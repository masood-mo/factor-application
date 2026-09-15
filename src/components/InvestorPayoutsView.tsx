import React, { useState, useMemo } from 'react';
import {
  Award,
  Search,
  Plus,
  Trash2,
  Edit2,
  X,
  Check,
  CreditCard,
  Building2,
  Calendar,
  Users,
  Copy,
  DollarSign,
  TrendingUp,
  Percent,
  CheckCircle2,
  HelpCircle,
  Phone,
  Layers,
  ArrowRightLeft,
  Loader2
} from 'lucide-react';
import { Investor, InvestorPayout, LodgeSettings, SalesInvoice, PurchaseInvoice, WagePayment } from '../types';
import { formatPersianPrice, getCurrentJalaliDate, formatPersianDate } from '../utils/persianDate';
import { PersianDatePicker } from './PersianDatePicker';

interface InvestorPayoutsViewProps {
  investors: Investor[];
  investorPayouts: InvestorPayout[];
  settings: LodgeSettings;
  salesInvoices: SalesInvoice[];
  purchaseInvoices: PurchaseInvoice[];
  wagePayments: WagePayment[];
  onSaveInvestor: (investor: Partial<Investor>) => Promise<Investor>;
  onDeleteInvestor: (id: string) => Promise<void>;
  onSaveInvestorPayout: (payout: Partial<InvestorPayout>) => Promise<InvestorPayout>;
  onDeleteInvestorPayout: (id: string) => Promise<void>;
}

