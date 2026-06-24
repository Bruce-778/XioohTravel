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

const connectionString = getDatabaseUrl();

const pool = new Pool({
  connectionString,
  ssl: shouldUseSsl(connectionString),
  connectionTimeoutMillis: 8_000,
});

export const db = {
  query: (text: string, params?: any[]) => pool.query(text, params),
  pool,
};

export default db;
