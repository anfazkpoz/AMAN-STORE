"use client";

import { useState, useEffect } from "react";
import {
  UserCog, Plus, Trash2, KeyRound, Phone, User as UserIcon,
  CheckCircle2, AlertCircle, Hash, Eye, EyeOff, Copy, Check
} from "lucide-react";
import { User } from "@/lib/types";
import { useAccounting } from "@/lib/AccountingContext";
import { getSession } from "@/lib/auth";

export default function StaffManagementPage() {
  const { accounts, cashTransfers, addCashTransfer, approveCashTransfer } = useAccounting();
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [remitAmount, setRemitAmount] = useState("");

  // Form fields
  const [name, setName] = useState("");
  const [userId, setUserId] = useState("");     // login ID (stored in phone field)
  const [phone, setPhone] = useState("");       // actual mobile number
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<'id' | 'password' | null>(null);

  const handleCopy = (text: string, id: string, field: 'id' | 'password') => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setCopiedField(field);
    setTimeout(() => {
      setCopiedId(null);
      setCopiedField(null);
    }, 2000);
  };

  const fetchStaff = async () => {
    try {
      const res = await fetch('/api/users?role=Staff');
      if (res.ok) {
        const data = await res.json();
        const normalized = Array.isArray(data) ? data.map((u: any) => ({ ...u, id: u._id })) : [];
        setUsers(normalized);
      }
    } catch (err) {
      console.error("Failed to fetch staff:", err);
    }
  };

  useEffect(() => {
    fetchStaff();
    const user = getSession();
    if (user) setCurrentUser(user as User);
  }, []);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!name.trim() || !userId.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    const cleanUserId = userId.trim().toLowerCase().replace(/\s+/g, '');

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: cleanUserId,   // User ID used for login (stored in phone field in DB)
          password: password.trim(),
          role: "Staff",
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        setError(errData.error || "Failed to add staff.");
        return;
      }

      const data = await res.json();
      const newStaff = { ...data.user, id: data.user._id };
      
      setUsers(prev => [...prev, newStaff]);

      // Reset form
      setName("");
      setUserId("");
      setPassword("");

      setSuccess(`Staff "${newStaff.name}" added. Staff ID: ${cleanUserId}`);
      setTimeout(() => setSuccess(""), 5000);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    }
  };

  const handleRemoveStaff = async (staffId: string) => {
    try {
      const res = await fetch('/api/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: staffId })
      });
      if (res.ok) {
        setUsers(prev => prev.filter(u => u.id !== staffId));
        setConfirmDeleteId(null);
      }
    } catch (err) {
      console.error("Failed to remove staff:", err);
    }
  };

  const staffCashAccounts = accounts.filter(a => a.name.startsWith('Cash - ') && a.balance > 0);
  const pendingTransfers = cashTransfers.filter(t => t.status === 'pending');
  const myStaffCash = accounts.find(a => a.name === `Cash - ${currentUser?.name}`)?.balance || 0;

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto pb-24 text-left">

      {/* Page Header */}
      <div className="pt-4 mb-6 scroll-reveal">
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">
          {currentUser?.role === 'Staff' ? 'My Cash Portal' : 'Staff Management'}
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {currentUser?.role === 'Staff' ? 'Manage your cash in hand and remittances' : 'Add and manage staff portal access'}
        </p>
      </div>

      {currentUser?.role === 'Staff' && (
        <div className="mb-8 p-6 bg-indigo-50 border border-indigo-100 rounded-2xl scroll-reveal">
          <h2 className="text-lg font-bold text-indigo-900 mb-1">Staff Cash Remittance</h2>
          <p className="text-xs text-indigo-700 mb-4">Transfer your cash in hand to the Main Admin.</p>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 mb-1 block">Cash in Hand</label>
              <div className="px-4 py-3 bg-white border border-indigo-200 rounded-xl text-lg font-black text-indigo-800">
                ₹{myStaffCash.toLocaleString()}
              </div>
            </div>
            <div className="flex-1 w-full">
              <label className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 mb-1 block">Amount to Remit (₹)</label>
              <input 
                type="number" 
                value={remitAmount}
                onChange={e => setRemitAmount(e.target.value)}
                placeholder="0"
                className="w-full px-4 py-3 bg-white border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-lg font-black text-slate-800"
              />
            </div>
            <button 
              onClick={() => {
                if (Number(remitAmount) > 0 && Number(remitAmount) <= myStaffCash && currentUser) {
                  addCashTransfer(Number(remitAmount), currentUser.id, currentUser.name);
                  setRemitAmount("");
                } else {
                  alert("Invalid amount or insufficient cash in hand.");
                }
              }}
              className="w-full sm:w-auto px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all active:scale-95"
            >
              Request Transfer
            </button>
          </div>
          {cashTransfers.filter(t => t.staffId === currentUser.id && t.status === 'pending').length > 0 && (
            <div className="mt-4 p-3 bg-orange-100 text-orange-800 text-xs font-bold rounded-xl border border-orange-200">
              You have pending transfer requests waiting for Admin approval.
            </div>
          )}
        </div>
      )}

      {currentUser?.role === 'Admin' && (
      <div className="grid grid-cols-1 md:grid-cols-5 gap-5 text-left">

        {/* ── Add Staff Form ── */}
        <div className="md:col-span-2 bg-white border border-slate-100 rounded-2xl shadow-sm p-5 self-start scroll-reveal">
          <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-slate-100">
            <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
              <UserCog size={16} />
            </div>
            <h2 className="font-bold text-slate-800 text-sm">Add New Staff</h2>
          </div>

          {error && (
            <div className="mb-4 flex items-center gap-2 text-xs font-semibold text-red-600 bg-red-50 border border-red-100 p-3 rounded-xl animate-in fade-in">
              <AlertCircle size={14} className="shrink-0" /> {error}
            </div>
          )}
          {success && (
            <div className="mb-4 flex items-center gap-2 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 p-3 rounded-xl animate-in fade-in">
              <CheckCircle2 size={14} className="shrink-0" /> {success}
            </div>
          )}

          <form onSubmit={handleAddStaff} className="space-y-4">

            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Full Name
              </label>
              <div className="relative">
                <UserIcon size={14} className="absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm font-semibold text-slate-800 placeholder-slate-400 transition-all uppercase"
                  placeholder="ENTER STAFF NAME"
                />
              </div>
            </div>

            {/* Staff ID */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Staff ID <span className="text-slate-300 normal-case font-normal">(used to login)</span>
              </label>
              <div className="relative">
                <Hash size={14} className="absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  value={userId}
                  onChange={e => setUserId(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm font-semibold text-slate-800 placeholder-slate-400 transition-all font-mono tracking-wide uppercase"
                  placeholder="CREATE STAFF ID"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Password
              </label>
              <div className="relative">
                <KeyRound size={14} className="absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm font-semibold text-slate-800 placeholder-slate-400 transition-all uppercase"
                  placeholder="CREATE PASSWORD"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-2 flex justify-center items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-bold py-2.5 rounded-xl transition-all text-sm shadow-sm"
            >
              <Plus size={16} /> Create Account
            </button>
          </form>
        </div>

        {/* ── Staff List ── */}
        <div className="md:col-span-3 bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden scroll-reveal">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-800 text-sm">Active Staff Accounts</h2>
            <span className="text-xs font-semibold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg">
              {users.length} {users.length === 1 ? "member" : "members"}
            </span>
          </div>

          {users.length > 0 && (
            <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100 grid grid-cols-3 gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <span>Name</span>
              <span>Staff ID</span>
              <span>Password</span>
            </div>
          )}

          <div className="divide-y divide-slate-50">
            {users.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <UserCog size={22} className="text-slate-400" />
                </div>
                <p className="text-sm font-semibold text-slate-500">No staff members yet</p>
                <p className="text-xs text-slate-400 mt-1">Add one using the form.</p>
              </div>
            ) : (
              users.map(staff => (
                <div
                  key={staff.id}
                  className={`px-5 py-3.5 flex items-center justify-between hover:bg-slate-50/60 transition-colors group ${
                    confirmDeleteId === staff.id ? "bg-red-50/40" : ""
                  }`}
                >
                  <div className="grid grid-cols-3 gap-2 flex-1 items-center text-sm mr-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">
                        {staff.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold text-slate-800 text-xs truncate">{staff.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5 w-fit">
                      <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md truncate">
                        {staff.phone}
                      </span>
                      <button
                        onClick={() => handleCopy(staff.phone || '', staff.id, 'id')}
                        className="text-slate-400 hover:text-indigo-600 transition-colors p-1"
                        title="Copy Staff ID"
                      >
                        {copiedId === staff.id && copiedField === 'id' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 w-fit">
                      <span className="font-mono text-xs font-bold text-slate-700 tracking-wider">
                        {staff.password || "—"}
                      </span>
                      {staff.password && (
                        <button
                          onClick={() => handleCopy(staff.password || '', staff.id, 'password')}
                          className="text-slate-400 hover:text-indigo-600 transition-colors p-1"
                          title="Copy Password"
                        >
                          {copiedId === staff.id && copiedField === 'password' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {confirmDeleteId === staff.id ? (
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-bold text-red-500">Remove?</span>
                        <button
                          onClick={() => handleRemoveStaff(staff.id)}
                          className="text-[10px] font-bold text-white bg-red-500 hover:bg-red-600 px-2 py-1 rounded-lg transition-colors"
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-[10px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg transition-colors"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(staff.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        title="Remove Staff"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
      )}

      {/* ── Cash Remittance (Admin View) ── */}
      {currentUser?.role === 'Admin' && (
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6 scroll-reveal">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-800 mb-3">Staff Cash in Hand</h2>
          {staffCashAccounts.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No staff is currently holding cash.</p>
          ) : (
            <div className="space-y-2">
              {staffCashAccounts.map(acc => (
                <div key={acc.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-sm font-semibold text-slate-700">{acc.name.replace('Cash - ', '')}</span>
                  <span className="text-sm font-black text-emerald-600">₹{acc.balance.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-800 mb-3">Pending Transfers</h2>
          {pendingTransfers.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No pending cash transfers.</p>
          ) : (
            <div className="space-y-2">
              {pendingTransfers.map(t => (
                <div key={t.id} className="flex justify-between items-center p-3 bg-orange-50 rounded-xl border border-orange-100">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{t.staffName}</p>
                    <p className="text-xs text-orange-600 font-bold">₹{t.amount.toLocaleString()}</p>
                  </div>
                  <button 
                    onClick={() => approveCashTransfer(t.id)}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                  >
                    Approve
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      )}

    </div>
  );
}
