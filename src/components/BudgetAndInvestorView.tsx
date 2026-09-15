import React, { useState } from 'react';
import {
  Calculator,
  PieChart,
  TrendingUp,
  TrendingDown,
  Percent,
  Calendar,
  CheckSquare,
  Square,
  DollarSign,
  AlertCircle,
  HelpCircle,
  Award,
  Layers,
  ChevronDown,
  Info
} from 'lucide-react';
import {
  SalesInvoice,
  PurchaseInvoice,
  WagePayment,
  Category,
  Item,
  LodgeSettings,
  BudgetRowConfig,
  Investor,
  InvestorPayout
} from '../types';
import { DEFAULT_PURCHASE_CATEGORIES } from '../services/dbService';
import {
  formatPersianPrice,
  getCurrentJalaliDate,
  getFirstDayOfMonthJalali,
  getLastDayOfMonthJalali,
  isDateInRange
} from '../utils/persianDate';
import { PersianDatePicker } from './PersianDatePicker';

interface BudgetAndInvestorViewProps {
  salesInvoices: SalesInvoice[];
  purchaseInvoices: PurchaseInvoice[];
  wagePayments: WagePayment[];
  categories: Category[];
  purchaseCategories?: Category[];
  purchaseItems?: Item[];
  investorPayouts?: InvestorPayout[];
  investors?: Investor[];
  settings: LodgeSettings;
}

