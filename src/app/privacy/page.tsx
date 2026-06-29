import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return locale === "zh"
    ? { title: "隐私政策 - XioohTravel", description: "了解 XioohTravel 如何收集、使用和保护您的个人信息。" }
    : { title: "Privacy Policy - XioohTravel", description: "Learn how XioohTravel collects, uses and protects your personal information." };
}

type Section = { title: string; paragraphs: string[] };

const CONTENT: Record<"zh" | "en", { title: string; updated: string; sections: Section[] }> = {
  zh: {
    title: "隐私政策",
    updated: "最后更新：2026 年 6 月",
    sections: [
      {
        title: "1. 我们收集的信息",
        paragraphs: [
          "当您预订接送服务时，我们收集完成服务所必需的信息：联系人姓名、电话、邮箱、航班号、上下车地址、乘车时间、乘客与行李信息。",
          "当您使用邮箱验证码登录时，我们记录您的邮箱地址以关联您的订单。",
          "我们使用 Cookie 保存您的语言、币种偏好和登录状态。若启用了 Google Tag Manager、Google Ads 或 Google Analytics，我们也会使用相关第三方技术衡量访问、广告转化和网站效果。",
        ],
      },
      {
        title: "2. 信息的使用",
        paragraphs: [
          "您的信息仅用于：履行接送服务（与司机共享必要的行程信息）、发送订单确认与退款通知邮件、处理付款与退款、以及客服支持。",
          "我们不会出售您的个人信息，也不会将其用于与服务无关的营销。",
        ],
      },
      {
        title: "3. 第三方服务",
        paragraphs: [
          "付款由 Stripe 处理，我们不存储您的银行卡信息；Stripe 的处理方式见其隐私政策。",
          "地址搜索由 Google Maps/Places 提供，您输入的搜索内容会发送给 Google。",
          "网站分析与广告转化衡量可能由 Google Tag Manager、Google Ads 或 Google Analytics 提供。您可以通过浏览器或设备设置限制 Cookie 和跟踪。",
          "交易邮件通过 Resend 发送。数据库托管于 Supabase。",
        ],
      },
      {
        title: "4. 数据保留与您的权利",
        paragraphs: [
          "订单数据为履行合同、税务与会计目的而保留。您可以联系我们查询、更正或删除您的个人信息（法律要求保留的除外）。",
          "如需行使上述权利，请联系 support@xioohtravel.com。",
        ],
      },
      {
        title: "5. 联系我们",
        paragraphs: [
          "如对本政策有任何疑问，请发送邮件至 support@xioohtravel.com，或通过网站底部的 WhatsApp 联系我们。",
        ],
      },
    ],
  },
  en: {
    title: "Privacy Policy",
    updated: "Last updated: June 2026",
    sections: [
      {
        title: "1. Information We Collect",
        paragraphs: [
          "When you book a transfer we collect what is necessary to deliver the service: contact name, phone, email, flight number, pickup/drop-off addresses, pickup time, passenger and luggage details.",
          "When you sign in with an email verification code, we record your email address to associate your bookings.",
          "We use cookies to remember your language, currency preference and login session. If Google Tag Manager, Google Ads, or Google Analytics is enabled, related third-party technologies may also be used to measure visits, ad conversions, and site performance.",
        ],
      },
      {
        title: "2. How We Use It",
        paragraphs: [
          "Your information is used only to: fulfil the transfer (sharing necessary trip details with the driver), send booking confirmations and refund notifications, process payments and refunds, and provide customer support.",
          "We never sell your personal information or use it for unrelated marketing.",
        ],
      },
      {
        title: "3. Third-Party Services",
        paragraphs: [
          "Payments are processed by Stripe; we never store your card details. See Stripe's privacy policy for how they handle data.",
          "Address search is powered by Google Maps/Places; your search input is sent to Google.",
          "Analytics and ad conversion measurement may be provided by Google Tag Manager, Google Ads, or Google Analytics. You can limit cookies and tracking through your browser or device settings.",
          "Transactional emails are delivered via Resend. Our database is hosted on Supabase.",
        ],
      },
      {
        title: "4. Retention & Your Rights",
        paragraphs: [
          "Booking records are retained for contract fulfilment, tax and accounting purposes. You may contact us to access, correct or delete your personal information (except where retention is legally required).",
          "To exercise these rights, contact support@xioohtravel.com.",
        ],
      },
      {
        title: "5. Contact",
        paragraphs: [
          "If you have any questions about this policy, email support@xioohtravel.com or reach us via WhatsApp in the site footer.",
        ],
      },
    ],
  },
};

export default async function PrivacyPage() {
  const locale = await getLocale();
  const content = CONTENT[locale === "zh" ? "zh" : "en"];

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">{content.title}</h1>
      <p className="mt-2 text-sm text-slate-500">{content.updated}</p>
      <div className="mt-8 space-y-8">
        {content.sections.map((section) => (
          <section key={section.title}>
            <h2 className="text-lg font-bold text-slate-900">{section.title}</h2>
            {section.paragraphs.map((paragraph, index) => (
              <p key={index} className="mt-2 text-sm leading-6 text-slate-600">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
