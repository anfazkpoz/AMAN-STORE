"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, Phone, LogOut, CheckCircle2, History, Banknote, Download, X } from "lucide-react";
import { useAccounting } from "@/lib/AccountingContext";
import { User as UserType } from "@/lib/types";
import { formatDate } from "@/lib/formatDate";
import { getSession, clearSession } from "@/lib/auth";

// Type for the browser's beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserType | null>(null);

  // PWA Install state
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installBannerVisible, setInstallBannerVisible] = useState(false);

  // Push notification state
  const [pushSupported, setPushSupported] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>("default");

  const { debtors, accounts, journalEntries } = useAccounting();

  // Capture the install prompt before it fires
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setInstallBannerVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    // Use the persistent session helper (falls back to sessionStorage)
    const u = getSession();
    if (u) {
      if (u.role !== "Student") {
        router.push("/dashboard");
        return;
      }
      setUser(u);
    } else {
      router.push("/");
    }
  }, [router]);

  // Request push permission and subscribe once we have the user
  useEffect(() => {
    if (!user) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    setPushSupported(true);
    setPushPermission(Notification.permission);

    // Only auto-request if still default (not yet asked)
    if (Notification.permission === "default") {
      Notification.requestPermission().then((perm) => {
        setPushPermission(perm);
        if (perm === "granted") subscribePush(user.id);
      });
    } else if (Notification.permission === "granted") {
      subscribePush(user.id);
    }
  }, [user]);

  async function subscribePush(userId: string) {
    try {
      const reg = await navigator.serviceWorker.ready;
      // Convert base64 VAPID public key to Uint8Array
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
      const keyBytes = urlBase64ToUint8Array(vapidKey);

      const existing = await reg.pushManager.getSubscription();
      const subscription = existing ?? await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey,
      });

      // Save to DB
      await fetch("/api/push-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, subscription: subscription.toJSON() }),
      });
    } catch (err) {
      console.error("[Push] Subscribe failed:", err);
    }
  }

  function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(base64);
    const arr = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    return arr;
  }

  const handleLogout = () => {
    clearSession();
    router.push("/");
  };

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
      setInstallBannerVisible(false);
    }
    setInstallPrompt(null);
  };

  if (!user) return null;

  // Resolve Student's Debtor profile and specific Ledger Account
  const studentDebtor = debtors.find((d) => d.id === user.debtorId);
  const studentAccount = accounts.find((a) => a.id === studentDebtor?.accountId);

  // Calculate specific entries for this student
  const studentTransactions = journalEntries.filter((entry) =>
    entry.lines.some((line) => line.accountId === studentAccount?.id)
  );

  const currentBalance = studentAccount?.balance || 0;

  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-20 sm:p-8">
      <div className="max-w-xl mx-auto space-y-6 mt-4">

        {/* ⚠️ Pending Balance Alert Banner */}
        {currentBalance > 0 && (
          <div className="relative overflow-hidden rounded-2xl border border-red-300 bg-red-600 shadow-lg shadow-red-500/30">
            {/* Animated shimmer strip */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_2.5s_infinite] pointer-events-none" />
            <div className="flex items-start gap-3 p-4">
              <span className="text-2xl leading-none shrink-0 mt-0.5" aria-hidden="true">⚠️</span>
              <p className="text-sm font-bold text-white leading-snug tracking-wide">
                You have a pending balance of{" "}
                <span className="text-yellow-300 text-base">
                  ₹{Math.abs(currentBalance).toLocaleString()}
                </span>
                . Please clear it immediately.
              </p>
            </div>
          </div>
        )}

        {/* PWA Install Banner */}
        {installBannerVisible && !isInstalled && (
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-4 flex items-center gap-3 shadow-lg text-white animate-in slide-in-from-top-4 fade-in duration-500">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0 backdrop-blur-sm">
              <Download size={20} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm">Install Aman Store</p>
              <p className="text-indigo-100 text-xs">Add to your home screen for quick access</p>
            </div>
            <button
              onClick={handleInstall}
              className="shrink-0 bg-white text-indigo-600 font-bold text-xs px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors active:scale-95"
            >
              Install
            </button>
            <button
              onClick={() => setInstallBannerVisible(false)}
              className="shrink-0 text-white/60 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Header & Logout */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-800">Student Portal</h1>
            <p className="text-sm font-medium text-slate-500">{user.batch} Batch</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Install App button (always visible if not installed and prompt available) */}
            {installPrompt && !isInstalled && (
              <button
                id="pwa-install-btn"
                onClick={handleInstall}
                title="Install App"
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-full transition-colors border border-indigo-200 active:scale-95"
              >
                <Download size={14} />
                <span className="hidden sm:inline">Install App</span>
              </button>
            )}
            {isInstalled && (
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-2 rounded-full border border-emerald-200">
                <CheckCircle2 size={14} />
                <span className="hidden sm:inline">Installed</span>
              </span>
            )}
            <button
              onClick={handleLogout}
              className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors flex items-center gap-2"
            >
              <LogOut size={18} />
              <span className="text-xs font-bold hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>

        {/* Profile Details */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 shadow-inner">
            <User size={30} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">{user.name}</h2>
            <div className="flex items-center gap-1.5 text-slate-500 font-medium text-sm mt-1">
              <Phone size={14} />
              <span>{user.phone}</span>
            </div>
          </div>
        </div>

        {/* Financial Overview Card */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl shadow-xl p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <Banknote size={120} className="-rotate-12" />
          </div>

          <div className="relative z-10">
            <p className="text-indigo-100 font-medium tracking-wide uppercase text-xs mb-1">Current Balance</p>
            <h3 className="text-5xl font-bold tracking-tight mb-2 flex items-baseline gap-2">
              ₹{Math.abs(currentBalance).toLocaleString()}
              <span className="text-lg font-medium text-indigo-200 uppercase">
                {currentBalance > 0 ? "Due (Dr)" : currentBalance < 0 ? "Advance (Cr)" : "Settled"}
              </span>
            </h3>
            <p className="text-sm text-indigo-100/80 font-medium">
              {currentBalance > 0
                ? "This is the amount you currently owe."
                : currentBalance < 0
                ? "You have this amount in advance."
                : "Your account is fully settled!"}
            </p>
          </div>
        </div>

        {/* Transaction History Statement */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-xl">
              <History size={20} className="text-indigo-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Your Statement</h3>
          </div>

          {studentTransactions.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm font-medium">
              No transactions recorded in your statement yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {studentTransactions.map((entry) => {
                const line = entry.lines.find((l) => l.accountId === studentAccount?.id);
                if (!line) return null;

                const isCredit = line.type === "Credit"; // credit means they paid (reduction of debt)

                return (
                  <div key={entry.id} className="p-5 hover:bg-slate-50 transition-colors flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{entry.narration || "Entry"}</p>
                      <p className="text-xs text-slate-400 mt-1">{formatDate(entry.date)}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${isCredit ? "text-emerald-500" : "text-red-500"}`}>
                        {isCredit ? "-" : "+"} ₹{line.amount.toLocaleString()}
                      </p>
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mt-1">
                        {isCredit ? "Payment / Credit" : "Charge / Debit"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
