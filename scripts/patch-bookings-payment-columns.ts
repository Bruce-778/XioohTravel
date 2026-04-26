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

    const sqlFile = new URL("./sql/bookings-payment-columns-patch.sql", import.meta.url);
    const patchSql = await readFile(sqlFile, "utf8");

    console.log("Applying bookings payment columns patch...");

    await client.query("BEGIN");
    await client.query(patchSql);

    const { rows } = await client.query<{ column_name: string }>(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_name = 'bookings'
         AND column_name IN (
           'stripe_checkout_session_id',
           'stripe_payment_intent_id',
           'stripe_payment_status',
           'paid_at',
           'payment_confirmation_email_sent_at',
           'payment_confirmation_email_provider_id'
         )
       ORDER BY column_name`
    );

    await client.query("COMMIT");

    console.log("Patch applied. Available columns:");
    for (const row of rows) {
      console.log(`- ${row.column_name}`);
    }
  } catch (error) {
    await client?.query("ROLLBACK").catch(() => undefined);
    console.error("Failed to apply bookings payment columns patch:", error);
    process.exitCode = 1;
  } finally {
    client?.release();
    await pool?.end();
  }
}

main();
