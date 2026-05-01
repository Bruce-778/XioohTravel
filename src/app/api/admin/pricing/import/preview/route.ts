import { NextResponse } from "next/server";
import {
  buildPricingImportPreview,
  buildPricingRuleKey,
  type PricingImportPreviewError,
} from "@/lib/adminPricing";
import { requireAdmin } from "@/lib/adminAuth";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
};

function formatPreviewErrorReason(error: PricingImportPreviewError, t: (key: string) => string) {
  switch (error.code) {
    case "missing_column":
      return `${t("admin.importErrorMissingColumn")}: ${error.details ?? error.field}`;
    case "missing_value":
      return `${t("admin.importErrorMissingValue")}: ${error.field}`;
    case "invalid_trip_type":
      return `${t("admin.importErrorInvalidTripType")}: ${error.rawValue ?? error.field}`;
    case "invalid_price":
      return `${t("admin.importErrorInvalidPrice")}: ${error.field}`;
    case "unknown_vehicle_type":
      return `${t("admin.importErrorUnknownVehicleType")}: ${error.rawValue ?? error.field}`;
    case "duplicate_in_file":
      return t("admin.importErrorDuplicateInFile");
    default:
      return t("admin.loadFailed");
  }
}

function formatPreviewNotes(notes: string[], t: (key: string) => string) {
  return notes.map((note) => {
    const [field, value] = note.split(":");
    if (!field || !value) return note;
    const label = field === "from" ? t("admin.fromArea") : t("admin.toArea");
    return `${t("admin.importCustomLocationNote")}: ${label} ${value}`;
  });
}

export async function POST(req: Request) {
  const { t } = await getT();
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: t(auth.error) }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: t("admin.importFileRequired") }, { status: 400 });
    }

    const csvText = await file.text();
    if (!csvText.trim()) {
      return NextResponse.json({ error: t("admin.importFileRequired") }, { status: 400 });
    }

    const { rows: vehicleRows } = await db.query(
      "SELECT id, name, seats FROM vehicle_types ORDER BY is_bus ASC, is_luxury ASC, seats ASC"
    );
    const { rows: existingRuleRows } = await db.query(
      "SELECT from_area, to_area, trip_type, vehicle_type_id FROM pricing_rules"
    );

    const preview = buildPricingImportPreview({
      csvText,
      vehicles: vehicleRows,
      existingRuleKeys: new Set(
        existingRuleRows.map((row) =>
          buildPricingRuleKey(row.from_area, row.to_area, row.trip_type, row.vehicle_type_id)
        )
      ),
    });

    return NextResponse.json(
      {
        rows: preview.rows.map((row) => ({
          ...row,
          notes: formatPreviewNotes(row.notes, t),
        })),
        errors: preview.errors.map((error) => ({
          ...error,
          reason: formatPreviewErrorReason(error, t),
        })),
        summary: preview.summary,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error?.message ?? t("api.serverError") }, { status: 500 });
  }
}
