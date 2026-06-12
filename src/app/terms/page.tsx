import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return locale === "zh"
    ? { title: "服务条款 - XioohTravel", description: "使用 XioohTravel 接送服务前请阅读本服务条款。" }
    : { title: "Terms of Service - XioohTravel", description: "Please read these terms before using XioohTravel airport transfer services." };
}

type Section = { title: string; paragraphs: string[] };

const CONTENT: Record<"zh" | "en", { title: string; updated: string; sections: Section[] }> = {
  zh: {
    title: "服务条款",
    updated: "最后更新：2026 年 6 月",
    sections: [
      {
        title: "1. 服务内容",
        paragraphs: [
          "XioohTravel 提供日本地区（东京、京都、大阪等）的机场接送与点对点包车服务。下单时显示的价格为锁定价格，除人工调整外不会变动。",
        ],
      },
      {
        title: "2. 预订与付款",
        paragraphs: [
          "订单须至少提前 12 小时预订；距用车不足 24 小时的订单视为加急订单，可能收取加急费。",
          "全部款项通过 Stripe 以日元（JPY）结算。订单在付款成功后方为有效，未付款订单的支付链接在约 35 分钟后失效，可在订单页重新发起支付。",
          "请确保航班号、上下车地址和联系方式准确无误；信息错误导致的服务失败由客户承担。",
        ],
      },
      {
        title: "3. 取消与退款",
        paragraphs: [
          "距用车时间超过 24 小时：可取消，退还全款（扣除 Stripe 实际支付手续费）。",
          "距用车时间不足 24 小时或加急订单：不支持自助取消；如有特殊情况请联系客服协商。",
          "退款将原路退回您的付款方式，到账时间以银行/卡组织为准（通常 5-10 个工作日）。",
        ],
      },
      {
        title: "4. 乘车须知",
        paragraphs: [
          "接机服务包含航班动态跟踪与合理等待时间；请在下单时填写正确航班号。",
          "乘客与行李数量不得超过所选车型的容量上限；儿童安全座椅需在下单时预订。",
          "如遇不可抗力（极端天气、交通管制等）导致服务无法履行，我们将协助改期或全额退款。",
        ],
      },
      {
        title: "5. 责任限制",
        paragraphs: [
          "我们对服务延误或未能履行的责任以订单实付金额为上限。本条款不影响适用法律赋予消费者的强制性权利。",
        ],
      },
      {
        title: "6. 联系方式",
        paragraphs: ["如有任何问题，请联系 support@xioohtravel.com 或通过页面底部的 WhatsApp 联系我们。"],
      },
    ],
  },
  en: {
    title: "Terms of Service",
    updated: "Last updated: June 2026",
    sections: [
      {
        title: "1. The Service",
        paragraphs: [
          "XioohTravel provides airport transfers and point-to-point private car services in Japan (Tokyo, Kyoto, Osaka and surrounding areas). The price shown at booking is locked and will not change except by agreed manual adjustment.",
        ],
      },
      {
        title: "2. Booking & Payment",
        paragraphs: [
          "Bookings must be made at least 12 hours before pickup; bookings within 24 hours of pickup are treated as urgent and may incur an urgent fee.",
          "All payments are settled in Japanese Yen (JPY) via Stripe. A booking is confirmed only after successful payment. Unpaid payment links expire after about 35 minutes; you can restart payment from the orders page.",
          "Please make sure your flight number, addresses and contact details are accurate; failures caused by incorrect information are the customer's responsibility.",
        ],
      },
      {
        title: "3. Cancellation & Refunds",
        paragraphs: [
          "More than 24 hours before pickup: cancellable with a full refund minus the actual Stripe processing fee.",
          "Within 24 hours of pickup, or urgent bookings: self-service cancellation is not available; please contact support for special circumstances.",
          "Refunds are returned to the original payment method; arrival time depends on your bank or card network (typically 5-10 business days).",
        ],
      },
      {
        title: "4. Ride Rules",
        paragraphs: [
          "Airport pickups include flight tracking and a reasonable waiting period; please provide the correct flight number when booking.",
          "Passengers and luggage must not exceed the capacity of the selected vehicle; child seats must be reserved at booking time.",
          "If force majeure (extreme weather, traffic control, etc.) prevents the service, we will help reschedule or issue a full refund.",
        ],
      },
      {
        title: "5. Limitation of Liability",
        paragraphs: [
          "Our liability for delays or failure to perform is limited to the amount actually paid for the booking. These terms do not affect mandatory consumer rights under applicable law.",
        ],
      },
      {
        title: "6. Contact",
        paragraphs: ["For any questions, contact support@xioohtravel.com or reach us via WhatsApp in the site footer."],
      },
    ],
  },
};

export default async function TermsPage() {
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
