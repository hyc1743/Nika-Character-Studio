import { neon } from '@neondatabase/serverless';

let sqlClient;

export function getSql() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connectionString) throw new Error('Missing DATABASE_URL or POSTGRES_URL');
  if (!sqlClient) sqlClient = neon(connectionString);
  return sqlClient;
}

export async function query(strings, ...values) {
  return getSql()(strings, ...values);
}
