import Link from "next/link";
import { getT } from "@/lib/i18n";

const SUPPORT_EMAIL = "support@xioohtravel.com";
const SUPPORT_PHONE = "+86-15058024190";
const WHATSAPP_URL = "https://wa.me/8615058024190";

type FooterLink = {
  href: string;
  label: string;
  external?: boolean;
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
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-white transition hover:text-[#cfcfcf]"
              >
                {link.label}
              </a>
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
  const year = 2026;
  const contactLinks: FooterLink[] = [
    { href: WHATSAPP_URL, label: t("footer.whatsapp"), external: true },
    { href: `mailto:${SUPPORT_EMAIL}`, label: t("footer.email"), external: true },
    { href: "/orders", label: t("footer.myOrders") },
  ];
  const navigateLinks: FooterLink[] = [
    { href: "/fleet", label: t("footer.vehicleGuide") },
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
            <div className="space-y-2 text-sm font-semibold leading-6 text-[#9b9b9b]">
              <p>
                © {year} <span className="text-white">{t("brand.name")}</span>
              </p>
              <p>{t("footer.serviceArea")}</p>
              <a href={`mailto:${SUPPORT_EMAIL}`} className="block transition hover:text-white">
                {SUPPORT_EMAIL}
              </a>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="block transition hover:text-white"
              >
                {SUPPORT_PHONE}
              </a>
            </div>
          </div>
        </div>
      </div>
      <div className="h-16 md:hidden" aria-hidden="true" />
    </footer>
  );
}
