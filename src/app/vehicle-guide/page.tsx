import type { Metadata } from "next";
import { VehicleGuidePage } from "@/components/VehicleGuidePage";
import { getT } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("fleet.title"), description: t("fleet.subtitle") };
}

export default VehicleGuidePage;
