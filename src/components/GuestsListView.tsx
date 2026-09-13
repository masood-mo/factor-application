import React, { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Phone,
  Briefcase,
  MapPin,
  Wallet,
  FileText,
  Edit2,
  Trash2,
  Tag,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  Check,
  CreditCard
} from 'lucide-react';
import { Guest, SalesInvoice, WalletTransaction } from '../types';
import { formatPersianPrice, getCurrentJalaliDate, formatPersianDate } from '../utils/persianDate';

interface GuestsListViewProps {
  guests: Guest[];
  salesInvoices: SalesInvoice[];
  walletTransactions: WalletTransaction[];
  customerTitle: string;
  onSaveGuest: (guest: Partial<Guest>) => Promise<Guest>;
  onDeleteGuest: (id: string) => Promise<void>;
  onRecordWalletTransaction: (tx: Partial<WalletTransaction>) => Promise<WalletTransaction>;
  onIssueInvoiceForGuest: (guest: Guest) => void;
}

export function GuestsListView({
  guests,
  salesInvoices,
  walletTransactions,
  customerTitle,
  onSaveGuest,
  onDeleteGuest,
  onRecordWalletTransaction,
  onIssueInvoiceForGuest
}: GuestsListViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGuestForProfile, setSelectedGuestForProfile] = useState<Guest | null>(null);
  const [selectedGuestForWallet, setSelectedGuestForWallet] = useState<Guest | null>(null);
  const [isEditingGuestModalOpen, setIsEditingGuestModalOpen] = useState(false);
  const [editingGuestData, setEditingGuestData] = useState<Partial<Guest>>({});

  // Wallet form state
  const [walletAmount, setWalletAmount] = useState<string>('');
  const [walletType, setWalletType] = useState<'DEPOSIT' | 'WITHDRAWAL' | 'REFUND'>('DEPOSIT');
  const [walletMethod, setWalletMethod] = useState<'CASH' | 'POS' | 'CHEQUE' | 'CARD_TO_CARD'>('POS');
  const [walletRef, setWalletRef] = useState<string>('');
  const [walletChequeNum, setWalletChequeNum] = useState<string>('');
  const [walletDesc, setWalletDesc] = useState<string>('');

  const filteredGuests = guests.filter((g) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      g.name.toLowerCase().includes(q) ||
      (g.phone && g.phone.includes(q)) ||
      (g.job && g.job.toLowerCase().includes(q)) ||
      (g.city && g.city.toLowerCase().includes(q)) ||
      (g.description && g.description.toLowerCase().includes(q))
    );
  });

  const handleOpenNewGuestModal = () => {
    setEditingGuestData({
      name: '',
      phone: '',
      nationalCode: '',
      job: '',
      city: '',
      description: '',
      walletBalance: 0,
      tags: [],
      createdAt: getCurrentJalaliDate()
    });
    setIsEditingGuestModalOpen(true);
  };

  const handleOpenEditGuestModal = (guest: Guest) => {
    setEditingGuestData(guest);
    setIsEditingGuestModalOpen(true);
  };

  const handleSaveGuestForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGuestData.name?.trim()) return;
    await onSaveGuest(editingGuestData);
    setIsEditingGuestModalOpen(false);
  };

  const handleSaveWalletTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGuestForWallet || !walletAmount) return;
    const amt = parseFloat(walletAmount.replace(/,/g, ''));
    if (isNaN(amt) || amt <= 0) return;

    await onRecordWalletTransaction({
      guestId: selectedGuestForWallet.id,
      guestName: selectedGuestForWallet.name,
      type: walletType,
      amount: amt,
      date: getCurrentJalaliDate(),
      method: walletMethod,
      referenceNumber: walletRef,
      chequeNumber: walletChequeNum,
      description: walletDesc || (walletType === 'DEPOSIT' ? 'شارژ / پیش‌پرداخت کیف پول' : 'برداشت از کیف پول')
    });

    setWalletAmount('');
    setWalletRef('');
    setWalletChequeNum('');
    setWalletDesc('');
    setSelectedGuestForWallet(null);
  };

  // Helper to get total invoices & total spent for a guest
  const getGuestStats = (guest: Guest) => {
    const invs = salesInvoices.filter(
      (inv) => inv.guestId === guest.id || (guest.phone && inv.guestPhone === guest.phone) || inv.guestName === guest.name
    );
    const totalSpent = invs.reduce((sum, inv) => sum + (Number(inv.totalPayable) || 0), 0);
    return {
      invoicesCount: invs.length,
      totalSpent,
      invoices: invs
    };
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex flex-col gap-6">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-amber-950 flex items-center gap-2">
            <Users className="w-6 h-6 text-amber-800" />
            لیست و پروفایل {customerTitle}‌های اقامتگاه
          </h2>
          <p className="text-xs text-amber-900/70 mt-1">
            مشاهده سوابق اقامت، شغل، شماره تماس، توصیف علایق و مدیریت کیف پول پیش‌پرداخت
          </p>
        </div>

        <button
          onClick={handleOpenNewGuestModal}
          className="flex items-center gap-2 bg-amber-800 hover:bg-amber-900 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-4 h-4 text-amber-300" />
          <span>افزودن {customerTitle} جدید</span>
        </button>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl p-4 border border-amber-900/15 shadow-xs flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder={`جستجوی نام، شماره تماس، شغل، شهر یا توضیحات ${customerTitle}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-9 py-2 border border-amber-900/20 rounded-xl text-xs focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700 outline-hidden bg-slate-50/50"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
        </div>
        <div className="text-xs text-slate-500 font-semibold whitespace-nowrap">
          تعداد کل: <span className="text-amber-900 font-bold">{filteredGuests.length}</span> نفر
        </div>
      </div>

      {/* Guests Grid */}
      {filteredGuests.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-amber-900/20 flex flex-col items-center justify-center">
          <Users className="w-12 h-12 text-amber-800/30 mb-3" />
          <p className="text-sm font-bold text-amber-950">هیچ {customerTitle}ی یافت نشد</p>
          <p className="text-xs text-slate-400 mt-1">با زدن دکمه «افزودن {customerTitle} جدید» شروع کنید</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGuests.map((guest) => {
            const stats = getGuestStats(guest);
            return (
              <div
                key={guest.id}
                className="bg-white rounded-2xl p-5 border border-amber-900/15 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-4"
              >
                {/* Guest Top Info */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                        {guest.name}
                      </h3>
                      {guest.job && (
                        <p className="text-xs text-amber-800 flex items-center gap-1 mt-0.5 font-medium">
                          <Briefcase className="w-3.5 h-3.5" />
                          <span>{guest.job}</span>
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditGuestModal(guest)}
                        className="p-1.5 text-slate-400 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-all"
                        title="ویرایش مشخصات"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`آیا از حذف ${customerTitle} "${guest.name}" اطمینان دارید؟`)) {
                            onDeleteGuest(guest.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        title="حذف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="space-y-1.5 text-xs text-slate-600 my-3 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                    {guest.phone && (
                      <p className="flex items-center justify-between">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5" /> شماره تماس:
                        </span>
                        <span className="font-mono font-bold text-slate-800">{guest.phone}</span>
                      </p>
                    )}
                    {guest.city && (
                      <p className="flex items-center justify-between">
                        <span className="text-slate-400 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" /> شهر / مبدا:
                        </span>
                        <span className="font-medium text-slate-800">{guest.city}</span>
                      </p>
                    )}
                    <p className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Wallet className="w-3.5 h-3.5" /> موجودی کیف پول:
                      </span>
                      <span className="font-bold text-emerald-700 font-mono">
                        {formatPersianPrice(guest.walletBalance)} تومان
                      </span>
                    </p>
                    <p className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" /> تعداد فاکتورها:
                      </span>
                      <span className="font-semibold text-slate-700">{stats.invoicesCount} فاکتور</span>
                    </p>
                  </div>

                  {/* Notes / Description */}
                  {guest.description && (
                    <p className="text-[11px] text-amber-950/80 bg-amber-50/60 p-2.5 rounded-xl border border-amber-200/50 line-clamp-2 leading-relaxed">
                      {guest.description}
                    </p>
                  )}
                </div>

                {/* Card Bottom Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => setSelectedGuestForProfile(guest)}
                    className="flex-1 py-2 text-center text-xs font-bold text-amber-900 bg-amber-100/70 hover:bg-amber-200/70 rounded-xl transition-all cursor-pointer"
                  >
                    پروفایل کامل
                  </button>
                  <button
                    onClick={() => setSelectedGuestForWallet(guest)}
                    className="py-2 px-3 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                    title="مدیریت کیف پول"
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    <span>کیف پول</span>
                  </button>
                  <button
                    onClick={() => onIssueInvoiceForGuest(guest)}
                    className="py-2 px-3 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                    title={`صدور فاکتور برای این ${customerTitle}`}
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-300" />
                    <span>فاکتور</span>
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Guest Profile Details Modal */}
      {selectedGuestForProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-amber-900/20 max-h-[90vh] overflow-y-auto flex flex-col gap-5 text-right">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-800 text-white flex items-center justify-center font-black text-lg">
                  {selectedGuestForProfile.name[0] || 'م'}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{selectedGuestForProfile.name}</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {selectedGuestForProfile.job || `پروفایل ${customerTitle}`} {selectedGuestForProfile.city ? `• اهل ${selectedGuestForProfile.city}` : ''}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedGuestForProfile(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Information Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <span className="text-[11px] text-slate-400">شماره تلفن همراه</span>
                <p className="text-sm font-bold text-slate-800 font-mono mt-0.5">
                  {selectedGuestForProfile.phone || 'ثبت نشده'}
                </p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <span className="text-[11px] text-slate-400">کد ملی / شناسه</span>
                <p className="text-sm font-bold text-slate-800 font-mono mt-0.5">
                  {selectedGuestForProfile.nationalCode || 'ثبت نشده'}
                </p>
              </div>

              <div className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-200">
                <span className="text-[11px] text-emerald-700">موجودی کیف پول</span>
                <p className="text-sm font-bold text-emerald-900 font-mono mt-0.5">
                  {formatPersianPrice(selectedGuestForProfile.walletBalance)} تومان
                </p>
              </div>
            </div>

            {/* Description & Preferences */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 mb-2">توصیف، سلیقه و نیازمندی‌های مهمان:</h4>
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 text-xs text-amber-950 leading-relaxed font-medium">
                {selectedGuestForProfile.description || 'توضیحات و ترجیحاتی برای این مهمان ثبت نشده است.'}
              </div>
            </div>

            {/* Invoices History */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 mb-2">سوابق فاکتورهای صادر شده:</h4>
              {(() => {
                const guestStats = getGuestStats(selectedGuestForProfile);
                if (guestStats.invoices.length === 0) {
                  return (
                    <p className="text-xs text-slate-400 bg-slate-50 p-4 rounded-xl text-center">
                      تاکنون فاکتوری برای این مهمان ثبت نشده است.
                    </p>
                  );
                }
                return (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {guestStats.invoices.map((inv) => (
                      <div
                        key={inv.id}
                        className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-slate-700">{inv.serialNumber}</span>
                          <span className="text-slate-600 font-bold">{formatPersianDate(inv.date)}</span>
                          <span className="text-slate-600">{inv.items.length} ردیف</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold font-mono text-slate-900">
                            {formatPersianPrice(inv.totalPayable)} تومان
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            inv.paid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {inv.paid ? 'تسویه شده' : 'معوق'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedGuestForProfile(null)}
                className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 cursor-pointer"
              >
                بستن پنجره
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Guest Wallet Management Modal */}
      {selectedGuestForWallet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-amber-900/20 flex flex-col gap-5 text-right">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shadow-xs">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">مدیریت کیف پول {customerTitle}</h3>
                  <p className="text-xs text-slate-500 font-medium">{selectedGuestForWallet.name}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedGuestForWallet(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Balance Banner */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-emerald-800 font-semibold">موجودی فعلی کیف پول:</span>
                <p className="text-2xl font-black text-emerald-950 mt-1 font-mono">
                  {formatPersianPrice(selectedGuestForWallet.walletBalance)} <span className="text-xs font-normal">تومان</span>
                </p>
              </div>
              <div className="text-xs text-emerald-700 bg-emerald-100/80 px-3 py-1.5 rounded-xl font-bold">
                پیش‌پرداخت معتبر
              </div>
            </div>

            {/* Deposit / Withdraw Form */}
            <form onSubmit={handleSaveWalletTx} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نوع عملیات:</label>
                  <select
                    value={walletType}
                    onChange={(e) => setWalletType(e.target.value as any)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-emerald-500 outline-hidden font-bold"
                  >
                    <option value="DEPOSIT">واریز / شارژ (پیش‌پرداخت)</option>
                    <option value="WITHDRAWAL">برداشت / کسر از کیف پول</option>
                    <option value="REFUND">عودت وجه به مهمان</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">مبلغ (تومان):</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: 500,000"
                    value={walletAmount}
                    onChange={(e) => setWalletAmount(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">شیوه پرداخت:</label>
                  <select
                    value={walletMethod}
                    onChange={(e) => setWalletMethod(e.target.value as any)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  >
                    <option value="POS">کارتخوان / کارت‌به‌کارت</option>
                    <option value="CASH">نقدی</option>
                    <option value="CHEQUE">چک صیادی</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {walletMethod === 'CHEQUE' ? 'شماره چک صیادی:' : 'شماره پیگیری / مرجع:'}
                  </label>
                  <input
                    type="text"
                    placeholder="اختیاری"
                    value={walletMethod === 'CHEQUE' ? walletChequeNum : walletRef}
                    onChange={(e) => walletMethod === 'CHEQUE' ? setWalletChequeNum(e.target.value) : setWalletRef(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">توضیحات و بابت:</label>
                <input
                  type="text"
                  placeholder="مثال: پیش‌پرداخت رزرو اتاق شاه‌نشین برای تاریخ ۱۵ مهر"
                  value={walletDesc}
                  onChange={(e) => setWalletDesc(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedGuestForWallet(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>ثبت تراکنش کیف پول</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Edit / New Guest Modal */}
      {isEditingGuestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-amber-900/20 flex flex-col gap-5 text-right">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-slate-900">
                {editingGuestData.id ? `ویرایش اطلاعات ${customerTitle}` : `ثبت ${customerTitle} جدید`}
              </h3>
              <button
                onClick={() => setIsEditingGuestModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGuestForm} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نام و نام خانوادگی *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: آقای مسعود ملایی"
                    value={editingGuestData.name || ''}
                    onChange={(e) => setEditingGuestData({ ...editingGuestData, name: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-amber-700 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">شماره همراه</label>
                  <input
                    type="text"
                    placeholder="0913..."
                    value={editingGuestData.phone || ''}
                    onChange={(e) => setEditingGuestData({ ...editingGuestData, phone: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-amber-700 outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">شغل / حرفه</label>
                  <input
                    type="text"
                    placeholder="مثال: پزشک، مهندس، مدرس"
                    value={editingGuestData.job || ''}
                    onChange={(e) => setEditingGuestData({ ...editingGuestData, job: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-700 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">شهر / محل سکونت</label>
                  <input
                    type="text"
                    placeholder="مثال: اصفهان، تهران"
                    value={editingGuestData.city || ''}
                    onChange={(e) => setEditingGuestData({ ...editingGuestData, city: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-700 outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">کد ملی / شناسه هویت</label>
                <input
                  type="text"
                  placeholder="۱۰ رقم کد ملی"
                  value={editingGuestData.nationalCode || ''}
                  onChange={(e) => setEditingGuestData({ ...editingGuestData, nationalCode: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-amber-700 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">توصیف متنی، سلیقه و نیازمندی‌ها</label>
                <textarea
                  rows={3}
                  placeholder="مثال: علاقه‌مند به غذاهای گیاهی، ترجیح اتاق طبقه بالا، مشتری پاییز و ایام گلاب‌گیری..."
                  value={editingGuestData.description || ''}
                  onChange={(e) => setEditingGuestData({ ...editingGuestData, description: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-700 outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditingGuestModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 bg-amber-800 hover:bg-amber-900 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  <Check className="w-4 h-4 text-amber-300" />
                  <span>ذخیره {customerTitle}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
