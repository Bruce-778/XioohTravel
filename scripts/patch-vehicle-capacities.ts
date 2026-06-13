import { readFile } from "node:fs/promises";
import dotenv from "dotenv";
import { Pool, type PoolClient } from "pg";

dotenv.config();

const connectionStrings = [process.env.DIRECT_URL, process.env.DATABASE_URL].filter(
  (value): value is string => Boolean(value)
);

if (connectionStrings.length === 0) {
  throw new Error("DIRECT_URL or DATABASE_URL must be configured");
}

async function main() {
  let pool: Pool | null = null;
  let client: PoolClient | null = null;

  try {
    let lastError: unknown = null;

    for (const connectionString of connectionStrings) {
      const nextPool = new Pool({
        connectionString,
        ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
      });

      try {
        client = await nextPool.connect();
        pool = nextPool;
        break;
      } catch (error) {
        lastError = error;
        await nextPool.end().catch(() => undefined);
      }
    }

    if (!client || !pool) {
      throw lastError ?? new Error("Unable to connect to database");
    }

    const sqlFile = new URL("./sql/vehicle-capacities-patch.sql", import.meta.url);
    const patchSql = await readFile(sqlFile, "utf8");

    console.log("Applying vehicle capacities patch...");

    await client.query("BEGIN");
    await client.query(patchSql);

    const { rows } = await client.query<{
      id: string;
      name: string;
      seats: number;
      luggage_small: number;
      luggage_medium: number;
    }>(
      `SELECT id, name, seats, luggage_small, luggage_medium
       FROM vehicle_types
       WHERE id IN ('business_7', 'large_9')
          OR name IN ('7座车（商务型）', '9座车（大空间）')
       ORDER BY seats ASC`
    );

    await client.query("COMMIT");

    console.log("Patch applied. Vehicle capacities:");
    for (const row of rows) {
      console.log(
        `- ${row.name} (${row.id}): seats=${row.seats}, small=${row.luggage_small}, medium=${row.luggage_medium}`
      );
    }
  } catch (error) {
    await client?.query("ROLLBACK").catch(() => undefined);
    console.error("Failed to apply vehicle capacities patch:", error);
    process.exitCode = 1;
  } finally {
    client?.release();
    await pool?.end();
  }
}

main();
