"use client";

import { formatDate, getTodayFormatted } from '@/lib/formatDate';
import { FileText, TrendingUp, Scale, Building2, Printer, Users, Download } from 'lucide-react';
import React, { useState, useCallback } from 'react';
import { useAccounting } from '@/lib/AccountingContext';

type ReportTab = 'trial_balance' | 'pnl' | 'balance_sheet' | 'students_balance';

export default function ReportsPage() {
  const { accounts, debtors } = useAccounting();
  const [activeTab, setActiveTab] = useState<ReportTab>('trial_balance');

  // Compute Trial Balance Array with Sundry Debtors grouping
  const regularAccounts: any[] = [];
  let sundryDebtorsDr = 0;
  let sundryDebtorsCr = 0;

  accounts.forEach(a => {
    let dr = 0;
    let cr = 0;
    if (a.balance >= 0) {
      if (a.balanceType === 'Debit') dr = a.balance;
      else cr = a.balance;
    } else {
      if (a.balanceType === 'Debit') cr = Math.abs(a.balance);
      else dr = Math.abs(a.balance);
    }
    
    if (debtors.some(d => d.accountId === a.id)) {
      // It's a student/customer debtor account
      sundryDebtorsDr += dr;
      sundryDebtorsCr += cr;
    } else {
      if (dr > 0 || cr > 0) {
        regularAccounts.push({ ...a, dr, cr });
      }
    }
  });

  const trialBalance = [...regularAccounts];
  if (sundryDebtorsDr > 0 || sundryDebtorsCr > 0) {
    trialBalance.push({ 
      id: 'sundry_debtors', 
      name: 'Sundry Debtors', 
      type: 'Asset', 
      balanceType: 'Debit', 
      balance: sundryDebtorsDr - sundryDebtorsCr,
      dr: sundryDebtorsDr, 
      cr: sundryDebtorsCr 
    } as any);
  }

  const totalDr = trialBalance.reduce((sum, a) => sum + a.dr, 0);
  const totalCr = trialBalance.reduce((sum, a) => sum + a.cr, 0);

  // Compute P&L
  const revenues = trialBalance.filter(a => a.type === 'Revenue');
  const expenses = trialBalance.filter(a => a.type === 'Expense');
  const totalRev = revenues.reduce((sum, a) => sum + a.cr - a.dr, 0);
  const totalExp = expenses.reduce((sum, a) => sum + a.dr - a.cr, 0);
  const netProfit = totalRev - totalExp;

  // Compute Balance Sheet
  const assets = trialBalance.filter(a => a.type === 'Asset');
  const liabilities = trialBalance.filter(a => a.type === 'Liability');
  const equity = trialBalance.filter(a => a.type === 'Equity');

  const totalAssets = assets.reduce((sum, a) => sum + a.dr - a.cr, 0);
  const totalLiab = liabilities.reduce((sum, a) => sum + a.cr - a.dr, 0);
  const totalEquity = equity.reduce((sum, a) => sum + a.cr - a.dr, 0);

  const totalLiabAndEquity = totalLiab + totalEquity + netProfit;

  const handleDownloadReport = useCallback(() => {
    const today = getTodayFormatted();
    const fmt = (n: number) => `₹${n.toFixed(2)}`;

    const tbRows = trialBalance.map((a, i) => `
      <tr>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;color:#888;font-size:11px">${i+1}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-weight:600">${a.name} <span style="color:#aaa;font-size:10px">(${a.type})</span></td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:right;font-family:monospace;color:#4338ca">${a.dr > 0 ? a.dr.toFixed(2) : ''}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:right;font-family:monospace;color:#059669">${a.cr > 0 ? a.cr.toFixed(2) : ''}</td>
      </tr>`).join('');

    const expRows = expenses.map(a => `
      <tr>
        <td style="padding:5px 10px;border-bottom:1px solid #fee2e2">${a.name}</td>
        <td style="padding:5px 10px;border-bottom:1px solid #fee2e2;text-align:right;font-family:monospace">${(a.dr - a.cr).toFixed(2)}</td>
      </tr>`).join('');
    const revRows = revenues.map(a => `
      <tr>
        <td style="padding:5px 10px;border-bottom:1px solid #d1fae5">${a.name}</td>
        <td style="padding:5px 10px;border-bottom:1px solid #d1fae5;text-align:right;font-family:monospace">${(a.cr - a.dr).toFixed(2)}</td>
      </tr>`).join('');

    const assetRows = assets.map(a => `
      <tr>
        <td style="padding:5px 10px;border-bottom:1px solid #d1fae5">${a.name}</td>
        <td style="padding:5px 10px;border-bottom:1px solid #d1fae5;text-align:right;font-family:monospace">${(a.dr - a.cr).toFixed(2)}</td>
      </tr>`).join('');
    const liabRows = liabilities.map(a => `
      <tr>
        <td style="padding:5px 10px;border-bottom:1px solid #fed7aa">${a.name}</td>
        <td style="padding:5px 10px;border-bottom:1px solid #fed7aa;text-align:right;font-family:monospace">${(a.cr - a.dr).toFixed(2)}</td>
      </tr>`).join('');
    const equityRows = equity.map(a => `
      <tr>
        <td style="padding:5px 10px;border-bottom:1px solid #e0e7ff">${a.name}</td>
        <td style="padding:5px 10px;border-bottom:1px solid #e0e7ff;text-align:right;font-family:monospace">${(a.cr - a.dr).toFixed(2)}</td>
      </tr>`).join('');

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Financial Report - AMAN STORE</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; background: #fff; padding: 32px; }
    .header { text-align: center; border-bottom: 3px solid #1e293b; padding-bottom: 16px; margin-bottom: 28px; }
    .header h1 { font-size: 26px; font-weight: 900; letter-spacing: 2px; }
    .header p { font-size: 12px; color: #64748b; margin-top: 4px; }
    .section { margin-bottom: 36px; page-break-inside: avoid; }
    .section-title { font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; padding: 8px 14px; border-radius: 6px; margin-bottom: 12px; }
    .tb-title { background: #eef2ff; color: #3730a3; }
    .pnl-title { background: #f0fdf4; color: #166534; }
    .bs-title { background: #fff7ed; color: #9a3412; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    thead th { background: #f8fafc; padding: 8px 10px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; border-bottom: 2px solid #e2e8f0; }
    thead th.right { text-align: right; }
    .total-row td { background: #f1f5f9; font-weight: 800; padding: 8px 10px; border-top: 2px solid #cbd5e1; font-family: monospace; }
    .total-row td.right { text-align: right; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    .sub-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .sub-title { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; padding: 5px 10px; margin-bottom: 4px; }
    .exp-title { color: #b91c1c; border-bottom: 2px solid #fecaca; }
    .rev-title { color: #065f46; border-bottom: 2px solid #a7f3d0; }
    .asset-title { color: #065f46; border-bottom: 2px solid #a7f3d0; }
    .liab-title { color: #9a3412; border-bottom: 2px solid #fed7aa; }
    .cap-title { color: #3730a3; border-bottom: 2px solid #c7d2fe; }
    .net-band { background: #f0fdf4; color: #166534; padding: 6px 10px; margin-top: 8px; border-radius: 4px; font-weight: 700; font-size: 12px; display: flex; justify-content: space-between; }
    .net-loss { background: #fef2f2; color: #991b1b; }
    .grand-total { display: flex; justify-content: space-between; background: #f1f5f9; padding: 10px 14px; border-radius: 6px; font-weight: 800; margin-top: 8px; font-size: 13px; }
    .footer { text-align: center; margin-top: 40px; font-size: 10px; color: #94a3b8; letter-spacing: 1px; border-top: 1px dashed #cbd5e1; padding-top: 12px; }
    /* ── Print-specific ── */
    @page { size: A4; margin: 1.5cm 1.5cm 1.5cm 1.5cm; }
    @media print {
      body { padding: 0; }
      .print-page-header {
        display: block !important;
        position: fixed;
        top: -1cm;
        left: 0;
        width: 100%;
        text-align: right;
        font-size: 10px;
        color: #64748b;
        font-family: 'Segoe UI', Arial, sans-serif;
        letter-spacing: 1px;
        padding-bottom: 4px;
        border-bottom: 1px solid #e2e8f0;
      }
      body { padding-top: 0.5cm; }
    }
  </style>
</head>
<body>
  <!-- Centered running header on every printed page -->
  <div class="print-page-header" style="display:none">
    Financial Report &mdash; AMAN STORE
  </div>
  <div class="header">
    <h1>AMAN STORE</h1>
    <p>Financial Report &mdash; Generated on ${today}</p>
  </div>

  <!-- 1. TRIAL BALANCE -->
  <div class="section">
    <div class="section-title tb-title">1. Trial Balance &nbsp;&nbsp;<span style="font-weight:400;font-size:11px">As of ${today}</span></div>
    <table>
      <thead>
        <tr>
          <th style="width:40px">No.</th>
          <th>Account Title</th>
          <th class="right" style="width:130px">Debit (₹)</th>
          <th class="right" style="width:130px">Credit (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${tbRows || '<tr><td colspan="4" style="text-align:center;padding:16px;color:#94a3b8;font-style:italic">No data</td></tr>'}
        <tr class="total-row">
          <td colspan="2" style="text-align:right;letter-spacing:1px">TOTAL</td>
          <td class="right">${totalDr.toFixed(2)}</td>
          <td class="right">${totalCr.toFixed(2)}</td>
        </tr>
      </tbody>
    </table>
    ${totalDr !== totalCr && totalDr > 0 ? `<div style="background:#fef2f2;color:#991b1b;padding:8px 12px;margin-top:8px;border-radius:6px;font-size:11px;font-weight:700">⚠ Trial Balance does not match. Suspense difference: ₹${Math.abs(totalDr - totalCr).toFixed(2)}</div>` : ''}
  </div>

  <!-- 2. PROFIT & LOSS -->
  <div class="section">
    <div class="section-title pnl-title">2. Profit &amp; Loss A/c &nbsp;&nbsp;<span style="font-weight:400;font-size:11px">For the period ending ${today}</span></div>
    <div class="two-col">
      <div>
        <div class="sub-title exp-title">Expenses (Dr)</div>
        <table class="sub-table">
          <tbody>
            ${expRows || '<tr><td style="padding:5px 10px;color:#94a3b8;font-style:italic">No expenses</td></tr>'}
            ${netProfit > 0 ? `<tr><td style="padding:5px 10px;font-weight:700;color:#166534">Net Profit (to Capital)</td><td style="text-align:right;font-family:monospace;font-weight:700;color:#166534;padding:5px 10px">${netProfit.toFixed(2)}</td></tr>` : ''}
          </tbody>
        </table>
      </div>
      <div>
        <div class="sub-title rev-title">Revenues (Cr)</div>
        <table class="sub-table">
          <tbody>
            ${revRows || '<tr><td style="padding:5px 10px;color:#94a3b8;font-style:italic">No revenues</td></tr>'}
            ${netProfit < 0 ? `<tr><td style="padding:5px 10px;font-weight:700;color:#991b1b">Net Loss (to Capital)</td><td style="text-align:right;font-family:monospace;font-weight:700;color:#991b1b;padding:5px 10px">${Math.abs(netProfit).toFixed(2)}</td></tr>` : ''}
          </tbody>
        </table>
      </div>
    </div>
    <div class="grand-total" style="margin-top:12px">
      <span>Net ${netProfit >= 0 ? 'Profit' : 'Loss'}</span>
      <span style="font-family:monospace;color:${netProfit >= 0 ? '#166534' : '#991b1b'}">${fmt(Math.abs(netProfit))}</span>
    </div>
  </div>

  <!-- 3. BALANCE SHEET -->
  <div class="section">
    <div class="section-title bs-title">3. Balance Sheet &nbsp;&nbsp;<span style="font-weight:400;font-size:11px">As of ${today}</span></div>
    <div class="two-col">
      <div>
        <div class="sub-title cap-title">Capital &amp; Equity</div>
        <table class="sub-table">
          <tbody>
            ${equityRows || '<tr><td style="padding:5px 10px;color:#94a3b8;font-style:italic">No equity</td></tr>'}
            <tr><td style="padding:5px 10px;font-weight:600">Add: Net Profit (Loss)</td><td style="text-align:right;font-family:monospace;font-weight:700;color:${netProfit >= 0 ? '#166534' : '#991b1b'};padding:5px 10px">${netProfit.toFixed(2)}</td></tr>
          </tbody>
        </table>
        <div style="height:16px"></div>
        <div class="sub-title liab-title">Liabilities</div>
        <table class="sub-table">
          <tbody>
            ${liabRows || '<tr><td style="padding:5px 10px;color:#94a3b8;font-style:italic">No liabilities</td></tr>'}
          </tbody>
        </table>
      </div>
      <div>
        <div class="sub-title asset-title">Assets</div>
        <table class="sub-table">
          <tbody>
            ${assetRows || '<tr><td style="padding:5px 10px;color:#94a3b8;font-style:italic">No assets</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:12px">
      <div class="grand-total"><span>Liabilities &amp; Equity</span><span style="font-family:monospace">${fmt(totalLiabAndEquity)}</span></div>
      <div class="grand-total"><span>Total Assets</span><span style="font-family:monospace">${fmt(totalAssets)}</span></div>
    </div>
  </div>

  <div class="footer">--- END OF FINANCIAL REPORT &mdash; AMAN STORE ---</div>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) { alert('Please allow pop-ups to download the report.'); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 600);
  }, [trialBalance, expenses, revenues, assets, liabilities, equity, totalDr, totalCr, netProfit, totalAssets, totalLiabAndEquity]);

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto pb-24 print:p-0 print:m-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 pt-4 gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FileText size={24} className="text-primary" />
            Financial Reports
          </h1>
          <p className="text-sm text-slate-500">Auto-posted from Ledger accounts</p>
        </div>

        <div className="flex bg-slate-200 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
          <button 
            onClick={() => setActiveTab('trial_balance')}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 shrink-0 ${activeTab === 'trial_balance' ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Scale size={16} /> Trial Balance
          </button>
          <button 
            onClick={() => setActiveTab('pnl')}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 shrink-0 ${activeTab === 'pnl' ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <TrendingUp size={16} /> Profit &amp; Loss
          </button>
          <button 
            onClick={() => setActiveTab('balance_sheet')}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 shrink-0 ${activeTab === 'balance_sheet' ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Building2 size={16} /> Balance Sheet
          </button>
          <button 
            onClick={() => setActiveTab('students_balance')}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 shrink-0 ${activeTab === 'students_balance' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Users size={16} /> Student Balances
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden min-h-[400px] print:rounded-none print:shadow-none print:border-none print:m-0 print:p-0">
        {activeTab === 'trial_balance' && (
          <div className="animate-in fade-in duration-300">
            <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-800 uppercase tracking-wide">Trial Balance</h2>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">As of {getTodayFormatted()}</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-y border-slate-100 text-xs text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4 font-semibold w-12">No.</th>
                    <th className="px-6 py-4 font-semibold">Account Title</th>
                    <th className="px-6 py-4 font-semibold text-right w-40">Debit (₹)</th>
                    <th className="px-6 py-4 font-semibold text-right w-40">Credit (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {trialBalance.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-500 italic">No ledger balances available.</td>
                    </tr>
                  ) : (
                    trialBalance.map((acc, idx) => (
                      <tr key={acc.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-3 font-mono text-slate-400 text-xs">{idx + 1}</td>
                        <td className="px-6 py-3 font-semibold text-slate-700">
                          {acc.name} <span className="text-[10px] text-slate-400 ml-2 uppercase font-medium">({acc.type})</span>
                        </td>
                        <td className="px-6 py-3 text-right font-mono text-indigo-700">{acc.dr > 0 ? acc.dr.toFixed(2) : ''}</td>
                        <td className="px-6 py-3 text-right font-mono text-emerald-700">{acc.cr > 0 ? acc.cr.toFixed(2) : ''}</td>
                      </tr>
                    ))
                  )}
                  {/* Totals */}
                  <tr className="bg-slate-100/50 font-bold border-t-2 border-slate-200">
                    <td colSpan={2} className="px-6 py-4 text-right uppercase tracking-wider text-slate-600 text-xs">Total</td>
                    <td className={`px-6 py-4 text-right font-mono ${totalDr === totalCr ? 'text-primary border-b-4 border-double border-primary' : 'text-red-600'}`}>
                      {totalDr.toFixed(2)}
                    </td>
                    <td className={`px-6 py-4 text-right font-mono ${totalDr === totalCr ? 'text-primary border-b-4 border-double border-primary' : 'text-red-600'}`}>
                      {totalCr.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
              {totalDr !== totalCr && totalDr > 0 && (
                <div className="p-4 m-4 bg-red-50 text-red-600 text-sm font-semibold rounded-xl border border-red-100 flex justify-center text-center">
                  Warning: Trial Balance does not match. Suspense difference is ₹{Math.abs(totalDr - totalCr).toFixed(2)}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'pnl' && (
          <div className="animate-in fade-in duration-300">
            <div className="p-6 bg-slate-50/50 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800 uppercase tracking-wide">Profit &amp; Loss Statement</h2>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">For the period ending {getTodayFormatted()}</p>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 relative">
              <div className="hidden md:block absolute left-1/2 top-6 bottom-6 w-px bg-slate-100 -translate-x-1/2" />
              
              {/* Expenses / Dr Side */}
              <div>
                <h3 className="text-sm font-bold text-rose-700 uppercase tracking-widest border-b border-rose-100 pb-2 mb-4">Expenses (Dr)</h3>
                <div className="space-y-2">
                  {expenses.map(acc => (
                    <div key={acc.id} className="flex justify-between items-center text-sm px-2 py-1.5 hover:bg-slate-50 rounded-lg">
                      <span className="font-semibold text-slate-700">{acc.name}</span>
                      <span className="font-mono text-slate-600">{(acc.dr - acc.cr).toFixed(2)}</span>
                    </div>
                  ))}
                  {expenses.length === 0 && <div className="text-xs text-slate-400 italic px-2">No expenses recorded</div>}
                </div>
                {netProfit > 0 && (
                  <div className="flex justify-between items-center text-sm px-2 py-2 mt-4 bg-emerald-50 text-emerald-800 font-bold rounded-lg border border-emerald-100">
                    <span>Net Profit (Transferred to Capital)</span>
                    <span className="font-mono">{netProfit.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Revenues / Cr Side */}
              <div>
                <h3 className="text-sm font-bold text-emerald-700 uppercase tracking-widest border-b border-emerald-100 pb-2 mb-4">Revenues (Cr)</h3>
                <div className="space-y-2">
                  {revenues.map(acc => (
                    <div key={acc.id} className="flex justify-between items-center text-sm px-2 py-1.5 hover:bg-slate-50 rounded-lg">
                      <span className="font-semibold text-slate-700">{acc.name}</span>
                      <span className="font-mono text-slate-600">{(acc.cr - acc.dr).toFixed(2)}</span>
                    </div>
                  ))}
                  {revenues.length === 0 && <div className="text-xs text-slate-400 italic px-2">No revenues recorded</div>}
                </div>
                {netProfit < 0 && (
                  <div className="flex justify-between items-center text-sm px-2 py-2 mt-4 bg-red-50 text-red-800 font-bold rounded-lg border border-red-100">
                    <span>Net Loss (Transferred to Capital)</span>
                    <span className="font-mono">{Math.abs(netProfit).toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="border-t-2 border-slate-100 p-6 flex justify-between bg-slate-50 font-bold text-lg">
              <span className="uppercase text-xs tracking-wider text-slate-500 self-center">Total Balance</span>
              <span className="font-mono text-primary flex items-center gap-12">
                <span>₹{Math.max(totalExp + (netProfit > 0 ? netProfit : 0), 0).toFixed(2)}</span>
              </span>
            </div>
          </div>
        )}

        {activeTab === 'balance_sheet' && (
          <div className="animate-in fade-in duration-300">
            <div className="p-6 bg-slate-50/50 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800 uppercase tracking-wide">Balance Sheet</h2>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">As of {getTodayFormatted()}</p>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 relative">
              <div className="hidden md:block absolute left-1/2 top-6 bottom-6 w-px bg-slate-100 -translate-x-1/2" />
              
              {/* Liabilities & Equity */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-indigo-700 uppercase tracking-widest border-b border-indigo-100 pb-2 mb-3">Capital &amp; Equity</h3>
                  <div className="space-y-2">
                    {equity.map(acc => (
                      <div key={acc.id} className="flex justify-between items-center text-sm px-2 py-1.5 hover:bg-slate-50 rounded-lg">
                        <span className="font-semibold text-slate-700">{acc.name}</span>
                        <span className="font-mono text-slate-600">{(acc.cr - acc.dr).toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center text-sm px-2 py-1.5 hover:bg-slate-50 rounded-lg">
                      <span className="font-semibold text-slate-700">Add: Net Profit (Loss)</span>
                      <span className={`font-mono ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{netProfit.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-orange-700 uppercase tracking-widest border-b border-orange-100 pb-2 mb-3">Liabilities</h3>
                  <div className="space-y-2">
                    {liabilities.map(acc => (
                      <div key={acc.id} className="flex justify-between items-center text-sm px-2 py-1.5 hover:bg-slate-50 rounded-lg">
                        <span className="font-semibold text-slate-700">{acc.name}</span>
                        <span className="font-mono text-slate-600">{(acc.cr - acc.dr).toFixed(2)}</span>
                      </div>
                    ))}
                    {liabilities.length === 0 && <div className="text-xs text-slate-400 italic px-2">No liabilities</div>}
                  </div>
                </div>
              </div>

              {/* Assets */}
              <div>
                <h3 className="text-sm font-bold text-emerald-700 uppercase tracking-widest border-b border-emerald-100 pb-2 mb-3">Assets</h3>
                <div className="space-y-2">
                  {assets.map(acc => (
                    <div key={acc.id} className="flex justify-between items-center text-sm px-2 py-1.5 hover:bg-slate-50 rounded-lg">
                      <span className="font-semibold text-slate-700">{acc.name}</span>
                      <span className="font-mono text-slate-600">{(acc.dr - acc.cr).toFixed(2)}</span>
                    </div>
                  ))}
                  {assets.length === 0 && <div className="text-xs text-slate-400 italic px-2">No assets</div>}
                </div>
              </div>
            </div>
            
            <div className="border-t-2 border-slate-100 p-6 flex justify-between bg-slate-50 font-bold text-lg">
              <span className="uppercase text-xs tracking-wider text-slate-500 self-center">Total Balance</span>
              <div className="flex items-center gap-4 sm:gap-12 md:w-3/4 justify-between md:justify-around">
                <span className="font-mono text-primary flex flex-col items-end">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Liabilities &amp; Equity</span>
                  ₹{totalLiabAndEquity.toFixed(2)}
                </span>
                <span className="font-mono text-primary flex flex-col items-end">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Assets</span>
                  ₹{totalAssets.toFixed(2)}
                </span>
              </div>
            </div>

            {/* ─── Download Financial Report Button ─── */}
            <div className="px-6 pb-6 pt-4 border-t border-slate-100 bg-gradient-to-r from-indigo-50/60 to-slate-50/40">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Download Financial Report</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Includes Trial Balance · Profit &amp; Loss A/c · Balance Sheet</p>
                </div>
                <button
                  onClick={handleDownloadReport}
                  className="flex items-center gap-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.97] text-white font-bold px-6 py-2.5 rounded-xl shadow-md shadow-indigo-200 transition-all text-sm"
                >
                  <Download size={16} />
                  Download Financial Report
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'students_balance' && (
          <div className="animate-in fade-in duration-300">
            <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center print:hidden">
              <div>
                <h2 className="text-lg font-bold text-slate-800 uppercase tracking-wide">Student Balances Report</h2>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">Exportable PDF Report</p>
              </div>
              <button 
                onClick={() => window.print()}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-sm font-bold rounded-xl transition-colors shadow-sm"
              >
                <Printer size={16} /> Save / Print PDF
              </button>
            </div>

            {/* Print Header (Only visible on print) — Compact */}
            <div className="hidden print:block text-center p-4 border-b-2 border-slate-800 mb-4">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">AMAN STORE</h1>
              <h2 className="text-lg font-bold text-slate-700 mt-1 uppercase tracking-wide">Statement of Student Balances</h2>
              <p className="text-xs font-medium text-slate-500 mt-0.5">Generated: {getTodayFormatted()}</p>
            </div>

            <div className="overflow-x-auto p-0 sm:p-6 print:p-0">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-indigo-50/50 border-y py-2 border-slate-200 text-xs text-indigo-900 uppercase tracking-wider print:bg-slate-100 print:text-black">
                  <tr>
                    <th className="px-6 py-4 font-bold border-b border-slate-200">Name</th>
                    <th className="px-6 py-4 font-bold border-b border-slate-200">Batch</th>
                    <th className="px-6 py-4 font-bold border-b border-slate-200">Phone</th>
                    <th className="px-6 py-4 font-bold text-right border-b border-slate-200">Balance (₹)</th>
                    <th className="px-6 py-4 font-bold text-right border-b border-slate-200 print:hidden">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 print:divide-y-2 print:divide-slate-200">
                  {debtors.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">No registered students found.</td>
                    </tr>
                  ) : (
                    debtors.map(student => {
                      const acc = accounts.find(a => a.id === student.accountId);
                      const bal = acc?.balance || 0;
                      return (
                        <tr key={student.id} className="hover:bg-slate-50 transition-colors print:hover:bg-white break-inside-avoid">
                          <td className="px-6 py-3 font-bold text-slate-800 print:text-black print:text-sm">{student.name}</td>
                          <td className="px-6 py-3 font-semibold text-slate-600">{student.batch || 'N/A'}</td>
                          <td className="px-6 py-3 font-mono text-slate-500 text-xs">{student.mobileNumber}</td>
                          <td className={`px-6 py-3 text-right font-mono font-bold print:text-black ${bal > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                            {Math.abs(bal).toFixed(2)} {bal > 0 ? 'Dr' : bal < 0 ? 'Cr' : ''}
                          </td>
                          <td className="px-6 py-3 text-right print:hidden">
                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${bal > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                              {bal > 0 ? 'Due' : 'Clear'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                  {/* Total Line */}
                  <tr className="bg-slate-50 font-black border-t-4 border-slate-200 print:border-slate-800">
                    <td colSpan={3} className="px-6 py-4 text-right uppercase tracking-wider text-slate-700 text-xs">Total Outstanding Receivables</td>
                    <td className="px-6 py-4 text-right font-mono text-red-600 print:text-black relative">
                      ₹{debtors.reduce((sum, student) => {
                        const acc = accounts.find(a => a.id === student.accountId);
                        const bal = acc?.balance || 0;
                        return sum + (bal > 0 ? bal : 0);
                      }, 0).toFixed(2)}
                    </td>
                    <td className="print:hidden"></td>
                  </tr>
                </tbody>
              </table>
              <div className="hidden print:block text-center mt-12 text-slate-500 text-xs tracking-widest border-t border-dashed border-slate-300 pt-4">
                --- END OF REPORT ---
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
