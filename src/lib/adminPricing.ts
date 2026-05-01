import {
  getPricingAreaCode,
  isKnownPricingLocationInput,
} from "@/lib/locationData";

export type PricingTripType = "PICKUP" | "DROPOFF" | "POINT_TO_POINT";
export type PricingImportAction = "create" | "update";
export type PricingImportErrorCode =
  | "missing_column"
  | "missing_value"
  | "invalid_trip_type"
  | "invalid_price"
  | "unknown_vehicle_type"
  | "duplicate_in_file";

type VehicleLookupRow = {
  id: string;
  name: string;
  seats?: number;
};

export type PricingImportPreviewRow = {
  rowNumber: number;
  rawFromArea: string;
  rawToArea: string;
  fromArea: string;
  toArea: string;
  tripType: PricingTripType;
  vehicleTypeId: string;
  vehicleTypeName: string;
  basePriceJpy: number;
  nightFeeJpy: number;
  urgentFeeJpy: number;
  action: PricingImportAction;
  notes: string[];
};

export type PricingImportPreviewError = {
  rowNumber: number;
  field: string;
  code: PricingImportErrorCode;
  rawValue?: string;
  details?: string;
};

export type PricingImportPreviewSummary = {
  totalRows: number;
  validRows: number;
  errorRows: number;
  createCount: number;
  updateCount: number;
};

export type PricingImportPreviewResult = {
  rows: PricingImportPreviewRow[];
  errors: PricingImportPreviewError[];
  summary: PricingImportPreviewSummary;
};

function normalizeText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function parseCsvText(text: string) {
  const input = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let currentField = "";
  let currentRow: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];

    if (inQuotes) {
      if (char === '"') {
        if (input[index + 1] === '"') {
          currentField += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      currentRow.push(currentField.trim());
      currentField = "";
      continue;
    }

    if (char === "\n") {
      currentRow.push(currentField.trim());
      if (currentRow.some((cell) => cell !== "")) {
        rows.push(currentRow);
      }
      currentField = "";
      currentRow = [];
      continue;
    }

    if (char !== "\r") {
      currentField += char;
    }
  }

  if (currentField !== "" || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((cell) => cell !== "")) {
      rows.push(currentRow);
    }
  }

  return rows;
}

export function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

export function toContainsPattern(value: string) {
  return `%${escapeLikePattern(value.trim())}%`;
}

export function buildPricingRuleKey(
  fromArea: string,
  toArea: string,
  tripType: PricingTripType,
  vehicleTypeId: string
) {
  return [fromArea.trim(), toArea.trim(), tripType, vehicleTypeId].join("::");
}

export function normalizePricingRouteValue(value: string) {
  return getPricingAreaCode(value).trim();
}

export function normalizePricingTripType(value: string): PricingTripType | null {
  const normalized = normalizeText(value).replace(/[-_]+/g, " ");
  if (!normalized) return null;
  const compact = normalized.replace(/\s+/g, "");

  if (["pickup", "pick up", "接机", "arrival"].includes(normalized)) {
    return "PICKUP";
  }

  if (["dropoff", "drop off", "送机", "departure"].includes(normalized)) {
    return "DROPOFF";
  }

  if (["pointtopoint", "p2p", "点到点"].includes(compact) || normalized === "point to point") {
    return "POINT_TO_POINT";
  }

  if (value === "PICKUP" || value === "DROPOFF" || value === "POINT_TO_POINT") {
    return value;
  }

  return null;
}

export function buildVehicleLookup(vehicles: VehicleLookupRow[]) {
  const lookup = new Map<string, VehicleLookupRow>();

  for (const vehicle of vehicles) {
    const keys = new Set<string>([
      normalizeText(vehicle.id),
      normalizeText(vehicle.name),
    ]);

    if (typeof vehicle.seats === "number" && vehicle.seats > 0) {
      keys.add(`${vehicle.seats}`);
      keys.add(`${vehicle.seats} seats`);
      keys.add(`${vehicle.seats} seat`);
      keys.add(`${vehicle.seats}seats`);
      keys.add(`${vehicle.seats} seater`);
      keys.add(`${vehicle.seats}-seater`);
    }

    for (const key of keys) {
      lookup.set(key, vehicle);
    }
  }

  return lookup;
}

