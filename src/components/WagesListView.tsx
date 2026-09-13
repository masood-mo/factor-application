import React, { useState } from 'react';
import {
  Banknote,
  Search,
  Plus,
  UserCheck,
  Calendar,
  CreditCard,
  Trash2,
  Edit2,
  X,
  Check,
  Award,
  Clock
} from 'lucide-react';
import { WagePayment } from '../types';
import { formatPersianPrice, getCurrentJalaliDate, formatPersianDate } from '../utils/persianDate';

interface WagesListViewProps {
  wagePayments: WagePayment[];
  onSaveWagePayment: (wage: Partial<WagePayment>) => Promise<WagePayment>;
  onDeleteWagePayment: (id: string) => Promise<void>;
}

export function WagesListView({
  wagePayments,
  onSaveWagePayment,
  onDeleteWagePayment
}: WagesListViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWage, setEditingWage] = useState<Partial<WagePayment>>({});

  const filteredWages = wagePayments.filter((w) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      w.employeeName.toLowerCase().includes(q) ||
      w.role.toLowerCase().includes(q) ||
      (w.period && w.period.toLowerCase().includes(q)) ||
      (w.notes && w.notes.toLowerCase().includes(q))
    );
  });

  const totalPayroll = wagePayments.reduce((sum, w) => sum + (Number(w.amount) || 0), 0);

  const handleOpenNewWage = () => {
    setEditingWage({
      employeeName: '',
      role: 'سرپرست پذیرش و خدمات',
      phone: '',
      date: getCurrentJalaliDate(),
      amount: 0,
      type: 'SALARY',
      paymentMethod: 'CARD_TO_CARD',
      referenceNumber: '',
      period: 'مرداد ۱۴۰۳',
      notes: '',
      paid: true
    });
    setIsModalOpen(true);
  };

  const handleSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWage.employeeName || !editingWage.amount) return;
    await onSaveWagePayment(editingWage);
    setIsModalOpen(false);
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex flex-col gap-6">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-amber-950 flex items-center gap-2">
            <Banknote className="w-6 h-6 text-amber-800" />
            ثبت و مدیریت پرداخت دستمزد و حقوق پرسنل
          </h2>
          <p className="text-xs text-amber-900/70 mt-1">
            ثبت اسناد حقوق ماهانه، دستمزد ساعتی، پاداش، انعام و مساعده همکاران اقامتگاه
          </p>
        </div>

        <button
          onClick={handleOpenNewWage}
          className="flex items-center gap-2 bg-amber-800 hover:bg-amber-900 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-4 h-4 text-amber-300" />
          <span>ثبت پرداخت دستمزد جدید</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-amber-900/15 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">مجموع کل دستمزدهای پرداختی</span>
            <p className="text-2xl font-black text-slate-900 font-mono mt-1">
              {formatPersianPrice(totalPayroll)} <span className="text-xs font-normal">تومان</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 flex items-center justify-center">
            <Banknote className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-amber-900/15 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">تعداد پرداخت‌های ثبت شده</span>
            <p className="text-2xl font-black text-slate-900 mt-1">
              {wagePayments.length} <span className="text-xs font-normal">سند</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-amber-900/15 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">وضعیت در تراز مالی</span>
            <p className="text-sm font-bold text-amber-900 mt-1">
              کسر خودکار از سرجمع هزینه‌های اقامتگاه
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <Award className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-amber-900/15 shadow-xs flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="جستجوی نام پرسنل، سمت، دوره یا توضیحات دستمزد..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-9 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-700 outline-hidden bg-slate-50/50"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
        </div>
      </div>

      {/* Wages Table */}
      <div className="bg-white rounded-2xl border border-amber-900/15 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 text-amber-200 border-b border-slate-800">
                <th className="py-3 px-3">نام پرسنل</th>
                <th className="py-3 px-3">سمت و جایگاه</th>
                <th className="py-3 px-3">نوع پرداخت</th>
                <th className="py-3 px-3">دوره / بابت</th>
                <th className="py-3 px-3">تاریخ پرداخت</th>
                <th className="py-3 px-3">شیوه پرداخت</th>
                <th className="py-3 px-3">شماره پیگیری</th>
                <th className="py-3 px-3">مبلغ پرداختی</th>
                <th className="py-3 px-3 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredWages.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
                    تاکنون هیچ سند پرداخت دستمزدی ثبت نشده است.
                  </td>
                </tr>
              ) : (
                filteredWages.map((w) => (
                  <tr key={w.id} className="hover:bg-amber-50/40 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-900">
                      {w.employeeName}
                    </td>

                    <td className="py-3 px-3 text-slate-700">
                      {w.role}
                    </td>

                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800">
                        {w.type === 'SALARY'
                          ? 'حقوق ماهانه'
                          : w.type === 'HOURLY'
                          ? 'دستمزد ساعتی/روزمزد'
                          : w.type === 'BONUS'
                          ? 'پاداش و عیدی'
                          : w.type === 'OVERTIME'
                          ? 'اضافه‌کاری'
                          : 'مساعده'}
                      </span>
                    </td>

                    <td className="py-3 px-3 font-medium text-slate-600">
                      {w.period || '-'}
                    </td>

                    <td className="py-3 px-3 font-bold text-slate-800">
                      {formatPersianDate(w.date)}
                    </td>

                    <td className="py-3 px-3 text-slate-700">
                      {w.paymentMethod === 'CARD_TO_CARD'
                        ? 'کارت‌به‌کارت'
                        : w.paymentMethod === 'CASH'
                        ? 'نقدی'
                        : 'چک'}
                    </td>

                    <td className="py-3 px-3 font-mono text-slate-500">
                      {w.referenceNumber || '-'}
                    </td>

                    <td className="py-3 px-3 font-mono font-black text-slate-900">
                      {formatPersianPrice(w.amount)} <span className="text-[10px] font-normal">تومان</span>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => {
                          if (confirm(`آیا از حذف سند دستمزد ${w.employeeName} اطمینان دارید؟`)) {
                            onDeleteWagePayment(w.id);
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        title="حذف سند"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Wage Payment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-amber-900/20 flex flex-col gap-5 text-right">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-slate-900">ثبت سند پرداخت دستمزد و حقوق پرسنل</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نام پرسنل / کارمند *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: علی اکبری"
                    value={editingWage.employeeName || ''}
                    onChange={(e) => setEditingWage({ ...editingWage, employeeName: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-amber-700 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">سمت / شغل</label>
                  <input
                    type="text"
                    placeholder="مثال: سرآشپز، راهنمای محلی"
                    value={editingWage.role || ''}
                    onChange={(e) => setEditingWage({ ...editingWage, role: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-700 outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نوع پرداخت</label>
                  <select
                    value={editingWage.type}
                    onChange={(e) => setEditingWage({ ...editingWage, type: e.target.value as any })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-amber-700 outline-hidden font-semibold"
                  >
                    <option value="SALARY">حقوق ماهانه</option>
                    <option value="HOURLY">دستمزد روزمزد / ساعتی</option>
                    <option value="BONUS">پاداش و عیدی</option>
                    <option value="OVERTIME">اضافه‌کاری</option>
                    <option value="ADVANCE">مساعده</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">دوره مربوطه</label>
                  <input
                    type="text"
                    placeholder="مثال: مرداد ۱۴۰۳"
                    value={editingWage.period || ''}
                    onChange={(e) => setEditingWage({ ...editingWage, period: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-700 outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">مبلغ پرداختی (تومان) *</label>
                  <input
                    type="number"
                    required
                    placeholder="مبلغ به تومان"
                    value={editingWage.amount || ''}
                    onChange={(e) => setEditingWage({ ...editingWage, amount: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-amber-700 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاریخ پرداخت *</label>
                  <input
                    type="text"
                    required
                    placeholder="1403/05/30"
                    value={editingWage.date || ''}
                    onChange={(e) => setEditingWage({ ...editingWage, date: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-amber-700 outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">شیوه پرداخت</label>
                  <select
                    value={editingWage.paymentMethod}
                    onChange={(e) => setEditingWage({ ...editingWage, paymentMethod: e.target.value as any })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-amber-700 outline-hidden"
                  >
                    <option value="CARD_TO_CARD">کارت‌به‌کارت / انتقال شبا</option>
                    <option value="CASH">نقدی</option>
                    <option value="CHEQUE">چک</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">شماره پیگیری فیش</label>
                  <input
                    type="text"
                    placeholder="اختیاری"
                    value={editingWage.referenceNumber || ''}
                    onChange={(e) => setEditingWage({ ...editingWage, referenceNumber: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-amber-700 outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">توضیحات و یادداشت</label>
                <input
                  type="text"
                  placeholder="اختیاری"
                  value={editingWage.notes || ''}
                  onChange={(e) => setEditingWage({ ...editingWage, notes: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-700 outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 bg-amber-800 hover:bg-amber-900 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  <Check className="w-4 h-4 text-amber-300" />
                  <span>ذخیره سند دستمزد</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
