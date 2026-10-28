import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  SalesInvoiceItem,
  PurchaseInvoiceItem,
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
  isDateInRange,
  normalizePersianText
} from '../utils/persianDate';
import { PersianDatePicker } from './PersianDatePicker';

export function resolvePurchaseCategory(
  item: PurchaseInvoiceItem,
  categories: Category[],
  purchaseCatalogItems: Item[] = []
): Category | null {
  const normItemName = normalizePersianText(item.itemName || '');
  const normCatName = normalizePersianText(item.categoryName || '');

  // 1. High-priority keyword heuristics on item name
  // This guarantees that "قبض برق" or "قبض آب" is ALWAYS categorized under "قبض و اینترنت"
  // even if an invoice row had an incorrect default category id!
  for (const cat of categories) {
    const cName = normalizePersianText(cat.name);
    // Utility bills & internet
    if (
      (cName.includes('قبض') || cName.includes('اینترنت') || cName.includes('انرژی') || cat.id === 'pcat-2' || cat.id === 'b-pcat-2') &&
      /قبض|آب|اب|برق|گاز|اینترنت|تلفن|مخابرات|وای‌فای|وای فای|شارژ|بسته اینترنت|سیمکارت|سیم کارت/.test(normItemName)
    ) {
      return cat;
    }
    // Repairs & Maintenance
    if (
      (cName.includes('تعمیر') || cName.includes('نگهداری') || cName.includes('تاسیسات') || cat.id === 'pcat-3' || cat.id === 'b-pcat-3') &&
      /تعمیر|سرویس|نگهداری|رنگ|لوله|سیم‌کشی|سیم کشی|شیرآلات|بنا|ابزار|تاسیسات|کاهگل|مرمت|ساختمانی|کلید|پریز/.test(normItemName)
    ) {
      return cat;
    }
    // Advertising & Environment
    if (
      (cName.includes('تبلیغ') || cName.includes('محیط') || cat.id === 'pcat-4' || cat.id === 'b-pcat-4') &&
      /تبلیغ|چاپ|بنر|کاتالوگ|بروشور|عکاسی|فیلمبرداری|محیط زیست|فضای سبز|پسماند|زباله|تراکت/.test(normItemName)
    ) {
      return cat;
    }
    // Equipment & Operating Supplies
    if (
      (cName.includes('تجهیزات') || cName.includes('ملزومات') || cat.id === 'pcat-5' || cat.id === 'b-pcat-5') &&
      /تجهیز|ملزومات|پتو|تشک|ملحفه|بالش|ظروف|قاشق|لیوان|لامپ|فرش|وسایل|پنکه|بخاری/.test(normItemName)
    ) {
      return cat;
    }
    // Food & Groceries & Hygiene
    if (
      (cName.includes('غذایی') || cName.includes('بهداشتی') || cat.id === 'pcat-1' || cat.id === 'b-pcat-1') &&
      /غذا|پذیرایی|صبحانه|دیزی|کباب|برنج|گوشت|مرغ|نان|پنیر|روغن|چای|قند|شوینده|بهداشتی|شامپو|مایع|دستمال|میوه|سبزی|ماست|شیر|لبنیات|سوپرمارکت|خواربار|ادویه|زعفران|حبوبات/.test(normItemName)
    ) {
      return cat;
    }
  }

  // 2. Direct categoryId match (handling b-pcat- prefix and standard ids)
  if (item.categoryId) {
    const rawId = item.categoryId;
    const strippedId = rawId.replace(/^b-pcat-/, '');
    const found = categories.find((c) => c.id === rawId || c.id === strippedId || `b-pcat-${c.id}` === rawId);
    if (found) return found;
  }

  // 3. Catalog Item match
  if (item.itemId) {
    const pItem = purchaseCatalogItems.find((p) => p.id === item.itemId);
    if (pItem?.categoryId) {
      const stripped = pItem.categoryId.replace(/^b-pcat-/, '');
      const found = categories.find((c) => c.id === pItem.categoryId || c.id === stripped);
      if (found) return found;
    }
    if (pItem?.categoryName) {
      const pcn = normalizePersianText(pItem.categoryName);
      const found = categories.find((c) => normalizePersianText(c.name) === pcn);
      if (found) return found;
    }
  }

  // 4. Direct categoryName match
  if (normCatName) {
    const found = categories.find((c) => {
      const cn = normalizePersianText(c.name);
      return cn === normCatName || normCatName.includes(cn) || cn.includes(normCatName);
    });
    if (found) return found;
  }

  // 5. Keyword search in category names
  for (const cat of categories) {
    const cName = normalizePersianText(cat.name);
    const keywords = cName.split(/[\s،,و/]+/).filter((k) => k.length > 2);
    if (keywords.some((k) => normItemName.includes(k))) {
      return cat;
    }
  }

  return null;
}

