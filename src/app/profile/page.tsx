"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, Phone, LogOut, CheckCircle2, History, Banknote, Download, X, Smartphone, QrCode, ExternalLink } from "lucide-react";
import { useAccounting } from "@/lib/AccountingContext";
import { User as UserType } from "@/lib/types";
import { formatDate } from "@/lib/formatDate";
import { getSession, clearSession } from "@/lib/auth";
import { QRCodeSVG } from "qrcode.react";

// ── UPI config ─────────────────────────────────────────────────────────────────
// Replace the UPI ID below with your actual UPI ID before going live
const UPI_ID = "muhammedanfaz123-1@oksbi";
const PAYEE_NAME = "AMAN%20STORE";

function buildUpiUrl(amount: number): string {
  return `upi://pay?pa=${UPI_ID}&pn=${PAYEE_NAME}&am=${amount.toFixed(2)}&cu=INR`;
}

// GPay (Google Pay / Tez) deep-link — opens GPay directly, skipping the app picker
function buildGPayUrl(amount: number): string {
  return `tez://upi/pay?pa=${UPI_ID}&pn=${PAYEE_NAME}&am=${amount.toFixed(2)}&cu=INR&mc=0000`;
}

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

  // UPI payment state
  const [showQrSheet, setShowQrSheet] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [pendingPaymentUrl, setPendingPaymentUrl] = useState("");

  const { debtors, accounts, journalEntries } = useAccounting();

  // Detect mobile on mount
  useEffect(() => {
    setIsMobile(/Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent));
  }, []);

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
      // Convert base64 VAPID public key to Uint8Array (required by Chrome)
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        console.error("[Push] NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set.");
        return;
      }
      const keyBytes = urlBase64ToUint8Array(vapidKey);

      // Unsubscribe any stale subscription first to avoid key-mismatch errors
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        // Re-use if keys match, otherwise re-subscribe
        try {
          await fetch("/api/push-subscription", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, subscription: existing.toJSON() }),
          });
          return;
        } catch {
          await existing.unsubscribe();
        }
      }

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyBytes, // ✅ Must be Uint8Array, NOT the raw string
      });

      // Save to DB
      await fetch("/api/push-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, subscription: subscription.toJSON() }),
      });
      console.log("[Push] Subscribed successfully for", userId);
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
            {currentBalance === 0 ? (
              <h3 className="text-4xl sm:text-5xl font-bold tracking-tight mb-2 text-indigo-200">
                Settled
              </h3>
            ) : (
              <h3 className="text-4xl sm:text-5xl font-bold tracking-tight mb-2 flex items-center flex-wrap gap-3">
                <span>₹{Math.abs(currentBalance).toLocaleString()}</span>
                <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest ${currentBalance > 0 ? 'bg-red-500/20 text-red-100 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-100 border border-emerald-500/30'}`}>
                  {currentBalance > 0 ? "Debtor (Asset)" : "Creditor (Liability)"}
                </span>
              </h3>
            )}
            <p className="text-sm text-indigo-100/80 font-medium">
              {currentBalance > 0
                ? "This is the amount you currently owe."
                : currentBalance < 0
                ? "You have this amount in advance."
                : "Your account is fully settled!"}
            </p>
          </div>
        </div>

        {/* ── UPI Payment Section ─────────────────────────────────────────── */}
        {currentBalance > 0 && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-center gap-3">
              <div className="p-2 bg-emerald-50 rounded-xl">
                <QrCode size={20} className="text-emerald-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Pay Your Balance</h3>
                <p className="text-xs text-slate-500 font-medium">via GPay, PhonePe, Paytm or any UPI app</p>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Amount pill */}
              <div className="flex items-center justify-between bg-red-50 border border-red-100 rounded-2xl px-5 py-3.5">
                <span className="text-sm font-semibold text-red-700">Amount Due</span>
                <span className="text-2xl font-black text-red-600">₹{currentBalance.toLocaleString()}</span>
              </div>

              {/* Mobile Pay Now button — opens native UPI app */}
              {isMobile && (
                <button
                  onClick={() => {
                    setPendingPaymentUrl(buildUpiUrl(currentBalance));
                    setShowWarning(true);
                  }}
                  className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-base tracking-wide shadow-lg shadow-emerald-500/30 active:scale-[0.98] transition-all select-none"
                >
                  <Smartphone size={20} />
                  Pay ₹{currentBalance.toLocaleString()} via UPI
                  <ExternalLink size={16} className="opacity-70" />
                </button>
              )}

              {/* Desktop: always show QR; Mobile: toggle sheet */}
              {!isMobile ? (
                /* ── Desktop QR + GPay button ── */
                <div className="flex flex-col items-center gap-4 pt-2">
                  <div className="p-4 bg-white rounded-2xl border-2 border-slate-100 shadow-sm inline-block">
                    <QRCodeSVG
                      value={buildUpiUrl(currentBalance)}
                      size={200}
                      bgColor="#ffffff"
                      fgColor="#1e293b"
                      level="H"
                      includeMargin={false}
                    />
                  </div>
                  <p className="text-sm font-semibold text-slate-600 text-center">
                    Scan with any UPI app to pay{" "}
                    <span className="text-emerald-600 font-bold">₹{currentBalance.toLocaleString()}</span>
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium">Works with GPay · PhonePe · Paytm · BHIM</p>

                  {/* GPay Pay Now button — desktop */}
                  <button
                    onClick={() => {
                      setPendingPaymentUrl(buildGPayUrl(currentBalance));
                      setShowWarning(true);
                    }}
                    className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-2xl font-bold text-sm text-white tracking-wide shadow-lg active:scale-[0.98] transition-all select-none"
                    style={{ background: 'linear-gradient(135deg, #1a73e8 0%, #0d47a1 100%)', boxShadow: '0 4px 15px rgba(26,115,232,0.35)' }}
                  >
                    <svg width="20" height="20" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 2.9l5.7-5.7C34.5 6.6 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z" fill="#FFC107"/>
                      <path d="M6.3 14.7l6.6 4.8C14.6 15.9 19 13 24 13c3.1 0 5.8 1.1 8 2.9l5.7-5.7C34.5 6.6 29.5 4 24 4 16.3 4 9.7 8.4 6.3 14.7z" fill="#FF3D00"/>
                      <path d="M24 44c5.4 0 10.3-2.1 14-5.4l-6.5-5.5C29.5 35 26.9 36 24 36c-5.3 0-9.7-3.3-11.3-8H6.1C9.4 35.7 16.2 44 24 44z" fill="#4CAF50"/>
                      <path d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.5 5.5C41.8 35.2 44 30 44 24c0-1.3-.1-2.7-.4-3.9z" fill="#1976D2"/>
                    </svg>
                    Pay Now with GPay
                  </button>
                </div>
              ) : (
                /* ── Mobile: QR toggle button ── */
                <>
                  <button
                    onClick={() => setShowQrSheet(true)}
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border-2 border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-sm transition-all active:scale-[0.98]"
                  >
                    <QrCode size={16} />
                    Show QR Code Instead
                  </button>

                  {/* QR Bottom Sheet */}
                  {showQrSheet && (
                    <div className="fixed inset-0 z-[200] flex items-end justify-center" onClick={() => setShowQrSheet(false)}>
                      {/* Backdrop */}
                      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                      {/* Sheet */}
                      <div
                        className="relative w-full max-w-sm bg-white rounded-t-3xl p-6 pb-10 shadow-2xl animate-in slide-in-from-bottom-8 duration-300"
                        onClick={e => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-between mb-5">
                          <div>
                            <h4 className="font-bold text-slate-800 text-base">Scan to Pay</h4>
                            <p className="text-xs text-slate-500">Open camera or any UPI app</p>
                          </div>
                          <button
                            onClick={() => setShowQrSheet(false)}
                            className="p-2 rounded-full hover:bg-slate-100 text-slate-400"
                          >
                            <X size={18} />
                          </button>
                        </div>

                        <div className="flex flex-col items-center gap-4">
                          <div className="p-4 bg-white rounded-2xl border-2 border-slate-100 shadow-sm">
                            <QRCodeSVG
                              value={buildUpiUrl(currentBalance)}
                              size={220}
                              bgColor="#ffffff"
                              fgColor="#1e293b"
                              level="H"
                              includeMargin={false}
                            />
                          </div>
                          <p className="text-sm font-semibold text-slate-600 text-center">
                            Scan with any UPI app to pay{" "}
                            <span className="text-emerald-600 font-bold">₹{currentBalance.toLocaleString()}</span>
                          </p>
                          <p className="text-[11px] text-slate-400 font-medium">GPay · PhonePe · Paytm · BHIM</p>

                          {/* GPay Pay Now button — inside mobile QR sheet */}
                          <button
                            onClick={() => {
                              setPendingPaymentUrl(buildGPayUrl(currentBalance));
                              setShowWarning(true);
                            }}
                            className="flex items-center justify-center gap-2.5 w-full py-4 rounded-2xl font-bold text-base text-white tracking-wide shadow-lg active:scale-[0.98] transition-all select-none"
                            style={{ background: 'linear-gradient(135deg, #1a73e8 0%, #0d47a1 100%)', boxShadow: '0 4px 18px rgba(26,115,232,0.4)' }}
                          >
                            <svg width="22" height="22" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 2.9l5.7-5.7C34.5 6.6 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z" fill="#FFC107"/>
                              <path d="M6.3 14.7l6.6 4.8C14.6 15.9 19 13 24 13c3.1 0 5.8 1.1 8 2.9l5.7-5.7C34.5 6.6 29.5 4 24 4 16.3 4 9.7 8.4 6.3 14.7z" fill="#FF3D00"/>
                              <path d="M24 44c5.4 0 10.3-2.1 14-5.4l-6.5-5.5C29.5 35 26.9 36 24 36c-5.3 0-9.7-3.3-11.3-8H6.1C9.4 35.7 16.2 44 24 44z" fill="#4CAF50"/>
                              <path d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.5 5.5C41.8 35.2 44 30 44 24c0-1.3-.1-2.7-.4-3.9z" fill="#1976D2"/>
                            </svg>
                            Pay Now with GPay
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

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

      {showWarning && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 mb-4 mx-auto">
                <span className="text-2xl">⚠️</span>
              </div>
              <h3 className="text-xl font-bold text-center text-slate-800 mb-3">Important Instruction</h3>
              <p className="text-slate-600 text-center font-medium leading-relaxed mb-8">
                After completing your payment, please take a <strong className="text-slate-800">screenshot of the success screen</strong> and send it to the Admin via WhatsApp.
              </p>
              
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    setShowWarning(false);
                    if (pendingPaymentUrl) {
                      window.location.href = pendingPaymentUrl;
                    }
                  }}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold tracking-wide transition-all shadow-md active:scale-95"
                >
                  Okay, Proceed to Pay
                </button>
                <button
                  onClick={() => setShowWarning(false)}
                  className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold tracking-wide transition-all active:scale-95"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
