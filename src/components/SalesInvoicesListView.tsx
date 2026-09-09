import React, { useState } from 'react';
import { SalesInvoice } from '../types';
import { formatPersianPrice } from '../utils/numberToWords';
import { isDateInRange } from '../utils/persianDate';
import {
  FileText,
  Search,
  Calendar,
  Edit3,
  Trash2,
  Printer,
  CheckCircle2,
  Clock,
  Filter,
  Eye,
  Plus,
  FileCheck,
  MessageSquare,
  Send
} from 'lucide-react';

interface SalesInvoicesListViewProps {
  invoices: SalesInvoice[];
  customerTitle?: string;
  onSelectEdit: (invoice: SalesInvoice) => void;
  onPrintInvoice: (invoice: SalesInvoice) => void;
  onTogglePaid: (id: string, paid: boolean) => Promise<void>;
  onDeleteInvoice: (id: string) => Promise<void>;
  onAddNewInvoice: () => void;
}

export const SalesInvoicesListView: React.FC<SalesInvoicesListViewProps> = ({
  invoices,
  customerTitle = 'مهمان',
  onSelectEdit,
  onPrintInvoice,
  onTogglePaid,
  onDeleteInvoice,
  onAddNewInvoice,
}) => {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'FINAL' | 'PROFORMA' | 'PAID' | 'UNPAID'>('ALL');

  // Direct share helper
  const handleDirectShare = (inv: SalesInvoice, type: 'whatsapp' | 'telegram') => {
    const text = encodeURIComponent(
      `🌿 صورتحساب ${inv.serialNumber}\n` +
      `👤 ${customerTitle}: ${inv.guestName}\n` +
      `📅 تاریخ: ${inv.date}\n` +
      `💰 مبلغ نهایی: ${formatPersianPrice(inv.totalPayable)} تومان\n` +
      `با تشکر از همراهی شما ✨`
    );

    const cleanedPhone = inv.guestPhone ? inv.guestPhone.replace(/\D/g, '').replace(/^0/, '98') : '';

    if (type === 'whatsapp') {
      const url = cleanedPhone
        ? `https://wa.me/${cleanedPhone}?text=${text}`
        : `https://api.whatsapp.com/send?text=${text}`;
      window.open(url, '_blank');
    } else {
      const url = `https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=${text}`;
      window.open(url, '_blank');
    }
  };

  // Filter logic
  const filteredInvoices = invoices.filter((inv) => {
    const matchesDate = isDateInRange(inv.date, startDate, endDate);
    const matchesSearch =
      inv.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inv.guestPhone && inv.guestPhone.includes(searchQuery));
    
    let matchesStatus = true;
    if (statusFilter === 'PAID') matchesStatus = !!inv.paid;
    else if (statusFilter === 'UNPAID') matchesStatus = !inv.paid;
    else if (statusFilter === 'PROFORMA') matchesStatus = inv.status === 'PROFORMA' || inv.invoiceKind === 'PROFORMA';
    else if (statusFilter === 'FINAL') matchesStatus = inv.status !== 'PROFORMA' && inv.invoiceKind !== 'PROFORMA';

    return matchesDate && matchesSearch && matchesStatus;
  });

  const totalFilteredSales = filteredInvoices.reduce((sum, inv) => sum + (inv.totalPayable || 0), 0);

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-amber-800" />
            لیست فاکتورها و پیش‌فاکتورهای فروش اقامتگاه
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            مشاهده، ویرایش، خروجی عکس و PDF، ارسال مستقیم به واتساپ و تلگرام {customerTitle}ان
          </p>
        </div>

        <button
          onClick={onAddNewInvoice}
          className="flex items-center gap-2 bg-amber-800 hover:bg-amber-900 text-white px-4 py-2.5 rounded-2xl text-xs font-bold shadow-xs transition-all cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-4 h-4 text-amber-300" />
          <span>صدور فاکتور جدید</span>
        </button>
      </div>

      {/* Date Range & Search Filter Toolbar */}
      <div className="bg-white rounded-3xl p-4 border border-amber-900/15 shadow-xs grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        
        {/* Start Date */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            از تاریخ:
          </label>
          <input
            type="text"
            placeholder="مثال: 1403/01/01"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-amber-700 outline-hidden"
          />
        </div>

        {/* End Date */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            تا تاریخ:
          </label>
          <input
            type="text"
            placeholder="مثال: 1403/12/29"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-amber-700 outline-hidden"
          />
        </div>

        {/* Search */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            جستجو (نام، شماره، سریال):
          </label>
          <input
            type="text"
            placeholder={`جستجو بر اساس نام ${customerTitle}، سریال فاکتور یا شماره تلفن...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-700 outline-hidden"
          />
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            فیلتر وضعیت سند:
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-amber-700 outline-hidden"
          >
            <option value="ALL">همه فاکتورها و پیش‌فاکتورها</option>
            <option value="FINAL">فقط فاکتورهای نهایی</option>
            <option value="PROFORMA">فقط پیش‌فاکتورها</option>
            <option value="PAID">فقط تسویه شده‌ها</option>
            <option value="UNPAID">دارای مانده حساب (تسویه نشده)</option>
          </select>
        </div>

      </div>

      {/* Summary Stat */}
      <div className="bg-amber-50 rounded-2xl p-3 border border-amber-200/80 flex items-center justify-between text-xs font-bold text-amber-950">
        <span>تعداد فاکتورهای یافت‌شده: {filteredInvoices.length} سند</span>
        <span>مجموع مبالغ قابل پرداخت: {formatPersianPrice(totalFilteredSales)} تومان</span>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-3xl border border-amber-900/15 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-900 text-white">
              <tr>
                <th className="px-3 py-3 text-center">شماره سند</th>
                <th className="px-3 py-3">تاریخ</th>
                <th className="px-4 py-3">نام {customerTitle}</th>
                <th className="px-3 py-3">نوع فاکتور</th>
                <th className="px-3 py-3">جمع اقلام</th>
                <th className="px-3 py-3">مبلغ نهایی</th>
                <th className="px-3 py-3 text-center">وضعیت تسویه</th>
                <th className="px-3 py-3 text-center min-w-[160px]">ارسال و عملیات</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">
                    هیچ فاکتور فروشی با مشخصات فیلتر شده یافت نشد.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const isProforma = inv.status === 'PROFORMA' || inv.invoiceKind === 'PROFORMA';
                  const isFullyPaid = inv.paid || (inv.remainingBalance === 0 && Number(inv.totalPayable) > 0);

                  return (
                    <tr
                      key={inv.id}
                      className="hover:bg-amber-50/40 transition-colors group cursor-pointer"
                      onClick={() => onSelectEdit(inv)}
                    >
                      <td className="px-3 py-3 font-mono font-bold text-amber-900 text-center">
                        {inv.serialNumber}
                      </td>
                      <td className="px-3 py-3 font-mono text-slate-600">{inv.date}</td>
                      <td className="px-4 py-3 font-bold text-slate-900">
                        {inv.guestName}
                        {inv.guestPhone && (
                          <span className="block text-[10px] text-slate-400 font-normal font-mono">
                            {inv.guestPhone}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                          isProforma ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {isProforma ? 'پیش‌فاکتور' : 'فاکتور قطعی'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-600 font-mono font-semibold">
                        {formatPersianPrice(inv.totalItemsAmount)}
                      </td>
                      <td className="px-3 py-3 font-black font-mono text-amber-950 text-sm">
                        {formatPersianPrice(inv.totalPayable)}
                      </td>

                      {/* Paid Toggle Button */}
                      <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => onTogglePaid(inv.id, !isFullyPaid)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer transition-all ${
                            isFullyPaid
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                          }`}
                          title="تغییر وضعیت تسویه"
                        >
                          {isFullyPaid ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Clock className="w-3.5 h-3.5 text-rose-600" />}
                          <span>{isFullyPaid ? 'تسویه کامل' : 'دارای مانده'}</span>
                        </button>
                      </td>

                      {/* Row Actions */}
                      <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          {/* WhatsApp Direct */}
                          <button
                            onClick={() => handleDirectShare(inv, 'whatsapp')}
                            className="p-1.5 text-emerald-700 hover:bg-emerald-100 rounded-lg cursor-pointer transition-all"
                            title="ارسال در واتساپ"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>

                          {/* Telegram Direct */}
                          <button
                            onClick={() => handleDirectShare(inv, 'telegram')}
                            className="p-1.5 text-sky-700 hover:bg-sky-100 rounded-lg cursor-pointer transition-all"
                            title="ارسال در تلگرام"
                          >
                            <Send className="w-4 h-4" />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => onSelectEdit(inv)}
                            className="p-1.5 text-slate-600 hover:text-amber-800 hover:bg-amber-100 rounded-lg cursor-pointer transition-all"
                            title="ویرایش فاکتور"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Print & PDF */}
                          <button
                            onClick={() => onPrintInvoice(inv)}
                            className="p-1.5 text-slate-600 hover:text-amber-800 hover:bg-amber-100 rounded-lg cursor-pointer transition-all"
                            title="چاپ / خروجی عکس و PDF"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => {
                              if (confirm(`آیا از حذف فاکتور ${inv.serialNumber} اطمینان دارید؟`)) {
                                onDeleteInvoice(inv.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-100 rounded-lg cursor-pointer transition-all"
                            title="حذف فاکتور"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
