import { database } from './connection';
import { QueryOptions, Filter } from '../types';

export class QueryBuilder {
  private selectClause: string = '';
  private fromClause: string = '';
  private whereConditions: string[] = [];
  private orderByClause: string = '';
  private limitClause: string = '';
  private offsetClause: string = '';
  private params: any[] = [];

  public select(columns: string | string[]): QueryBuilder {
    if (Array.isArray(columns)) {
      this.selectClause = `SELECT ${columns.join(', ')}`;
    } else {
      this.selectClause = `SELECT ${columns}`;
    }
    return this;
  }

  public from(table: string): QueryBuilder {
    this.fromClause = `FROM ${table}`;
    return this;
  }

  public where(condition: string, ...params: any[]): QueryBuilder {
    this.whereConditions.push(condition);
    this.params.push(...params);
    return this;
  }

  public orderBy(column: string, direction: 'ASC' | 'DESC' = 'ASC'): QueryBuilder {
    this.orderByClause = `ORDER BY ${column} ${direction}`;
    return this;
  }

  public limit(count: number): QueryBuilder {
    this.limitClause = `LIMIT ${count}`;
    return this;
  }

  public offset(count: number): QueryBuilder {
    this.offsetClause = `OFFSET ${count}`;
    return this;
  }

  public build(): { sql: string; params: any[] } {
    const clauses = [
      this.selectClause,
      this.fromClause,
      this.whereConditions.length > 0 ? `WHERE ${this.whereConditions.join(' AND ')}` : '',
      this.orderByClause,
      this.limitClause,
      this.offsetClause
    ].filter(clause => clause.length > 0);

    return {
      sql: clauses.join(' '),
      params: this.params
    };
  }

  public async execute<T = any>(): Promise<T[]> {
    const { sql, params } = this.build();
    return database.all<T>(sql, params);
  }

  public async executeOne<T = any>(): Promise<T | undefined> {
    const { sql, params } = this.build();
    return database.get<T>(sql, params);
  }
}

export class QueryHelpers {
  // Apply filters to a query builder
  public static applyFilters(queryBuilder: QueryBuilder, filters: Filter[]): QueryBuilder {
    for (const filter of filters) {
      switch (filter.operator) {
        case 'eq':
          queryBuilder.where(`${filter.column} = ?`, filter.value);
          break;
        case 'gt':
          queryBuilder.where(`${filter.column} > ?`, filter.value);
          break;
        case 'lt':
          queryBuilder.where(`${filter.column} < ?`, filter.value);
          break;
        case 'contains':
          queryBuilder.where(`${filter.column} LIKE ?`, `%${filter.value}%`);
          break;
      }
    }
    return queryBuilder;
  }

  // Apply pagination to a query builder
  public static applyPagination(queryBuilder: QueryBuilder, options: QueryOptions): QueryBuilder {
    const offset = (options.page - 1) * options.limit;
    queryBuilder.limit(options.limit).offset(offset);

    if (options.sortBy) {
      const direction = options.sortOrder?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      queryBuilder.orderBy(options.sortBy, direction as 'ASC' | 'DESC');
    }

    return queryBuilder;
  }

  // Get total count for pagination
  public static async getCount(table: string, whereConditions: string[] = [], params: any[] = []): Promise<number> {
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    const sql = `SELECT COUNT(*) as count FROM ${table} ${whereClause}`;
    
    const result = await database.get<{ count: number }>(sql, params);
    return result?.count || 0;
  }

  // Insert helper
  public static async insert(table: string, data: Record<string, any>): Promise<number> {
    const columns = Object.keys(data);
    const placeholders = columns.map(() => '?').join(', ');
    const values = Object.values(data);

    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
    const result = await database.run(sql, values);
    
    return result.lastID!;
  }

  // Update helper
  public static async update(table: string, data: Record<string, any>, whereCondition: string, whereParams: any[]): Promise<number> {
    const columns = Object.keys(data);
    const setClause = columns.map(col => `${col} = ?`).join(', ');
    const values = Object.values(data);

    const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereCondition}`;
    const result = await database.run(sql, [...values, ...whereParams]);
    
    return result.changes!;
  }

  // Delete helper
  public static async delete(table: string, whereCondition: string, whereParams: any[]): Promise<number> {
    const sql = `DELETE FROM ${table} WHERE ${whereCondition}`;
    const result = await database.run(sql, whereParams);
    
    return result.changes!;
  }

  // Upsert helper (insert or update)
  public static async upsert(table: string, data: Record<string, any>, conflictColumns: string[]): Promise<number> {
    const columns = Object.keys(data);
    const placeholders = columns.map(() => '?').join(', ');
    const values = Object.values(data);
    
    const updateColumns = columns.filter(col => !conflictColumns.includes(col));
    const updateClause = updateColumns.map(col => `${col} = excluded.${col}`).join(', ');

    const sql = `
      INSERT INTO ${table} (${columns.join(', ')}) 
      VALUES (${placeholders})
      ON CONFLICT(${conflictColumns.join(', ')}) 
      DO UPDATE SET ${updateClause}
    `;

    const result = await database.run(sql, values);
    return result.lastID || result.changes!;
  }

  // Batch insert helper
  public static async batchInsert(table: string, dataArray: Record<string, any>[]): Promise<void> {
    if (dataArray.length === 0) return;

    const columns = Object.keys(dataArray[0]);
    const placeholders = columns.map(() => '?').join(', ');
    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;

    await database.transaction(async () => {
      for (const data of dataArray) {
        const values = columns.map(col => data[col]);
        await database.run(sql, values);
      }
    });
  }
}

// Export a new query builder instance
export function createQueryBuilder(): QueryBuilder {
  return new QueryBuilder();
}