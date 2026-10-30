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
  TrendingDown,
  Percent,
  CheckCircle2,
  HelpCircle,
  Phone,
  Layers,
  ArrowRightLeft,
  Loader2,
  Calculator,
  CheckSquare,
  Square,
  AlertCircle,
  Sparkles,
  CheckCheck
} from 'lucide-react';
import { Investor, InvestorPayout, LodgeSettings, SalesInvoice, PurchaseInvoice, WagePayment, Category, Item } from '../types';
import {
  formatPersianPrice,
  getCurrentJalaliDate,
  formatPersianDate,
  getFirstDayOfMonthJalali,
  getLastDayOfMonthJalali,
  isDateInRange
} from '../utils/persianDate';
import { PersianDatePicker } from './PersianDatePicker';
import { resolveSalesCategory } from './BudgetAndInvestorView';

interface InvestorPayoutsViewProps {
  investors: Investor[];
  investorPayouts: InvestorPayout[];
  settings: LodgeSettings;
  salesInvoices: SalesInvoice[];
  purchaseInvoices: PurchaseInvoice[];
  wagePayments: WagePayment[];
  categories?: Category[];
  items?: Item[];
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
  categories = [],
  items = [],
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

  // --- Dynamic Calculation Date Range State ---
  const [calcDateFilterMode, setCalcDateFilterMode] = useState<'THIS_MONTH' | 'THIS_SEASON' | 'THIS_YEAR' | 'ALL' | 'CUSTOM'>('THIS_MONTH');
  const [calcStartDate, setCalcStartDate] = useState<string>(getFirstDayOfMonthJalali());
  const [calcEndDate, setCalcEndDate] = useState<string>(getLastDayOfMonthJalali());

  const handleSetCalcDatePreset = (mode: 'THIS_MONTH' | 'THIS_SEASON' | 'THIS_YEAR' | 'ALL' | 'CUSTOM') => {
    setCalcDateFilterMode(mode);
    const today = getCurrentJalaliDate();
    const parts = today.split('/');
    const y = parts[0];
    const m = parseInt(parts[1], 10);

    if (mode === 'THIS_MONTH') {
      setCalcStartDate(getFirstDayOfMonthJalali());
      setCalcEndDate(getLastDayOfMonthJalali());
    } else if (mode === 'THIS_SEASON') {
      if (m <= 3) {
        setCalcStartDate(`${y}/01/01`);
        setCalcEndDate(`${y}/03/31`);
      } else if (m <= 6) {
        setCalcStartDate(`${y}/04/01`);
        setCalcEndDate(`${y}/06/31`);
      } else if (m <= 9) {
        setCalcStartDate(`${y}/07/01`);
        setCalcEndDate(`${y}/09/30`);
      } else {
        setCalcStartDate(`${y}/10/01`);
        setCalcEndDate(`${y}/12/29`);
      }
    } else if (mode === 'THIS_YEAR') {
      setCalcStartDate(`${y}/01/01`);
      setCalcEndDate(`${y}/12/29`);
    } else if (mode === 'ALL') {
      setCalcStartDate('1400/01/01');
      setCalcEndDate('1410/12/29');
    }
  };

  // --- Investor Share Percentage & Category Exemption State ---
  const investorBudgetRow = (settings.budgetRows || []).find(
    (r) => r.isInvestorShare || r.name.includes('سرمایه‌گذار')
  );
  const approvedPercent = investorBudgetRow
    ? Number(investorBudgetRow.percentage)
    : (settings.investorSharePercent || 35);

  const [investorSharePercent, setInvestorSharePercent] = useState<number>(approvedPercent);
  const [exemptCategoryIds, setExemptCategoryIds] = useState<string[]>(
    settings.investorExemptCategoryIds || ['cat-3']
  );

