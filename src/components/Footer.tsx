import Link from "next/link";
import { getT } from "@/lib/i18n";
import { TrackedAnchor } from "@/components/TrackedActions";

const SUPPORT_EMAIL = "support@xioohtravel.com";
const SUPPORT_PHONE = "+86-15058024190";
const WHATSAPP_URL = "https://wa.me/8615058024190";

type FooterLink = {
  href: string;
  label: string;
  external?: boolean;
  trackingEvent?: string;
  trackingSource?: string;
};

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: FooterLink[];
}) {
  return (
    <div>
      <h2 className="font-serif text-xl font-bold tracking-tight text-[#9b9b9b]">
        {title}
      </h2>
      <ul className="mt-5 space-y-3.5">
        {links.map((link) => (
          <li key={`${link.href}-${link.label}`}>
            {link.external ? (
              <TrackedAnchor
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                eventName={link.trackingEvent ?? "external_footer_click"}
                eventPayload={{
                  contact_channel: link.href.startsWith("mailto:") ? "email" : "whatsapp",
                  source_area: link.trackingSource ?? "footer_column",
                }}
                className="text-sm font-semibold text-white transition hover:text-[#cfcfcf]"
              >
                {link.label}
              </TrackedAnchor>
            ) : (
              <Link
                href={link.href}
                className="text-sm font-semibold text-white transition hover:text-[#cfcfcf]"
              >
                {link.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ServiceList({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <div>
      <h2 className="font-serif text-xl font-bold tracking-tight text-[#9b9b9b]">
        {title}
      </h2>
      <ul className="mt-5 space-y-3.5">
        {items.map((item) => (
          <li key={item} className="text-sm font-semibold text-white">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export async function Footer() {
  const { t } = await getT();
  const year = new Date().getFullYear();
  const contactLinks: FooterLink[] = [
    {
      href: WHATSAPP_URL,
      label: t("footer.whatsapp"),
      external: true,
      trackingEvent: "contact_whatsapp_click",
    },
    {
      href: `mailto:${SUPPORT_EMAIL}`,
      label: t("footer.email"),
      external: true,
      trackingEvent: "contact_email_click",
    },
    { href: "/orders", label: t("footer.myOrders") },
    { href: "/about", label: t("footer.about") },
  ];
  const navigateLinks: FooterLink[] = [
    { href: "/vehicle-guide", label: t("footer.vehicleGuide") },
    { href: "/luggage-guide", label: t("footer.luggageGuide") },
    { href: "/drivers", label: t("footer.driverGuide") },
    { href: "/#faq", label: t("footer.faq") },
  ];
  const serviceItems = [
    t("footer.fixedPrice"),
    t("footer.vehicleOptions"),
    t("footer.driverCare"),
    t("footer.support"),
  ];

  return (
    <footer className="bg-[#303030] text-white">
      <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[0.9fr_0.9fr_1fr_1fr] lg:gap-10">
          <FooterColumn title={t("footer.contact")} links={contactLinks} />
          <FooterColumn title={t("footer.navigate")} links={navigateLinks} />
          <ServiceList title={t("footer.service")} items={serviceItems} />

          <div>
            <h2 className="font-serif text-xl font-bold tracking-tight text-[#9b9b9b]">
              {t("brand.name")}
            </h2>
            <div className="mt-5 space-y-3.5 text-sm font-semibold leading-6 text-[#9b9b9b]">
              <p>{t("footer.serviceArea")}</p>
              <TrackedAnchor
                href={`mailto:${SUPPORT_EMAIL}`}
                eventName="contact_email_click"
                eventPayload={{ contact_channel: "email", source_area: "footer_brand" }}
                className="block transition hover:text-white"
              >
                {SUPPORT_EMAIL}
              </TrackedAnchor>
              <TrackedAnchor
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                eventName="contact_whatsapp_click"
                eventPayload={{ contact_channel: "whatsapp", source_area: "footer_brand" }}
                className="block transition hover:text-white"
              >
                {SUPPORT_PHONE}
              </TrackedAnchor>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-white/10 pt-5 text-sm font-semibold text-[#9b9b9b] sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} <span className="text-white">{t("brand.name")}</span>
          </p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="transition hover:text-white">
              {t("footer.privacy")}
            </Link>
            <Link href="/terms" className="transition hover:text-white">
              {t("footer.terms")}
            </Link>
          </div>
        </div>
      </div>
      <div className="h-16 md:hidden" aria-hidden="true" />
    </footer>
  );
}
