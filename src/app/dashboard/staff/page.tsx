"use client";

import { useState, useEffect } from "react";
import {
  UserCog, Plus, Trash2, KeyRound, Phone, User as UserIcon,
  CheckCircle2, AlertCircle, Hash, Eye, EyeOff
} from "lucide-react";
import { User } from "@/lib/types";

export default function StaffManagementPage() {
  const [users, setUsers] = useState<User[]>([]);

  // Form fields
  const [name, setName] = useState("");
  const [userId, setUserId] = useState("");     // login ID (stored in phone field)
  const [phone, setPhone] = useState("");       // actual mobile number
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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
  }, []);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!name.trim() || !userId.trim() || !phone.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    const cleanUserId = userId.trim().toLowerCase().replace(/\s+/g, '');
    const cleanPhone = phone.replace(/\s+/g, '').replace(/[^0-9]/g, '');

    if (!/^[0-9]{10}$/.test(cleanPhone)) {
      setError("Phone must be exactly 10 digits after +91.");
      return;
    }

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: cleanUserId,   // User ID used for login (stored in phone field in DB)
          mobile: cleanPhone,   // Actual mobile number
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
      setPhone("");
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

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto pb-24">

      {/* Page Header */}
      <div className="pt-4 mb-6">
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">Staff Management</h1>
        <p className="text-sm text-slate-500 mt-0.5">Add and manage staff portal access</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-5">

        {/* ── Add Staff Form ── */}
        <div className="md:col-span-2 bg-white border border-slate-100 rounded-2xl shadow-sm p-5 self-start">
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
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm font-semibold text-slate-800 placeholder-slate-400 transition-all"
                  placeholder="e.g. Aman Khan"
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
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm font-semibold text-slate-800 placeholder-slate-400 transition-all font-mono tracking-wide"
                  placeholder="e.g. aman001"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Phone Number <span className="text-slate-300 normal-case font-normal">(+91 · 10 digits)</span>
              </label>
              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all overflow-hidden">
                <div className="flex items-center gap-1.5 pl-3 pr-2 border-r border-slate-200 select-none shrink-0 h-full py-2.5">
                  <Phone size={13} className="text-slate-400" />
                  <span className="text-sm font-bold text-slate-500">+91</span>
                </div>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                  className="flex-1 px-3 py-2.5 bg-transparent outline-none text-sm font-semibold text-slate-800 placeholder-slate-300"
                  placeholder="98765 43210"
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
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm font-semibold text-slate-800 placeholder-slate-400 transition-all"
                  placeholder="••••••••"
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
        <div className="md:col-span-3 bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-800 text-sm">Active Staff Accounts</h2>
            <span className="text-xs font-semibold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg">
              {users.length} {users.length === 1 ? "member" : "members"}
            </span>
          </div>

          {users.length > 0 && (
            <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100 grid grid-cols-4 gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <span>Name</span>
              <span>Staff ID</span>
              <span>Phone</span>
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
                  <div className="grid grid-cols-4 gap-2 flex-1 items-center text-sm mr-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">
                        {staff.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold text-slate-800 text-xs truncate">{staff.name}</span>
                    </div>

                    <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md truncate w-fit">
                      {staff.phone}
                    </span>

                    <span className="font-mono text-xs text-slate-500">
                      {staff.mobile || "—"}
                    </span>

                    <span className="font-mono text-xs font-bold text-slate-700 tracking-wider">
                      {staff.password || "—"}
                    </span>
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
    </div>
  );
}
