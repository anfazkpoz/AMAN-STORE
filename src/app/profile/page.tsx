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
const UPI_ID = "muhammedanfaz123_1@oksbi";

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
  const studentBalance = currentBalance;
  
  let upiUrl = "";
  try {
    upiUrl = `upi://pay?pa=muhammedanfaz123-1@oksbi&pn=AMAN%20STORE&am=${Number(studentBalance).toFixed(2)}&cu=INR&mc=8299&tn=store%20cash`;
  } catch (err) {
    console.error("Failed to generate UPI URL", err);
  }

  return (
    <div className="min-h-screen bg-transparent p-4 pb-20 sm:p-8">
      <div className="max-w-xl mx-auto space-y-5 mt-4">

        {/* ⚠️ Pending Balance Alert Banner */}
        {currentBalance > 0 && (
          <div className="relative overflow-hidden rounded-2xl border border-rose-200 bg-rose-50 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-start gap-3 p-4">
              <span className="text-xl leading-none shrink-0" aria-hidden="true">⚠️</span>
              <p className="text-sm font-semibold text-rose-800 leading-snug">
                You have a pending balance of{" "}
                <span className="font-black text-rose-900">
                  ₹{Math.abs(currentBalance).toLocaleString()}
                </span>
                . Please clear it immediately.
              </p>
            </div>
          </div>
        )}

        {/* PWA Install Banner */}
        {installBannerVisible && !isInstalled && (
          <div className="bg-slate-900 rounded-2xl p-4 flex items-center gap-3 shadow-lg text-white animate-in slide-in-from-top-4 fade-in duration-500">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
              <Download size={20} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm">Install Aman Store</p>
              <p className="text-slate-400 text-xs">Add to your home screen for quick access</p>
            </div>
            <button
              onClick={handleInstall}
              className="shrink-0 bg-white text-slate-900 font-bold text-xs px-4 py-2 rounded-xl hover:bg-slate-100 transition-colors active:scale-95"
            >
              Install
            </button>
            <button
              onClick={() => setInstallBannerVisible(false)}
              className="shrink-0 text-slate-500 hover:text-white transition-colors p-1"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Header & Logout */}
        <div className="flex justify-between items-center mb-6 pt-2 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-75 fill-mode-both">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-800">Student Portal</h1>
            <p className="text-xs font-bold tracking-widest uppercase text-slate-400 mt-0.5">{user.batch} Batch</p>
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
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-100 fill-mode-both">
          <div className="w-14 h-14 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shrink-0">
            <User size={24} />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-800">{user.name}</h2>
            <div className="flex items-center gap-1.5 text-slate-500 font-medium text-xs mt-0.5">
              <Phone size={12} />
              <span>{user.phone}</span>
            </div>
          </div>
        </div>

        {/* Financial Overview Card */}
        <div className="bg-gradient-to-r from-slate-800 to-indigo-900 rounded-3xl shadow-xl shadow-indigo-900/20 p-8 text-white relative overflow-hidden animate-[slideInLeft_0.6s_ease-out_forwards] delay-150 fill-mode-both transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-900/40">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Banknote size={160} className="-rotate-12 transform translate-x-4 -translate-y-4" />
          </div>

          <div className="relative z-10 flex flex-col items-center text-center">
            <p className="text-slate-400 font-bold tracking-widest uppercase text-[10px] mb-2">Total Amount Due</p>
            {currentBalance === 0 ? (
              <h3 className="text-5xl font-black tracking-tighter mb-1 text-slate-300">
                ₹0
              </h3>
            ) : (
              <h3 className={`text-6xl font-black tracking-tighter mb-1 ${currentBalance > 0 ? 'text-white' : 'text-emerald-400'}`}>
                ₹{Math.abs(currentBalance).toLocaleString()}
              </h3>
            )}
            <p className="text-xs text-slate-400 font-medium mt-3 px-6">
              {currentBalance > 0
                ? "This is the current outstanding amount."
                : currentBalance < 0
                ? "You have this amount in advance."
                : "Your account is fully settled!"}
            </p>
          </div>
        </div>

        {/* ── UPI Payment Section ─────────────────────────────────────────── */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500 delay-200 fill-mode-both mb-8">
          <div className="px-6 pt-6 pb-2 flex flex-col items-center text-center">
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl mb-3">
              <QrCode size={20} className="text-slate-700" />
            </div>
            <h3 className="text-lg font-black text-slate-800">Pay Instantly</h3>
            <p className="text-xs text-slate-500 font-medium mt-1">Supports GPay, PhonePe, Paytm, and all UPI apps.</p>
          </div>

          <div className="p-6">
            {studentBalance <= 0 ? (
              <div className="text-center p-8 bg-emerald-50 rounded-2xl border border-emerald-100 mb-2">
                <p className="text-emerald-700 font-bold text-lg">You have no pending dues.</p>
                <p className="text-emerald-600 text-sm mt-1">Your account is fully settled!</p>
              </div>
            ) : upiUrl ? (
              <div className="flex flex-col items-center">
                {/* Mobile View */}
                <a
                  href={upiUrl}
                  onClick={() => { setPendingPaymentUrl(upiUrl); setTimeout(() => setShowWarning(true), 500); }}
                  className="block md:hidden w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-center font-bold text-base tracking-wide shadow-lg shadow-indigo-500/40 hover:shadow-indigo-500/60 active:scale-[0.98] transition-all duration-300 select-none animate-in"
                >
                  Pay via GPay / UPI
                </a>

                {/* Desktop View */}
                <div className="hidden md:flex flex-col items-center gap-4 pt-2">
                  <div className="p-4 bg-white rounded-2xl border-2 border-slate-100 shadow-sm inline-block">
                    <QRCodeSVG
                      value={upiUrl}
                      size={200}
                      bgColor="#ffffff"
                      fgColor="#1e293b"
                      level="H"
                      includeMargin={false}
                    />
                  </div>
                  <p className="text-sm font-semibold text-slate-600 text-center">
                    Scan with any UPI app to pay{" "}
                    <span className="text-emerald-600 font-bold">₹{Number(studentBalance).toLocaleString()}</span>
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium pb-2">Supports all major UPI apps</p>
                </div>
              </div>
            ) : (
              <div className="text-center p-6 text-rose-500 font-bold bg-rose-50 rounded-2xl border border-rose-100">
                Failed to load payment options. Please try again later.
              </div>
            )}
          </div>
        </div>

        {/* Transaction History Statement */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500 delay-300 fill-mode-both mb-8">
          <div className="p-6 border-b border-slate-50 flex items-center gap-3">
            <h3 className="text-base font-black text-slate-800">Recent Transactions</h3>
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