export function resolveSalesCategory(
  item: SalesInvoiceItem,
  categories: Category[],
  salesCatalogItems: Item[] = []
): Category | null {
  const normItemName = normalizePersianText(item.itemName || '');
  const normCatName = normalizePersianText(item.categoryName || '');

  // 1. Keyword matching for known sales domains
  for (const cat of categories) {
    const cName = normalizePersianText(cat.name);
    // Accommodation & Breakfast
    if (
      (cName.includes('اقامت') || cName.includes('صبحانه') || cat.id === 'cat-1') &&
      /اقامت|اتاق|سوئیت|شاه‌نشین|شاه نشین|ترنج|دربست|حیاط|صبحانه|اسکان|رزرو|تخت|نفر اضافه/.test(normItemName)
    ) {
      return cat;
    }
    // Restaurant & Beverages & Food
    if (
      (cName.includes('رستوران') || cName.includes('نوشیدنی') || cName.includes('غذا') || cat.id === 'cat-2') &&
      /دیزی|غذا|کباب|شامی|قرمساق|چای|شربت|دمنوش|پذیرایی|دوغ|ترشی|ناهار|شام|شام محلی|سینی|کیک|قهوه/.test(normItemName)
    ) {
      return cat;
    }
    // Handcrafts & Rosewater & Souvenirs
    if (
      (cName.includes('دست‌آفرید') || cName.includes('دست افرید') || cName.includes('صنایع') || cName.includes('سوغات') || cat.id === 'cat-3') &&
      /گلاب|عرق|عرقیات|نعناع|نعنا|بیدمشک|صنایع|صنایع دستی|گلیم|دست‌آفرید|دست افرید|سوغات|کوزه|سفال/.test(normItemName)
    ) {
      return cat;
    }
    // Tours & Eco-tourism experiences
    if (
      (cName.includes('تور') || cName.includes('بوم‌گردی') || cName.includes('تجارب') || cat.id === 'cat-4') &&
      /تور|کویر|باغ|باغ‌گردی|رصد|ستارگان|گشت|راهنما|دوچرخه|عکاسی/.test(normItemName)
    ) {
      return cat;
    }
  }

  // 2. Direct categoryId match
  if (item.categoryId) {
    const found = categories.find((c) => c.id === item.categoryId);
    if (found) return found;
  }

  // 3. Catalog Item match
  if (item.itemId) {
    const sItem = salesCatalogItems.find((s) => s.id === item.itemId);
    if (sItem?.categoryId) {
      const found = categories.find((c) => c.id === sItem.categoryId);
      if (found) return found;
    }
    if (sItem?.categoryName) {
      const scn = normalizePersianText(sItem.categoryName);
      const found = categories.find((c) => normalizePersianText(c.name) === scn);
      if (found) return found;
    }
  }

  // 4. Direct categoryName match
  if (normCatName) {
    const found = categories.find((c) => {
      const cn = normalizePersianText(c.name);
      return cn === normCatName || normCatName.includes(cn) || cn.includes(normCatName);
    });
    if (found) return found;
  }

  // 5. Keyword match from category name words
  for (const cat of categories) {
    const cName = normalizePersianText(cat.name);
    const keywords = cName.split(/[\s،,و/]+/).filter((k) => k.length > 2);
    if (keywords.some((k) => normItemName.includes(k))) {
      return cat;
    }
  }

  return null;
}

