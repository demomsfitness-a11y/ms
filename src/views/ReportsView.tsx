import React, { useState } from 'react';
import { Member, Payment, GymSettings, AdminAccount } from '../types';
import { hasPermission } from '../lib/permissions';
import { BarChart3, Download, FileSpreadsheet, FileText, Calendar, Filter, IndianRupee, Users, Lock } from 'lucide-react';
import { exportReportToPdf } from '../lib/pdfReceipt';

interface Props {
  members: Member[];
  payments: Payment[];
  settings: GymSettings;
  currentAdmin?: AdminAccount;
}

type ReportType =
  | 'daily_collection'
  | 'monthly_collection'
  | 'payment_history'
  | 'active_members'
  | 'expired_members'
  | 'outstanding_dues';

export const ReportsView: React.FC<Props> = ({ members, payments, settings, currentAdmin }) => {
  const canExport = !currentAdmin || hasPermission(currentAdmin, 'reports.export');
  const [reportType, setReportType] = useState<ReportType>('daily_collection');
  const [startDate, setStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

  // Filter payments by date range
  const filteredPayments = payments.filter((p) => {
    return p.payment_date >= startDate && p.payment_date <= endDate;
  });

  // Export to CSV
  const handleExportCsv = () => {
    let filename = `MSFitness_${reportType}_${new Date().toISOString().slice(0, 10)}.csv`;
    let csvContent = 'data:text/csv;charset=utf-8,';

    if (reportType === 'payment_history' || reportType === 'daily_collection' || reportType === 'monthly_collection') {
      csvContent += 'Receipt No,Payment ID,Member Name,Member ID,Date,Amount Paid,Discount,Total Due,Remaining Balance,Method\n';
      filteredPayments.forEach((p) => {
        csvContent += `"${p.receipt_number || ''}","${p.payment_id}","${p.member_name || ''}","${p.member_code || ''}","${p.payment_date}","${p.amount}","${p.discount}","${p.total_due}","${p.remaining_balance}","${p.payment_method}"\n`;
      });
    } else {
      csvContent += 'Member ID,Name,Mobile,Email,Join Date,Expiry Date,Status,Plan Amount\n';
      const list = reportType === 'active_members'
        ? members.filter((m) => m.status === 'active')
        : reportType === 'expired_members'
        ? members.filter((m) => m.status === 'expired')
        : members;
      list.forEach((m) => {
        csvContent += `"${m.member_id}","${m.name}","${m.mobile}","${m.email || ''}","${m.join_date}","${m.membership_expiry}","${m.status}","${m.plan_amount}"\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to PDF
  const handleExportPdf = () => {
    let title = 'MS Fitness Financial & Member Report';
    let headers: string[] = [];
    let rows: (string | number)[][] = [];

    if (reportType === 'daily_collection' || reportType === 'monthly_collection' || reportType === 'payment_history') {
      title = reportType === 'daily_collection' ? 'Daily Collections Report' : reportType === 'monthly_collection' ? 'Monthly Collections Report' : 'Payment History Ledger';
      headers = ['Receipt', 'Member', 'Date', 'Amount', 'Balance Due', 'Method'];
      rows = filteredPayments.map((p) => [
        p.receipt_number || p.payment_id,
        p.member_name || 'Member',
        p.payment_date,
        `INR ${Number(p.amount).toLocaleString('en-IN')}`,
        `INR ${Number(p.remaining_balance).toLocaleString('en-IN')}`,
        p.payment_method,
      ]);
    } else {
      title = reportType === 'active_members' ? 'Active Gym Members' : reportType === 'expired_members' ? 'Expired Gym Members' : 'Outstanding Balances Report';
      headers = ['Member ID', 'Name', 'Mobile', 'Expiry', 'Status'];
      const list = reportType === 'active_members'
        ? members.filter((m) => m.status === 'active')
        : members.filter((m) => m.status === 'expired');
      rows = list.map((m) => [
        m.member_id,
        m.name,
        m.mobile,
        m.membership_expiry,
        m.status.toUpperCase(),
      ]);
    }

    exportReportToPdf(title, headers, rows, settings);
  };

  // Report Summary Statistics
  const totalCollectedInRange = filteredPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const totalRemainingInRange = filteredPayments.reduce((sum, p) => sum + (Number(p.remaining_balance) || 0), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-white font-display">
            AUDIT, REVENUE & GYM ANALYTICS REPORTS
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Export comprehensive revenue statements, outstanding ledger reports, and member directories to CSV and PDF.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canExport ? (
            <>
              <button
                onClick={handleExportCsv}
                className="px-4 py-2 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold flex items-center gap-2 border border-neutral-700 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Export CSV
              </button>
              <button
                onClick={handleExportPdf}
                className="px-4 py-2 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-lg shadow-red-600/20"
              >
                <FileText className="w-4 h-4" /> Download PDF Report
              </button>
            </>
          ) : (
            <div
              title="You do not have permission to export reports (reports.export)"
              className="px-4 py-2 rounded-2xl bg-neutral-800/80 text-neutral-500 text-xs font-medium flex items-center gap-2 border border-neutral-700/50 cursor-not-allowed"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Export Restricted</span>
            </div>
          )}
        </div>
      </div>

      {/* Filter Tabs & Date Range Bar */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-4 md:p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2 border-b border-neutral-800 pb-4">
          {[
            { id: 'daily_collection', label: 'Daily Collection' },
            { id: 'monthly_collection', label: 'Monthly Collection' },
            { id: 'payment_history', label: 'Payment Ledger' },
            { id: 'active_members', label: 'Active Members' },
            { id: 'expired_members', label: 'Expired Members' },
            { id: 'outstanding_dues', label: 'Outstanding Balances' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setReportType(tab.id as ReportType)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                reportType === tab.id
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                  : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Date controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <span className="text-neutral-400 font-semibold flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-red-500" /> Date Range:
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white focus:border-red-500 outline-none"
            />
            <span className="text-neutral-500">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white focus:border-red-500 outline-none"
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-neutral-950 px-3 py-1.5 rounded-xl border border-neutral-800">
              <span className="text-neutral-400">Total in Period: </span>
              <strong className="text-emerald-400 font-display text-sm">₹{totalCollectedInRange.toLocaleString('en-IN')}</strong>
            </div>
            <div className="bg-neutral-950 px-3 py-1.5 rounded-xl border border-neutral-800">
              <span className="text-neutral-400">Pending Dues: </span>
              <strong className="text-red-400 font-display text-sm">₹{totalRemainingInRange.toLocaleString('en-IN')}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Report Data Table */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl overflow-hidden">
        {reportType.includes('collection') || reportType === 'payment_history' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-950/80 border-b border-neutral-800 text-neutral-400 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Receipt Number</th>
                  <th className="py-3.5 px-4">Payment ID</th>
                  <th className="py-3.5 px-4">Member</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Mode</th>
                  <th className="py-3.5 px-4">Fee Paid</th>
                  <th className="py-3.5 px-4">Remaining Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/80 text-neutral-200">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-neutral-500">
                      No transactions recorded in the selected date range.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-neutral-800/40">
                      <td className="py-3.5 px-4 font-mono font-bold text-red-400">
                        {p.receipt_number || 'N/A'}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-neutral-400">{p.payment_id}</td>
                      <td className="py-3.5 px-4 font-semibold text-white">{p.member_name || 'Member'}</td>
                      <td className="py-3.5 px-4 text-neutral-300">{p.payment_date}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-neutral-800 text-[10px] font-bold">
                          {p.payment_method}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-emerald-400">
                        ₹{Number(p.amount).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-red-400">
                        ₹{Number(p.remaining_balance).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-950/80 border-b border-neutral-800 text-neutral-400 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Member ID</th>
                  <th className="py-3.5 px-4">Name</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4">Join Date</th>
                  <th className="py-3.5 px-4">Expiry Date</th>
                  <th className="py-3.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/80 text-neutral-200">
                {(reportType === 'active_members'
                  ? members.filter((m) => m.status === 'active')
                  : members.filter((m) => m.status === 'expired')
                ).map((m) => (
                  <tr key={m.id} className="hover:bg-neutral-800/40">
                    <td className="py-3.5 px-4 font-mono font-bold text-red-400">{m.member_id}</td>
                    <td className="py-3.5 px-4 font-semibold text-white">{m.name}</td>
                    <td className="py-3.5 px-4 text-neutral-300">{m.mobile}</td>
                    <td className="py-3.5 px-4 text-neutral-400">{m.join_date}</td>
                    <td className="py-3.5 px-4 font-mono font-medium">{m.membership_expiry}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        m.status === 'active' ? 'bg-emerald-950/60 text-emerald-400' : 'bg-red-950/60 text-red-400'
                      }`}>
                        {m.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
