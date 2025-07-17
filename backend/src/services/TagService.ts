import { database } from '../database/connection';
import { 
  Tag, 
  CreateTagRequest, 
  UpdateTagRequest,
  Strategy
} from '../types';

export class TagService {
  async createTag(userId: number, tag: CreateTagRequest): Promise<Tag> {
    const sql = `
      INSERT INTO tags (user_id, name, color)
      VALUES (?, ?, ?)
    `;
    
    const params = [
      userId,
      tag.name,
      tag.color || null
    ];

    try {
      const result = await database.run(sql, params);
      const tagId = result.lastID!;

      return this.getTagById(userId, tagId);
    } catch (error: any) {
      // Handle unique constraint violation
      if (error.message.includes('UNIQUE constraint failed')) {
        throw new Error(`Tag with name "${tag.name}" already exists`);
      }
      throw error;
    }
  }

  async updateTag(userId: number, tagId: number, updates: UpdateTagRequest): Promise<Tag> {
    // Build dynamic update query
    const updateFields: string[] = [];
    const params: any[] = [];

    if (updates.name !== undefined) {
      updateFields.push('name = ?');
      params.push(updates.name);
    }
    if (updates.color !== undefined) {
      updateFields.push('color = ?');
      params.push(updates.color);
    }

    if (updateFields.length === 0) {
      // No updates provided, just return the existing tag
      return this.getTagById(userId, tagId);
    }

    params.push(userId, tagId);

    const sql = `
      UPDATE tags 
      SET ${updateFields.join(', ')} 
      WHERE user_id = ? AND id = ?
    `;

    try {
      const result = await database.run(sql, params);
      
      if (result.changes === 0) {
        throw new Error('Tag not found or access denied');
      }

      return this.getTagById(userId, tagId);
    } catch (error: any) {
      // Handle unique constraint violation
      if (error.message.includes('UNIQUE constraint failed')) {
        throw new Error(`Tag with name "${updates.name}" already exists`);
      }
      throw error;
    }
  }

  async deleteTag(userId: number, tagId: number): Promise<void> {
    // First, remove all strategy-tag associations
    await database.run(
      'DELETE FROM strategy_tags WHERE tag_id = ?',
      [tagId]
    );

    // Then delete the tag
    const sql = 'DELETE FROM tags WHERE user_id = ? AND id = ?';
    const result = await database.run(sql, [userId, tagId]);

    if (result.changes === 0) {
      throw new Error('Tag not found or access denied');
    }
  }

  async getUserTags(userId: number): Promise<Tag[]> {
    const sql = `
      SELECT * FROM tags 
      WHERE user_id = ? 
      ORDER BY name ASC
    `;

    const rows = await database.all(sql, [userId]);
    return rows.map(this.mapRowToTag);
  }

  async getStrategiesByTag(userId: number, tagId: number): Promise<Strategy[]> {
    const sql = `
      SELECT 
        s.*,
        sb.name as bucket_name,
        sb.description as bucket_description,
        sb.color as bucket_color
      FROM strategies s
      LEFT JOIN strategy_buckets sb ON s.bucket_id = sb.id
      INNER JOIN strategy_tags st ON s.id = st.strategy_id
      WHERE s.user_id = ? AND st.tag_id = ?
      ORDER BY s.name ASC
    `;

    const rows = await database.all(sql, [userId, tagId]);
    
    // Map rows to strategies and fetch tags for each
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

  async getTagsByStrategy(strategyId: number): Promise<Tag[]> {
    const sql = `
      SELECT t.* 
      FROM tags t
      INNER JOIN strategy_tags st ON t.id = st.tag_id
      WHERE st.strategy_id = ?
      ORDER BY t.name
    `;

    const rows = await database.all(sql, [strategyId]);
    return rows.map(this.mapRowToTag);
  }

  private async getTagById(userId: number, tagId: number): Promise<Tag> {
    const sql = 'SELECT * FROM tags WHERE user_id = ? AND id = ?';
    const row = await database.get(sql, [userId, tagId]);

    if (!row) {
      throw new Error('Tag not found');
    }

    return this.mapRowToTag(row);
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
    return rows.map(this.mapRowToTag);
  }

  private mapRowToTag(row: any): Tag {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      color: row.color,
      createdAt: new Date(row.created_at)
    };
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