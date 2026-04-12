"use client";
/* eslint-disable react-hooks/exhaustive-deps */

import { Home, BookOpen, Users, FileText, Library, LogOut, ShieldAlert, UserCog } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { User } from "@/lib/types";
import { getSession, clearSession } from "@/lib/auth";

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
    const user = getSession();
    if (!user) {
      router.push("/");
      return;
    }
    
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
    clearSession(); // clears both localStorage and sessionStorage
    router.push("/");
  };

  return (
    <div className="flex min-h-screen bg-slate-50 relative print:bg-white">
      {/* Desktop Sidebar (Left) */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-100 z-50 sticky top-0 h-screen print:hidden shadow-[4px_0_10px_rgba(0,0,0,0.03)]">
        <div className="p-6 border-b border-slate-50 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-100">
            <span className="text-white font-black text-sm tracking-tight">AS</span>
          </div>
          <div>
            <p className="text-sm font-black text-slate-800 leading-none">AMAN STORE</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Admin Portal</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1.5 mt-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700 shadow-sm"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                }`}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} className={isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"} />
                <span className={`text-sm font-bold ${isActive ? "text-indigo-700" : "text-slate-600"}`}>{item.name}</span>
                {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-50 mb-2">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-all font-bold text-sm"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen w-full">
        {/* Mobile Top Header (Header text only on desktop, full branding on mobile) */}
        <header className="bg-white border-b border-slate-100 px-5 h-16 flex justify-between items-center sticky top-0 z-40 print:hidden shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="flex md:hidden items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
              <span className="text-white font-black text-xs tracking-tight">AS</span>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 leading-none uppercase tracking-tight">AMAN STORE</p>
            </div>
          </div>
          
          <div className="hidden md:block">
            <h2 className="text-sm font-extrabold text-slate-700 uppercase tracking-widest flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Main Dashboard
            </h2>
          </div>

          <div className="flex items-center gap-4">
             <div className="hidden sm:flex flex-col items-end mr-2">
                <span className="text-xs font-bold text-slate-800">{currentUser.name}</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase">{currentUser.role}</span>
             </div>
             <button
                onClick={handleLogout}
                className="flex md:hidden items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-red-500"
              >
                <LogOut size={16} />
              </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto print:overflow-visible pb-24 md:pb-8">
          {children}
        </main>

        {/* Mobile Bottom Navigation (Hidden on Tablet/Desktop) */}
        <nav className="md:hidden fixed bottom-6 left-5 right-5 bg-white/80 backdrop-blur-md border border-slate-100 p-2 rounded-2xl z-50 print:hidden shadow-[0_10px_25px_rgba(0,0,0,0.1)] transition-transform">
          <div className="flex justify-around items-center h-14 mx-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center justify-center gap-1 flex-1 h-full rounded-xl transition-all ${
                    isActive ? "text-indigo-600" : "text-slate-400"
                  }`}
                >
                  <div className={`p-2 rounded-xl transition-all ${isActive ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100 -translate-y-1" : ""}`}>
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  {!isActive && <span className="text-[9px] font-black uppercase tracking-tight">{item.name}</span>}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
