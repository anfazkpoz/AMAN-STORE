"use client";
/* eslint-disable react-hooks/exhaustive-deps */

import { Home, BookOpen, Users, FileText, Library, LogOut, ShieldAlert, UserCog } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { User } from "@/lib/types";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const userStr = sessionStorage.getItem("aman_store_current_user");
    if (!userStr) {
      router.push("/");
      return;
    }
    
    const user: User = JSON.parse(userStr);
    setCurrentUser(user);

    if (user.role === "Student") {
      router.push("/profile");
      return;
    }

    if (user.role === "Staff" && pathname !== "/dashboard/debtors") {
      router.replace("/dashboard/debtors");
      return;
    }

    setIsAuthorized(true);
  }, [pathname, router]);

  if (!isAuthorized || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <ShieldAlert size={40} className="animate-pulse" />
          <p className="text-sm font-semibold tracking-wide">Verifying Access…</p>
        </div>
      </div>
    );
  }

  let navItems = [
    { name: "Home", href: "/dashboard", icon: Home },
    { name: "Journal", href: "/dashboard/journal", icon: BookOpen },
    { name: "Ledger", href: "/dashboard/ledger", icon: Library },
    { name: "Debtors", href: "/dashboard/debtors", icon: Users },
    { name: "Reports", href: "/dashboard/reports", icon: FileText },
  ];

  if (currentUser.role === "Staff") {
    navItems = [{ name: "Debtors", href: "/dashboard/debtors", icon: Users }];
  } else if (currentUser.role === "Admin") {
    navItems.push({ name: "Staff", href: "/dashboard/staff", icon: UserCog });
  }

  const handleLogout = () => {
    sessionStorage.removeItem("aman_store_current_user");
    router.push("/");
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-20 relative print:bg-white print:pb-0">

        {/* Top Header */}
        <header className="bg-white border-b border-slate-100 px-5 py-3 flex justify-between items-center sticky top-0 z-40 print:hidden shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
              <span className="text-white font-black text-xs tracking-tight">AS</span>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 leading-none">AMAN STORE</p>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
                {currentUser.role} Portal
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors"
          >
            <LogOut size={15} />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </header>

        <main className="flex-1 overflow-y-auto print:overflow-visible">
          {children}
        </main>

        {/* Bottom Navigation */}
        <nav className="fixed bottom-0 w-full bg-white border-t border-slate-100 z-50 print:hidden shadow-[0_-2px_8px_rgba(0,0,0,0.06)]">
          <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center justify-center gap-1 flex-1 h-full rounded-xl mx-0.5 transition-all ${
                    isActive
                      ? "text-indigo-600"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <div className={`p-1.5 rounded-lg transition-all ${isActive ? "bg-indigo-50" : ""}`}>
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 1.75} />
                  </div>
                  <span className={`text-[10px] font-bold tracking-wide leading-none ${isActive ? "text-indigo-600" : "text-slate-400"}`}>
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
    </div>
  );
}
