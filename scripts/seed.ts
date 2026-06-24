import { randomUUID } from "node:crypto";
import dotenv from "dotenv";
import { Pool, PoolClient } from "pg";
import { generateRealPricingRules, REAL_VEHICLES } from "@/lib/realPricing";

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

async function tableExists(client: PoolClient, tableName: string) {
  const { rows } = await client.query<{ exists: boolean }>(
    "SELECT to_regclass($1) IS NOT NULL AS exists",
    [`public.${tableName}`]
  );
  return rows[0]?.exists ?? false;
}

async function ensureVehicle(client: PoolClient, vehicle: (typeof REAL_VEHICLES)[number]) {
  const { rowCount } = await client.query(
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

  return rowCount ?? 0;
}

async function main() {
  const client = await pool.connect();

  try {
    if (!(await tableExists(client, "vehicle_types")) || !(await tableExists(client, "pricing_rules"))) {
      throw new Error("Required tables are missing. Run `npm run init-db` first.");
    }

    await client.query("BEGIN");

    let touchedVehicles = 0;
    for (const vehicle of REAL_VEHICLES) {
      touchedVehicles += await ensureVehicle(client, vehicle);
    }

    const rules = generateRealPricingRules();
    let insertedPricingRules = 0;
    let updatedPricingRules = 0;

    for (const rule of rules) {
      const { rows: existing } = await client.query<{ id: string }>(
        `SELECT id
         FROM pricing_rules
         WHERE from_area = $1
           AND to_area = $2
           AND trip_type = $3
           AND vehicle_type_id = $4
         LIMIT 1`,
        [rule.fromArea, rule.toArea, rule.tripType, rule.vehicleTypeId]
      );

      if (existing.length > 0) {
        await client.query(
          `UPDATE pricing_rules
           SET base_price_jpy = $1,
               night_fee_jpy = $2,
               urgent_fee_jpy = $3,
               updated_at = NOW()
           WHERE id = $4`,
          [rule.basePriceJpy, rule.nightFeeJpy, rule.urgentFeeJpy, existing[0].id]
        );
        updatedPricingRules += 1;
        continue;
      }

      await client.query(
        `INSERT INTO pricing_rules (
           id, from_area, to_area, trip_type, base_price_jpy, night_fee_jpy, urgent_fee_jpy, vehicle_type_id
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          randomUUID(),
          rule.fromArea,
          rule.toArea,
          rule.tripType,
          rule.basePriceJpy,
          rule.nightFeeJpy,
          rule.urgentFeeJpy,
          rule.vehicleTypeId,
        ]
      );
      insertedPricingRules += 1;
    }

    await client.query("COMMIT");
    console.log(`Real vehicle seed completed. Touched ${touchedVehicles} vehicle row(s).`);
    console.log(
      `Real pricing seed completed. Inserted ${insertedPricingRules} and updated ${updatedPricingRules} pricing rule(s).`
    );
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error(error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
