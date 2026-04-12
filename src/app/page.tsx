"use client";

import { Store, KeyRound, Phone, AlertCircle, User, ArrowRight, MoreVertical, ShieldCheck, UserCog, GraduationCap, Eye, EyeOff } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Batch, User as UserType } from "@/lib/types";
import { useAccounting } from "@/lib/AccountingContext";
import { saveSession, getSession } from "@/lib/auth";

const BATCHES: Batch[] = ['JD1', 'JD2', 'JD3', 'HS1', 'HS2', 'BS1', 'BS2', 'BS3', 'BS4', 'BS5'];

export default function AuthPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [loginMode, setLoginMode] = useState<'Student' | 'Admin' | 'Staff'>('Student');
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [batch, setBatch] = useState<Batch | "">("");
  
  const [error, setError] = useState("");
  const [showForgot, setShowForgot] = useState(false);
  const router = useRouter();
  const { reloadData } = useAccounting();

  // Auto-login: if a valid persistent session exists, skip the login screen
  useEffect(() => {
    const existing = getSession();
    if (existing) {
      if (existing.role === 'Admin') router.replace("/dashboard");
      else if (existing.role === 'Staff') router.replace("/dashboard/debtors");
      else router.replace("/profile");
    }
  }, [router]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError("");

    // For Staff: login uses a User ID (alphanumeric), so use it as-is.
    // For Student/Admin: normalize phone (strip +91, spaces, non-digits).
    let cleanPhone: string;
    if (loginMode === 'Staff' || loginMode === 'Admin') {
      cleanPhone = phone.trim();
    } else {
      cleanPhone = phone.replace(/\s+/g, '').replace(/[^0-9]/g, '');
      if (cleanPhone.startsWith('91') && cleanPhone.length === 12) cleanPhone = cleanPhone.slice(2);
    }
    const cleanPassword = password.trim();
    
    if (!cleanPhone || !cleanPassword || (isRegister && (!name.trim() || !batch))) {
      setError("Please fill in all required fields.");
      return;
    }

    // Registration: enforce exactly 10 digits
    if (isRegister && !/^[0-9]{10}$/.test(cleanPhone)) {
      setError("Phone must be exactly 10 digits after +91.");
      return;
    }

    try {
      if (isRegister) {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            name: name.trim(), 
            phone: cleanPhone, 
            password: cleanPassword, 
            role: 'Student',
            batch: batch as Batch
          })
        });

        if (!res.ok) {
          const errData = await res.json();
          setError(errData.error || "Registration failed.");
          return;
        }

        const data = await res.json();
        const newUser: UserType = {
          id: String(data.user._id || data.user.id),
          name: data.user.name,
          phone: data.user.phone,
          role: data.user.role,
          batch: data.user.batch,
          debtorId: data.user.debtorId ? String(data.user.debtorId) : undefined,
        };

        // Update Context state immediately before redirect
        await reloadData();
        
        // Auto Sign-In with persistent session
        saveSession(newUser);
        router.push("/profile");

      } else {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: cleanPhone, password: cleanPassword, role: loginMode })
        });

        if (!res.ok) {
          const errData = await res.json();
          setError(errData.error || 'Invalid ID or Password.');
          return;
        }

        const data = await res.json();
        // The login API already returns { id, name, phone, role, batch, debtorId }
        // No need to remap _id — it's already normalized
        const user: UserType = data.user;
        
        // Save persistent 30-day session
        saveSession(user);
        
        if (user.role === 'Admin') router.push("/dashboard");
        else if (user.role === 'Staff') router.push("/dashboard/debtors");
        else router.push("/profile");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    }
  };

  const isStudent = loginMode === 'Student';

  return (
    <div className={`h-screen flex items-center justify-center p-3 transition-colors duration-500 overflow-hidden ${isStudent ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500' : 'bg-slate-50'}`}>
      {/* Hidden Admin/Staff Toggle Menu */}
      <div className="absolute top-3 right-3 z-50">
        <div className="relative">
          <button 
            onClick={() => setShowAdminMenu(!showAdminMenu)}
            className={`p-2 rounded-full backdrop-blur-sm transition-all ${isStudent ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
          >
            <MoreVertical size={18} />
          </button>
          
          {showAdminMenu && (
            <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-2xl py-1.5 border border-slate-100 animate-in fade-in slide-in-from-top-2">
              <button 
                onClick={() => { setLoginMode('Student'); setShowAdminMenu(false); setIsRegister(false); }}
                className="w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <GraduationCap size={15} /> Student Login
              </button>
              <button 
                onClick={() => { setLoginMode('Staff'); setShowAdminMenu(false); setIsRegister(false); }}
                className="w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <UserCog size={15} /> Staff Login
              </button>
              <button 
                onClick={() => { setLoginMode('Admin'); setShowAdminMenu(false); setIsRegister(false); }}
                className="w-full text-left px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-slate-100 mt-1 pt-2"
              >
                <ShieldCheck size={15} /> Main Admin
              </button>
            </div>
          )}
        </div>
      </div>

      <div className={`w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md transition-all duration-500 ${isStudent ? 'bg-white/90 border border-white/40' : 'bg-white border border-slate-200'}`}>
        {/* Header Section */}
        <div className={`px-5 py-4 flex flex-col items-center text-center relative overflow-hidden ${isStudent ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white' : 'bg-slate-800 text-white'}`}>
          <div className="bg-white/20 p-2.5 rounded-full mb-1.5 shadow-inner relative z-10 backdrop-blur-sm">
            <Store size={26} className="text-white drop-shadow-sm" />
          </div>
          <h1 className="text-lg font-bold tracking-tight mb-0.5 relative z-10">AMAN STORE</h1>
          <p className="text-white/80 text-xs font-medium relative z-10">
            {loginMode === 'Student' ? 'Student Portal' : `${loginMode} Access`}
          </p>
        </div>

        <div className="px-5 py-4">
          <div className="mb-3">
            <h2 className="text-base font-bold text-slate-800 tracking-tight">
              {isRegister ? "Student Registration" : `Welcome, ${loginMode}`}
            </h2>
            <p className="text-slate-500 text-xs font-medium">
              {isRegister ? "Create your account to view statements" : "Sign in to continue"}
            </p>
          </div>

          {error && (
            <div className="mb-3 p-2.5 bg-red-50 text-red-700 border border-red-200 rounded-lg flex items-center gap-2 animate-in fade-in">
              <AlertCircle size={15} className="shrink-0" />
              <p className="font-medium text-xs">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-2.5">
            {isRegister && isStudent && (
              <div className="space-y-2.5 animate-in slide-in-from-top-4 fade-in duration-300">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500" htmlFor="name">Full Name</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User size={14} className="text-slate-400" />
                    </div>
                    <input 
                      type="text" id="name" value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none text-sm font-semibold text-slate-800 placeholder-slate-400"
                      placeholder="e.g. Aman Khan"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500" htmlFor="batch">Batch</label>
                  <select
                    id="batch" value={batch}
                    onChange={(e) => setBatch(e.target.value as Batch)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none text-sm font-semibold text-slate-800"
                  >
                    <option value="" disabled>Select your batch</option>
                    {BATCHES.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500" htmlFor="phone">
                {loginMode === 'Admin' ? 'User ID' : loginMode === 'Staff' ? 'Staff ID' : (isRegister ? 'Phone (+91 · 10 digits)' : 'Phone Number')}
              </label>
              {isRegister && isStudent ? (
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all overflow-hidden">
                  <div className="flex items-center gap-1 pl-3 pr-2 border-r border-slate-200 select-none shrink-0 py-2">
                    <Phone size={13} className="text-slate-400" />
                    <span className="text-xs font-bold text-slate-500">+91</span>
                  </div>
                  <input
                    type="tel" inputMode="numeric" id="phone" value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                    maxLength={10}
                    className="flex-1 px-3 py-2 bg-transparent outline-none text-sm font-semibold text-slate-800 placeholder-slate-300"
                    placeholder="98765 43210"
                  />
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    {(loginMode === 'Staff' || loginMode === 'Admin')
                      ? <User size={14} className="text-slate-400" />
                      : <Phone size={14} className="text-slate-400" />}
                  </div>
                  <input 
                    type="text" id="phone" value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={`w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 transition-all outline-none text-sm font-semibold text-slate-800 placeholder-slate-400 focus:bg-white ${isStudent ? 'focus:ring-indigo-500 focus:border-indigo-500' : 'focus:ring-slate-600 focus:border-slate-600'}`}
                    placeholder={loginMode === 'Admin' ? 'Enter User ID' : loginMode === 'Staff' ? 'Enter Staff ID' : 'Mobile number'}
                  />
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500" htmlFor="password">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <KeyRound size={14} className="text-slate-400" />
                </div>
                <input 
                  type={showPassword ? "text" : "password"} id="password" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 transition-all outline-none text-sm font-semibold text-slate-800 placeholder-slate-400 focus:bg-white ${isStudent ? 'focus:ring-indigo-500 focus:border-indigo-500' : 'focus:ring-slate-600 focus:border-slate-600'}`}
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

            {!isRegister && (
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setShowForgot(true)}
                  className="text-[10px] font-bold text-slate-400 hover:text-indigo-600 transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
            )}

            <button 
              type="submit" 
              className={`w-full text-white font-bold tracking-wide py-2.5 rounded-xl transition-all shadow-md mt-1 flex justify-center items-center gap-2 group active:scale-[0.98] ${isStudent ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 shadow-indigo-500/30' : 'bg-slate-800 hover:bg-slate-900 shadow-slate-800/25'}`}
            >
              {isRegister ? "Complete Registration" : "Log In"}
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          {isStudent && (
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-center">
              <span className="text-xs font-medium text-slate-500 mr-2">
                {isRegister ? "Already registered?" : "New student?"}
              </span>
              <button 
                type="button"
                onClick={() => { setIsRegister(!isRegister); setError(""); setPhone(""); setName(""); setBatch(""); setPassword(""); }}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                {isRegister ? "Sign In" : "Register Here"}
              </button>
            </div>
          )}
        </div>
      </div>
      {showForgot && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in transition-all">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden p-8 text-center animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
               <ShieldCheck size={40} />
            </div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-3">Forgot Password?</h2>
            <p className="text-slate-500 font-bold leading-relaxed mb-8">
               For security reasons, please contact the <span className="text-indigo-600">Aman Store Administrator</span> to reset your password or recover your account access.
            </p>
            <button 
               onClick={() => setShowForgot(false)}
               className="w-full py-4 bg-slate-800 hover:bg-slate-900 text-white font-black rounded-2xl shadow-xl transition-all active:scale-[0.98]"
            >
               I Understand
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