interface BudgetAndInvestorViewProps {
  salesInvoices: SalesInvoice[];
  purchaseInvoices: PurchaseInvoice[];
  wagePayments: WagePayment[];
  categories: Category[];
  purchaseCategories?: Category[];
  purchaseItems?: Item[];
  items?: Item[];
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
  items = [],
  investorPayouts = [],
  investors = [],
  settings
}: BudgetAndInvestorViewProps) {
  // Date Range State
  const [dateFilterMode, setDateFilterMode] = useState<'THIS_MONTH' | 'THIS_YEAR' | 'CUSTOM'>('THIS_MONTH');
  const [startDate, setStartDate] = useState<string>(getFirstDayOfMonthJalali());
  const [endDate, setEndDate] = useState<string>(getLastDayOfMonthJalali());

  // Category Selection for General Budget calculation
  const [selectedBudgetCategoryIds, setSelectedBudgetCategoryIds] = useState<string[]>(() => [
    ...categories.map((c) => c.id),
    'other'
  ]);
  const hasInitializedBudgetCategories = useRef(categories.length > 0);

  useEffect(() => {
    if (!hasInitializedBudgetCategories.current && categories.length > 0) {
      setSelectedBudgetCategoryIds([...categories.map((c) => c.id), 'other']);
      hasInitializedBudgetCategories.current = true;
    }
  }, [categories]);

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

  // Calculate Total Sales Revenue by Category and Investor Eligible Revenue
  const salesByCategory: Record<string, number> = {};
  categories.forEach((cat) => (salesByCategory[cat.id] = 0));
  salesByCategory['other'] = 0;

  let investorEligibleRevenue = 0;
  let investorExemptRevenue = 0;

  inRangeSales.forEach((inv) => {
    const totalPayable = Number(inv.totalPayable) || 0;
    const paidAmount = Number(inv.totalPaidAmount) > 0 ? Number(inv.totalPaidAmount) : (inv.paid ? totalPayable : 0);
    // Requirement (ج): Unpaid invoices must NOT be counted into revenue. Only actual paid amounts count.
    if (paidAmount <= 0) return;

    const ratio = totalPayable > 0 ? Math.min(1, paidAmount / totalPayable) : 1;

    (inv.items || []).forEach((item) => {
      const rawItemAmount = Number(item.payableAmount ?? item.totalPrice) || 0;
      const itemAmount = rawItemAmount * ratio;
      const matchedCat = resolveSalesCategory(item, categories, items);
      const catId = matchedCat ? matchedCat.id : 'other';
      salesByCategory[catId] = (salesByCategory[catId] || 0) + itemAmount;

      // Check exemption dynamically based on matched category id
      const isExempt = matchedCat ? investorExemptCategoryIds.includes(matchedCat.id) : false;
      if (isExempt) {
        investorExemptRevenue += itemAmount;
      } else {
        investorEligibleRevenue += itemAmount;
      }
    });
  });

  // Calculate In-Scope Sales Revenue for Overall Overview (Strictly paid amounts per Requirement ج)
  const totalInScopeSalesRevenue = inRangeSales.reduce((sum, inv) => {
    const totalPayable = Number(inv.totalPayable) || 0;
    const paidAmount = Number(inv.totalPaidAmount) > 0 ? Number(inv.totalPaidAmount) : (inv.paid ? totalPayable : 0);
    return sum + paidAmount;
  }, 0);

  // List of all sales categories for display & budget selection
  const allDisplaySalesCategories = useMemo(() => {
    const list = [...categories];
    if (salesByCategory['other'] && salesByCategory['other'] > 0) {
      list.push({
        id: 'other',
        name: 'سایر / بدون دسته‌بندی'
      });
    }
    return list;
  }, [categories, salesByCategory]);

  // Total budget-eligible sales income based on selected income categories
  const totalBudgetEligibleIncome = useMemo(() => {
    return allDisplaySalesCategories.reduce((sum, cat) => {
      if (selectedBudgetCategoryIds.includes(cat.id)) {
        return sum + (salesByCategory[cat.id] || 0);
      }
      return sum;
    }, 0);
  }, [allDisplaySalesCategories, selectedBudgetCategoryIds, salesByCategory]);

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

  let unmatchedPurchasesSpent = 0;

  inRangePurchases.forEach((inv) => {
    (inv.items || []).forEach((item) => {
      const amount = Number(item.paidAmount ?? item.totalPrice) || 0;
      const matchedCat = resolvePurchaseCategory(item, effectivePurchaseCategories, purchaseItems);

      if (matchedCat) {
        categorySpentMap[matchedCat.id] = (categorySpentMap[matchedCat.id] || 0) + amount;
        matchedPurchaseItemIds.add(item.id);
      } else {
        unmatchedPurchasesSpent += amount;
      }
    });
  });

  // Build the list of budget rows strictly per Requirement 5:
  // - حقوق و دستمزد و انعام پرسنل
  // - ردیف‌های دسته‌بندی کالاها در «کاتالوگ کالا و خدمات برای خرید»
  // - سود سرمایه گذار
  const configRows = settings.budgetRows || [];

  // 1. Wage row (Allocated ceiling based on selected budget income)
  const wageConfig = configRows.find(
    (r) => r.isWageRow || r.name.includes('حقوق') || r.name.includes('دستمزد')
  );
  const wagePercentage = wageConfig ? Number(wageConfig.percentage) : 20;
  const wageAllocated = (totalBudgetEligibleIncome * wagePercentage) / 100;
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

  // 2. Purchase Category rows (Allocated ceiling based on selected budget income)
  const purchaseCategoryRowsCalculated = effectivePurchaseCategories.map((cat) => {
    const catConfig = configRows.find(
      (r) =>
        (r.purchaseCategoryId && (r.purchaseCategoryId === cat.id || r.purchaseCategoryId === cat.id.replace(/^b-pcat-/, ''))) ||
        r.id === cat.id ||
        r.id === `b-pcat-${cat.id}` ||
        normalizePersianText(r.name) === normalizePersianText(cat.name)
    );
    let defaultPct = 10;
    if (cat.name.includes('غذایی') || cat.name.includes('بهداشتی')) defaultPct = 25;
    else if (cat.name.includes('قبض') || cat.name.includes('اینترنت')) defaultPct = 5;
    else if (cat.name.includes('تعمیر') || cat.name.includes('نگهداری')) defaultPct = 10;
    else if (cat.name.includes('تبلیغ') || cat.name.includes('محیط')) defaultPct = 5;
    else if (cat.name.includes('تجهیزات') || cat.name.includes('ملزومات')) defaultPct = 5;

    const percentage = catConfig ? Number(catConfig.percentage) : defaultPct;
    const allocatedBudget = (totalBudgetEligibleIncome * percentage) / 100;
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

  // Calculate Investor Profit Amount (for Section 2 reference)
  const investorEligibleExpenses = totalInScopeExpenses;
  const investorNetBaseProfit = Math.max(0, investorEligibleRevenue - investorEligibleExpenses);
  const investorShareAmount = (investorNetBaseProfit * investorSharePercent) / 100;

  // 3. Investor Profit row (Allocated ceiling based on selected budget income; actual cost based on recorded payouts)
  const investorConfig = configRows.find(
    (r) => r.isInvestorShare || r.name.includes('سرمایه‌گذار')
  );
  const investorPercentage = investorConfig
    ? Number(investorConfig.percentage)
    : (settings.investorSharePercent || 35);
  const investorAllocated = (totalBudgetEligibleIncome * investorPercentage) / 100;
  // Real cost: strictly actual payouts registered to investors in this date range
  const investorActualSpent = totalInvestorPayoutsPaid;
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

  const toggleBudgetCategory = (catId: string) => {
    setSelectedBudgetCategoryIds((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  };

  const selectAllBudgetCategories = () => {
    setSelectedBudgetCategoryIds(allDisplaySalesCategories.map((c) => c.id));
  };

  const deselectAllBudgetCategories = () => {
    setSelectedBudgetCategoryIds([]);
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
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 font-bold text-slate-700 text-xs shrink-0">
            <Calendar className="w-4 h-4 text-amber-800" />
            <span>بازه محاسباتی:</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-slate-500 font-bold shrink-0">از:</span>
            <div className="w-56 sm:w-64 min-w-[220px]">
              <PersianDatePicker
                value={startDate}
                onChange={(newD) => {
                  setStartDate(newD);
                  setDateFilterMode('CUSTOM');
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
                value={endDate}
                onChange={(newD) => {
                  setEndDate(newD);
                  setDateFilterMode('CUSTOM');
                }}
                placeholder="پایان (۱۴۰۳/۱۲/۲۹)"
                inputClassName="py-2 px-3 text-xs"
                allowClear
              />
            </div>
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
              {totalBudgetEligibleIncome !== totalInScopeSalesRevenue && (
                <span className="text-emerald-700 font-bold mr-2">
                  (مبنای بودجه: {formatPersianPrice(totalBudgetEligibleIncome)} تومان)
                </span>
              )}
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
        {/* Table Top Header Bar */}
        <div className="p-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <PieChart className="w-5 h-5 text-amber-300" />
            <div>
              <h3 className="text-sm font-bold">جدول درصد و انحراف ردیف‌های بودجه اقامتگاه</h3>
              <p className="text-[11px] text-slate-300 mt-0.5">
                سنجش انحراف از بودجه مصوب بر مبنای دسته‌بندی‌های درآمدی انتخابی
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-amber-200 bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700 font-medium">
              درآمد مبنای تخصیص سقف:{' '}
              <strong className="font-mono text-white text-sm">{formatPersianPrice(totalBudgetEligibleIncome)}</strong> تومان
            </span>
          </div>
        </div>

        {/* Budget Eligible Income Categories Selector (مشابه با بخش محاسبه سود سرمایه‌گذار) */}
        <div className="p-4 sm:p-5 bg-amber-50/40 border-b border-amber-900/10 flex flex-col gap-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-slate-900">
                تعیین دسته‌بندی‌های درآمدی مشمول در محاسبه سقف بودجه اقامتگاه:
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                روی هر دسته کلیک کنید تا در جمع درآمد مبنای تخصیص بودجه ردیف‌ها لحاظ یا حذف شود
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={selectAllBudgetCategories}
                className="text-[11px] font-bold text-amber-800 hover:text-amber-950 px-2.5 py-1 rounded-lg hover:bg-amber-100/60 transition-colors cursor-pointer"
              >
                انتخاب همه
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={deselectAllBudgetCategories}
                className="text-[11px] font-bold text-slate-500 hover:text-slate-700 px-2.5 py-1 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                لغو همه
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {allDisplaySalesCategories.map((cat) => {
              const isIncluded = selectedBudgetCategoryIds.includes(cat.id);
              const catRevenue = salesByCategory[cat.id] || 0;
              const catShareOfTotal = totalInScopeSalesRevenue > 0
                ? Math.round((catRevenue / totalInScopeSalesRevenue) * 100)
                : 0;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleBudgetCategory(cat.id)}
                  className={`p-3 rounded-2xl border text-right transition-all cursor-pointer flex flex-col justify-between gap-2 shadow-2xs ${
                    isIncluded
                      ? 'bg-emerald-50/80 border-emerald-300 hover:bg-emerald-100/70 ring-1 ring-emerald-400/20'
                      : 'bg-slate-50/90 border-slate-200 text-slate-400 hover:bg-slate-100/80 opacity-75'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={`font-bold text-xs ${isIncluded ? 'text-slate-900' : 'text-slate-500'}`}>
                      {cat.name}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        isIncluded
                          ? 'bg-emerald-200 text-emerald-800'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {isIncluded ? (
                        <>
                          <CheckSquare className="w-3 h-3 text-emerald-700" />
                          مشمول در بودجه
                        </>
                      ) : (
                        <>
                          <Square className="w-3 h-3 text-slate-500" />
                          حذف از بودجه
                        </>
                      )}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between w-full pt-1 border-t border-slate-200/60">
                    <span className="text-[11px] text-slate-500">فروش این بازه:</span>
                    <span className={`text-xs font-mono font-bold ${isIncluded ? 'text-slate-800' : 'text-slate-400'}`}>
                      {formatPersianPrice(catRevenue)} تومان
                      <span className="text-[10px] text-slate-400 font-normal mr-1">({catShareOfTotal}٪)</span>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {selectedBudgetCategoryIds.length < allDisplaySalesCategories.length && (
            <div className="flex items-center justify-between text-[11px] bg-amber-100/70 text-amber-900 px-3.5 py-2 rounded-xl border border-amber-200">
              <span>
                توجه: برخی دسته‌بندی‌ها از محاسبه بودجه حذف شده‌اند. کل فروش ناخالص دوره:{' '}
                <strong className="font-mono">{formatPersianPrice(totalInScopeSalesRevenue)}</strong> تومان | درآمد مبنای بودجه:{' '}
                <strong className="font-mono text-emerald-900">{formatPersianPrice(totalBudgetEligibleIncome)}</strong> تومان
              </span>
            </div>
          )}
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

        {/* Exempt Category Toggle & Revenue Breakdown */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">
              تعیین دسته‌بندی‌های درآمدی مشمول یا معاف از محاسبه سود سرمایه‌گذار:
            </span>
            <span className="text-[11px] text-slate-500">
              روی هر دسته کلیک کنید تا آن را معاف یا مشمول سود کنید
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {categories.map((cat) => {
              const isExempt = investorExemptCategoryIds.includes(cat.id);
              const catRevenue = salesByCategory[cat.id] || 0;
              const catShareOfTotal = totalInScopeSalesRevenue > 0
                ? Math.round((catRevenue / totalInScopeSalesRevenue) * 100)
                : 0;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleInvestorExemptCategory(cat.id)}
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
                    <span className="text-[11px] text-slate-500">فروش این بازه:</span>
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

        {/* Calculation Summary Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <div>
            <span className="text-[11px] text-slate-500 font-semibold">کل فروش ناخالص در بازه</span>
            <p className="text-base font-bold text-slate-900 font-mono mt-1">
              {formatPersianPrice(totalInScopeSalesRevenue)} تومان
            </p>
            {investorExemptRevenue > 0 && (
              <span className="text-[10px] text-rose-600 block mt-0.5 font-medium">
                معاف شده: {formatPersianPrice(investorExemptRevenue)} تومان
              </span>
            )}
          </div>

          <div>
            <span className="text-[11px] text-slate-500 font-semibold">درآمد خالص مشمول سرمایه‌گذار</span>
            <p className="text-base font-bold text-emerald-700 font-mono mt-1">
              {formatPersianPrice(investorEligibleRevenue)} تومان
            </p>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              مبنای محاسبه سود
            </span>
          </div>

          <div>
            <span className="text-[11px] text-slate-500 font-semibold">هزینه‌های کسر شده (خرید و دستمزد)</span>
            <p className="text-base font-bold text-rose-700 font-mono mt-1">
              {formatPersianPrice(investorEligibleExpenses)} تومان
            </p>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              هزینه‌های جاری اقامتگاه
            </span>
          </div>

          <div className="bg-amber-100/80 p-3.5 rounded-xl border border-amber-300 flex flex-col justify-between">
            <span className="text-[11px] text-amber-900 font-bold">
              سهم سود محاسبه شده سرمایه‌گذار ({investorSharePercent}٪)
            </span>
            <p className="text-lg font-black text-amber-950 font-mono mt-1">
              {formatPersianPrice(investorShareAmount)} تومان
            </p>
            {totalInvestorPayoutsPaid > 0 && (
              <span className="text-[10px] text-amber-800 font-medium block mt-1 pt-1 border-t border-amber-300">
                پرداخت شده: {formatPersianPrice(totalInvestorPayoutsPaid)} | مانده: {formatPersianPrice(investorShareAmount - totalInvestorPayoutsPaid)} تومان
              </span>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
