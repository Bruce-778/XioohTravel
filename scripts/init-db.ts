import { readFile } from "node:fs/promises";
import dotenv from "dotenv";
import { Pool, PoolClient } from "pg";

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

const TABLE_NAMES = [
  "orders",
  "vehicle_types",
  "pricing_rules",
  "bookings",
  "users",
  "user_emails",
  "verification_codes",
] as const;

type TableName = (typeof TABLE_NAMES)[number];

function quoteIdent(identifier: TableName) {
  return `"${identifier}"`;
}

async function tableExists(client: PoolClient, tableName: TableName) {
  const { rows } = await client.query<{ exists: boolean }>(
    "SELECT to_regclass($1) IS NOT NULL AS exists",
    [`public.${tableName}`]
  );
  return rows[0]?.exists ?? false;
}

async function getTableCount(client: PoolClient, tableName: TableName) {
  if (!(await tableExists(client, tableName))) {
    return null;
  }

  const { rows } = await client.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM ${quoteIdent(tableName)}`
  );

  return Number(rows[0]?.count ?? 0);
}

async function snapshotCounts(client: PoolClient) {
  const entries = await Promise.all(
    TABLE_NAMES.map(async (tableName) => [tableName, await getTableCount(client, tableName)] as const)
  );

  return Object.fromEntries(entries) as Record<TableName, number | null>;
}

function printCounts(title: string, counts: Record<TableName, number | null>) {
  console.log(title);
  for (const tableName of TABLE_NAMES) {
    const value = counts[tableName];
    console.log(`  - ${tableName}: ${value === null ? "missing" : value}`);
  }
}

async function getPricingRuleDuplicateGroups(client: PoolClient) {
  if (!(await tableExists(client, "pricing_rules"))) {
    return 0;
  }

  const { rows } = await client.query<{ count: string }>(`
    SELECT COUNT(*)::text AS count
    FROM (
      SELECT from_area, to_area, trip_type, vehicle_type_id
      FROM pricing_rules
      GROUP BY from_area, to_area, trip_type, vehicle_type_id
      HAVING COUNT(*) > 1
    ) duplicates
  `);

  return Number(rows[0]?.count ?? 0);
}

async function init() {
  const client = await pool.connect();

  try {
    const sqlFile = new URL("./sql/supabase-safe-init.sql", import.meta.url);
    const migrationSql = await readFile(sqlFile, "utf8");

    console.log("Starting safe PostgreSQL/Supabase initialization...");

    const beforeCounts = await snapshotCounts(client);
    printCounts("Table counts before migration:", beforeCounts);

    await client.query("BEGIN");
    await client.query(migrationSql);
    await client.query("COMMIT");

    const afterCounts = await snapshotCounts(client);
    printCounts("Table counts after migration:", afterCounts);

    const duplicateGroups = await getPricingRuleDuplicateGroups(client);
    if (duplicateGroups > 0) {
      console.log(
        `Pricing rule duplicates detected in ${duplicateGroups} route group(s). Unique constraint was intentionally skipped to preserve existing data.`
      );
    } else {
      console.log("No duplicate pricing rule groups detected.");
    }

    if (beforeCounts.orders !== null) {
      console.log("Legacy orders table detected and preserved as-is.");
    }

    console.log("Safe database initialization completed successfully.");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error("Error initializing database safely:", error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

init();
