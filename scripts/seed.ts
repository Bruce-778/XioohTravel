import dotenv from "dotenv";
import { Pool, PoolClient } from "pg";

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

type DefaultVehicle = {
  preferredId: string;
  name: string;
  seats: number;
  luggageSmall: number;
  luggageMedium: number;
  luggageLarge: number;
  isLuxury?: boolean;
  isBus?: boolean;
  description: string;
};

type DefaultVehiclePrice = {
  name: string;
  base: number;
  night: number;
  urgent: number;
};

type RoutePair = {
  fromArea: string;
  toArea: string;
  tripType: "PICKUP" | "DROPOFF" | "POINT_TO_POINT";
};

const DEFAULT_VEHICLES: DefaultVehicle[] = [
  {
    preferredId: "economy_5",
    name: "5座车（经济型）",
    seats: 4,
    luggageSmall: 2,
    luggageMedium: 1,
    luggageLarge: 1,
    description: "适合 1-3 人轻装出行",
  },
  {
    preferredId: "business_7",
    name: "7座车（商务型）",
    seats: 6,
    luggageSmall: 4,
    luggageMedium: 3,
    luggageLarge: 2,
    description: "适合家庭/多人出行",
  },
  {
    preferredId: "large_9",
    name: "9座车（大空间）",
    seats: 8,
    luggageSmall: 6,
    luggageMedium: 4,
    luggageLarge: 3,
    description: "适合行李较多或 6-8 人",
  },
  {
    preferredId: "luxury_vip",
    name: "豪华型（VIP）",
    seats: 4,
    luggageSmall: 3,
    luggageMedium: 2,
    luggageLarge: 2,
    isLuxury: true,
    description: "更舒适的商务接待",
  },
  {
    preferredId: "bus_group",
    name: "大巴车（团体）",
    seats: 20,
    luggageSmall: 20,
    luggageMedium: 20,
    luggageLarge: 20,
    isBus: true,
    description: "团队出行与大型行李",
  },
];

const AIRPORTS = ["NRT", "HND", "KIX", "NGO", "CTS"];
const POPULAR_AREAS = [
  "Shinjuku",
  "Shibuya",
  "Ginza",
  "Asakusa",
  "Ueno",
  "Ikebukuro",
  "Namba",
  "Umeda",
  "Dotonbori",
  "Gion",
  "Kyoto Station",
] as const;

const VEHICLE_PRICES: DefaultVehiclePrice[] = [
  { name: "5座车（经济型）", base: 16000, night: 2000, urgent: 3000 },
  { name: "7座车（商务型）", base: 22000, night: 3000, urgent: 4000 },
  { name: "9座车（大空间）", base: 28000, night: 4000, urgent: 5000 },
  { name: "豪华型（VIP）", base: 38000, night: 5000, urgent: 6000 },
  { name: "大巴车（团体）", base: 85000, night: 8000, urgent: 12000 },
];

function generateId() {
  return Math.random().toString(36).slice(2, 15);
}

async function tableExists(client: PoolClient, tableName: string) {
  const { rows } = await client.query<{ exists: boolean }>(
    "SELECT to_regclass($1) IS NOT NULL AS exists",
    [`public.${tableName}`]
  );
  return rows[0]?.exists ?? false;
}

async function ensureVehicle(client: PoolClient, vehicle: DefaultVehicle) {
  const { rows: existingByName } = await client.query<{ id: string }>(
    "SELECT id FROM vehicle_types WHERE name = $1 LIMIT 1",
    [vehicle.name]
  );

  if (existingByName.length > 0) {
    return { id: existingByName[0].id, inserted: false };
  }

  let candidateId = vehicle.preferredId;
  const { rows: idConflict } = await client.query<{ id: string }>(
    "SELECT id FROM vehicle_types WHERE id = $1 LIMIT 1",
    [candidateId]
  );
  if (idConflict.length > 0) {
    candidateId = `${vehicle.preferredId}_${generateId()}`;
  }

  const { rows } = await client.query<{ id: string }>(
    `INSERT INTO vehicle_types (
      id, name, seats, luggage_small, luggage_medium, luggage_large, is_luxury, is_bus, description
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id`,
    [
      candidateId,
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

  return { id: rows[0].id, inserted: true };
}

function buildDefaultRoutePairs(): RoutePair[] {
  const pairs: RoutePair[] = [];

  for (const airport of AIRPORTS) {
    for (const area of POPULAR_AREAS) {
      pairs.push({ fromArea: airport, toArea: area, tripType: "PICKUP" });
      pairs.push({ fromArea: area, toArea: airport, tripType: "DROPOFF" });
    }
  }

  for (const fromArea of POPULAR_AREAS) {
    for (const toArea of POPULAR_AREAS) {
      if (fromArea === toArea) continue;
      pairs.push({ fromArea, toArea, tripType: "POINT_TO_POINT" });
    }
  }

  return pairs;
}

async function main() {
  const client = await pool.connect();

  try {
    if (!(await tableExists(client, "vehicle_types")) || !(await tableExists(client, "pricing_rules"))) {
      throw new Error("Required tables are missing. Run `npm run init-db` first.");
    }

    await client.query("BEGIN");

    let insertedVehicles = 0;
    for (const vehicle of DEFAULT_VEHICLES) {
      const result = await ensureVehicle(client, vehicle);
      if (result.inserted) insertedVehicles += 1;
    }

    const { rows: allVehicles } = await client.query<{ id: string; name: string }>(
      "SELECT id, name FROM vehicle_types"
    );
    const vehicleIdsByName = new Map(allVehicles.map((vehicle) => [vehicle.name, vehicle.id]));
    const routes = buildDefaultRoutePairs();

    let insertedPricingRules = 0;
    for (const route of routes) {
      for (const vehiclePrice of VEHICLE_PRICES) {
        const vehicleTypeId = vehicleIdsByName.get(vehiclePrice.name);
        if (!vehicleTypeId) continue;

        const { rowCount } = await client.query(
          `INSERT INTO pricing_rules (
            id, from_area, to_area, trip_type, base_price_jpy, night_fee_jpy, urgent_fee_jpy, vehicle_type_id
          )
          SELECT $1, $2, $3, $4, $5, $6, $7, $8
          WHERE NOT EXISTS (
            SELECT 1
            FROM pricing_rules
            WHERE from_area = $2
              AND to_area = $3
              AND trip_type = $4
              AND vehicle_type_id = $8
          )`,
          [
            generateId(),
            route.fromArea,
            route.toArea,
            route.tripType,
            vehiclePrice.base,
            vehiclePrice.night,
            vehiclePrice.urgent,
            vehicleTypeId,
          ]
        );

        insertedPricingRules += rowCount ?? 0;
      }
    }

    await client.query("COMMIT");
    console.log(`Vehicle seed completed. Added ${insertedVehicles} missing vehicle type(s).`);
    console.log(
      `Default pricing seed completed. Checked ${routes.length} route group(s) and added ${insertedPricingRules} missing pricing rule(s).`
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
