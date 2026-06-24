import { randomUUID } from "node:crypto";
import dotenv from "dotenv";
import { Pool, PoolClient, type PoolConfig } from "pg";
import { generateRealPricingRules, REAL_SURCHARGE_JPY, REAL_VEHICLES } from "@/lib/realPricing";

dotenv.config();

const isCommit = process.argv.includes("--commit");
const shouldCheckDb = isCommit || process.argv.includes("--check-db");
const useDirectUrl = process.argv.includes("--direct");
const expectedRuleCount = 520;

function getDatabaseUrl() {
  if (useDirectUrl) {
    return process.env.DIRECT_URL || process.env.DATABASE_URL;
  }

  return process.env.DATABASE_URL || process.env.DIRECT_URL;
}

function shouldUseSsl(connectionString: string | undefined): PoolConfig["ssl"] {
  if (!connectionString) return false;

  try {
    const parsed = new URL(connectionString);
    const sslMode = parsed.searchParams.get("sslmode");
    if (sslMode === "disable") return false;
    if (sslMode === "require" || parsed.hostname.includes("supabase.com")) {
      return { rejectUnauthorized: false };
    }
  } catch {
    return false;
  }

  return false;
}

function createPool() {
  return new Pool({
    connectionString: getDatabaseUrl(),
    ssl: shouldUseSsl(getDatabaseUrl()),
    connectionTimeoutMillis: 8_000,
  });
}

async function tableExists(client: PoolClient, tableName: string) {
  const { rows } = await client.query<{ exists: boolean }>(
    "SELECT to_regclass($1) IS NOT NULL AS exists",
    [`public.${tableName}`]
  );
  return rows[0]?.exists ?? false;
}

async function getCount(client: PoolClient, tableName: string) {
  if (!(await tableExists(client, tableName))) return null;
  const { rows } = await client.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM ${tableName}`);
  return Number(rows[0]?.count ?? 0);
}

async function ensureVehicle(client: PoolClient, vehicle: (typeof REAL_VEHICLES)[number]) {
  await client.query(
    `INSERT INTO vehicle_types (
       id, name, seats, luggage_small, luggage_medium, luggage_large, is_luxury, is_bus, description
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (id) DO UPDATE
       SET name = EXCLUDED.name,
           seats = EXCLUDED.seats,
           luggage_small = EXCLUDED.luggage_small,
           luggage_medium = EXCLUDED.luggage_medium,
           luggage_large = EXCLUDED.luggage_large,
           is_luxury = EXCLUDED.is_luxury,
           is_bus = EXCLUDED.is_bus,
           description = EXCLUDED.description,
           updated_at = NOW()`,
    [
      vehicle.id,
      vehicle.name,
      vehicle.seats,
      vehicle.luggageSmall,
      vehicle.luggageMedium,
      vehicle.luggageLarge,
      vehicle.isLuxury ?? false,
      vehicle.isBus ?? false,
      vehicle.description,
    ]
  );
}

async function main() {
  const rules = generateRealPricingRules();
  if (rules.length !== expectedRuleCount) {
    throw new Error(`Real pricing rule count mismatch: expected ${expectedRuleCount}, got ${rules.length}`);
  }

  console.log(`Real pricing rules to sync: ${rules.length}`);
  console.log(`Night fee JPY: ${REAL_SURCHARGE_JPY}`);
  console.log(`Urgent fee JPY: ${REAL_SURCHARGE_JPY}`);

  if (!shouldCheckDb) {
    console.log("Dry run only. Re-run with --check-db to inspect database counts, or --commit to replace database pricing rules.");
    return;
  }

  const pool = createPool();
  const client = await pool.connect();

  try {
    for (const tableName of ["vehicle_types", "pricing_rules", "pricing_rule_overrides"]) {
      if (!(await tableExists(client, tableName))) {
        throw new Error(`Required table is missing: ${tableName}. Run npm run init-db first.`);
      }
    }

    const beforePricingRules = await getCount(client, "pricing_rules");
    const beforeOverrides = await getCount(client, "pricing_rule_overrides");
    console.log(`Current pricing_rules: ${beforePricingRules ?? "missing"}`);
    console.log(`Current pricing_rule_overrides: ${beforeOverrides ?? "missing"}`);

    if (!isCommit) {
      console.log("Database check only. Re-run with --commit to replace database pricing rules.");
      return;
    }

    await client.query("BEGIN");

    for (const vehicle of REAL_VEHICLES) {
      await ensureVehicle(client, vehicle);
    }

    await client.query("DELETE FROM pricing_rule_overrides");
    await client.query("DELETE FROM pricing_rules");

    for (const rule of rules) {
      await client.query(
        `INSERT INTO pricing_rules (
           id, from_area, to_area, trip_type, vehicle_type_id,
           base_price_jpy, night_fee_jpy, urgent_fee_jpy, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
        [
          randomUUID(),
          rule.fromArea,
          rule.toArea,
          rule.tripType,
          rule.vehicleTypeId,
          rule.basePriceJpy,
          rule.nightFeeJpy,
          rule.urgentFeeJpy,
        ]
      );
    }

    await client.query("COMMIT");

    const afterPricingRules = await getCount(client, "pricing_rules");
    const afterOverrides = await getCount(client, "pricing_rule_overrides");
    console.log(`Synced real pricing. pricing_rules: ${afterPricingRules}`);
    console.log(`Cleared pricing_rule_overrides. pricing_rule_overrides: ${afterOverrides}`);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Failed to sync real pricing:", error);
  process.exitCode = 1;
});
