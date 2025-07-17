import { database } from '../database/connection';
import { 
  StrategyBucket, 
  CreateBucketRequest, 
  UpdateBucketRequest,
  Strategy
} from '../types';

export class BucketService {
  async createBucket(userId: number, bucket: CreateBucketRequest): Promise<StrategyBucket> {
    const sql = `
      INSERT INTO strategy_buckets (user_id, name, description, color)
      VALUES (?, ?, ?, ?)
    `;
    
    const params = [
      userId,
      bucket.name,
      bucket.description || null,
      bucket.color || null
    ];

    const result = await database.run(sql, params);
    const bucketId = result.lastID!;

    return this.getBucketById(userId, bucketId);
  }

  async updateBucket(userId: number, bucketId: number, updates: UpdateBucketRequest): Promise<StrategyBucket> {
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
    if (updates.color !== undefined) {
      updateFields.push('color = ?');
      params.push(updates.color);
    }

    if (updateFields.length === 0) {
      // No updates provided, just return the existing bucket
      return this.getBucketById(userId, bucketId);
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(userId, bucketId);

    const sql = `
      UPDATE strategy_buckets 
      SET ${updateFields.join(', ')} 
      WHERE user_id = ? AND id = ?
    `;

    const result = await database.run(sql, params);
    
    if (result.changes === 0) {
      throw new Error('Bucket not found or access denied');
    }

    return this.getBucketById(userId, bucketId);
  }

  async deleteBucket(userId: number, bucketId: number): Promise<void> {
    // First, check if any strategies are using this bucket
    const strategiesInBucket = await this.getStrategiesInBucket(userId, bucketId);
    
    if (strategiesInBucket.length > 0) {
      // Set bucket_id to null for all strategies in this bucket
      await database.run(
        'UPDATE strategies SET bucket_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE bucket_id = ? AND user_id = ?',
        [bucketId, userId]
      );
    }

    const sql = 'DELETE FROM strategy_buckets WHERE user_id = ? AND id = ?';
    const result = await database.run(sql, [userId, bucketId]);

    if (result.changes === 0) {
      throw new Error('Bucket not found or access denied');
    }
  }

  async getUserBuckets(userId: number): Promise<StrategyBucket[]> {
    const sql = `
      SELECT * FROM strategy_buckets 
      WHERE user_id = ? 
      ORDER BY name ASC
    `;

    const rows = await database.all(sql, [userId]);
    return rows.map(this.mapRowToBucket);
  }

  async getStrategiesInBucket(userId: number, bucketId: number): Promise<Strategy[]> {
    const sql = `
      SELECT 
        s.*,
        sb.name as bucket_name,
        sb.description as bucket_description,
        sb.color as bucket_color
      FROM strategies s
      LEFT JOIN strategy_buckets sb ON s.bucket_id = sb.id
      WHERE s.user_id = ? AND s.bucket_id = ?
      ORDER BY s.name ASC
    `;

    const rows = await database.all(sql, [userId, bucketId]);
    
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

  private async getBucketById(userId: number, bucketId: number): Promise<StrategyBucket> {
    const sql = 'SELECT * FROM strategy_buckets WHERE user_id = ? AND id = ?';
    const row = await database.get(sql, [userId, bucketId]);

    if (!row) {
      throw new Error('Bucket not found');
    }

    return this.mapRowToBucket(row);
  }

  private async getStrategyTags(strategyId: number): Promise<any[]> {
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

  private mapRowToBucket(row: any): StrategyBucket {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      description: row.description,
      color: row.color,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
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