export function BudgetAndInvestorView({
  salesInvoices,
  purchaseInvoices,
  wagePayments,
  categories,
  purchaseCategories = [],
  purchaseItems = [],
  investorPayouts = [],
  investors = [],
  settings
}: BudgetAndInvestorViewProps) {
  // Date Range State
  const [dateFilterMode, setDateFilterMode] = useState<'THIS_MONTH' | 'THIS_YEAR' | 'CUSTOM'>('THIS_MONTH');
  const [startDate, setStartDate] = useState<string>(getFirstDayOfMonthJalali());
  const [endDate, setEndDate] = useState<string>(getLastDayOfMonthJalali());

  // Category Selection for General Budget calculation
  const [selectedSalesCategoryIds, setSelectedSalesCategoryIds] = useState<string[]>(
    categories.map((c) => c.id)
  );
  const [selectedPurchaseCategoryIds, setSelectedPurchaseCategoryIds] = useState<string[]>(
    categories.map((c) => c.id)
  );
  const [includeWagesInExpenses, setIncludeWagesInExpenses] = useState<boolean>(true);

  // Investor Share Settings
  const investorBudgetRow = (settings.budgetRows || []).find(
    (r) => r.isInvestorShare || r.name.includes('سرمایه‌گذار')
  );
  const defaultInvestorPercent = investorBudgetRow
    ? Number(investorBudgetRow.percentage)
    : (settings.investorSharePercent || 35);

  const [investorSharePercent, setInvestorSharePercent] = useState<number>(
    defaultInvestorPercent
  );
  const [investorExemptCategoryIds, setInvestorExemptCategoryIds] = useState<string[]>(
    settings.investorExemptCategoryIds || ['cat-3']
  );

  // Set quick date preset
  const handleSetDatePreset = (mode: 'THIS_MONTH' | 'THIS_YEAR' | 'CUSTOM') => {
    setDateFilterMode(mode);
    const today = getCurrentJalaliDate();
    const parts = today.split('/');
    if (mode === 'THIS_MONTH') {
      setStartDate(getFirstDayOfMonthJalali());
      setEndDate(getLastDayOfMonthJalali());
    } else if (mode === 'THIS_YEAR') {
      setStartDate(`${parts[0]}/01/01`);
      setEndDate(`${parts[0]}/12/29`);
    }
  };

  // Filter Sales Invoices within Range
  const inRangeSales = salesInvoices.filter((inv) => isDateInRange(inv.date, startDate, endDate));
  const inRangePurchases = purchaseInvoices.filter((inv) => isDateInRange(inv.date, startDate, endDate));
  const inRangeWages = wagePayments.filter((w) => isDateInRange(w.date, startDate, endDate));

  // Calculate Total Sales Revenue by Category
  const salesByCategory: Record<string, number> = {};
  categories.forEach((cat) => (salesByCategory[cat.id] = 0));
  salesByCategory['other'] = 0;

  inRangeSales.forEach((inv) => {
    inv.items.forEach((item) => {
      // Find item's category if possible
      const itemAmount = item.payableAmount || item.totalPrice || 0;
      // Default to matching or first category
      let matchedCatId = 'other';
      if (item.itemName.includes('اقامت') || item.itemName.includes('اتاق') || item.itemName.includes('سوئیت')) {
        matchedCatId = 'cat-1';
      } else if (item.itemName.includes('دیزی') || item.itemName.includes('غذا') || item.itemName.includes('کباب') || item.itemName.includes('چای')) {
        matchedCatId = 'cat-2';
      } else if (item.itemName.includes('گلاب') || item.itemName.includes('عرق') || item.itemName.includes('صنایع') || item.itemName.includes('گلیم')) {
        matchedCatId = 'cat-3';
      } else if (item.itemName.includes('تور') || item.itemName.includes('کویر') || item.itemName.includes('گشت')) {
        matchedCatId = 'cat-4';
      }
      salesByCategory[matchedCatId] = (salesByCategory[matchedCatId] || 0) + itemAmount;
    });
  });

  // Calculate In-Scope Sales Revenue for Budget
  const totalInScopeSalesRevenue = inRangeSales.reduce((sum, inv) => {
    return sum + (Number(inv.totalPayable) || 0);
  }, 0);

  // Calculate Total In-Scope Purchases
  const totalInScopePurchases = inRangePurchases.reduce((sum, inv) => {
    return sum + (Number(inv.totalPaid || inv.totalAmount) || 0);
  }, 0);

  // Total Wages
  const totalInScopeWages = includeWagesInExpenses
    ? inRangeWages.reduce((sum, w) => sum + (Number(w.amount) || 0), 0)
    : 0;

  const totalInScopeExpenses = totalInScopePurchases + totalInScopeWages;
  const netOperatingSurplus = totalInScopeSalesRevenue - totalInScopeExpenses;

  // --- Budget Rows Calculation (Requirements 5 & 6) ---
  const effectivePurchaseCategories =
    purchaseCategories && purchaseCategories.length > 0
      ? purchaseCategories
      : DEFAULT_PURCHASE_CATEGORIES;

  // In-range investor payouts
  const inRangeInvestorPayouts = investorPayouts.filter((p) =>
    isDateInRange(p.date, startDate, endDate)
  );
  const totalInvestorPayoutsPaid = inRangeInvestorPayouts.reduce(
    (sum, p) => sum + (Number(p.amount) || 0),
    0
  );

  // Helper to calculate actual spent per purchase category from purchase invoices
  const matchedPurchaseItemIds = new Set<string>();
  const categorySpentMap: Record<string, number> = {};
  effectivePurchaseCategories.forEach((cat) => {
    categorySpentMap[cat.id] = 0;
  });

  inRangePurchases.forEach((inv) => {
    (inv.items || []).forEach((item) => {
      const amount = Number(item.paidAmount || item.totalPrice) || 0;
      let matchedCatId: string | null = null;

      // 1. Check direct categoryId match
      if (item.categoryId && categorySpentMap[item.categoryId] !== undefined) {
        matchedCatId = item.categoryId;
      }
      // 2. Check catalog item match
      if (!matchedCatId && item.itemId) {
        const pItem = purchaseItems.find((p) => p.id === item.itemId);
        if (pItem?.categoryId && categorySpentMap[pItem.categoryId] !== undefined) {
          matchedCatId = pItem.categoryId;
        }
      }
      // 3. Check direct categoryName match
      if (!matchedCatId && item.categoryName) {
        const found = effectivePurchaseCategories.find(
          (c) => c.name.trim().toLowerCase() === item.categoryName!.trim().toLowerCase()
        );
        if (found) matchedCatId = found.id;
      }
      // 4. Keyword heuristic matching if no explicit category
      if (!matchedCatId) {
        const name = (item.itemName || '').toLowerCase();
        for (const cat of effectivePurchaseCategories) {
          const cName = cat.name.toLowerCase();
          if (
            (cName.includes('غذایی') || cName.includes('بهداشتی')) &&
            /غذا|پذیرایی|صبحانه|دیزی|کباب|برنج|گوشت|مرغ|نان|پنیر|روغن|چای|قند|شوینده|بهداشتی|شامپو|مایع|دستمال|میوه|سبزی|ماست|شیر|لبنیات/.test(
              name
            )
          ) {
            matchedCatId = cat.id;
            break;
          } else if (
            (cName.includes('قبض') || cName.includes('اینترنت')) &&
            /قبض|آب|برق|گاز|اینترنت|تلفن|مخابرات|وای‌فای|شارژ/.test(name)
          ) {
            matchedCatId = cat.id;
            break;
          } else if (
            (cName.includes('تعمیر') || cName.includes('نگهداری')) &&
            /تعمیر|سرویس|نگهداری|رنگ|لوله|سیم‌کشی|شیرآلات|بنا|ابزار|تاسیسات|کاهگل|مرمت/.test(name)
          ) {
            matchedCatId = cat.id;
            break;
          } else if (
            (cName.includes('تبلیغ') || cName.includes('محیط')) &&
            /تبلیغ|چاپ|بنر|کاتالوگ|بروشور|عکاسی|فیلمبرداری|محیط زیست|فضای سبز|پسماند/.test(name)
          ) {
            matchedCatId = cat.id;
            break;
          } else if (
            (cName.includes('تجهیزات') || cName.includes('ملزومات')) &&
            /تجهیز|ملزومات|پتو|تشک|ملحفه|بالش|ظروف|قاشق|لیوان|لامپ/.test(name)
          ) {
            matchedCatId = cat.id;
            break;
          }
        }
      }

      if (matchedCatId) {
        categorySpentMap[matchedCatId] = (categorySpentMap[matchedCatId] || 0) + amount;
        matchedPurchaseItemIds.add(item.id);
      }
    });
  });

  // Calculate any unmatched purchase amounts
  let unmatchedPurchasesSpent = 0;
  inRangePurchases.forEach((inv) => {
    (inv.items || []).forEach((item) => {
      if (!matchedPurchaseItemIds.has(item.id)) {
        unmatchedPurchasesSpent += Number(item.paidAmount || item.totalPrice) || 0;
      }
    });
  });

  // Build the list of budget rows strictly per Requirement 5:
  // - حقوق و دستمزد و انعام پرسنل
  // - ردیف‌های دسته‌بندی کالاها در «کاتالوگ کالا و خدمات برای خرید»
  // - سود سرمایه گذار
  const configRows = settings.budgetRows || [];

  // 1. Wage row
  const wageConfig = configRows.find(
    (r) => r.isWageRow || r.name.includes('حقوق') || r.name.includes('دستمزد')
  );
  const wagePercentage = wageConfig ? Number(wageConfig.percentage) : 20;
  const wageAllocated = (totalInScopeSalesRevenue * wagePercentage) / 100;
  const wageRowCalculated = {
    id: 'b-wages',
    name: 'حقوق و دستمزد و انعام پرسنل',
    badge: 'حقوق و دستمزد',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    percentage: wagePercentage,
    allocatedBudget: wageAllocated,
    actualSpent: totalInScopeWages,
    variance: wageAllocated - totalInScopeWages,
    usagePercent: wageAllocated > 0 ? (totalInScopeWages / wageAllocated) * 100 : 0
  };

  // 2. Purchase Category rows
  const purchaseCategoryRowsCalculated = effectivePurchaseCategories.map((cat) => {
    const catConfig = configRows.find(
      (r) => (r.purchaseCategoryId && r.purchaseCategoryId === cat.id) || r.name.trim() === cat.name.trim()
    );
    let defaultPct = 10;
    if (cat.name.includes('غذایی') || cat.name.includes('بهداشتی')) defaultPct = 25;
    else if (cat.name.includes('قبض') || cat.name.includes('اینترنت')) defaultPct = 5;
    else if (cat.name.includes('تعمیر') || cat.name.includes('نگهداری')) defaultPct = 10;
    else if (cat.name.includes('تبلیغ') || cat.name.includes('محیط')) defaultPct = 5;
    else if (cat.name.includes('تجهیزات') || cat.name.includes('ملزومات')) defaultPct = 5;

    const percentage = catConfig ? Number(catConfig.percentage) : defaultPct;
    const allocatedBudget = (totalInScopeSalesRevenue * percentage) / 100;
    const actualSpent = categorySpentMap[cat.id] || 0;
    const variance = allocatedBudget - actualSpent;
    const usagePercent = allocatedBudget > 0 ? (actualSpent / allocatedBudget) * 100 : 0;

    return {
      id: `b-pcat-${cat.id}`,
      name: cat.name,
      badge: 'کاتالوگ خرید',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      percentage,
      allocatedBudget,
      actualSpent,
      variance,
      usagePercent
    };
  });

  // Calculate Investor Profit Amount
  let investorEligibleRevenue = 0;
  inRangeSales.forEach((inv) => {
    inv.items.forEach((item) => {
      let isExempt = false;
      if (
        investorExemptCategoryIds.includes('cat-3') &&
        (item.itemName.includes('گلاب') ||
          item.itemName.includes('دست‌آفرید') ||
          item.itemName.includes('گلیم') ||
          item.itemName.includes('صنایع دستی'))
      ) {
        isExempt = true;
      }
      if (!isExempt) {
        investorEligibleRevenue += item.payableAmount || item.totalPrice || 0;
      }
    });
  });
  const investorEligibleExpenses = totalInScopeExpenses;
  const investorNetBaseProfit = Math.max(0, investorEligibleRevenue - investorEligibleExpenses);
  const investorShareAmount = (investorNetBaseProfit * investorSharePercent) / 100;

  // 3. Investor Profit row
  const investorConfig = configRows.find(
    (r) => r.isInvestorShare || r.name.includes('سرمایه‌گذار')
  );
  const investorPercentage = investorConfig
    ? Number(investorConfig.percentage)
    : (settings.investorSharePercent || 35);
  const investorAllocated = (totalInScopeSalesRevenue * investorPercentage) / 100;
  // Real cost: actual payouts if recorded, otherwise eligible profit share
  const investorActualSpent = totalInvestorPayoutsPaid > 0 ? totalInvestorPayoutsPaid : investorShareAmount;
  const investorRowCalculated = {
    id: 'b-investor',
    name: 'سود سرمایه‌گذار',
    badge: 'سود سرمایه‌گذار',
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
    percentage: investorPercentage,
    allocatedBudget: investorAllocated,
    actualSpent: investorActualSpent,
    variance: investorAllocated - investorActualSpent,
    usagePercent: investorAllocated > 0 ? (investorActualSpent / investorAllocated) * 100 : 0
  };

  // Combine rows strictly according to Requirement 5
  const budgetRowsWithCalculations = [
    wageRowCalculated,
    ...purchaseCategoryRowsCalculated,
    investorRowCalculated,
    ...(unmatchedPurchasesSpent > 0
      ? [
          {
            id: 'b-unmatched',
            name: 'سایر اقلام و هزینه‌های خرید (فاکتورهای ثبت شده)',
            badge: 'خرید متفرقه',
            badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
            percentage: 0,
            allocatedBudget: 0,
            actualSpent: unmatchedPurchasesSpent,
            variance: -unmatchedPurchasesSpent,
            usagePercent: 100
          }
        ]
      : [])
  ];

  // Totals
  const totalBudgetPercentageSum = budgetRowsWithCalculations.reduce(
    (sum, r) => sum + (r.id !== 'b-unmatched' ? r.percentage : 0),
    0
  );
  const totalAllocatedSum = budgetRowsWithCalculations.reduce(
    (sum, r) => sum + r.allocatedBudget,
    0
  );
  const totalActualSpentSum = budgetRowsWithCalculations.reduce(
    (sum, r) => sum + r.actualSpent,
    0
  );
  const totalVarianceSum = totalAllocatedSum - totalActualSpentSum;
  const totalUsagePercentSum =
    totalAllocatedSum > 0 ? (totalActualSpentSum / totalAllocatedSum) * 100 : 0;

  const toggleCategorySelection = (catId: string) => {
    setSelectedSalesCategoryIds((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  };

  const toggleInvestorExemptCategory = (catId: string) => {
    setInvestorExemptCategoryIds((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex flex-col gap-6">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-amber-950 flex items-center gap-2">
            <Calculator className="w-6 h-6 text-amber-800" />
            تحلیل ردیف‌های بودجه و محاسبه سهم سرمایه‌گذار
          </h2>
          <p className="text-xs text-amber-900/70 mt-1">
            سنجش انحراف از بودجه مصوب و محاسبه دقیق سود سرمایه‌گذار با تفکیک اقلام معاف مانند دست‌آفرید
          </p>
        </div>

        {/* Date Filter Quick Presets */}
        <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-amber-900/15 shadow-xs">
          <button
            onClick={() => handleSetDatePreset('THIS_MONTH')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              dateFilterMode === 'THIS_MONTH'
                ? 'bg-amber-800 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            ماه جاری
          </button>
          <button
            onClick={() => handleSetDatePreset('THIS_YEAR')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              dateFilterMode === 'THIS_YEAR'
                ? 'bg-amber-800 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            سال جاری
          </button>
          <button
            onClick={() => setDateFilterMode('CUSTOM')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              dateFilterMode === 'CUSTOM'
                ? 'bg-amber-800 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            بازه دلخواه
          </button>
        </div>
      </div>

      {/* Date Range & Custom Input Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-amber-900/15 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 text-amber-800" />
          <span className="text-xs font-bold text-slate-700">بازه محاسباتی:</span>
          <div className="w-36">
            <PersianDatePicker
              value={startDate}
              onChange={(newD) => setStartDate(newD)}
              placeholder="شروع"
              inputClassName="py-1 px-2 text-xs"
            />
          </div>
          <span className="text-xs text-slate-400">تا</span>
          <div className="w-36">
            <PersianDatePicker
              value={endDate}
              onChange={(newD) => setEndDate(newD)}
              placeholder="پایان"
              inputClassName="py-1 px-2 text-xs"
            />
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={includeWagesInExpenses}
              onChange={(e) => setIncludeWagesInExpenses(e.target.checked)}
              className="accent-amber-800 rounded"
            />
            <span>شامل شدن دستمزد و حقوق پرسنل در هزینه‌ها</span>
          </label>
        </div>
      </div>

      {/* Primary KPI Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-amber-900/15 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-emerald-800 uppercase">مجموع کل درآمد بازه</span>
            <p className="text-2xl font-black text-slate-900 font-mono mt-1.5">
              {formatPersianPrice(totalInScopeSalesRevenue)} <span className="text-xs font-normal">تومان</span>
            </p>
            <span className="text-[11px] text-slate-500 mt-1 block">
              {inRangeSales.length} فاکتور فروش صادره
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-amber-900/15 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-rose-800 uppercase">مجموع کل هزینه‌ها و دستمزدها</span>
            <p className="text-2xl font-black text-slate-900 font-mono mt-1.5">
              {formatPersianPrice(totalInScopeExpenses)} <span className="text-xs font-normal">تومان</span>
            </p>
            <span className="text-[11px] text-slate-500 mt-1 block">
              {inRangePurchases.length} فاکتور خرید + {inRangeWages.length} سند دستمزد
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-amber-900/15 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-amber-900 uppercase">سود عملیاتی خالص اقامتگاه</span>
            <p className={`text-2xl font-black font-mono mt-1.5 ${netOperatingSurplus >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {formatPersianPrice(netOperatingSurplus)} <span className="text-xs font-normal">تومان</span>
            </p>
            <span className="text-[11px] text-slate-500 mt-1 block">
              {netOperatingSurplus >= 0 ? 'تراز مالی مثبت (سودده)' : 'تراز منفی'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-900 border border-amber-200 flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Section 1: Budget Rows & Variance Table */}
      <div className="bg-white rounded-2xl border border-amber-900/15 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PieChart className="w-5 h-5 text-amber-300" />
            <h3 className="text-sm font-bold">جدول درصد و انحراف ردیف‌های بودجه اقامتگاه</h3>
          </div>
          <span className="text-xs text-amber-200">
            تخصیص بر مبنای کل درآمد ({formatPersianPrice(totalInScopeSalesRevenue)} تومان)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-amber-50/60 text-amber-950 border-b border-amber-900/10">
                <th className="py-3 px-4 font-bold">ردیف بودجه</th>
                <th className="py-3 px-4 font-bold">درصد مصوب</th>
                <th className="py-3 px-4 font-bold">سقف بودجه تخصیصی</th>
                <th className="py-3 px-4 font-bold">هزینه واقعی انجام شده</th>
                <th className="py-3 px-4 font-bold">میزان انحراف (صرفه‌جویی / مازاد)</th>
                <th className="py-3 px-4 font-bold">درصد مصرف سقف</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {budgetRowsWithCalculations.map((row) => {
                const isUnderBudget = row.variance >= 0;
                return (
                  <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <span>{row.name}</span>
                        {row.badge && (
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-md border font-medium ${row.badgeColor || 'bg-slate-100 text-slate-700 border-slate-200'}`}
                          >
                            {row.badge}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-amber-900">
                      {row.percentage}٪
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      {formatPersianPrice(row.allocatedBudget)} تومان
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      {formatPersianPrice(row.actualSpent)} تومان
                    </td>

                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold font-mono ${
                        isUnderBudget
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {isUnderBudget ? '+' : ''}{formatPersianPrice(row.variance)} تومان{' '}
                        {isUnderBudget ? '(صرفه‌جویی)' : '(مازاد مصرف)'}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-slate-200 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              row.usagePercent > 100
                                ? 'bg-rose-600'
                                : row.usagePercent > 80
                                ? 'bg-amber-600'
                                : 'bg-emerald-600'
                            }`}
                            style={{ width: `${Math.min(100, row.usagePercent)}%` }}
                          />
                        </div>
                        <span className="font-mono font-bold text-slate-700 text-[11px]">
                          {Math.round(row.usagePercent)}٪
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-amber-950 text-white font-bold border-t-2 border-amber-900">
              <tr>
                <td className="py-3.5 px-4 text-xs">
                  مجموع ردیف‌های مصوب بودجه اقامتگاه
                </td>
                <td className="py-3.5 px-4 font-mono text-amber-300">
                  {totalBudgetPercentageSum}٪
                </td>
                <td className="py-3.5 px-4 font-mono">
                  {formatPersianPrice(totalAllocatedSum)} تومان
                </td>
                <td className="py-3.5 px-4 font-mono text-amber-200">
                  {formatPersianPrice(totalActualSpentSum)} تومان
                </td>
                <td className="py-3.5 px-4">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-bold ${
                      totalVarianceSum >= 0
                        ? 'bg-emerald-800 text-emerald-100'
                        : 'bg-rose-800 text-rose-100'
                    }`}
                  >
                    {totalVarianceSum >= 0 ? '+' : ''}
                    {formatPersianPrice(totalVarianceSum)} تومان{' '}
                    {totalVarianceSum >= 0 ? '(تراز مثبت)' : '(کسری)'}
                  </span>
                </td>
                <td className="py-3.5 px-4">
                  <span className="font-mono text-xs">
                    {Math.round(totalUsagePercentSum)}٪
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Section 2: Investor Profit Calculation (سود سرمایه‌گذار) */}
      <div className="bg-white rounded-3xl p-6 border-2 border-amber-900/20 shadow-md flex flex-col gap-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-amber-900/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-800 text-white flex items-center justify-center shadow-xs">
              <Award className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                محاسبه سود سرمایه‌گذار اقامتگاه
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                تفکیک اقلام درآمدی مشمول سود و معاف کردن مواردی مانند دست‌آفرید و صنایع دستی
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-amber-50/80 p-2.5 rounded-2xl border border-amber-200">
            <label className="text-xs font-bold text-amber-950">درصد سهم سرمایه‌گذار:</label>
            <input
              type="number"
              min="0"
              max="100"
              value={investorSharePercent}
              onChange={(e) => setInvestorSharePercent(Number(e.target.value))}
              className="w-16 p-1.5 border border-amber-300 rounded-xl text-center text-xs font-mono font-bold bg-white focus:ring-2 focus:ring-amber-700 outline-hidden"
            />
            <span className="text-xs font-bold text-amber-900">درصد (٪)</span>
          </div>
        </div>

        {/* Exempt Category Toggle Buttons */}
        <div>
          <span className="text-xs font-bold text-slate-700 mb-2 block">
            دسته‌بندی‌های درآمدی معاف از محاسبه سود سرمایه‌گذار (مثلاً دست‌آفرید و صنایع دستی):
          </span>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => {
              const isExempt = investorExemptCategoryIds.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  onClick={() => toggleInvestorExemptCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                    isExempt
                      ? 'bg-rose-50 text-rose-800 border-rose-300'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  }`}
                >
                  {isExempt ? (
                    <>
                      <Square className="w-3.5 h-3.5 text-rose-600" />
                      <span>{cat.name} (معاف از سود سرمایه‌گذار)</span>
                    </>
                  ) : (
                    <>
                      <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{cat.name} (مشمول محاسبه سود)</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Calculation Summary Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <div>
            <span className="text-[11px] text-slate-500 font-semibold">درآمد مشمول سرمایه‌گذار</span>
            <p className="text-base font-bold text-slate-900 font-mono mt-1">
              {formatPersianPrice(investorEligibleRevenue)} تومان
            </p>
          </div>

          <div>
            <span className="text-[11px] text-slate-500 font-semibold">هزینه‌های کسر شده</span>
            <p className="text-base font-bold text-rose-700 font-mono mt-1">
              {formatPersianPrice(investorEligibleExpenses)} تومان
            </p>
          </div>

          <div>
            <span className="text-[11px] text-slate-500 font-semibold">پایه سود خالص قابل تقسیم</span>
            <p className="text-base font-bold text-slate-900 font-mono mt-1">
              {formatPersianPrice(investorNetBaseProfit)} تومان
            </p>
          </div>

          <div className="bg-amber-100/70 p-3 rounded-xl border border-amber-300">
            <span className="text-[11px] text-amber-900 font-bold">مبلغ سهم سود سرمایه‌گذار ({investorSharePercent}٪)</span>
            <p className="text-lg font-black text-amber-950 font-mono mt-0.5">
              {formatPersianPrice(investorShareAmount)} تومان
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}