export function resolveVehicleType(input: string, vehicles: VehicleLookupRow[]) {
  const normalized = normalizeText(input);
  if (!normalized) return null;

  const lookup = buildVehicleLookup(vehicles);
  return lookup.get(normalized) ?? null;
}

export function parseIntegerPrice(value: string) {
  const normalized = value.trim().replace(/,/g, "");
  if (!normalized || !/^-?\d+$/.test(normalized)) {
    return null;
  }

  const parsed = Number(normalized);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

export function buildPricingImportPreview({
  csvText,
  vehicles,
  existingRuleKeys,
}: {
  csvText: string;
  vehicles: VehicleLookupRow[];
  existingRuleKeys: Set<string>;
}): PricingImportPreviewResult {
  const parsedRows = parseCsvText(csvText);
  const rows: PricingImportPreviewRow[] = [];
  const errors: PricingImportPreviewError[] = [];
  const seenKeys = new Set<string>();
  let createCount = 0;
  let updateCount = 0;

  if (parsedRows.length === 0) {
    return {
      rows,
      errors: [
        {
          rowNumber: 1,
          field: "file",
          code: "missing_column",
          details: "fromArea, toArea, tripType, vehicleType, basePriceJpy, nightFeeJpy, urgentFeeJpy",
        },
      ],
      summary: {
        totalRows: 0,
        validRows: 0,
        errorRows: 1,
        createCount: 0,
        updateCount: 0,
      },
    };
  }

  const headers = parsedRows[0].map((cell) => cell.trim());
  const headerIndex = new Map(headers.map((header, index) => [header, index]));
  const vehicleHeader = headerIndex.has("vehicleType")
    ? "vehicleType"
    : headerIndex.has("vehicleTypeId")
      ? "vehicleTypeId"
      : null;
  const requiredHeaders = [
    "fromArea",
    "toArea",
    "tripType",
    "basePriceJpy",
    "nightFeeJpy",
    "urgentFeeJpy",
  ];

  for (const header of requiredHeaders) {
    if (!headerIndex.has(header)) {
      errors.push({
        rowNumber: 1,
        field: header,
        code: "missing_column",
        details: header,
      });
    }
  }

  if (!vehicleHeader) {
    errors.push({
      rowNumber: 1,
      field: "vehicleType",
      code: "missing_column",
      details: "vehicleType",
    });
  }

  if (errors.length > 0) {
    return {
      rows,
      errors,
      summary: {
        totalRows: Math.max(parsedRows.length - 1, 0),
        validRows: 0,
        errorRows: 1,
        createCount: 0,
        updateCount: 0,
      },
    };
  }

  const dataRows = parsedRows.slice(1);

  dataRows.forEach((rawRow, rowIndex) => {
    const rowNumber = rowIndex + 2;
    const getCell = (header: string) => rawRow[headerIndex.get(header) ?? -1]?.trim() ?? "";
    const rawFromArea = getCell("fromArea");
    const rawToArea = getCell("toArea");
    const rawTripType = getCell("tripType");
    const rawVehicle = getCell(vehicleHeader as string);
    const rawBasePrice = getCell("basePriceJpy");
    const rawNightFee = getCell("nightFeeJpy");
    const rawUrgentFee = getCell("urgentFeeJpy");

    const rowErrors: PricingImportPreviewError[] = [];

    if (!rawFromArea) {
      rowErrors.push({ rowNumber, field: "fromArea", code: "missing_value" });
    }
    if (!rawToArea) {
      rowErrors.push({ rowNumber, field: "toArea", code: "missing_value" });
    }
    if (!rawTripType) {
      rowErrors.push({ rowNumber, field: "tripType", code: "missing_value" });
    }
    if (!rawVehicle) {
      rowErrors.push({ rowNumber, field: vehicleHeader as string, code: "missing_value" });
    }
    if (!rawBasePrice) {
      rowErrors.push({ rowNumber, field: "basePriceJpy", code: "missing_value" });
    }
    if (!rawNightFee) {
      rowErrors.push({ rowNumber, field: "nightFeeJpy", code: "missing_value" });
    }
    if (!rawUrgentFee) {
      rowErrors.push({ rowNumber, field: "urgentFeeJpy", code: "missing_value" });
    }

    const tripType = normalizePricingTripType(rawTripType);
    if (rawTripType && !tripType) {
      rowErrors.push({
        rowNumber,
        field: "tripType",
        code: "invalid_trip_type",
        rawValue: rawTripType,
      });
    }

    const vehicle = rawVehicle ? resolveVehicleType(rawVehicle, vehicles) : null;
    if (rawVehicle && !vehicle) {
      rowErrors.push({
        rowNumber,
        field: vehicleHeader as string,
        code: "unknown_vehicle_type",
        rawValue: rawVehicle,
      });
    }

    const basePriceJpy = parseIntegerPrice(rawBasePrice);
    if (rawBasePrice && basePriceJpy === null) {
      rowErrors.push({
        rowNumber,
        field: "basePriceJpy",
        code: "invalid_price",
        rawValue: rawBasePrice,
      });
    }

    const nightFeeJpy = parseIntegerPrice(rawNightFee);
    if (rawNightFee && nightFeeJpy === null) {
      rowErrors.push({
        rowNumber,
        field: "nightFeeJpy",
        code: "invalid_price",
        rawValue: rawNightFee,
      });
    }

    const urgentFeeJpy = parseIntegerPrice(rawUrgentFee);
    if (rawUrgentFee && urgentFeeJpy === null) {
      rowErrors.push({
        rowNumber,
        field: "urgentFeeJpy",
        code: "invalid_price",
        rawValue: rawUrgentFee,
      });
    }

    if (rowErrors.length > 0 || !tripType || !vehicle || basePriceJpy === null || nightFeeJpy === null || urgentFeeJpy === null) {
      errors.push(...rowErrors);
      return;
    }

    const fromArea = normalizePricingRouteValue(rawFromArea);
    const toArea = normalizePricingRouteValue(rawToArea);
    const key = buildPricingRuleKey(fromArea, toArea, tripType, vehicle.id);

    if (seenKeys.has(key)) {
      errors.push({
        rowNumber,
        field: "route",
        code: "duplicate_in_file",
      });
      return;
    }

    seenKeys.add(key);

    const action: PricingImportAction = existingRuleKeys.has(key) ? "update" : "create";
    const notes: string[] = [];
    if (rawFromArea && !isKnownPricingLocationInput(rawFromArea)) {
      notes.push(`from:${fromArea}`);
    }
    if (rawToArea && !isKnownPricingLocationInput(rawToArea)) {
      notes.push(`to:${toArea}`);
    }

    if (action === "create") {
      createCount += 1;
    } else {
      updateCount += 1;
    }

    rows.push({
      rowNumber,
      rawFromArea,
      rawToArea,
      fromArea,
      toArea,
      tripType,
      vehicleTypeId: vehicle.id,
      vehicleTypeName: vehicle.name,
      basePriceJpy,
      nightFeeJpy,
      urgentFeeJpy,
      action,
      notes,
    });
  });

  return {
    rows,
    errors,
    summary: {
      totalRows: dataRows.length,
      validRows: rows.length,
      errorRows: new Set(errors.map((error) => error.rowNumber)).size,
      createCount,
      updateCount,
    },
  };
}
