import { Pool, QueryResult, QueryResultRow, QueryConfig } from 'pg';
import { env } from './config/env';

export const pool = new Pool({ connectionString: env.DATABASE_URL, max: 10 });

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: QueryConfig['values']
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params);
}