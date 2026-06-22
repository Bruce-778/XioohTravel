import Script from "next/script";

function normalizeGtmId(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed || !/^GTM-[A-Z0-9]+$/i.test(trimmed)) {
    return null;
  }
  return trimmed.toUpperCase();
}

export function GoogleTagManager({ gtmId }: { gtmId: string | undefined }) {
  const normalizedGtmId = normalizeGtmId(gtmId);
  if (!normalizedGtmId) return null;

  return (
    <Script
      id="google-tag-manager"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','${normalizedGtmId}');
        `,
      }}
    />
  );
}

export function GoogleTagManagerNoScript({ gtmId }: { gtmId: string | undefined }) {
  const normalizedGtmId = normalizeGtmId(gtmId);
  if (!normalizedGtmId) return null;

  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${normalizedGtmId}`}
        height="0"
        width="0"
        className="hidden"
        title="Google Tag Manager"
      />
    </noscript>
  );
}
