"use client";

import { usePathname } from "next/navigation";
import { AuthLink } from "@/components/AuthLink";
import { useSession } from "@/hooks/useSession";

export function MobileNav({
  labels
}: {
  labels: {
    home: string;
    orders: string;
    contact: string;
    login: string;
    logout: string;
  };
}) {
  const pathname = usePathname();
  const { user, loading } = useSession();

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        window.location.reload();
      }
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const navItems = [
    {
      href: "/",
      label: labels.home,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    {
      href: "/orders",
      label: labels.orders,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      )
    },
    {
      href: "/contact",
      label: labels.contact,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      )
    }
  ];

  const accountIcon = (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-lg border-t border-slate-200 pb-safe">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <AuthLink
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
                isActive ? "text-brand-600" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {item.icon}
              <span className="text-[10px] font-medium uppercase tracking-wider">{item.label}</span>
            </AuthLink>
          );
        })}

        {!loading && (
          user ? (
            <button
              onClick={handleLogout}
              className="flex flex-col items-center justify-center w-full h-full gap-1 text-slate-500 hover:text-slate-900 transition-colors"
            >
              {accountIcon}
              <span className="text-[10px] font-medium uppercase tracking-wider">{labels.logout}</span>
            </button>
          ) : (
            <AuthLink
              href="/login"
              className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
                pathname === "/login" ? "text-brand-600" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {accountIcon}
              <span className="text-[10px] font-medium uppercase tracking-wider">{labels.login}</span>
            </AuthLink>
          )
        )}
      </div>
    </div>
  );
}