  // Effective sales categories
  const effectiveSalesCategories = useMemo(() => {
    const list = [...(categories || [])];
    if (list.length === 0) {
      list.push(
        { id: 'cat-1', name: 'اقامت و صبحانه' },
        { id: 'cat-2', name: 'رستوران و نوشیدنی' },
        { id: 'cat-3', name: 'دست‌آفرید و صنایع دستی' },
        { id: 'cat-4', name: 'تجارب و گردشگری' }
      );
    }
    return list;
  }, [categories]);

  const toggleExemptCategory = (catId: string) => {
    setExemptCategoryIds((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  };

  const includeAllCategories = () => {
    setExemptCategoryIds([]);
  };

  const exemptHandicrafts = () => {
    const handicraftIds = effectiveSalesCategories
      .filter((c) =>
        c.name.includes('صنایع') ||
        c.name.includes('دست‌آفرید') ||
        c.name.includes('دست افرید') ||
        c.name.includes('سوغات') ||
        c.id === 'cat-3'
      )
      .map((c) => c.id);
    setExemptCategoryIds((prev) => Array.from(new Set([...prev, ...handicraftIds])));
  };

  // In-range data
  const inRangeSales = useMemo(() => {
    return salesInvoices.filter((inv) => isDateInRange(inv.date, calcStartDate, calcEndDate));
  }, [salesInvoices, calcStartDate, calcEndDate]);

  const inRangePurchases = useMemo(() => {
    return purchaseInvoices.filter((inv) => isDateInRange(inv.date, calcStartDate, calcEndDate));
  }, [purchaseInvoices, calcStartDate, calcEndDate]);

  const inRangeWages = useMemo(() => {
    return wagePayments.filter((w) => isDateInRange(w.date, calcStartDate, calcEndDate));
  }, [wagePayments, calcStartDate, calcEndDate]);

  // Calculate revenue per category in range (strictly paid amounts per Requirement ج)
  const { salesByCategory, totalGrossRevenue, exemptRevenue, eligibleRevenue } = useMemo(() => {
    const catSales: Record<string, number> = {};
    effectiveSalesCategories.forEach((cat) => {
      catSales[cat.id] = 0;
    });
    catSales['other'] = 0;

    let gross = 0;
    let exempt = 0;
    let eligible = 0;

    inRangeSales.forEach((inv) => {
      const totalPayable = Number(inv.totalPayable) || 0;
      const paidAmount = Number(inv.totalPaidAmount) > 0 ? Number(inv.totalPaidAmount) : (inv.paid ? totalPayable : 0);
      if (paidAmount <= 0) return;

      gross += paidAmount;
      const ratio = totalPayable > 0 ? Math.min(1, paidAmount / totalPayable) : 1;

      (inv.items || []).forEach((item) => {
        const rawItemAmount = Number(item.payableAmount ?? item.totalPrice) || 0;
        const itemAmount = rawItemAmount * ratio;
        const matchedCat = resolveSalesCategory(item, effectiveSalesCategories, items);
        const catId = matchedCat ? matchedCat.id : 'other';
        catSales[catId] = (catSales[catId] || 0) + itemAmount;

        const isExempt = matchedCat ? exemptCategoryIds.includes(matchedCat.id) : false;
        if (isExempt) {
          exempt += itemAmount;
        } else {
          eligible += itemAmount;
        }
      });
    });

    return {
      salesByCategory: catSales,
      totalGrossRevenue: gross,
      exemptRevenue: exempt,
      eligibleRevenue: eligible
    };
  }, [inRangeSales, effectiveSalesCategories, items, exemptCategoryIds]);

  // Expenses in range
  const totalInScopePurchases = useMemo(() => {
    return inRangePurchases.reduce((sum, inv) => {
      return sum + (Number(inv.totalPaid || inv.totalPaidAmount || inv.totalAmount) || 0);
    }, 0);
  }, [inRangePurchases]);

  const totalInScopeWages = useMemo(() => {
    return inRangeWages.reduce((sum, w) => sum + (Number(w.amount) || 0), 0);
  }, [inRangeWages]);

  const totalOperatingExpenses = totalInScopePurchases + totalInScopeWages;

  // Net Profit & Total Investor Share Pool in Selected Range
  const netEligibleProfit = Math.max(0, eligibleRevenue - totalOperatingExpenses);
  const totalInvestorProfitPool = Math.round((netEligibleProfit * investorSharePercent) / 100);

  // In-range investor payouts
  const inRangeInvestorPayouts = useMemo(() => {
    return investorPayouts.filter((p) => isDateInRange(p.date, calcStartDate, calcEndDate) && p.paid !== false);
  }, [investorPayouts, calcStartDate, calcEndDate]);

  // Per-Investor Detailed Breakdown (تقسیم سود و تعیین مبالغ قابل پرداخت)
  const investorBreakdowns = useMemo(() => {
    return investors.map((inv) => {
      const sharePct = Number(inv.sharePercent) || 0;
      // Calculated share of total investor profit pool
      const calculatedShare = Math.round((totalInvestorProfitPool * sharePct) / 100);
      // Actual payouts already recorded in this period for this investor
      const alreadyPaidInPeriod = inRangeInvestorPayouts
        .filter((p) => p.investorId === inv.id)
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      // Exact payable amount (مانده قابل پرداخت)
      const remainingPayable = Math.max(0, calculatedShare - alreadyPaidInPeriod);
      const isSettled = calculatedShare > 0 && remainingPayable === 0;

      return {
        investor: inv,
        sharePct,
        calculatedShare,
        alreadyPaidInPeriod,
        remainingPayable,
        isSettled
      };
    });
  }, [investors, totalInvestorProfitPool, inRangeInvestorPayouts]);

  // Global profitMetrics for fallback reference
  const profitMetrics = {
    totalRevenue: totalGrossRevenue,
    totalExpenses: totalOperatingExpenses,
    netBaseProfit: netEligibleProfit,
    approvedPercent: investorSharePercent,
    totalInvestorPool: totalInvestorProfitPool
  };

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

  const handleQuickPayout = (inv: Investor, payableAmount: number, calculatedShare: number) => {
    const periodLabel = `سود دوره ${calcStartDate} تا ${calcEndDate}`;
    const amountToPay = payableAmount > 0 ? payableAmount : calculatedShare;
    setEditingPayout({
      investorId: inv.id,
      investorName: inv.name,
      amount: amountToPay,
      date: getCurrentJalaliDate(),
      paymentMethod: 'BANK_TRANSFER',
      referenceNumber: '',
      period: periodLabel,
      notes: `تسویه سود سهم ${inv.sharePercent}٪ دوره ${calcStartDate} تا ${calcEndDate} (سود کل سرمایه‌گذاران: ${formatPersianPrice(totalInvestorProfitPool)} تومان)`,
      paid: true,
      calculatedProfitShare: calculatedShare
    });
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

      {/* ======================================================== */}
      {/* TOP SECTION: INVESTOR PROFIT CALCULATION & PAYABLE AMOUNTS */}
      {/* ======================================================== */}
      <div className="bg-white rounded-3xl p-6 border-2 border-amber-900/20 shadow-md flex flex-col gap-6">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-amber-900/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-800 text-white flex items-center justify-center shadow-xs shrink-0">
              <Calculator className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span>محاسبه سهم سود سرمایه‌گذاران و تعیین مبالغ قابل پرداخت</span>
                <span className="text-[11px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                  هوشمند بر اساس دسته‌بندی‌ها
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                تفکیک اقلام درآمدی مشمول/معاف (مانند دست‌آفرید)، کسر هزینه‌های دوره و محاسبه دقیق تقسیم سود و مانده قابل تسویه هر شریک
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-amber-50/90 p-2.5 rounded-2xl border border-amber-200 shrink-0">
            <label className="text-xs font-bold text-amber-950">درصد سهم سرمایه‌گذاران از سود:</label>
            <input
              type="number"
              min="0"
              max="100"
              value={investorSharePercent}
              onChange={(e) => setInvestorSharePercent(Math.max(0, Math.min(100, Number(e.target.value))))}
              className="w-16 p-1.5 border border-amber-300 rounded-xl text-center text-xs font-mono font-bold bg-white focus:ring-2 focus:ring-amber-700 outline-hidden"
            />
            <span className="text-xs font-bold text-amber-900">درصد (٪)</span>
          </div>
        </div>

        {/* Date Filter & Presets Toolbar */}
        <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 font-bold text-slate-700 text-xs shrink-0">
              <Calendar className="w-4 h-4 text-amber-800" />
              <span>بازه محاسباتی:</span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-slate-500 font-bold shrink-0">از:</span>
              <div className="w-56 sm:w-64 min-w-[220px]">
                <PersianDatePicker
                  value={calcStartDate}
                  onChange={(newD) => {
                    setCalcStartDate(newD);
                    setCalcDateFilterMode('CUSTOM');
                  }}
                  placeholder="شروع (۱۴۰۳/۰۱/۰۱)"
                  inputClassName="py-2 px-3 text-xs"
                  allowClear
                />
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-slate-500 font-bold shrink-0">تا:</span>
              <div className="w-56 sm:w-64 min-w-[220px]">
                <PersianDatePicker
                  value={calcEndDate}
                  onChange={(newD) => {
                    setCalcEndDate(newD);
                    setCalcDateFilterMode('CUSTOM');
                  }}
                  placeholder="پایان (۱۴۰۳/۱۲/۲۹)"
                  inputClassName="py-2 px-3 text-xs"
                  allowClear
                />
              </div>
            </div>
          </div>

          {/* Quick Date Presets */}
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
            <button
              type="button"
              onClick={() => handleSetCalcDatePreset('THIS_MONTH')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                calcDateFilterMode === 'THIS_MONTH'
                  ? 'bg-amber-800 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              ماه جاری
            </button>
            <button
              type="button"
              onClick={() => handleSetCalcDatePreset('THIS_SEASON')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                calcDateFilterMode === 'THIS_SEASON'
                  ? 'bg-amber-800 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              فصل جاری
            </button>
            <button
              type="button"
              onClick={() => handleSetCalcDatePreset('THIS_YEAR')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                calcDateFilterMode === 'THIS_YEAR'
                  ? 'bg-amber-800 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              سال جاری
            </button>
            <button
              type="button"
              onClick={() => handleSetCalcDatePreset('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                calcDateFilterMode === 'ALL'
                  ? 'bg-amber-800 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              همه زمان‌ها
            </button>
          </div>
        </div>

        {/* Category Toggles Panel */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-slate-800">
                تعیین دسته‌بندی‌های درآمدی مشمول یا معاف از سود سرمایه‌گذار:
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                روی هر دسته‌بندی کلیک کنید تا وضعیت آن تغییر کند. مبالغ بر اساس فاکتورهای وصول‌شده این بازه است.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={includeAllCategories}
                className="text-xs font-bold px-2.5 py-1 rounded-lg border border-emerald-300 text-emerald-800 bg-emerald-50/70 hover:bg-emerald-100 cursor-pointer transition-all"
              >
                مشمول کردن همه
              </button>
              <button
                type="button"
                onClick={exemptHandicrafts}
                className="text-xs font-bold px-2.5 py-1 rounded-lg border border-rose-300 text-rose-800 bg-rose-50/70 hover:bg-rose-100 cursor-pointer transition-all"
              >
                معاف کردن صنایع‌دستی و سوغات
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {effectiveSalesCategories.map((cat) => {
              const isExempt = exemptCategoryIds.includes(cat.id);
              const catRevenue = salesByCategory[cat.id] || 0;
              const catShareOfTotal = totalGrossRevenue > 0
                ? Math.round((catRevenue / totalGrossRevenue) * 100)
                : 0;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleExemptCategory(cat.id)}
                  className={`p-3 rounded-2xl border text-right transition-all cursor-pointer flex flex-col justify-between gap-2 shadow-2xs ${
                    isExempt
                      ? 'bg-rose-50/70 border-rose-300 hover:bg-rose-100/60'
                      : 'bg-emerald-50/70 border-emerald-300 hover:bg-emerald-100/60'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-xs text-slate-900">{cat.name}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        isExempt
                          ? 'bg-rose-200 text-rose-800'
                          : 'bg-emerald-200 text-emerald-800'
                      }`}
                    >
                      {isExempt ? (
                        <>
                          <Square className="w-3 h-3 text-rose-700" />
                          معاف از سود
                        </>
                      ) : (
                        <>
                          <CheckSquare className="w-3 h-3 text-emerald-700" />
                          مشمول سود
                        </>
                      )}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between w-full pt-1 border-t border-slate-200/60">
                    <span className="text-[11px] text-slate-500">فروش نقدی این بازه:</span>
                    <span className="text-xs font-mono font-bold text-slate-800">
                      {formatPersianPrice(catRevenue)} تومان
                      <span className="text-[10px] text-slate-400 font-normal mr-1">({catShareOfTotal}٪)</span>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Financial Calculation Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <div>
            <span className="text-[11px] text-slate-500 font-semibold block">کل فروش وصول‌شده در بازه</span>
            <p className="text-sm font-bold text-slate-900 font-mono mt-1">
              {formatPersianPrice(totalGrossRevenue)} تومان
            </p>
            <span className="text-[10px] text-slate-400 block mt-0.5">درآمد نقدی محقق شده</span>
          </div>

          <div>
            <span className="text-[11px] text-rose-700 font-semibold block">درآمد معاف از سود</span>
            <p className="text-sm font-bold text-rose-700 font-mono mt-1">
              {formatPersianPrice(exemptRevenue)} تومان
            </p>
            <span className="text-[10px] text-slate-400 block mt-0.5">اقلام و دسته‌های معاف</span>
          </div>

          <div>
            <span className="text-[11px] text-emerald-700 font-semibold block">درآمد مشمول محاسبه سود</span>
            <p className="text-sm font-bold text-emerald-700 font-mono mt-1">
              {formatPersianPrice(eligibleRevenue)} تومان
            </p>
            <span className="text-[10px] text-slate-400 block mt-0.5">فروش وصول‌شده مشمول</span>
          </div>

          <div>
            <span className="text-[11px] text-slate-600 font-semibold block">هزینه‌های کسر شده دوره</span>
            <p className="text-sm font-bold text-slate-800 font-mono mt-1">
              {formatPersianPrice(totalOperatingExpenses)} تومان
            </p>
            <span className="text-[10px] text-slate-400 block mt-0.5">خرید + حقوق پرسنل</span>
          </div>

          <div>
            <span className="text-[11px] text-slate-700 font-semibold block">سود خالص مشمول اقامتگاه</span>
            <p className="text-sm font-bold text-slate-900 font-mono mt-1">
              {formatPersianPrice(netEligibleProfit)} تومان
            </p>
            <span className="text-[10px] text-slate-400 block mt-0.5">درآمد مشمول منهای هزینه‌ها</span>
          </div>

          <div className="bg-amber-100/90 p-3 rounded-xl border border-amber-300 flex flex-col justify-between">
            <span className="text-[11px] text-amber-900 font-black block">
              کل سهم سود سرمایه‌گذاران ({investorSharePercent}٪)
            </span>
            <p className="text-base font-black text-amber-950 font-mono mt-0.5">
              {formatPersianPrice(totalInvestorProfitPool)} تومان
            </p>
            <span className="text-[10px] text-amber-800 block mt-0.5 font-medium">
              مجموع قابل تقسیم بین شرکا
            </span>
          </div>
        </div>

        {/* Division of Profit & Payable Amounts per Investor */}
        <div className="flex flex-col gap-3 pt-2 border-t border-amber-900/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-800" />
              <h4 className="text-sm font-black text-slate-900">
                تقسیم سود و مبالغ قابل پرداخت به تفکیک سرمایه‌گذاران
              </h4>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              محاسبه سهم هر سرمایه‌گذار و کسر پرداختی‌های قبلی در این دوره
            </span>
          </div>

          {investors.length === 0 ? (
            <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300">
              <p className="text-xs text-slate-600 font-bold">هنوز سرمایه‌گذاری در سیستم تعریف نشده است.</p>
              <button
                type="button"
                onClick={handleOpenNewInvestor}
                className="mt-2 text-xs text-amber-800 font-bold underline cursor-pointer"
              >
                افزودن اولین سرمایه‌گذار
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                    <th className="py-3 px-4">سرمایه‌گذار</th>
                    <th className="py-3 px-4 text-center">درصد سهم</th>
                    <th className="py-3 px-4">سود سهم سرمایه‌گذار (محاسبه شده)</th>
                    <th className="py-3 px-4">پرداختی‌های ثبت شده در بازه</th>
                    <th className="py-3 px-4">میزان مبلغ قابل پرداخت (مانده)</th>
                    <th className="py-3 px-4 text-center">وضعیت</th>
                    <th className="py-3 px-4 text-center">اقدام</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {investorBreakdowns.map((b) => (
                    <tr key={b.investor.id} className="hover:bg-amber-50/30 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-amber-800 text-white font-black text-xs flex items-center justify-center">
                            {b.investor.name.slice(0, 1)}
                          </div>
                          <div>
                            <div>{b.investor.name}</div>
                            {b.investor.phone && (
                              <div className="text-[10px] text-slate-400 font-mono dir-ltr">{b.investor.phone}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-700">
                        {b.sharePct}٪
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        {formatPersianPrice(b.calculatedShare)} تومان
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {formatPersianPrice(b.alreadyPaidInPeriod)} تومان
                      </td>
                      <td className="py-3 px-4">
                        <span className={`font-mono font-black text-sm ${
                          b.remainingPayable > 0 ? 'text-amber-950 font-bold' : 'text-slate-400'
                        }`}>
                          {formatPersianPrice(b.remainingPayable)} تومان
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {b.isSettled ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-300">
                            <CheckCheck className="w-3 h-3 text-emerald-700" />
                            تسویه شده
                          </span>
                        ) : b.remainingPayable > 0 ? (
                          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-amber-300">
                            قابل پرداخت
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">بدون مانده</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleQuickPayout(b.investor, b.remainingPayable, b.calculatedShare)}
                          className="inline-flex items-center gap-1 bg-amber-800 hover:bg-amber-900 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl transition-all shadow-2xs cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5 text-amber-300" />
                          <span>ثبت سند پرداخت</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 font-bold text-slate-800 border-t-2 border-slate-300">
                    <td className="py-3 px-4">مجموع سهم‌ها ({investors.reduce((s, i) => s + (Number(i.sharePercent) || 0), 0)}٪)</td>
                    <td className="py-3 px-4 text-center font-mono">
                      {investors.reduce((s, i) => s + (Number(i.sharePercent) || 0), 0)}٪
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-amber-950">
                      {formatPersianPrice(investorBreakdowns.reduce((s, b) => s + b.calculatedShare, 0))} تومان
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      {formatPersianPrice(investorBreakdowns.reduce((s, b) => s + b.alreadyPaidInPeriod, 0))} تومان
                    </td>
                    <td className="py-3 px-4 font-mono font-black text-emerald-800 text-sm">
                      {formatPersianPrice(investorBreakdowns.reduce((s, b) => s + b.remainingPayable, 0))} تومان
                    </td>
                    <td colSpan={2} className="py-3 px-4 text-center text-[11px] text-slate-500">
                      کل مانده تسویه نشده در این بازه
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
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
