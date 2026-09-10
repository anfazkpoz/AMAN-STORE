"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { 
  User, Phone, Banknote, QrCode, ArrowLeft, MessageCircle, 
  CheckCircle2, AlertCircle, ExternalLink, ShieldCheck 
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { formatDate } from "@/lib/formatDate";
import Link from "next/link";

const ADMIN_WHATSAPP = "918593971496";

export default function StudentPortalPage() {
  const params = useParams();
  const id = params.id as string;

  const [data, setData] = useState<{
    debtor: { id: string; name: string; batch: string; mobileNumber: string; accountId: string };
    account: { id: string; name: string; balanceType: string; balance: number };
    currentBalance: number;
    transactions: Array<{ id: string; date: string; narration: string; type: string; amount: number; isCredit: boolean }>;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showWarning, setShowWarning] = useState(false);
  const [pendingPaymentUrl, setPendingPaymentUrl] = useState("");

  useEffect(() => {
    if (!id) return;
    fetch(`/api/student/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Could not find student account");
        return res.json();
      })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load account details");
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold tracking-wide">Loading your statement…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-sm border border-slate-200">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-xl font-black text-slate-800">Account Not Found</h2>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            We couldn't locate your student portal details. Please contact the administrator.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <a
              href={`https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent("Hi Admin, I was checking my student portal link but it says account not found.")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2"
            >
              <MessageCircle size={16} /> Contact Admin on WhatsApp
            </a>
            <Link
              href="/"
              className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm"
            >
              Go to Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { debtor, currentBalance, transactions } = data;
  const studentBalance = currentBalance;
  const upiUrl = `upi://pay?pa=muhammedanfaz123-1@oksbi&pn=AMAN%20STORE&am=${Number(studentBalance).toFixed(2)}&cu=INR&mc=8299&tn=store%20cash`;

  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-24 sm:p-8">
      <div className="max-w-xl mx-auto space-y-5">
        
        {/* Header Branding */}
        <div className="flex items-center justify-between pt-2 scroll-reveal">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-indigo-200">
              AS
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-slate-800">AMAN STORE</h1>
              <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400">Student Portal</p>
            </div>
          </div>
          <Link
            href="/"
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-full transition-colors"
          >
            Sign In
          </Link>
        </div>

        {/* Student Identity Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 flex items-center justify-between gap-4 scroll-reveal">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg shrink-0">
              {debtor.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <span>{debtor.name}</span>
                {debtor.batch && (
                  <span className="px-2 py-0.5 rounded bg-indigo-50 text-[10px] text-indigo-600 uppercase tracking-wider font-bold">
                    {debtor.batch}
                  </span>
                )}
              </h2>
              {debtor.mobileNumber && (
                <div className="flex items-center gap-1.5 text-slate-500 font-medium text-xs mt-0.5">
                  <Phone size={12} />
                  <span>{debtor.mobileNumber}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Financial Overview Card */}
        <div className="bg-gradient-to-r from-slate-800 to-indigo-900 rounded-3xl shadow-xl shadow-indigo-900/20 p-8 text-white relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-900/40 scroll-reveal-scale">
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
                ? "This is your current outstanding store balance."
                : currentBalance < 0
                ? "You have this amount in advance credit."
                : "Your account is fully settled!"}
            </p>
          </div>
        </div>

        {/* UPI Payment Section */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden mb-8 scroll-reveal">
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
                {/* Mobile View - Direct UPI Deep Link */}
                <a
                  href={upiUrl}
                  onClick={() => { setPendingPaymentUrl(upiUrl); setTimeout(() => setShowWarning(true), 500); }}
                  className="block md:hidden w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-center font-bold text-base tracking-wide shadow-lg shadow-indigo-500/40 hover:shadow-indigo-500/60 active:scale-[0.98] transition-all duration-300 select-none"
                >
                  Pay via GPay / UPI
                </a>

                {/* Desktop View - QR Code */}
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
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden mb-8 scroll-reveal">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-base font-black text-slate-800">Recent Transactions</h3>
            <span className="text-xs font-semibold text-slate-400">
              {transactions.length} entries
            </span>
          </div>

          {transactions.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm font-medium">
              No transactions recorded in your statement yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {transactions.map((entry) => (
                <div key={entry.id} className="p-5 hover:bg-slate-50 transition-colors flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{entry.narration || "Entry"}</p>
                    <p className="text-xs text-slate-400 mt-1">{formatDate(entry.date)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${entry.isCredit ? "text-emerald-500" : "text-red-500"}`}>
                      {entry.isCredit ? "-" : "+"} ₹{entry.amount.toLocaleString()}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mt-1">
                      {entry.isCredit ? "Payment / Credit" : "Charge / Debit"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* WhatsApp Support Button */}
        <div className="text-center pb-8 scroll-reveal">
          <a
            href={`https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(`Hi Admin, I am ${debtor.name} (${debtor.batch || ""}). I am viewing my account details online and have a question regarding my balance.`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-5 py-3 rounded-2xl border border-emerald-200 transition-all shadow-sm"
          >
            <MessageCircle size={16} className="text-emerald-600" />
            <span>Have questions? Contact Admin on WhatsApp</span>
          </a>
        </div>

      </div>

      {/* Payment Confirmation Helper Modal */}
      {showWarning && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center shadow-xl space-y-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="font-bold text-slate-800 text-base">Payment Opened in UPI</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Once you complete the payment, please take a screenshot and send it to the store admin so your account balance can be verified.
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <a
                href={`https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(`Hi Admin, I have paid ₹${Number(studentBalance).toFixed(2)} for ${debtor.name} (${debtor.batch || ""}). Here is the payment screenshot:`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2"
              >
                <MessageCircle size={14} /> Send Screenshot on WhatsApp
              </a>
              <button
                onClick={() => setShowWarning(false)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
