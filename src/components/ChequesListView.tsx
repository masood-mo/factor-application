import React, { useState } from 'react';
import {
  CreditCard,
  Search,
  Plus,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Edit2,
  Calendar,
  Building,
  User,
  X,
  Check,
  BellRing
} from 'lucide-react';
import { Cheque, LodgeSettings } from '../types';
import { formatPersianPrice, getCurrentJalaliDate, getChequeAlarmStatus, formatPersianDate } from '../utils/persianDate';
import { PersianDatePicker } from './PersianDatePicker';

interface ChequesListViewProps {
  cheques: Cheque[];
  settings: LodgeSettings;
  onSaveCheque: (cheque: Partial<Cheque>) => Promise<Cheque>;
  onDeleteCheque: (id: string) => Promise<void>;
  onUpdateChequeStatus: (id: string, status: 'PENDING' | 'CLEARED' | 'BOUNCED', clearanceDate?: string) => Promise<void>;
}

export function ChequesListView({
  cheques,
  settings,
  onSaveCheque,
  onDeleteCheque,
  onUpdateChequeStatus
}: ChequesListViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'RECEIVABLE' | 'PAYABLE'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'CLEARED' | 'BOUNCED'>('ALL');
  const [isNewChequeModalOpen, setIsNewChequeModalOpen] = useState(false);
  const [editingChequeData, setEditingChequeData] = useState<Partial<Cheque>>({});

  const alarmDays = settings.chequeAlarmDays ?? 2;

  // Filter cheques
  const filteredCheques = cheques.filter((chq) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      chq.chequeNumber.includes(q) ||
      chq.bankName.toLowerCase().includes(q) ||
      chq.accountOwner.toLowerCase().includes(q) ||
      chq.recipientName.toLowerCase().includes(q) ||
      (chq.guestName && chq.guestName.toLowerCase().includes(q)) ||
      (chq.vendorName && chq.vendorName.toLowerCase().includes(q));

    const matchesType = typeFilter === 'ALL' || chq.type === typeFilter;
    const matchesStatus = statusFilter === 'ALL' || chq.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  // Calculate Due Alarm Cheques (Pending cheques within alarm threshold)
  const alarmCheques = cheques.filter((chq) => {
    if (chq.status !== 'PENDING') return false;
    const alarm = getChequeAlarmStatus(chq.dueDate, alarmDays);
    return alarm.isAlarm || alarm.isPast;
  });

  // Summary amounts
  const totalReceivablePending = cheques
    .filter((c) => c.type === 'RECEIVABLE' && c.status === 'PENDING')
    .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

  const totalPayablePending = cheques
    .filter((c) => c.type === 'PAYABLE' && c.status === 'PENDING')
    .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

  const handleOpenNewCheque = (type: 'RECEIVABLE' | 'PAYABLE' = 'RECEIVABLE') => {
    setEditingChequeData({
      type,
      chequeNumber: '',
      bankName: '',
      branchName: '',
      accountOwner: '',
      recipientName: settings.lodgeName || 'اقامتگاه بوم‌گردی خانه برزک',
      amount: 0,
      dueDate: getCurrentJalaliDate(),
      status: 'PENDING',
      notes: ''
    });
    setIsNewChequeModalOpen(true);
  };

  const handleSaveChequeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChequeData.chequeNumber || !editingChequeData.amount) return;
    await onSaveCheque(editingChequeData);
    setIsNewChequeModalOpen(false);
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex flex-col gap-6">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-amber-950 flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-amber-800" />
            مدیریت چک‌ها و سامانه اعلام سررسید
          </h2>
          <p className="text-xs text-amber-900/70 mt-1">
            پیگیری چک‌های دریافتی از مشتریان، چک‌های صادره به تامین‌کنندگان و آلارم سررسید ({alarmDays} روز قبل)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenNewCheque('RECEIVABLE')}
            className="flex items-center gap-2 bg-amber-800 hover:bg-amber-900 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-amber-300" />
            <span>ثبت چک دریافتی (مشتری)</span>
          </button>
          <button
            onClick={() => handleOpenNewCheque('PAYABLE')}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>ثبت چک پرداختی (فروشنده)</span>
          </button>
        </div>
      </div>

      {/* Alarm Banner if Any Cheques Due */}
      {alarmCheques.length > 0 && (
        <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl p-4.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 animate-bounce">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-rose-950">
                هشدار: تعداد {alarmCheques.length} فقره چک در آستانه سررسید یا گذشته از موعد است!
              </p>
              <p className="text-xs text-rose-700 mt-0.5">
                بر اساس تنظیمات سیستم، چک‌هایی که طی {alarmDays} روز آینده موعد آنهاست در زیر هایلایت شده‌اند.
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-rose-800 bg-rose-100 px-3 py-1.5 rounded-xl">
            نیاز به پیگیری بانکی
          </span>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-amber-900/15 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-emerald-800">چک‌های دریافتی در انتظار وصول</span>
            <p className="text-xl font-black text-slate-900 font-mono mt-1">
              {formatPersianPrice(totalReceivablePending)} <span className="text-xs font-normal">تومان</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-amber-900/15 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-rose-800">چک‌های پرداختی در انتظار پاس شدن</span>
            <p className="text-xl font-black text-slate-900 font-mono mt-1">
              {formatPersianPrice(totalPayablePending)} <span className="text-xs font-normal">تومان</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-amber-900/15 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-amber-800">کل چک‌های ثبت شده</span>
            <p className="text-xl font-black text-slate-900 mt-1">
              {cheques.length} <span className="text-xs font-normal">فقره چک</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 flex items-center justify-center">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-amber-900/15 shadow-xs grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
        <div className="relative md:col-span-2">
          <input
            type="text"
            placeholder="جستجو در شماره چک، نام بانک، صادرکننده یا دریافت‌کننده..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-9 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-700 outline-hidden bg-slate-50/50"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
        </div>

        <div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="w-full p-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-amber-700 outline-hidden font-semibold"
          >
            <option value="ALL">همه انواع چک‌ها</option>
            <option value="RECEIVABLE">چک‌های دریافتی (از مشتری)</option>
            <option value="PAYABLE">چک‌های پرداختی (به فروشنده)</option>
          </select>
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full p-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-amber-700 outline-hidden font-semibold"
          >
            <option value="ALL">همه وضعیت‌ها</option>
            <option value="PENDING">در انتظار وصول</option>
            <option value="CLEARED">وصول شده (پاس شده)</option>
            <option value="BOUNCED">برگشت خورده</option>
          </select>
        </div>
      </div>

      {/* Cheques Table */}
      <div className="bg-white rounded-2xl border border-amber-900/15 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 text-amber-200 border-b border-slate-800">
                <th className="py-3 px-3">نوع</th>
                <th className="py-3 px-3">شماره چک صیادی</th>
                <th className="py-3 px-3">بانک و شعبه</th>
                <th className="py-3 px-3">صاحب حساب</th>
                <th className="py-3 px-3">در وجه</th>
                <th className="py-3 px-3">مبلغ چک</th>
                <th className="py-3 px-3">تاریخ سررسید</th>
                <th className="py-3 px-3">وضعیت سررسید</th>
                <th className="py-3 px-3">وضعیت وصول</th>
                <th className="py-3 px-3 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCheques.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 font-medium">
                    هیچ چکی مطابق با فیلترهای انتخابی یافت نشد.
                  </td>
                </tr>
              ) : (
                filteredCheques.map((chq) => {
                  const alarm = getChequeAlarmStatus(chq.dueDate, alarmDays);
                  const isAlarmActive = chq.status === 'PENDING' && (alarm.isAlarm || alarm.isPast);

                  return (
                    <tr
                      key={chq.id}
                      className={`hover:bg-amber-50/40 transition-colors ${
                        isAlarmActive ? 'bg-rose-50/60 font-semibold' : ''
                      }`}
                    >
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          chq.type === 'RECEIVABLE' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {chq.type === 'RECEIVABLE' ? 'دریافتی' : 'پرداختی'}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-mono font-bold text-slate-900">
                        {chq.chequeNumber}
                      </td>

                      <td className="py-3 px-3 text-slate-700">
                        {chq.bankName} {chq.branchName ? `(${chq.branchName})` : ''}
                      </td>

                      <td className="py-3 px-3 text-slate-800 font-medium">
                        {chq.accountOwner}
                      </td>

                      <td className="py-3 px-3 text-slate-600">
                        {chq.recipientName}
                      </td>

                      <td className="py-3 px-3 font-mono font-black text-slate-900">
                        {formatPersianPrice(chq.amount)} <span className="text-[10px] font-normal">تومان</span>
                      </td>

                      <td className="py-3 px-3 font-bold text-slate-800">
                        {formatPersianDate(chq.dueDate)}
                      </td>

                      <td className="py-3 px-3">
                        {chq.status === 'PENDING' ? (
                          alarm.isPast ? (
                            <span className="text-rose-700 font-bold flex items-center gap-1 text-[11px]">
                              <AlertTriangle className="w-3.5 h-3.5" /> گذشته از موعد
                            </span>
                          ) : alarm.isToday ? (
                            <span className="text-rose-600 font-black animate-pulse flex items-center gap-1 text-[11px]">
                              <BellRing className="w-3.5 h-3.5" /> سررسید امروز
                            </span>
                          ) : alarm.isAlarm ? (
                            <span className="text-amber-700 font-bold flex items-center gap-1 text-[11px]">
                              <Clock className="w-3.5 h-3.5" /> {alarm.daysLeft} روز مانده
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[11px]">{alarm.daysLeft} روز مانده</span>
                          )
                        ) : (
                          <span className="text-slate-400 text-[11px]">
                            {chq.clearanceDate ? `وصول در ${chq.clearanceDate}` : '-'}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          chq.status === 'CLEARED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : chq.status === 'BOUNCED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {chq.status === 'CLEARED'
                            ? 'وصول شده'
                            : chq.status === 'BOUNCED'
                            ? 'برگشت خورده'
                            : 'در انتظار وصول'}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {chq.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => onUpdateChequeStatus(chq.id, 'CLEARED')}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                                title="ثبت وصول چک"
                              >
                                وصول شد
                              </button>
                              <button
                                onClick={() => onUpdateChequeStatus(chq.id, 'BOUNCED')}
                                className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                                title="ثبت برگشت چک"
                              >
                                برگشت
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => {
                              if (confirm(`آیا از حذف چک شماره ${chq.chequeNumber} اطمینان دارید؟`)) {
                                onDeleteCheque(chq.id);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                            title="حذف چک"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* New Cheque Modal */}
      {isNewChequeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-amber-900/20 flex flex-col gap-5 text-right">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-slate-900">
                {editingChequeData.type === 'RECEIVABLE' ? 'ثبت چک دریافتی از مشتری' : 'ثبت چک پرداختی به فروشنده'}
              </h3>
              <button
                onClick={() => setIsNewChequeModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveChequeSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نوع چک *</label>
                  <select
                    value={editingChequeData.type}
                    onChange={(e) => setEditingChequeData({ ...editingChequeData, type: e.target.value as any })}
                    className="w-full p-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-amber-700 outline-hidden font-bold"
                  >
                    <option value="RECEIVABLE">دریافتی (مربوط به فروش)</option>
                    <option value="PAYABLE">پرداختی (مربوط به خرید/هزینه)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">شماره ۱۶ رقمی صیادی *</label>
                  <input
                    type="text"
                    required
                    placeholder="شماره چک صیاد"
                    value={editingChequeData.chequeNumber || ''}
                    onChange={(e) => setEditingChequeData({ ...editingChequeData, chequeNumber: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-amber-700 outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نام بانک *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: بانک ملی، ملت، سپه"
                    value={editingChequeData.bankName || ''}
                    onChange={(e) => setEditingChequeData({ ...editingChequeData, bankName: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-700 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">شعبه</label>
                  <input
                    type="text"
                    placeholder="مثال: شعبه مرکزی کاشان"
                    value={editingChequeData.branchName || ''}
                    onChange={(e) => setEditingChequeData({ ...editingChequeData, branchName: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-700 outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">صاحب حساب / صادرکننده *</label>
                  <input
                    type="text"
                    required
                    placeholder="نام صادرکننده چک"
                    value={editingChequeData.accountOwner || ''}
                    onChange={(e) => setEditingChequeData({ ...editingChequeData, accountOwner: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-700 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">در وجه *</label>
                  <input
                    type="text"
                    required
                    placeholder="نام دریافت‌کننده چک"
                    value={editingChequeData.recipientName || ''}
                    onChange={(e) => setEditingChequeData({ ...editingChequeData, recipientName: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-700 outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">مبلغ چک (تومان) *</label>
                  <input
                    type="number"
                    required
                    placeholder="مبلغ به تومان"
                    value={editingChequeData.amount || ''}
                    onChange={(e) => setEditingChequeData({ ...editingChequeData, amount: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-amber-700 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاریخ سررسید *</label>
                  <PersianDatePicker
                    value={editingChequeData.dueDate || ''}
                    onChange={(newD) => setEditingChequeData({ ...editingChequeData, dueDate: newD })}
                    placeholder="انتخاب سررسید چک..."
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">توضیحات و بابت</label>
                <input
                  type="text"
                  placeholder="اختیاری"
                  value={editingChequeData.notes || ''}
                  onChange={(e) => setEditingChequeData({ ...editingChequeData, notes: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-700 outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewChequeModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 bg-amber-800 hover:bg-amber-900 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  <Check className="w-4 h-4 text-amber-300" />
                  <span>ذخیره چک در سیستم</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
