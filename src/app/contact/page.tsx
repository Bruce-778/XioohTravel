import { getT } from "@/lib/i18n";

export default async function ContactPage() {
  const { t } = await getT();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 py-16 sm:py-20 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">{t("contact.title")}</h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            {t("contact.subtitle")}
          </p>
        </div>

        <div className="max-w-4xl mx-auto card-elevated overflow-hidden animate-slide-up">
          <div className="grid lg:grid-cols-2">
            <div className="p-8 sm:p-12 bg-slate-900 text-white">
              <h2 className="text-2xl font-bold mb-6">{t("home.chip.support")}</h2>
              
              <div className="space-y-8">
                <div className="flex items-start gap-5">
                  <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/10">
                    <svg className="w-6 h-6 text-brand-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8.228 9c.549 0 1.163.368 1.325.942l.493 1.746c.115.405-.102.834-.51 1.012l-.994.43c-.413.179-.588.655-.38 1.047 1.254 2.373 3.195 4.314 5.568 5.568.392.208.868.033 1.047-.38l.43-.994c.178-.408.607-.625 1.012-.51l1.746.493c.574.162.942.776.942 1.325V21c0 .552-.448 1-1 1C9.395 22 2 14.605 2 5.385c0-.552.448-1 1-1h3.228z"/>
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-400 mb-1">{t("contact.whatsapp")}</div>
                    <div className="text-xl font-bold tracking-tight">+86-15058024190</div>
                  </div>
                </div>

                <div className="flex items-start gap-5">
                  <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/10">
                    <svg className="w-6 h-6 text-brand-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-400 mb-1">{t("contact.email")}</div>
                    <div className="text-xl font-bold tracking-tight">support@xioohtravel.com</div>
                  </div>
                </div>
              </div>

              <div className="mt-16 p-6 rounded-2xl bg-white/5 border border-white/10">
                <div className="text-sm text-slate-400 leading-relaxed italic">
                  {t("footer.ruleText")}
                </div>
              </div>
            </div>

            <div className="p-8 sm:p-12 bg-white">
              <div className="flex flex-col h-full justify-between gap-8">
                <div className="flex-1 flex flex-col items-center justify-center p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:border-brand-200 hover:bg-brand-50/30 transition-all duration-300 group">
                  <div className="w-20 h-20 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-6 group-hover:bg-emerald-500 group-hover:text-white transition-colors shadow-sm">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <div className="text-2xl font-bold text-slate-900 mb-2">WhatsApp</div>
                  <div className="text-slate-500 font-medium">+86-15058024190</div>
                  <a 
                    href="https://wa.me/8615058024190" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="mt-6 px-8 py-3 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-colors shadow-md hover:shadow-lg active:scale-95"
                  >
                    Chat Now
                  </a>
                </div>

                <div className="p-6 rounded-3xl bg-brand-50 border border-brand-100 flex items-center gap-4 shadow-sm">
                  <div className="w-12 h-12 rounded-xl bg-brand-500 text-white flex items-center justify-center shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-bold text-brand-900">{t("contact.speed")}</div>
                    <div className="text-sm text-brand-700">{t("contact.speedDesc")}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
