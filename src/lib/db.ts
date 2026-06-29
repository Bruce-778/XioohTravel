import { Pool, type PoolConfig } from 'pg';

function getDatabaseUrl() {
  if (process.env.NODE_ENV === "production") {
    return process.env.DATABASE_URL || process.env.DIRECT_URL;
  }

  return process.env.DATABASE_URL || process.env.DIRECT_URL;
}

function shouldUseSsl(connectionString: string | undefined): PoolConfig["ssl"] {
  if (process.env.NODE_ENV === "production") {
    return { rejectUnauthorized: false };
  }

  if (!connectionString) {
    return false;
  }

  try {
    const parsed = new URL(connectionString);
    const sslMode = parsed.searchParams.get("sslmode");
    if (sslMode === "disable") {
      return false;
    }

    if (sslMode === "require" || parsed.hostname.includes("supabase.com")) {
      return { rejectUnauthorized: false };
    }
  } catch {
    return false;
  }

  return false;
}

let pool: Pool | null = null;

export function getDbPool() {
  if (!pool) {
    const connectionString = getDatabaseUrl();
    pool = new Pool({
      connectionString,
      ssl: shouldUseSsl(connectionString),
      connectionTimeoutMillis: 15_000,
    });
  }

  return pool;
}

export const db = {
  query: (text: string, params?: any[]) => getDbPool().query(text, params),
  get pool() {
    return getDbPool();
  },
};

export default db;
