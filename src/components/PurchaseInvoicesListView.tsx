import React, { useState } from 'react';
import { PurchaseInvoice } from '../types';
import { formatPersianPrice } from '../utils/numberToWords';
import { isDateInRange } from '../utils/persianDate';
import { ShoppingBag, Search, Calendar, Edit3, Trash2, CheckCircle2, Clock, Filter, Plus } from 'lucide-react';

interface PurchaseInvoicesListViewProps {
  invoices: PurchaseInvoice[];
  onSelectEdit: (invoice: PurchaseInvoice) => void;
  onTogglePaid: (id: string, paid: boolean) => Promise<void>;
  onDeleteInvoice: (id: string) => Promise<void>;
  onAddNewInvoice: () => void;
}

export const PurchaseInvoicesListView: React.FC<PurchaseInvoicesListViewProps> = ({
  invoices,
  onSelectEdit,
  onTogglePaid,
  onDeleteInvoice,
  onAddNewInvoice,
}) => {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'UNPAID'>('ALL');

  const filteredInvoices = invoices.filter((inv) => {
    const matchesDate = isDateInRange(inv.date, startDate, endDate);
    const matchesSearch =
      inv.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.serialNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'PAID' && inv.paid) ||
      (statusFilter === 'UNPAID' && !inv.paid);

    return matchesDate && matchesSearch && matchesStatus;
  });

  const totalFilteredPurchases = filteredInvoices.reduce((sum, inv) => sum + inv.totalPaid, 0);

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-emerald-700" />
            پنجره لیست فاکتورهای خرید و هزینه‌ها
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            مدیریت فاکتورهای خرید از فروشندگان و تامین‌کنندگان اقامتگاه در بازه زمانی مشخص
          </p>
        </div>

        <button
          onClick={onAddNewInvoice}
          className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>ثبت فاکتور خرید جدید</span>
        </button>
      </div>

      {/* Date Range & Search Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            از تاریخ:
          </label>
          <input
            type="text"
            placeholder="مثال: 1403/01/01"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500 outline-hidden"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            تا تاریخ:
          </label>
          <input
            type="text"
            placeholder="مثال: 1403/12/29"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500 outline-hidden"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            جستجو (نام فروشنده / شماره فاکتور)
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="جستجو..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-8 py-1.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            وضعیت پرداخت
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden bg-white"
          >
            <option value="ALL">همه وضعیت‌ها</option>
            <option value="PAID">تسویه شده</option>
            <option value="UNPAID">در انتظار پرداخت</option>
          </select>
        </div>
      </div>

      {/* Total Banner */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 px-5 flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-emerald-900">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-emerald-700" />
          <span>تعداد فاکتورهای خرید یافت شده: {filteredInvoices.length} عدد</span>
        </div>
        <div>
          جمع کل هزینه‌ها و خریدهای این بازه: <span className="text-base text-emerald-800 font-extrabold mr-1">{formatPersianPrice(totalFilteredPurchases)}</span> تومان
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase">
              <tr>
                <th className="px-3 py-3 text-center">شماره ردیف</th>
                <th className="px-3 py-3">تاریخ</th>
                <th className="px-4 py-3">نام فروشنده / تامین کننده</th>
                <th className="px-3 py-3">تعداد اقلام</th>
                <th className="px-3 py-3">جمع کل خرید (تومان)</th>
                <th className="px-3 py-3">تخفیف</th>
                <th className="px-3 py-3 font-extrabold text-emerald-900">مبلغ پرداخت شده</th>
                <th className="px-3 py-3 text-center">وضعیت پرداخت</th>
                <th className="px-3 py-3 text-center">عملیات</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-slate-400">
                    هیچ فاکتور خریدی در این بازه زمانی یافت نشد.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-emerald-50/40 transition-colors cursor-pointer"
                    onClick={() => onSelectEdit(inv)}
                  >
                    <td className="px-3 py-3 font-mono font-bold text-emerald-800 text-center">
                      {inv.serialNumber}
                    </td>
                    <td className="px-3 py-3 font-mono text-slate-600">{inv.date}</td>
                    <td className="px-4 py-3 font-bold text-slate-800">{inv.vendorName}</td>
                    <td className="px-3 py-3 text-slate-600 font-medium">
                      {inv.items?.length || 0} ردیف
                    </td>
                    <td className="px-3 py-3 text-slate-700 font-semibold">
                      {formatPersianPrice(inv.totalAmount)}
                    </td>
                    <td className="px-3 py-3 text-rose-600 font-semibold">
                      {formatPersianPrice(inv.totalDiscount)}
                    </td>
                    <td className="px-3 py-3 font-black text-emerald-900 text-sm">
                      {formatPersianPrice(inv.totalPaid)}
                    </td>

                    <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => onTogglePaid(inv.id, !inv.paid)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer transition-all ${
                          inv.paid
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                        }`}
                        title="تغییر وضعیت پرداخت"
                      >
                        {inv.paid ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Clock className="w-3.5 h-3.5 text-amber-600" />}
                        <span>{inv.paid ? 'تسویه شده' : 'معوق'}</span>
                      </button>
                    </td>

                    <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onSelectEdit(inv)}
                          className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-100 rounded-lg cursor-pointer"
                          title="ویرایش فاکتور خرید"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            if (confirm(`آیا از حذف فاکتور خرید ${inv.serialNumber} اطمینان دارید؟`)) {
                              onDeleteInvoice(inv.id);
                            }
                          }}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-100 rounded-lg cursor-pointer"
                          title="حذف فاکتور"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