export function InvestorPayoutsView({
  investors,
  investorPayouts,
  settings,
  salesInvoices,
  purchaseInvoices,
  wagePayments,
  onSaveInvestor,
  onDeleteInvestor,
  onSaveInvestorPayout,
  onDeleteInvestorPayout
}: InvestorPayoutsViewProps) {
  // Navigation sub-tabs or search
  const [searchPayoutQuery, setSearchPayoutQuery] = useState('');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Modal States - Investor Form
  const [isInvestorModalOpen, setIsInvestorModalOpen] = useState(false);
  const [editingInvestor, setEditingInvestor] = useState<Partial<Investor>>({});
  const [isSavingInvestor, setIsSavingInvestor] = useState(false);
  const [deletingInvestorId, setDeletingInvestorId] = useState<string | null>(null);

  // Modal States - Payout Form
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [editingPayout, setEditingPayout] = useState<Partial<InvestorPayout>>({});
  const [isSavingPayout, setIsSavingPayout] = useState(false);
  const [deletingPayoutId, setDeletingPayoutId] = useState<string | null>(null);

  // Calculate Net Profit & Investor Share Pool from system data
  const profitMetrics = useMemo(() => {
    // 1. Total revenue
    const totalRevenue = salesInvoices.reduce((sum, inv) => sum + (Number(inv.totalPayable) || 0), 0);
    
    // 2. Total expenses (purchases + staff wages)
    const totalPurchases = purchaseInvoices.reduce(
      (sum, inv) => sum + (Number(inv.totalAmount || inv.totalPaidAmount) || 0),
      0
    );
    const totalWages = wagePayments.reduce((sum, w) => sum + (Number(w.amount) || 0), 0);
    const totalExpenses = totalPurchases + totalWages;

    // 3. Net base profit
    const netBaseProfit = Math.max(0, totalRevenue - totalExpenses);

    // 4. Approved budget row percentage for investor share
    const investorBudgetRow = (settings.budgetRows || []).find(
      (r) => r.isInvestorShare || r.name.includes('سرمایه‌گذار')
    );
    const approvedPercent = investorBudgetRow
      ? Number(investorBudgetRow.percentage)
      : (settings.investorSharePercent || 35);

    // 5. Total pool to distribute among investors
    const totalInvestorPool = Math.round((netBaseProfit * approvedPercent) / 100);

    return {
      totalRevenue,
      totalExpenses,
      netBaseProfit,
      approvedPercent,
      totalInvestorPool
    };
  }, [salesInvoices, purchaseInvoices, wagePayments, settings]);

  // Overall Statistics
  const totalPayoutsSum = investorPayouts.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const totalSharesSum = investors.reduce((sum, inv) => sum + (Number(inv.sharePercent) || 0), 0);

  // Copy to clipboard helper
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2500);
  };

  // --- Investor Management Handlers ---
  const handleOpenNewInvestor = () => {
    setEditingInvestor({
      name: '',
      sharePercent: 50,
      phone: '',
      nationalCode: '',
      cardNumber: '',
      shaba: '',
      notes: ''
    });
    setIsInvestorModalOpen(true);
  };

  const handleOpenEditInvestor = (inv: Investor) => {
    setEditingInvestor({ ...inv });
    setIsInvestorModalOpen(true);
  };

  const handleSaveInvestorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvestor.name?.trim()) return;
    try {
      setIsSavingInvestor(true);
      await onSaveInvestor(editingInvestor);
      setIsInvestorModalOpen(false);
    } catch (err) {
      console.error('Error saving investor:', err);
      alert('خطا در ذخیره اطلاعات سرمایه‌گذار');
    } finally {
      setIsSavingInvestor(false);
    }
  };

  const handleDeleteInvestor = async (inv: Investor) => {
    if (!confirm(`آیا از حذف سرمایه‌گذار "${inv.name}" اطمینان دارید؟`)) return;
    try {
      setDeletingInvestorId(inv.id);
      await onDeleteInvestor(inv.id);
    } catch (err) {
      console.error('Error deleting investor:', err);
      alert('خطا در حذف سرمایه‌گذار');
    } finally {
      setDeletingInvestorId(null);
    }
  };

  // --- Helper to calculate suggested default payout amount for an investor ---
  const calculateDefaultAmountForInvestor = (investorId: string, customShare?: number) => {
    const inv = investors.find((i) => i.id === investorId);
    if (!inv) return 0;
    const share = customShare !== undefined ? customShare : (Number(inv.sharePercent) || 0);
    // Formula: totalInvestorPool * (share / 100)
    const suggested = Math.round((profitMetrics.totalInvestorPool * share) / 100);
    return Math.max(0, suggested);
  };

  // --- Payout Handlers ---
  const handleOpenNewPayout = (preSelectedInvestorId?: string) => {
    const targetInvestor = preSelectedInvestorId
      ? investors.find((i) => i.id === preSelectedInvestorId)
      : investors[0];

    const initialAmount = targetInvestor
      ? calculateDefaultAmountForInvestor(targetInvestor.id)
      : 0;

    setEditingPayout({
      investorId: targetInvestor ? targetInvestor.id : '',
      investorName: targetInvestor ? targetInvestor.name : '',
      amount: initialAmount,
      date: getCurrentJalaliDate(),
      paymentMethod: 'BANK_TRANSFER',
      referenceNumber: '',
      period: 'سود دوره جاری',
      notes: '',
      paid: true,
      calculatedProfitShare: initialAmount
    });
    setIsPayoutModalOpen(true);
  };

  const handleOpenEditPayout = (payout: InvestorPayout) => {
    setEditingPayout({ ...payout });
    setIsPayoutModalOpen(true);
  };

  const handleInvestorSelectChange = (investorId: string) => {
    const inv = investors.find((i) => i.id === investorId);
    if (!inv) return;
    const suggested = calculateDefaultAmountForInvestor(inv.id);
    setEditingPayout((prev) => ({
      ...prev,
      investorId: inv.id,
      investorName: inv.name,
      amount: suggested,
      calculatedProfitShare: suggested
    }));
  };

  const handleSavePayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayout.investorId || editingPayout.amount === undefined) return;
    try {
      setIsSavingPayout(true);
      await onSaveInvestorPayout(editingPayout);
      setIsPayoutModalOpen(false);
    } catch (err) {
      console.error('Error saving payout:', err);
      alert('خطا در ثبت سند پرداخت سود سرمایه‌گذار');
    } finally {
      setIsSavingPayout(false);
    }
  };

  const handleDeletePayout = async (payout: InvestorPayout) => {
    if (
      !confirm(
        `آیا از حذف سند پرداخت سود به "${payout.investorName}" به مبلغ ${formatPersianPrice(
          payout.amount
        )} تومان اطمینان دارید؟`
      )
    ) {
      return;
    }
    try {
      setDeletingPayoutId(payout.id);
      await onDeleteInvestorPayout(payout.id);
    } catch (err) {
      console.error('Error deleting payout:', err);
      alert('خطا در حذف سند پرداخت');
    } finally {
      setDeletingPayoutId(null);
    }
  };

  // Filtered payouts
  const filteredPayouts = investorPayouts.filter((p) => {
    const q = searchPayoutQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      p.investorName.toLowerCase().includes(q) ||
      (p.period && p.period.toLowerCase().includes(q)) ||
      (p.referenceNumber && p.referenceNumber.toLowerCase().includes(q)) ||
      (p.notes && p.notes.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex flex-col gap-8">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-amber-800 text-amber-200 flex items-center justify-center shadow-xs">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-amber-950">
                مدیریت سرمایه‌گذاران و پرداخت سود
              </h2>
              <p className="text-xs text-amber-900/70 mt-0.5">
                تعریف شرکا و سرمایه‌گذاران، میزان سهم، و صدور اسناد تسویه و پرداخت سود بر اساس مصوبه بودجه ({profitMetrics.approvedPercent}٪)
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleOpenNewInvestor}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-amber-700" />
            <span>معرفی سرمایه‌گذار جدید</span>
          </button>

          <button
            onClick={() => handleOpenNewPayout()}
            disabled={investors.length === 0}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer ${
              investors.length === 0
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-amber-800 hover:bg-amber-900 text-white'
            }`}
          >
            <Plus className="w-4 h-4 text-amber-300" />
            <span>ثبت پرداخت سود جدید</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-amber-900/15 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">مجموع سود پرداختی</span>
            <p className="text-2xl font-black text-amber-950 font-mono mt-1">
              {formatPersianPrice(totalPayoutsSum)} <span className="text-xs font-normal">تومان</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 flex items-center justify-center">
            <Award className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-amber-900/15 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">تعداد اسناد پرداخت</span>
            <p className="text-2xl font-black text-slate-900 font-mono mt-1">
              {investorPayouts.length} <span className="text-xs font-normal">سند</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-700 border border-slate-200 flex items-center justify-center">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-amber-900/15 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">تعداد سرمایه‌گذاران</span>
            <p className="text-2xl font-black text-slate-900 font-mono mt-1">
              {investors.length} <span className="text-xs font-normal">نفر</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-amber-900/15 shadow-xs flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500">سود قابل تقسیم اقامتگاه</span>
              <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded font-mono">
                {profitMetrics.approvedPercent}٪
              </span>
            </div>
            <p className="text-2xl font-black text-emerald-800 font-mono mt-1">
              {formatPersianPrice(profitMetrics.totalInvestorPool)} <span className="text-xs font-normal">تومان</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* SECTION 1: INVESTORS LIST & SHARES */}
      <div className="bg-white rounded-3xl p-6 border border-amber-900/15 shadow-xs flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                لیست سرمایه‌گذاران و میزان سهم
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                تعریف هویت، درصد سهام از سود سرمایه‌گذاران، و اطلاعات بانکی جهت واریز
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-bold font-mono px-3 py-1 rounded-xl border ${
                totalSharesSum === 100
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-amber-50 text-amber-900 border-amber-300'
              }`}
            >
              مجموع سهم‌ها: {totalSharesSum}٪ {totalSharesSum === 100 ? '(کامل)' : ''}
            </span>
            <button
              onClick={handleOpenNewInvestor}
              className="bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer transition-all flex items-center gap-1 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>افزودن سرمایه‌گذار</span>
            </button>
          </div>
        </div>

        {investors.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300">
            <Users className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">هیچ سرمایه‌گذاری تعریف نشده است</p>
            <p className="text-xs text-slate-500 mt-1">
              جهت ثبت پرداخت سود، ابتدا مشخصات و درصد سهم سرمایه‌گذاران را اضافه کنید.
            </p>
            <button
              onClick={handleOpenNewInvestor}
              className="mt-4 inline-flex items-center gap-1.5 bg-amber-800 text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>معرفی اولین سرمایه‌گذار</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {investors.map((inv) => {
              // Calculate total payouts recorded for this investor
              const investorTotalPaid = investorPayouts
                .filter((p) => p.investorId === inv.id)
                .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

              // Suggested current pool share
              const currentSuggestedShare = calculateDefaultAmountForInvestor(inv.id);

              return (
                <div
                  key={inv.id}
                  className="bg-slate-50/70 hover:bg-slate-50 border border-slate-200 hover:border-amber-300 rounded-2xl p-4 transition-all flex flex-col justify-between gap-3 shadow-xs group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-amber-800 text-white font-black text-sm flex items-center justify-center shadow-xs">
                        {inv.name.slice(0, 1)}
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900 leading-tight">
                          {inv.name}
                        </h4>
                        {inv.phone && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span className="font-mono dir-ltr">{inv.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className="bg-amber-100 border border-amber-300 text-amber-900 font-mono font-black text-xs px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                        <Percent className="w-3 h-3 text-amber-700" />
                        {inv.sharePercent}٪ سهم
                      </span>
                    </div>
                  </div>

                  {/* Share Progress Bar */}
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-800 h-full rounded-full transition-all"
                      style={{ width: `${Math.min(100, inv.sharePercent)}%` }}
                    />
                  </div>

                  {/* Bank Info */}
                  <div className="bg-white rounded-xl p-2.5 border border-slate-200 text-xs space-y-1">
                    {inv.cardNumber ? (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 font-semibold">شماره کارت:</span>
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-[11px] font-bold text-slate-800 dir-ltr">
                            {inv.cardNumber}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(inv.cardNumber!, `کارت ${inv.name}`)}
                            className="text-slate-400 hover:text-amber-800 cursor-pointer p-0.5"
                            title="کپی شماره کارت"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {inv.shaba ? (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 font-semibold">شماره شبا:</span>
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-[11px] font-bold text-slate-800 dir-ltr">
                            {inv.shaba}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(inv.shaba!, `شبا ${inv.name}`)}
                            className="text-slate-400 hover:text-amber-800 cursor-pointer p-0.5"
                            title="کپی شماره شبا"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {!inv.cardNumber && !inv.shaba && (
                      <span className="text-[11px] text-slate-400 italic block text-center">
                        شماره حساب یا شبا ثبت نشده است
                      </span>
                    )}
                  </div>

                  {/* Financial Metrics */}
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/80">
                    <div>
                      <span className="text-[10px] text-slate-400 block">کل سود دریافتی:</span>
                      <span className="font-mono font-bold text-slate-800 text-[11px]">
                        {formatPersianPrice(investorTotalPaid)} تومان
                      </span>
                    </div>

                    <div className="text-left">
                      <span className="text-[10px] text-amber-700 block font-semibold">سود برآورد شده:</span>
                      <span className="font-mono font-black text-amber-950 text-[11px]">
                        {formatPersianPrice(currentSuggestedShare)} تومان
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => handleOpenNewPayout(inv.id)}
                      className="text-xs bg-amber-800 hover:bg-amber-900 text-white font-bold px-3 py-1.5 rounded-xl cursor-pointer transition-all flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5 text-amber-300" />
                      <span>پرداخت سود</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditInvestor(inv)}
                        className="p-1.5 text-slate-500 hover:text-amber-800 hover:bg-white rounded-lg transition-colors cursor-pointer"
                        title="ویرایش مشخصات"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteInvestor(inv)}
                        disabled={deletingInvestorId === inv.id}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
                        title="حذف سرمایه‌گذار"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 2: INVESTOR PROFIT PAYOUTS LIST (SIMILAR TO WAGE PAYMENTS) */}
      <div className="bg-white rounded-3xl p-6 border border-amber-900/15 shadow-xs flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                تاریخچه و اسناد پرداخت سود سرمایه‌گذاران
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                لیست تمام پرداختی‌ها، شماره پیگیری بانکی، بابت دوره و رسیدهای ثبت‌شده
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="جستجو در اسناد (نام، دوره، پیگیری...)"
                value={searchPayoutQuery}
                onChange={(e) => setSearchPayoutQuery(e.target.value)}
                className="w-full pl-3 pr-9 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-700 outline-hidden bg-slate-50/50"
              />
            </div>

            <button
              onClick={() => handleOpenNewPayout()}
              disabled={investors.length === 0}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer ${
                investors.length === 0
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-amber-800 hover:bg-amber-900 text-white'
              }`}
            >
              <Plus className="w-4 h-4 text-amber-300" />
              <span>ثبت پرداخت سود جدید</span>
            </button>
          </div>
        </div>

        {/* Payouts Table */}
        {filteredPayouts.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300">
            <Award className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">هیچ سندی برای پرداخت سود ثبت نشده است</p>
            <p className="text-xs text-slate-500 mt-1">
              {searchPayoutQuery
                ? 'موردی با عبارت جستجو شده پیدا نشد.'
                : 'برای ثبت تسویه یا واریز سود، روی دکمه «ثبت پرداخت سود جدید» کلیک کنید.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">تاریخ</th>
                  <th className="py-3 px-4">نام سرمایه‌گذار</th>
                  <th className="py-3 px-4">بابت / دوره</th>
                  <th className="py-3 px-4">مبلغ پرداختی (تومان)</th>
                  <th className="py-3 px-4">روش پرداخت</th>
                  <th className="py-3 px-4">شماره پیگیری / سند</th>
                  <th className="py-3 px-4">توضیحات</th>
                  <th className="py-3 px-4 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayouts.map((payout) => {
                  const inv = investors.find((i) => i.id === payout.investorId);
                  return (
                    <tr key={payout.id} className="hover:bg-amber-50/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-700 whitespace-nowrap">
                        {payout.date}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{payout.investorName}</span>
                          {inv && (
                            <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-mono font-bold">
                              {inv.sharePercent}٪
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                        <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md font-medium text-[11px]">
                          {payout.period || 'سود سهام'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-black text-amber-950 text-sm whitespace-nowrap">
                        {formatPersianPrice(payout.amount)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200">
                          {payout.paymentMethod === 'BANK_TRANSFER' && 'واریز به شبا / پایا'}
                          {payout.paymentMethod === 'CARD_TO_CARD' && 'کارت به کارت'}
                          {payout.paymentMethod === 'CHEQUE' && 'چک بانکی'}
                          {payout.paymentMethod === 'CASH' && 'نقدی'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap dir-ltr text-right">
                        {payout.referenceNumber || '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-500 max-w-[200px] truncate" title={payout.notes}>
                        {payout.notes || '—'}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEditPayout(payout)}
                            className="p-1.5 text-slate-500 hover:text-amber-800 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer"
                            title="ویرایش سند"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeletePayout(payout)}
                            disabled={deletingPayoutId === payout.id}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="حذف سند"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Copy Notification Toast */}
      {copiedText && (
        <div className="fixed bottom-6 left-6 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-xl shadow-xl z-50 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{copiedText} با موفقیت در کلیپ‌بورد کپی شد</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: ADD / EDIT INVESTOR */}
      {/* ======================================================== */}
      {isInvestorModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-amber-900/20 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-amber-950 flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-800" />
                {editingInvestor.id ? 'ویرایش مشخصات سرمایه‌گذار' : 'معرفی سرمایه‌گذار جدید'}
              </h3>
              <button
                onClick={() => setIsInvestorModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveInvestorSubmit} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  نام و نام خانوادگی سرمایه‌گذار <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: حاج محمدتقی برزکی"
                  value={editingInvestor.name || ''}
                  onChange={(e) => setEditingInvestor((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-700 outline-hidden font-bold text-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    میزان سهم از سود (%) <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min="0"
                      max="100"
                      placeholder="مثال: 50"
                      value={editingInvestor.sharePercent ?? 50}
                      onChange={(e) =>
                        setEditingInvestor((prev) => ({ ...prev, sharePercent: Number(e.target.value) }))
                      }
                      className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-700 outline-hidden font-mono font-bold text-slate-800"
                    />
                    <Percent className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    درصد سهم این سرمایه‌گذار از کل سود سرمایه‌گذاران
                  </span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">شماره تماس</label>
                  <input
                    type="text"
                    placeholder="مثال: 09131612345"
                    value={editingInvestor.phone || ''}
                    onChange={(e) => setEditingInvestor((prev) => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-700 outline-hidden font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">شماره کارت بانکی</label>
                  <input
                    type="text"
                    placeholder="مثال: 6037-9911-2233-4455"
                    value={editingInvestor.cardNumber || ''}
                    onChange={(e) => setEditingInvestor((prev) => ({ ...prev, cardNumber: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-700 outline-hidden font-mono text-center"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">شماره شبا</label>
                  <input
                    type="text"
                    placeholder="مثال: IR120170000000112233445501"
                    value={editingInvestor.shaba || ''}
                    onChange={(e) => setEditingInvestor((prev) => ({ ...prev, shaba: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-700 outline-hidden font-mono text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">یادداشت و توافقات</label>
                <textarea
                  rows={2}
                  placeholder="مثال: سرمایه‌گذار اصلی تجهیز سوئیت‌های سنتی، پرداخت در انتهای هر فصل"
                  value={editingInvestor.notes || ''}
                  onChange={(e) => setEditingInvestor((prev) => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-700 outline-hidden font-sans"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsInvestorModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-100 font-bold cursor-pointer transition-colors"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={isSavingInvestor}
                  className="px-5 py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-xl font-bold cursor-pointer transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  {isSavingInvestor && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>ذخیره سرمایه‌گذار</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: REGISTER / EDIT INVESTOR PROFIT PAYOUT */}
      {/* ======================================================== */}
      {isPayoutModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-amber-900/20 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-amber-950 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-800" />
                {editingPayout.id ? 'ویرایش سند پرداخت سود' : 'ثبت پرداخت سود جدید سرمایه‌گذار'}
              </h3>
              <button
                onClick={() => setIsPayoutModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePayoutSubmit} className="mt-4 space-y-4 text-xs">
              
              {/* 1. Investor Selector Dropdown */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  انتخاب سرمایه‌گذار <span className="text-rose-600">*</span>
                </label>
                <select
                  required
                  value={editingPayout.investorId || ''}
                  onChange={(e) => handleInvestorSelectChange(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-700 outline-hidden font-bold text-slate-800 bg-white"
                >
                  <option value="" disabled>
                    -- سرمایه‌گذار را انتخاب کنید --
                  </option>
                  {investors.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.name} (سهم مصوب: {inv.sharePercent}٪)
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Intelligent Profit Calculation Box */}
              {editingPayout.investorId && (
                <div className="bg-amber-50/90 border border-amber-300/80 rounded-2xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-amber-950">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5 text-amber-700" />
                      محاسبه هوشمند سود بر اساس درآمد و سهم
                    </span>
                    <span className="font-mono text-amber-800">
                      ردیف بودجه مصوب: {profitMetrics.approvedPercent}٪
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700 pt-1 border-t border-amber-200">
                    <div>
                      <span className="text-slate-500">پایه سود خالص اقامتگاه:</span>
                      <p className="font-mono font-bold text-slate-900 mt-0.5">
                        {formatPersianPrice(profitMetrics.netBaseProfit)} تومان
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">کل سود سرمایه‌گذاران ({profitMetrics.approvedPercent}٪):</span>
                      <p className="font-mono font-bold text-slate-900 mt-0.5">
                        {formatPersianPrice(profitMetrics.totalInvestorPool)} تومان
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-amber-200">
                    <div>
                      <span className="text-xs font-bold text-amber-950">
                        سهم پیشنهادی این سرمایه‌گذار:
                      </span>
                      <span className="text-xs font-mono font-black text-amber-950 mr-1.5">
                        {formatPersianPrice(editingPayout.calculatedProfitShare || 0)} تومان
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const calculated = calculateDefaultAmountForInvestor(editingPayout.investorId!);
                        setEditingPayout((prev) => ({
                          ...prev,
                          amount: calculated,
                          calculatedProfitShare: calculated
                        }));
                      }}
                      className="text-[10px] text-amber-800 bg-white hover:bg-amber-100 border border-amber-300 font-bold px-2 py-0.5 rounded-md cursor-pointer transition-colors"
                    >
                      اعمال مجدد سهم سیستمی
                    </button>
                  </div>
                </div>
              )}

              {/* 3. Amount Field (Defaulted by percentage, fully editable by user!) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">
                    مبلغ پرداختی (تومان) <span className="text-rose-600">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400">
                    (پیش‌فرض بر اساس درصد سهام درج شده و قابل ویرایش است)
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="مبلغ پرداختی به تومان"
                    value={editingPayout.amount !== undefined ? editingPayout.amount : ''}
                    onChange={(e) =>
                      setEditingPayout((prev) => ({
                        ...prev,
                        amount: Number(e.target.value)
                      }))
                    }
                    className="w-full px-3 py-2 border-2 border-amber-700/40 rounded-xl focus:ring-2 focus:ring-amber-700 outline-hidden font-mono font-black text-sm text-amber-950 bg-white"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    تومان
                  </span>
                </div>
                {editingPayout.amount ? (
                  <span className="text-[11px] font-bold text-slate-600 mt-1 block">
                    معادل: {formatPersianPrice(editingPayout.amount)} تومان
                  </span>
                ) : null}
              </div>

              {/* 4. Date and Period */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    تاریخ پرداخت <span className="text-rose-600">*</span>
                  </label>
                  <PersianDatePicker
                    value={editingPayout.date || getCurrentJalaliDate()}
                    onChange={(val) => setEditingPayout((prev) => ({ ...prev, date: val }))}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    بابت / دوره سود
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: سود بهار ۱۴۰۳، سود ماه مرداد"
                    value={editingPayout.period || ''}
                    onChange={(e) => setEditingPayout((prev) => ({ ...prev, period: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-700 outline-hidden"
                  />
                </div>
              </div>

              {/* 5. Payment Method & Reference Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    روش تسویه و پرداخت
                  </label>
                  <select
                    value={editingPayout.paymentMethod || 'BANK_TRANSFER'}
                    onChange={(e) =>
                      setEditingPayout((prev) => ({
                        ...prev,
                        paymentMethod: e.target.value as any
                      }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-700 outline-hidden bg-white"
                  >
                    <option value="BANK_TRANSFER">واریز به شبا / پایا / ساتنا</option>
                    <option value="CARD_TO_CARD">کارت به کارت</option>
                    <option value="CHEQUE">چک بانکی</option>
                    <option value="CASH">نقدی</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    شماره پیگیری / شماره چک
                  </label>
                  <input
                    type="text"
                    placeholder="کد پیگیری بانکی یا ارجاع"
                    value={editingPayout.referenceNumber || ''}
                    onChange={(e) =>
                      setEditingPayout((prev) => ({ ...prev, referenceNumber: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-700 outline-hidden font-mono"
                  />
                </div>
              </div>

              {/* 6. Notes */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">یادداشت و توضیحات سند</label>
                <textarea
                  rows={2}
                  placeholder="توضیحات اختیاری در خصوص تسویه حساب یا کسر کسورات..."
                  value={editingPayout.notes || ''}
                  onChange={(e) => setEditingPayout((prev) => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-700 outline-hidden font-sans"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPayoutModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-100 font-bold cursor-pointer transition-colors"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={isSavingPayout || !editingPayout.investorId}
                  className="px-5 py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-xl font-bold cursor-pointer transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  {isSavingPayout && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>ثبت سند پرداخت</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
