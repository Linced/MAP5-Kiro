import { database } from '../database/connection';
import { 
  Strategy, 
  CreateStrategyRequest, 
  UpdateStrategyRequest, 
  QueryOptions,
  Tag
} from '../types';

export class StrategyService {
  async createStrategy(userId: number, strategy: CreateStrategyRequest): Promise<Strategy> {
    const sql = `
      INSERT INTO strategies (
        user_id, bucket_id, name, description, entry_rules, 
        exit_rules, risk_management, notes, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      userId,
      strategy.bucketId || null,
      strategy.name,
      strategy.description || null,
      JSON.stringify(strategy.entryRules),
      JSON.stringify(strategy.exitRules),
      JSON.stringify(strategy.riskManagement),
      strategy.notes || null,
      true
    ];

    const result = await database.run(sql, params);
    const strategyId = result.lastID!;
    
    // If tags are provided, add them
    if (strategy.tagIds && strategy.tagIds.length > 0) {
      await this.addTagsToStrategy(strategyId, strategy.tagIds);
    }

    return this.getStrategyById(userId, strategyId);
  }

  async updateStrategy(userId: number, strategyId: number, updates: UpdateStrategyRequest): Promise<Strategy> {
    // Build dynamic update query
    const updateFields: string[] = [];
    const params: any[] = [];

    if (updates.name !== undefined) {
      updateFields.push('name = ?');
      params.push(updates.name);
    }
    if (updates.description !== undefined) {
      updateFields.push('description = ?');
      params.push(updates.description);
    }
    if (updates.bucketId !== undefined) {
      updateFields.push('bucket_id = ?');
      params.push(updates.bucketId);
    }
    if (updates.entryRules !== undefined) {
      updateFields.push('entry_rules = ?');
      params.push(JSON.stringify(updates.entryRules));
    }
    if (updates.exitRules !== undefined) {
      updateFields.push('exit_rules = ?');
      params.push(JSON.stringify(updates.exitRules));
    }
    if (updates.riskManagement !== undefined) {
      updateFields.push('risk_management = ?');
      params.push(JSON.stringify(updates.riskManagement));
    }
    if (updates.notes !== undefined) {
      updateFields.push('notes = ?');
      params.push(updates.notes);
    }
    if (updates.isActive !== undefined) {
      updateFields.push('is_active = ?');
      params.push(updates.isActive);
    }

    if (updateFields.length === 0) {
      // No updates provided, just return the existing strategy
      return this.getStrategyById(userId, strategyId);
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(userId, strategyId);

    const sql = `
      UPDATE strategies 
      SET ${updateFields.join(', ')} 
      WHERE user_id = ? AND id = ?
    `;

    const result = await database.run(sql, params);

    if (result.changes === 0) {
      throw new Error('Strategy not found or access denied');
    }

    return this.getStrategyById(userId, strategyId);
  }

  async deleteStrategy(userId: number, strategyId: number): Promise<void> {
    const sql = 'DELETE FROM strategies WHERE user_id = ? AND id = ?';
    const result = await database.run(sql, [userId, strategyId]);

    if (result.changes === 0) {
      throw new Error('Strategy not found or access denied');
    }
  }

  async getUserStrategies(userId: number, options: QueryOptions = { page: 1, limit: 50 }): Promise<Strategy[]> {
    const offset = (options.page - 1) * options.limit;
    let sql = `
      SELECT 
        s.*,
        sb.name as bucket_name,
        sb.description as bucket_description,
        sb.color as bucket_color
      FROM strategies s
      LEFT JOIN strategy_buckets sb ON s.bucket_id = sb.id
      WHERE s.user_id = ?
    `;
    
    const params: any[] = [userId];

    // Add filtering
    if (options.filters) {
      for (const filter of options.filters) {
        if (filter.column === 'name' && filter.operator === 'contains') {
          sql += ' AND s.name LIKE ?';
          params.push(`%${filter.value}%`);
        } else if (filter.column === 'is_active' && filter.operator === 'eq') {
          sql += ' AND s.is_active = ?';
          params.push(filter.value);
        } else if (filter.column === 'bucket_id' && filter.operator === 'eq') {
          sql += ' AND s.bucket_id = ?';
          params.push(filter.value);
        }
      }
    }

    // Add sorting
    if (options.sortBy) {
      const sortColumn = options.sortBy === 'bucket_name' ? 'sb.name' : `s.${options.sortBy}`;
      const sortOrder = options.sortOrder || 'asc';
      sql += ` ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}`;
    } else {
      sql += ' ORDER BY s.created_at DESC';
    }

    sql += ' LIMIT ? OFFSET ?';
    params.push(options.limit, offset);

    const rows = await database.all(sql, params);

    const strategies = await Promise.all(
      rows.map(async (row: any) => {
        const strategy = this.mapRowToStrategy(row);
        
        // Fetch tags for each strategy
        const tags = await this.getStrategyTags(strategy.id);
        strategy.tags = tags;
        
        return strategy;
      })
    );

    return strategies;
  }

  async getStrategyById(userId: number, strategyId: number): Promise<Strategy> {
    const sql = `
      SELECT 
        s.*,
        sb.name as bucket_name,
        sb.description as bucket_description,
        sb.color as bucket_color
      FROM strategies s
      LEFT JOIN strategy_buckets sb ON s.bucket_id = sb.id
      WHERE s.user_id = ? AND s.id = ?
    `;

    const row = await database.get(sql, [userId, strategyId]);

    if (!row) {
      throw new Error('Strategy not found');
    }

    const strategy = this.mapRowToStrategy(row);
    
    // Fetch tags
    const tags = await this.getStrategyTags(strategy.id);
    strategy.tags = tags;
    
    return strategy;
  }

  async assignStrategyToBucket(strategyId: number, bucketId: number): Promise<void> {
    const sql = 'UPDATE strategies SET bucket_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    
    const result = await database.run(sql, [bucketId, strategyId]);

    if (result.changes === 0) {
      throw new Error('Strategy not found');
    }
  }

  async addTagsToStrategy(strategyId: number, tagIds: number[]): Promise<void> {
    if (tagIds.length === 0) {
      return;
    }

    // First, remove existing tags
    const deleteSql = 'DELETE FROM strategy_tags WHERE strategy_id = ?';
    await database.run(deleteSql, [strategyId]);

    // Then add new tags
    const insertSql = 'INSERT INTO strategy_tags (strategy_id, tag_id) VALUES (?, ?)';
    for (const tagId of tagIds) {
      await database.run(insertSql, [strategyId, tagId]);
    }
  }

  private async getStrategyTags(strategyId: number): Promise<Tag[]> {
    const sql = `
      SELECT t.* 
      FROM tags t
      INNER JOIN strategy_tags st ON t.id = st.tag_id
      WHERE st.strategy_id = ?
      ORDER BY t.name
    `;

    const rows = await database.all(sql, [strategyId]);
    return rows.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      color: row.color,
      createdAt: new Date(row.created_at)
    }));
  }

  private mapRowToStrategy(row: any): Strategy {
    const strategy: Strategy = {
      id: row.id,
      userId: row.user_id,
      bucketId: row.bucket_id,
      name: row.name,
      description: row.description,
      entryRules: JSON.parse(row.entry_rules || '[]'),
      exitRules: JSON.parse(row.exit_rules || '[]'),
      riskManagement: JSON.parse(row.risk_management || '{}'),
      notes: row.notes,
      isActive: Boolean(row.is_active),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };

    // Add bucket information if available
    if (row.bucket_name) {
      strategy.bucket = {
        id: row.bucket_id,
        userId: row.user_id,
        name: row.bucket_name,
        description: row.bucket_description,
        color: row.bucket_color,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      };
    }

    return strategy;
  }
}