import React, { useState, useMemo, useEffect } from 'react';
import {
  SalesInvoice,
  PurchaseInvoice,
  Category,
  Item,
  WagePayment
} from '../types';
import { formatPersianPrice, numberToWordsPersian } from '../utils/numberToWords';
import {
  isDateInRange,
  formatPersianDate,
  normalizePersianText
} from '../utils/persianDate';
import { exportTableToExcel, ExcelColumn } from '../utils/exportToExcel';
import { PersianDatePicker } from './PersianDatePicker';
import {
  resolvePurchaseCategory,
  resolveSalesCategory
} from './BudgetAndInvestorView';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';
import {
  BarChart3,
  Calendar,
  PieChart as PieIcon,
  ShoppingBag,
  TrendingUp,
  TrendingDown,
  DollarSign,
  User,
  Layers,
  FileText,
  Package,
  Folder,
  FileSpreadsheet,
  CheckSquare,
  Square,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  RotateCcw
} from 'lucide-react';

interface ReportsViewProps {
  salesInvoices: SalesInvoice[];
  purchaseInvoices: PurchaseInvoice[];
  categories: Category[];
  items?: Item[];
  purchaseCategories?: Category[];
  purchaseItems?: Item[];
  wagePayments?: WagePayment[];
  customerTitle?: string;
}

type ReportTabId =
  | 'PROFIT_LOSS'
  | 'PURCHASE_BY_CATEGORY'
  | 'PURCHASE_BY_ITEM'
  | 'SALES_BY_CATEGORY'
  | 'SALES_BY_ITEM'
  | 'SALES_INVOICES'
  | 'PURCHASE_INVOICES'
  | 'GUEST_HISTORY';

export const ReportsView: React.FC<ReportsViewProps> = ({
  salesInvoices,
  purchaseInvoices,
  categories,
  items = [],
  purchaseCategories = [],
  purchaseItems = [],
  wagePayments = [],
  customerTitle = 'مهمان',
}) => {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [activeReportTab, setActiveReportTab] = useState<ReportTabId>('PROFIT_LOSS');

  // Search queries for individual report tables
  const [searchPurchaseCat, setSearchPurchaseCat] = useState('');
  const [searchPurchaseItem, setSearchPurchaseItem] = useState('');
  const [searchSalesCat, setSearchSalesCat] = useState('');
  const [searchSalesItem, setSearchSalesItem] = useState('');
  const [selectedGuestName, setSelectedGuestName] = useState<string>('');

  // 1. Filtered sales invoices in date range
  const filteredSales = useMemo(() => {
    return salesInvoices.filter((inv) => isDateInRange(inv.date, startDate, endDate));
  }, [salesInvoices, startDate, endDate]);

  // 2. Filtered purchase invoices in date range
  const filteredPurchases = useMemo(() => {
    return purchaseInvoices.filter((inv) => isDateInRange(inv.date, startDate, endDate));
  }, [purchaseInvoices, startDate, endDate]);

  // 3. Filtered wage payments in date range
  const filteredWages = useMemo(() => {
    return wagePayments.filter((w) => isDateInRange(w.date, startDate, endDate));
  }, [wagePayments, startDate, endDate]);

  // ==========================================
  // DISCOVER & AGGREGATE ALL INCOME CATEGORIES
  // ==========================================
  const allIncomeCategories = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();

    // From settings categories
    categories.forEach((cat) => {
      map.set(cat.id, { id: cat.id, name: cat.name });
    });

    // Also check sales invoice items to catch any custom category names
    filteredSales.forEach((inv) => {
      inv.items?.forEach((item) => {
        const resolved = resolveSalesCategory(item, categories, items);
        if (resolved) {
          map.set(resolved.id, { id: resolved.id, name: resolved.name });
        } else if (item.categoryName?.trim()) {
          const key = `custom-sales-${item.categoryName.trim()}`;
          if (!map.has(key)) {
            map.set(key, { id: key, name: item.categoryName.trim() });
          }
        }
      });
    });

    // Fallback if empty
    if (map.size === 0) {
      map.set('general-sales', { id: 'general-sales', name: 'فروش و خدمات اقامتگاه' });
    }

    return Array.from(map.values());
  }, [categories, filteredSales, items]);

  // ===========================================
  // DISCOVER & AGGREGATE ALL EXPENSE CATEGORIES
  // ===========================================
  const allExpenseCategories = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();

    // From settings purchaseCategories
    purchaseCategories.forEach((cat) => {
      map.set(cat.id, { id: cat.id, name: cat.name });
    });

    // Also check purchase invoice items
    filteredPurchases.forEach((inv) => {
      inv.items?.forEach((item) => {
        const resolved = resolvePurchaseCategory(item, purchaseCategories, purchaseItems);
        if (resolved) {
          map.set(resolved.id, { id: resolved.id, name: resolved.name });
        } else if (item.categoryName?.trim()) {
          const key = `custom-pcat-${item.categoryName.trim()}`;
          if (!map.has(key)) {
            map.set(key, { id: key, name: item.categoryName.trim() });
          }
        }
      });
    });

    // Always include Wages as a distinct expense category
    map.set('wages-row', { id: 'wages-row', name: 'دستمزد و حقوق پرسنل' });

    // Fallback if empty
    if (map.size === 1) {
      map.set('general-purchases', { id: 'general-purchases', name: 'سایر ملزومات و خریدهای عمومی' });
    }

    return Array.from(map.values());
  }, [purchaseCategories, filteredPurchases, purchaseItems]);

  // Category selections state for Requirement (ج)
  const [selectedIncomeCatIds, setSelectedIncomeCatIds] = useState<string[]>([]);
  const [selectedExpenseCatIds, setSelectedExpenseCatIds] = useState<string[]>([]);
  const [isIncomeInitialized, setIsIncomeInitialized] = useState(false);
  const [isExpenseInitialized, setIsExpenseInitialized] = useState(false);

  // Initialize all selected by default
  useEffect(() => {
    if (!isIncomeInitialized && allIncomeCategories.length > 0) {
      setSelectedIncomeCatIds(allIncomeCategories.map((c) => c.id));
      setIsIncomeInitialized(true);
    }
  }, [allIncomeCategories, isIncomeInitialized]);

  useEffect(() => {
    if (!isExpenseInitialized && allExpenseCategories.length > 0) {
      setSelectedExpenseCatIds(allExpenseCategories.map((c) => c.id));
      setIsExpenseInitialized(true);
    }
  }, [allExpenseCategories, isExpenseInitialized]);

  // Keep any new categories automatically selected
  useEffect(() => {
    if (isIncomeInitialized) {
      setSelectedIncomeCatIds((prev) => {
        const existingSet = new Set(prev);
        const newCatIds = allIncomeCategories.map((c) => c.id).filter((id) => !existingSet.has(id));
        return newCatIds.length > 0 ? [...prev, ...newCatIds] : prev;
      });
    }
  }, [allIncomeCategories, isIncomeInitialized]);

  useEffect(() => {
    if (isExpenseInitialized) {
      setSelectedExpenseCatIds((prev) => {
        const existingSet = new Set(prev);
        const newCatIds = allExpenseCategories.map((c) => c.id).filter((id) => !existingSet.has(id));
        return newCatIds.length > 0 ? [...prev, ...newCatIds] : prev;
      });
    }
  }, [allExpenseCategories, isExpenseInitialized]);

  // Pre-calculate raw breakdown by income category in date range (strictly paid amounts per Requirement ج)
  const incomeCategorySums = useMemo(() => {
    const sums: { [catId: string]: number } = {};
    allIncomeCategories.forEach((cat) => {
      sums[cat.id] = 0;
    });

    filteredSales.forEach((inv) => {
      const invTotal = Number(inv.totalPayable) || 0;
      const invPaid = Number(inv.totalPaidAmount) > 0 ? Number(inv.totalPaidAmount) : (inv.paid ? invTotal : 0);
      
      // Requirement (ج): Unpaid invoices must NOT be counted into revenue. Only actual paid amounts count.
      if (invPaid <= 0) return;

      const paidRatio = invTotal > 0 ? Math.min(1, invPaid / invTotal) : 1;

      inv.items?.forEach((item) => {
        const resolved = resolveSalesCategory(item, categories, items);
        const catId = resolved ? resolved.id : (
          allIncomeCategories.find((c) => c.name === item.categoryName)?.id || allIncomeCategories[0]?.id
        );
        if (catId) {
          const itemPaid = (Number(item.payableAmount) || 0) * paidRatio;
          sums[catId] = (sums[catId] || 0) + itemPaid;
        }
      });
    });

    return sums;
  }, [allIncomeCategories, filteredSales, categories, items]);

  // Pre-calculate raw breakdown by expense category in date range
  const expenseCategorySums = useMemo(() => {
    const sums: { [catId: string]: number } = {};
    allExpenseCategories.forEach((cat) => {
      sums[cat.id] = 0;
    });

    filteredPurchases.forEach((inv) => {
      inv.items?.forEach((item) => {
        const resolved = resolvePurchaseCategory(item, purchaseCategories, purchaseItems);
        const catId = resolved ? resolved.id : (
          allExpenseCategories.find((c) => c.name === item.categoryName)?.id || allExpenseCategories[0]?.id
        );
        if (catId) {
          sums[catId] = (sums[catId] || 0) + (item.paidAmount || (item.quantity * item.unitPrice) || 0);
        }
      });
    });

    // Wages sum
    const wagesTotal = filteredWages.reduce((sum, w) => sum + (w.amount || 0), 0);
    sums['wages-row'] = wagesTotal;

    return sums;
  }, [allExpenseCategories, filteredPurchases, purchaseCategories, purchaseItems, filteredWages]);

  // =========================================================================
  // REQUIREMENT (ج): TOTAL REVENUE, TOTAL EXPENSES & NET PROFIT FILTERED BY
  // SELECTED INCOME AND EXPENSE CATEGORIES
  // =========================================================================
  const totalRevenue = useMemo(() => {
    let sum = 0;
    selectedIncomeCatIds.forEach((catId) => {
      sum += incomeCategorySums[catId] || 0;
    });
    return sum;
  }, [selectedIncomeCatIds, incomeCategorySums]);

  const totalExpenses = useMemo(() => {
    let sum = 0;
    selectedExpenseCatIds.forEach((catId) => {
      sum += expenseCategorySums[catId] || 0;
    });
    return sum;
  }, [selectedExpenseCatIds, expenseCategorySums]);

  const netProfit = totalRevenue - totalExpenses;

  // Pie chart data
  const pieChartData = [
    { name: 'درآمد منتخب', value: totalRevenue, color: '#15803d' },
    { name: 'هزینه منتخب', value: totalExpenses, color: '#b91c1c' },
  ];

  // =========================================================================
  // REPORT 1: PURCHASE REPORT BY ITEM (گزارش خرید بر اساس اقلام کالا)
  // =========================================================================
  interface PurchasedItemRow {
    name: string;
    category: string;
    unit: string;
    qty: number;
    totalCost: number;
    avgUnitPrice: number;
    percentage: number;
  }

  const purchasedItemsList = useMemo<PurchasedItemRow[]>(() => {
    const map: { [key: string]: { name: string; unit: string; qty: number; totalCost: number; category: string } } = {};
    let totalAllPurchases = 0;

    filteredPurchases.forEach((inv) => {
      inv.items?.forEach((item) => {
        const key = `${item.itemName.trim()}-${item.unit.trim()}`;
        const resolved = resolvePurchaseCategory(item, purchaseCategories, purchaseItems);
        const catName = resolved ? resolved.name : (item.categoryName || 'سایر ملزومات');

        if (!map[key]) {
          map[key] = {
            name: item.itemName,
            unit: item.unit || 'عدد',
            qty: 0,
            totalCost: 0,
            category: catName,
          };
        }
        const cost = item.paidAmount || (item.quantity * item.unitPrice) || 0;
        map[key].qty += item.quantity || 0;
        map[key].totalCost += cost;
        totalAllPurchases += cost;
      });
    });

    return Object.values(map)
      .map((row) => ({
        ...row,
        avgUnitPrice: row.qty > 0 ? Math.round(row.totalCost / row.qty) : 0,
        percentage: totalAllPurchases > 0 ? Number(((row.totalCost / totalAllPurchases) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.totalCost - a.totalCost);
  }, [filteredPurchases, purchaseCategories, purchaseItems]);

  const filteredPurchasedItemsList = useMemo(() => {
    if (!searchPurchaseItem.trim()) return purchasedItemsList;
    const q = normalizePersianText(searchPurchaseItem);
    return purchasedItemsList.filter(
      (item) =>
        normalizePersianText(item.name).includes(q) ||
        normalizePersianText(item.category).includes(q)
    );
  }, [purchasedItemsList, searchPurchaseItem]);

  // =========================================================================
  // REPORT 2: PURCHASE REPORT BY CATEGORY (گزارش خرید بر اساس دسته‌بندی کالاها)
  // =========================================================================
  interface PurchaseCategoryRow {
    name: string;
    itemCount: number;
    totalCost: number;
    percentage: number;
  }

  const purchaseCategoriesReportList = useMemo<PurchaseCategoryRow[]>(() => {
    const map: { [catName: string]: { totalCost: number; itemCount: number } } = {};
    let grandTotal = 0;

    filteredPurchases.forEach((inv) => {
      inv.items?.forEach((item) => {
        const resolved = resolvePurchaseCategory(item, purchaseCategories, purchaseItems);
        const catName = resolved ? resolved.name : (item.categoryName || 'سایر ملزومات و خریدهای عمومی');

        if (!map[catName]) {
          map[catName] = { totalCost: 0, itemCount: 0 };
        }
        const cost = item.paidAmount || (item.quantity * item.unitPrice) || 0;
        map[catName].totalCost += cost;
        map[catName].itemCount += item.quantity || 0;
        grandTotal += cost;
      });
    });

    return Object.entries(map)
      .map(([name, data]) => ({
        name,
        itemCount: data.itemCount,
        totalCost: data.totalCost,
        percentage: grandTotal > 0 ? Number(((data.totalCost / grandTotal) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.totalCost - a.totalCost);
  }, [filteredPurchases, purchaseCategories, purchaseItems]);

  const filteredPurchaseCategoriesReportList = useMemo(() => {
    if (!searchPurchaseCat.trim()) return purchaseCategoriesReportList;
    const q = normalizePersianText(searchPurchaseCat);
    return purchaseCategoriesReportList.filter((cat) => normalizePersianText(cat.name).includes(q));
  }, [purchaseCategoriesReportList, searchPurchaseCat]);

  // =========================================================================
  // REPORT 3: SALES REPORT BY CATEGORY (گزارش فروش بر اساس دسته‌بندی کالا)
  // =========================================================================
  interface SalesCategoryRow {
    name: string;
    itemCount: number;
    totalAmount: number;
    percentage: number;
  }

  const salesCategoriesReportList = useMemo<SalesCategoryRow[]>(() => {
    const map: { [catName: string]: { totalAmount: number; itemCount: number } } = {};
    let grandTotal = 0;

    filteredSales.forEach((inv) => {
      const invTotal = Number(inv.totalPayable) || 0;
      const invPaid = Number(inv.totalPaidAmount) > 0 ? Number(inv.totalPaidAmount) : (inv.paid ? invTotal : 0);
      if (invPaid <= 0) return;
      const paidRatio = invTotal > 0 ? Math.min(1, invPaid / invTotal) : 1;

      inv.items?.forEach((item) => {
        const resolved = resolveSalesCategory(item, categories, items);
        const catName = resolved ? resolved.name : (item.categoryName || 'اقلام و خدمات متفرقه');

        if (!map[catName]) {
          map[catName] = { totalAmount: 0, itemCount: 0 };
        }
        const amt = (item.payableAmount || 0) * paidRatio;
        map[catName].totalAmount += amt;
        map[catName].itemCount += item.quantity || 1;
        grandTotal += amt;
      });
    });

    return Object.entries(map)
      .map(([name, data]) => ({
        name,
        itemCount: data.itemCount,
        totalAmount: data.totalAmount,
        percentage: grandTotal > 0 ? Number(((data.totalAmount / grandTotal) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }, [filteredSales, categories, items]);

  const filteredSalesCategoriesReportList = useMemo(() => {
    if (!searchSalesCat.trim()) return salesCategoriesReportList;
    const q = normalizePersianText(searchSalesCat);
    return salesCategoriesReportList.filter((cat) => normalizePersianText(cat.name).includes(q));
  }, [salesCategoriesReportList, searchSalesCat]);

  // =========================================================================
  // REPORT 4: SALES REPORT BY ITEM (گزارش فروش بر اساس اقلام کالا)
  // =========================================================================
  interface SalesItemRow {
    name: string;
    category: string;
    unit: string;
    qty: number;
    totalAmount: number;
    avgUnitPrice: number;
    percentage: number;
  }

  const salesItemsReportList = useMemo<SalesItemRow[]>(() => {
    const map: { [key: string]: { name: string; category: string; unit: string; qty: number; totalAmount: number } } = {};
    let grandTotal = 0;

    filteredSales.forEach((inv) => {
      const invTotal = Number(inv.totalPayable) || 0;
      const invPaid = Number(inv.totalPaidAmount) > 0 ? Number(inv.totalPaidAmount) : (inv.paid ? invTotal : 0);
      if (invPaid <= 0) return;
      const paidRatio = invTotal > 0 ? Math.min(1, invPaid / invTotal) : 1;

      inv.items?.forEach((item) => {
        const key = `${item.itemName.trim()}-${item.unit.trim()}`;
        const resolved = resolveSalesCategory(item, categories, items);
        const catName = resolved ? resolved.name : (item.categoryName || 'سایر اقلام');

        if (!map[key]) {
          map[key] = {
            name: item.itemName,
            category: catName,
            unit: item.unit || 'عدد',
            qty: 0,
            totalAmount: 0,
          };
        }
        const amt = (item.payableAmount || 0) * paidRatio;
        map[key].qty += item.quantity || 0;
        map[key].totalAmount += amt;
        grandTotal += amt;
      });
    });

    return Object.values(map)
      .map((row) => ({
        ...row,
        avgUnitPrice: row.qty > 0 ? Math.round(row.totalAmount / row.qty) : 0,
        percentage: grandTotal > 0 ? Number(((row.totalAmount / grandTotal) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }, [filteredSales, categories, items]);

  const filteredSalesItemsReportList = useMemo(() => {
    if (!searchSalesItem.trim()) return salesItemsReportList;
    const q = normalizePersianText(searchSalesItem);
    return salesItemsReportList.filter(
      (item) =>
        normalizePersianText(item.name).includes(q) ||
        normalizePersianText(item.category).includes(q)
    );
  }, [salesItemsReportList, searchSalesItem]);

  // =========================================================================
  // GUEST HISTORY REPORT
  // =========================================================================
  const guestNamesList = useMemo(() => {
    return Array.from(new Set(salesInvoices.map((inv) => inv.guestName.trim()))).filter(Boolean);
  }, [salesInvoices]);

  const selectedGuestInvoices = useMemo(() => {
    if (!selectedGuestName.trim()) return [];
    return salesInvoices.filter(
      (inv) =>
        inv.guestName.trim().toLowerCase().includes(selectedGuestName.trim().toLowerCase()) &&
        isDateInRange(inv.date, startDate, endDate)
    );
  }, [salesInvoices, selectedGuestName, startDate, endDate]);

  const guestTotalSpent = useMemo(() => {
    return selectedGuestInvoices.reduce((sum, inv) => sum + inv.totalPayable, 0);
  }, [selectedGuestInvoices]);

  // =========================================================================
  // EXCEL EXPORT HANDLERS (Requirement ب)
  // =========================================================================
  const handleExportPurchaseByCatExcel = () => {
    const columns: ExcelColumn<PurchaseCategoryRow>[] = [
      { header: 'ردیف', formatter: (_, idx) => idx + 1, width: 8 },
      { header: 'عنوان دسته‌بندی خرید', key: 'name', width: 28 },
      { header: 'مجموع تعداد / ردیف‌ها', key: 'itemCount', width: 16 },
      { header: 'مجموع مبالغ هزینه شده (تومان)', formatter: (row) => row.totalCost, width: 24 },
      { header: 'سهم از کل هزینه‌ها (درصد)', formatter: (row) => `${row.percentage}%`, width: 18 },
    ];
    exportTableToExcel(
      filteredPurchaseCategoriesReportList,
      columns,
      `گزارش_خرید_بر_اساس_دسته_کالا_${formatPersianDate(new Date().toISOString().split('T')[0]) || 'دوره'}.xlsx`,
      'خرید بر اساس دسته'
    );
  };

  const handleExportPurchaseByItemExcel = () => {
    const columns: ExcelColumn<PurchasedItemRow>[] = [
      { header: 'ردیف', formatter: (_, idx) => idx + 1, width: 8 },
      { header: 'نام کالای خریداری شده', key: 'name', width: 26 },
      { header: 'دسته‌بندی کالا', key: 'category', width: 22 },
      { header: 'واحد سنجش', key: 'unit', width: 12 },
      { header: 'مجموع تعداد / مقدار', key: 'qty', width: 16 },
      { header: 'میانگین قیمت واحد (تومان)', formatter: (row) => row.avgUnitPrice, width: 20 },
      { header: 'مجموع هزینه کل (تومان)', formatter: (row) => row.totalCost, width: 22 },
      { header: 'سهم از کل خریدها (درصد)', formatter: (row) => `${row.percentage}%`, width: 18 },
    ];
    exportTableToExcel(
      filteredPurchasedItemsList,
      columns,
      `گزارش_خرید_بر_اساس_اقلام_کالا_${formatPersianDate(new Date().toISOString().split('T')[0]) || 'دوره'}.xlsx`,
      'خرید بر اساس اقلام'
    );
  };

  const handleExportSalesByCatExcel = () => {
    const columns: ExcelColumn<SalesCategoryRow>[] = [
      { header: 'ردیف', formatter: (_, idx) => idx + 1, width: 8 },
      { header: 'عنوان دسته‌بندی فروش', key: 'name', width: 28 },
      { header: 'تعداد ردیف / اقلام فروخته شده', key: 'itemCount', width: 20 },
      { header: 'مجموع مبلغ فروش (تومان)', formatter: (row) => row.totalAmount, width: 24 },
      { header: 'سهم از کل فروش (درصد)', formatter: (row) => `${row.percentage}%`, width: 18 },
    ];
    exportTableToExcel(
      filteredSalesCategoriesReportList,
      columns,
      `گزارش_فروش_بر_اساس_دسته_کالا_${formatPersianDate(new Date().toISOString().split('T')[0]) || 'دوره'}.xlsx`,
      'فروش بر اساس دسته'
    );
  };

  const handleExportSalesByItemExcel = () => {
    const columns: ExcelColumn<SalesItemRow>[] = [
      { header: 'ردیف', formatter: (_, idx) => idx + 1, width: 8 },
      { header: 'نام کالا / خدمت فروخته شده', key: 'name', width: 28 },
      { header: 'دسته‌بندی فروش', key: 'category', width: 22 },
      { header: 'واحد سنجش', key: 'unit', width: 12 },
      { header: 'تعداد / مقدار فروخته شده', key: 'qty', width: 18 },
      { header: 'میانگین نرخ واحد (تومان)', formatter: (row) => row.avgUnitPrice, width: 20 },
      { header: 'مجموع مبلغ فروش (تومان)', formatter: (row) => row.totalAmount, width: 22 },
      { header: 'سهم از کل فروش (درصد)', formatter: (row) => `${row.percentage}%`, width: 18 },
    ];
    exportTableToExcel(
      filteredSalesItemsReportList,
      columns,
      `گزارش_فروش_بر_اساس_اقلام_کالا_${formatPersianDate(new Date().toISOString().split('T')[0]) || 'دوره'}.xlsx`,
      'فروش بر اساس اقلام'
    );
  };

  const handleExportProfitLossExcel = () => {
    const summaryRows = [
      { item: 'کل درآمد حاصل از فروش (دسته‌بندی‌های منتخب)', amount: totalRevenue },
      { item: 'کل خریدها و هزینه‌های اجرایی (دسته‌بندی‌های منتخب)', amount: totalExpenses },
      { item: 'سود خالص دوره (درآمد منهای هزینه)', amount: netProfit },
    ];
    const columns: ExcelColumn<{ item: string; amount: number }>[] = [
      { header: 'شرح حساب تراز سود و زیان', key: 'item', width: 40 },
      { header: 'مبلغ به تومان', formatter: (row) => row.amount, width: 24 },
    ];
    exportTableToExcel(
      summaryRows,
      columns,
      `تراز_سود_و_زیان_${formatPersianDate(new Date().toISOString().split('T')[0]) || 'دوره'}.xlsx`,
      'تراز سود و زیان'
    );
  };

  const handleExportSalesInvoicesExcel = () => {
    const columns: ExcelColumn<SalesInvoice>[] = [
      { header: 'شماره سریال', key: 'serialNumber', width: 14 },
      { header: 'تاریخ', key: 'date', width: 14 },
      { header: 'نام مهمان / طرف حساب', key: 'guestName', width: 24 },
      { header: 'مبلغ اقلام (تومان)', key: 'totalItemsAmount', width: 18 },
      { header: 'مبلغ تخفیف (تومان)', key: 'totalDiscountAmount', width: 16 },
      { header: 'مالیات و عوارض (تومان)', key: 'totalTaxAmount', width: 18 },
      { header: 'مبلغ کل قابل پرداخت (تومان)', key: 'totalPayable', width: 22 },
      { header: 'مبلغ پرداخت شده (تومان)', key: 'totalPaidAmount', width: 20 },
      { header: 'مانده حساب (تومان)', key: 'remainingBalance', width: 18 },
      { header: 'وضعیت تسویه', formatter: (inv) => (inv.paid ? 'تسویه کامل' : 'دارای مانده'), width: 14 },
    ];
    exportTableToExcel(
      filteredSales,
      columns,
      `لیست_فاکتورهای_فروش_${formatPersianDate(new Date().toISOString().split('T')[0]) || 'دوره'}.xlsx`,
      'فاکتورهای فروش'
    );
  };

  const handleExportPurchaseInvoicesExcel = () => {
    const columns: ExcelColumn<PurchaseInvoice>[] = [
      { header: 'شماره سریال', key: 'serialNumber', width: 14 },
      { header: 'تاریخ', key: 'date', width: 14 },
      { header: 'نام فروشنده / تامین‌کننده', key: 'vendorName', width: 24 },
      { header: 'مبلغ کل خرید (تومان)', key: 'totalAmount', width: 20 },
      { header: 'تخفیف (تومان)', key: 'totalDiscount', width: 16 },
      { header: 'مبلغ پرداخت شده (تومان)', key: 'totalPaid', width: 20 },
      { header: 'وضعیت پرداخت', formatter: (inv) => (inv.paid ? 'تسویه شده' : 'معوق'), width: 14 },
    ];
    exportTableToExcel(
      filteredPurchases,
      columns,
      `لیست_فاکتورهای_خرید_${formatPersianDate(new Date().toISOString().split('T')[0]) || 'دوره'}.xlsx`,
      'فاکتورهای خرید'
    );
  };

  const handleExportGuestHistoryExcel = () => {
    const columns: ExcelColumn<SalesInvoice>[] = [
      { header: 'تاریخ فاکتور', key: 'date', width: 14 },
      { header: 'شماره سریال فاکتور', key: 'serialNumber', width: 16 },
      { header: 'نام مهمان', key: 'guestName', width: 24 },
      { header: 'تعداد اقلام', formatter: (inv) => inv.items?.length || 0, width: 12 },
      { header: 'مبلغ کل فاکتور (تومان)', key: 'totalPayable', width: 22 },
      { header: 'وضعیت تسویه', formatter: (inv) => (inv.paid ? 'تسویه شده' : 'دارای مانده'), width: 14 },
    ];
    exportTableToExcel(
      selectedGuestInvoices,
      columns,
      `سوابق_مهمان_${selectedGuestName.trim() || 'ناشناس'}.xlsx`,
      'سوابق مهمان'
    );
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 space-y-6">

      {/* Title & Description */}
      <div>
        <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-amber-800" />
          گزارش‌ها و تحلیل‌های مالی و آماری اقامتگاه
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          محاسبه سود و زیان بر اساس تفکیک دسته‌های درآمد و هزینه، گزارش‌های تحلیلی خرید و فروش بر اساس کالا و دسته، و خروجی کامل فایل اکسل
        </p>
      </div>

      {/* Date Filter Toolbar */}
      <div className="bg-white rounded-3xl p-4 border border-amber-900/15 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 text-xs w-full sm:w-auto">
          <span className="font-bold text-slate-700 flex items-center gap-1.5 shrink-0">
            <Calendar className="w-4 h-4 text-amber-800" />
            فیلتر بازه زمانی گزارش:
          </span>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-slate-600 font-bold shrink-0">از:</span>
            <div className="w-56 sm:w-64 min-w-[220px]">
              <PersianDatePicker
                placeholder="۱۴۰۳/۰۱/۰۱"
                value={startDate}
                onChange={(newD) => setStartDate(newD)}
                allowClear
                inputClassName="py-2 px-3 text-xs"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-slate-600 font-bold shrink-0">تا:</span>
            <div className="w-56 sm:w-64 min-w-[220px]">
              <PersianDatePicker
                placeholder="۱۴۰۳/۱۲/۲۹"
                value={endDate}
                onChange={(newD) => setEndDate(newD)}
                allowClear
                inputClassName="py-2 px-3 text-xs"
              />
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            setStartDate('');
            setEndDate('');
          }}
          className="text-xs text-amber-800 hover:text-amber-900 font-bold cursor-pointer shrink-0 flex items-center gap-1"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          پاک کردن فیلتر تاریخ (تمام دوره‌ها)
        </button>
      </div>

      {/* ========================================================================= */}
      {/* REQUIREMENT (ج): CATEGORY INCLUSION SELECTORS BEFORE KPI CARDS            */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-br from-amber-50/70 via-stone-50 to-amber-50/40 rounded-3xl p-5 border border-amber-900/20 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-900/15 pb-3">
          <div>
            <h3 className="text-sm font-black text-amber-950 flex items-center gap-2">
              <Filter className="w-4 h-4 text-amber-800" />
              تعیین دسته‌بندی‌های مشمول در محاسبه درآمد، هزینه و سود خالص اقامتگاه
            </h3>
            <p className="text-[11px] text-slate-600 mt-0.5">
              مشخص کنید چه دسته‌بندی‌هایی در محاسبه درآمد کل و هزینه کل لحاظ شوند. کارت‌های خلاصه مالی و نمودار بر اساس این انتخاب‌ها به‌روز می‌شوند.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold shrink-0">
            <span className="text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-full">
              {selectedIncomeCatIds.length} از {allIncomeCategories.length} دسته درآمدی فعال
            </span>
            <span className="text-rose-800 bg-rose-100/80 px-2.5 py-1 rounded-full">
              {selectedExpenseCatIds.length} از {allExpenseCategories.length} دسته هزینه‌ای فعال
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Income Categories Box */}
          <div className="bg-white rounded-2xl p-4 border border-emerald-900/15 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-700" />
                <span className="text-xs font-black text-emerald-950">دسته‌بندی‌های درآمدی (فروش)</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setSelectedIncomeCatIds(allIncomeCategories.map((c) => c.id))}
                  className="text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
                >
                  انتخاب همه
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => setSelectedIncomeCatIds([])}
                  className="text-slate-500 hover:text-slate-700 underline cursor-pointer"
                >
                  لغو همه
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
              {allIncomeCategories.map((cat) => {
                const isChecked = selectedIncomeCatIds.includes(cat.id);
                const amount = incomeCategorySums[cat.id] || 0;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedIncomeCatIds((prev) =>
                        isChecked ? prev.filter((id) => id !== cat.id) : [...prev, cat.id]
                      );
                    }}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                      isChecked
                        ? 'bg-emerald-50/70 border-emerald-300 text-slate-900 shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-400 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div className="mt-0.5 text-emerald-700 shrink-0">
                      {isChecked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-300" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-bold truncate ${isChecked ? 'text-slate-800' : 'text-slate-500 line-through'}`}>
                        {cat.name}
                      </p>
                      <p className="text-[11px] font-mono mt-0.5 text-emerald-800 font-extrabold">
                        {formatPersianPrice(amount)} <span className="text-[9px] font-normal text-slate-500 font-sans">تومان</span>
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Expense Categories Box */}
          <div className="bg-white rounded-2xl p-4 border border-rose-900/15 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-rose-100 pb-2">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-rose-700" />
                <span className="text-xs font-black text-rose-950">دسته‌بندی‌های هزینه‌ای (خرید و دستمزد)</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setSelectedExpenseCatIds(allExpenseCategories.map((c) => c.id))}
                  className="text-rose-700 hover:text-rose-900 underline cursor-pointer"
                >
                  انتخاب همه
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => setSelectedExpenseCatIds([])}
                  className="text-slate-500 hover:text-slate-700 underline cursor-pointer"
                >
                  لغو همه
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
              {allExpenseCategories.map((cat) => {
                const isChecked = selectedExpenseCatIds.includes(cat.id);
                const amount = expenseCategorySums[cat.id] || 0;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedExpenseCatIds((prev) =>
                        isChecked ? prev.filter((id) => id !== cat.id) : [...prev, cat.id]
                      );
                    }}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                      isChecked
                        ? 'bg-rose-50/70 border-rose-300 text-slate-900 shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-400 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div className="mt-0.5 text-rose-700 shrink-0">
                      {isChecked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-300" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-bold truncate ${isChecked ? 'text-slate-800' : 'text-slate-500 line-through'}`}>
                        {cat.name}
                      </p>
                      <p className="text-[11px] font-mono mt-0.5 text-rose-800 font-extrabold">
                        {formatPersianPrice(amount)} <span className="text-[9px] font-normal text-slate-500 font-sans">تومان</span>
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Top 3 KPI Cards (درآمد، هزینه و سود خالص) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Income */}
        <div className="bg-white border border-amber-900/15 rounded-3xl p-5 flex items-center justify-between shadow-xs hover:shadow-md transition-all">
          <div>
            <p className="text-xs font-bold text-emerald-800 uppercase tracking-wide">کل درآمد مشمول (دسته‌های منتخب)</p>
            <p className="text-2xl font-black text-slate-900 mt-1.5 font-mono">
              {formatPersianPrice(totalRevenue)} <span className="text-xs font-semibold text-slate-500">تومان</span>
            </p>
            <p className="text-[11px] text-emerald-700 font-medium mt-1">
              محاسبه شده بر اساس {selectedIncomeCatIds.length} دسته درآمدی فعال
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-white border border-amber-900/15 rounded-3xl p-5 flex items-center justify-between shadow-xs hover:shadow-md transition-all">
          <div>
            <p className="text-xs font-bold text-rose-800 uppercase tracking-wide">کل هزینه‌های مشمول (دسته‌های منتخب)</p>
            <p className="text-2xl font-black text-slate-900 mt-1.5 font-mono">
              {formatPersianPrice(totalExpenses)} <span className="text-xs font-semibold text-slate-500">تومان</span>
            </p>
            <p className="text-[11px] text-rose-700 font-medium mt-1">
              محاسبه شده بر اساس {selectedExpenseCatIds.length} دسته هزینه‌ای فعال
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center shrink-0">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        {/* Net Profit */}
        <div className="bg-white border border-amber-900/15 rounded-3xl p-5 flex items-center justify-between shadow-xs hover:shadow-md transition-all">
          <div>
            <p className="text-xs font-bold text-amber-900 uppercase tracking-wide">سود خالص اقامتگاه (درآمد - هزینه)</p>
            <p className={`text-2xl font-black mt-1.5 font-mono ${netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {formatPersianPrice(netProfit)} <span className="text-xs font-semibold text-slate-500">تومان</span>
            </p>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              {netProfit >= 0 ? 'تراز مالی مثبت (سوددهی اقامتگاه)' : 'تراز مالی منفی (کسری عملکرد اقامتگاه)'}
            </p>
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
            netProfit >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}>
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Reports Navigation Tabs (Requirement الف) */}
      <div className="bg-white rounded-3xl p-1.5 border border-amber-900/15 shadow-xs flex flex-wrap gap-1.5">
        {[
          { id: 'PROFIT_LOSS', label: 'تراز سود و زیان و نمودار', icon: PieIcon },
          { id: 'PURCHASE_BY_CATEGORY', label: 'گزارش خرید بر اساس دسته‌بندی کالاها', icon: Folder },
          { id: 'PURCHASE_BY_ITEM', label: 'گزارش خرید بر اساس اقلام کالا', icon: Package },
          { id: 'SALES_BY_CATEGORY', label: 'گزارش فروش بر اساس دسته‌بندی کالا', icon: Layers },
          { id: 'SALES_BY_ITEM', label: 'گزارش فروش بر اساس اقلام کالا', icon: ShoppingBag },
          { id: 'SALES_INVOICES', label: 'لیست فاکتورهای فروش', icon: FileText },
          { id: 'PURCHASE_INVOICES', label: 'لیست فاکتورهای خرید', icon: TrendingDown },
          { id: 'GUEST_HISTORY', label: `سوابق ${customerTitle}ان`, icon: User },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeReportTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveReportTab(tab.id as ReportTabId)}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-amber-300' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Report Content Panels */}
      <div className="bg-white rounded-3xl p-6 border border-amber-900/15 shadow-xs">

        {/* ========================================================================= */}
        {/* 1. PROFIT & LOSS TAB                                                      */}
        {/* ========================================================================= */}
        {activeReportTab === 'PROFIT_LOSS' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <PieIcon className="w-5 h-5 text-amber-800" />
                نمودار دایره‌ای نسبت درآمد به هزینه و تراز سود خالص بر اساس دسته‌بندی‌های مشمول
              </h3>

              <button
                onClick={handleExportProfitLossExcel}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>خروجی فایل اکسل</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              {/* Pie Chart */}
              <div className="h-64 w-full">
                {totalRevenue === 0 && totalExpenses === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                    داده‌ای در این بازه زمانی با دسته‌بندی‌های انتخاب‌شده ثبت نشده است.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `${formatPersianPrice(value)} تومان`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Financial Calculation Summary Table */}
              <div className="bg-amber-50/40 p-5 rounded-3xl border border-amber-900/15 space-y-3 text-xs">
                <h4 className="font-black text-slate-900 text-sm border-b border-amber-900/15 pb-2">
                  خلاصه تراز سود و زیان دوره (دسته‌بندی‌های مشمول):
                </h4>

                <div className="flex justify-between text-emerald-800 font-bold">
                  <span>(+) درآمد کل دسته‌بندی‌های منتخب:</span>
                  <span className="font-mono">{formatPersianPrice(totalRevenue)} تومان</span>
                </div>

                <div className="flex justify-between text-rose-800 font-bold">
                  <span>(-) هزینه کل دسته‌بندی‌های منتخب:</span>
                  <span className="font-mono">({formatPersianPrice(totalExpenses)}) تومان</span>
                </div>

                <div className="pt-2 border-t border-amber-900/20 flex justify-between text-sm font-black text-slate-900">
                  <span>(=) سود خالص اقامتگاه:</span>
                  <span className={`font-mono text-base ${netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {formatPersianPrice(netProfit)} تومان
                  </span>
                </div>

                <div className="bg-amber-100/70 p-3 rounded-2xl text-[11px] font-bold text-amber-950 leading-relaxed border border-amber-300">
                  سود به حروف: {numberToWordsPersian(netProfit)} تومان
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. PURCHASE REPORT BY CATEGORY (گزارش خرید بر اساس دسته‌بندی کالاها)       */}
        {/* ========================================================================= */}
        {activeReportTab === 'PURCHASE_BY_CATEGORY' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Folder className="w-5 h-5 text-amber-800" />
                  گزارش خرید بر اساس دسته‌بندی کالاها
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  مجموع هزینه‌ها و سهم هر یک از دسته‌بندی‌های کالایی در بازه زمانی تعیین‌شده
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
                  <input
                    type="text"
                    value={searchPurchaseCat}
                    onChange={(e) => setSearchPurchaseCat(e.target.value)}
                    placeholder="جستجوی دسته‌بندی خرید..."
                    className="pr-8 pl-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-700 outline-hidden font-bold"
                  />
                </div>

                <button
                  onClick={handleExportPurchaseByCatExcel}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>خروجی فایل اکسل</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2.5 text-center w-12">#</th>
                    <th className="px-4 py-2.5">عنوان دسته‌بندی خرید</th>
                    <th className="px-3 py-2.5 text-center">مجموع تعداد اقلام</th>
                    <th className="px-4 py-2.5 font-bold text-rose-900">مجموع مبالغ هزینه شده (تومان)</th>
                    <th className="px-4 py-2.5">سهم از کل هزینه‌ها (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPurchaseCategoriesReportList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-slate-400">
                        هیچ خریدی در این بازه زمانی با مشخصات جستجو شده یافت نشد.
                      </td>
                    </tr>
                  ) : (
                    filteredPurchaseCategoriesReportList.map((cat, idx) => (
                      <tr key={idx} className="hover:bg-amber-50/20 transition-colors">
                        <td className="px-3 py-2.5 text-center font-semibold text-slate-400">{idx + 1}</td>
                        <td className="px-4 py-2.5 font-bold text-slate-800 flex items-center gap-2">
                          <Folder className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                          <span>{cat.name}</span>
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-700">
                          {cat.itemCount}
                        </td>
                        <td className="px-4 py-2.5 font-black text-rose-800 font-mono">
                          {formatPersianPrice(cat.totalCost)}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-28 bg-slate-200 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-rose-600 h-full rounded-full transition-all"
                                style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                              />
                            </div>
                            <span className="font-bold text-slate-700 font-mono">{cat.percentage}%</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {filteredPurchaseCategoriesReportList.length > 0 && (
                  <tfoot className="bg-slate-50 font-black border-t-2 border-slate-300">
                    <tr>
                      <td colSpan={2} className="px-4 py-3 text-slate-900">
                        جمع کل خریدهای دسته‌بندی‌ها:
                      </td>
                      <td className="px-3 py-3 text-center font-mono">
                        {filteredPurchaseCategoriesReportList.reduce((sum, c) => sum + c.itemCount, 0)}
                      </td>
                      <td className="px-4 py-3 font-mono text-rose-900">
                        {formatPersianPrice(
                          filteredPurchaseCategoriesReportList.reduce((sum, c) => sum + c.totalCost, 0)
                        )}{' '}
                        تومان
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-700">۱۰۰٪</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. PURCHASE REPORT BY ITEM (گزارش خرید بر اساس اقلام کالا)                  */}
        {/* ========================================================================= */}
        {activeReportTab === 'PURCHASE_BY_ITEM' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-emerald-700" />
                  گزارش خرید بر اساس اقلام کالا
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  تفکیک جزءبه‌جزء کالاهای خریداری شده به همراه مقدار، میانگین قیمت واحد و هزینه کل
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
                  <input
                    type="text"
                    value={searchPurchaseItem}
                    onChange={(e) => setSearchPurchaseItem(e.target.value)}
                    placeholder="جستجوی نام یا دسته کالا..."
                    className="pr-8 pl-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-700 outline-hidden font-bold"
                  />
                </div>

                <button
                  onClick={handleExportPurchaseByItemExcel}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>خروجی فایل اکسل</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2.5 text-center w-12">#</th>
                    <th className="px-4 py-2.5">نام کالای خریداری شده</th>
                    <th className="px-3 py-2.5">دسته کالا</th>
                    <th className="px-3 py-2.5 text-center">واحد</th>
                    <th className="px-3 py-2.5 text-center">مجموع مقدار</th>
                    <th className="px-3 py-2.5 font-bold text-slate-700">میانگین قیمت واحد (تومان)</th>
                    <th className="px-4 py-2.5 font-bold text-rose-900">مجموع هزینه کل (تومان)</th>
                    <th className="px-4 py-2.5 text-center">سهم از کل (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPurchasedItemsList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-slate-400">
                        هیچ کالای خریداری‌شده‌ای در این بازه زمانی با مشخصات جستجو شده یافت نشد.
                      </td>
                    </tr>
                  ) : (
                    filteredPurchasedItemsList.map((item, idx) => (
                      <tr key={idx} className="hover:bg-amber-50/20 transition-colors">
                        <td className="px-3 py-2.5 text-center font-semibold text-slate-400">{idx + 1}</td>
                        <td className="px-4 py-2.5 font-bold text-slate-800 flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          <span>{item.name}</span>
                        </td>
                        <td className="px-3 py-2.5 text-slate-500 font-medium">{item.category}</td>
                        <td className="px-3 py-2.5 text-center text-slate-600 font-medium">{item.unit}</td>
                        <td className="px-3 py-2.5 text-center font-bold text-slate-800 font-mono">{item.qty}</td>
                        <td className="px-3 py-2.5 font-mono text-slate-700 font-bold">
                          {formatPersianPrice(item.avgUnitPrice)}
                        </td>
                        <td className="px-4 py-2.5 font-black text-rose-800 font-mono">
                          {formatPersianPrice(item.totalCost)}
                        </td>
                        <td className="px-4 py-2.5 text-center font-mono font-bold text-slate-700">
                          {item.percentage}%
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {filteredPurchasedItemsList.length > 0 && (
                  <tfoot className="bg-slate-50 font-black border-t-2 border-slate-300">
                    <tr>
                      <td colSpan={6} className="px-4 py-3 text-slate-900">
                        جمع کل اقلام خریداری شده:
                      </td>
                      <td className="px-4 py-3 font-mono text-rose-900">
                        {formatPersianPrice(
                          filteredPurchasedItemsList.reduce((sum, item) => sum + item.totalCost, 0)
                        )}{' '}
                        تومان
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-slate-700">۱۰۰٪</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4. SALES REPORT BY CATEGORY (گزارش فروش بر اساس دسته‌بندی کالا)             */}
        {/* ========================================================================= */}
        {activeReportTab === 'SALES_BY_CATEGORY' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-amber-800" />
                  گزارش فروش بر اساس دسته‌بندی کالا
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  تفکیک درآمدهای اقامتگاه بر اساس دسته‌های مختلف فروش و سهم هر یک از کل فروش
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
                  <input
                    type="text"
                    value={searchSalesCat}
                    onChange={(e) => setSearchSalesCat(e.target.value)}
                    placeholder="جستجوی دسته‌بندی فروش..."
                    className="pr-8 pl-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-700 outline-hidden font-bold"
                  />
                </div>

                <button
                  onClick={handleExportSalesByCatExcel}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>خروجی فایل اکسل</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2.5 text-center w-12">#</th>
                    <th className="px-4 py-2.5">نام دسته‌بندی فروش</th>
                    <th className="px-3 py-2.5 text-center">تعداد اقلام فروخته شده</th>
                    <th className="px-4 py-2.5 font-bold text-emerald-900">مبلغ کل فروش (تومان)</th>
                    <th className="px-4 py-2.5">سهم از کل فروش (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSalesCategoriesReportList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-slate-400">
                        هیچ فروشی در این بازه زمانی با مشخصات جستجو شده یافت نشد.
                      </td>
                    </tr>
                  ) : (
                    filteredSalesCategoriesReportList.map((cat, idx) => (
                      <tr key={idx} className="hover:bg-amber-50/20 transition-colors">
                        <td className="px-3 py-2.5 text-center font-semibold text-slate-400">{idx + 1}</td>
                        <td className="px-4 py-2.5 font-bold text-slate-800 flex items-center gap-2">
                          <Layers className="w-3.5 h-3.5 text-amber-800 shrink-0" />
                          <span>{cat.name}</span>
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-700">
                          {cat.itemCount}
                        </td>
                        <td className="px-4 py-2.5 font-black text-emerald-800 font-mono">
                          {formatPersianPrice(cat.totalAmount)}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-28 bg-slate-200 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-emerald-600 h-full rounded-full transition-all"
                                style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                              />
                            </div>
                            <span className="font-bold text-slate-700 font-mono">{cat.percentage}%</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {filteredSalesCategoriesReportList.length > 0 && (
                  <tfoot className="bg-slate-50 font-black border-t-2 border-slate-300">
                    <tr>
                      <td colSpan={2} className="px-4 py-3 text-slate-900">
                        جمع کل درآمدهای دسته‌بندی‌ها:
                      </td>
                      <td className="px-3 py-3 text-center font-mono">
                        {filteredSalesCategoriesReportList.reduce((sum, c) => sum + c.itemCount, 0)}
                      </td>
                      <td className="px-4 py-3 font-mono text-emerald-800">
                        {formatPersianPrice(
                          filteredSalesCategoriesReportList.reduce((sum, c) => sum + c.totalAmount, 0)
                        )}{' '}
                        تومان
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-700">۱۰۰٪</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 5. SALES REPORT BY ITEM (گزارش فروش بر اساس اقلام کالا)                     */}
        {/* ========================================================================= */}
        {activeReportTab === 'SALES_BY_ITEM' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-amber-800" />
                  گزارش فروش بر اساس اقلام کالا
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  تفکیک اقلام و خدمات فروش رفته به همراه تعداد، میانگین قیمت واحد و مبلغ کل فروش
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
                  <input
                    type="text"
                    value={searchSalesItem}
                    onChange={(e) => setSearchSalesItem(e.target.value)}
                    placeholder="جستجوی نام یا دسته کالا..."
                    className="pr-8 pl-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-700 outline-hidden font-bold"
                  />
                </div>

                <button
                  onClick={handleExportSalesByItemExcel}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>خروجی فایل اکسل</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2.5 text-center w-12">#</th>
                    <th className="px-4 py-2.5">نام کالا / خدمت فروخته شده</th>
                    <th className="px-3 py-2.5">دسته‌بندی</th>
                    <th className="px-3 py-2.5 text-center">واحد</th>
                    <th className="px-3 py-2.5 text-center">تعداد / مقدار</th>
                    <th className="px-3 py-2.5 font-bold text-slate-700">میانگین نرخ واحد (تومان)</th>
                    <th className="px-4 py-2.5 font-bold text-emerald-900">مجموع مبلغ فروش (تومان)</th>
                    <th className="px-4 py-2.5 text-center">سهم از کل (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSalesItemsReportList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-slate-400">
                        هیچ کالا یا خدمتی در این بازه زمانی با مشخصات جستجو شده به فروش نرسیده است.
                      </td>
                    </tr>
                  ) : (
                    filteredSalesItemsReportList.map((item, idx) => (
                      <tr key={idx} className="hover:bg-amber-50/20 transition-colors">
                        <td className="px-3 py-2.5 text-center font-semibold text-slate-400">{idx + 1}</td>
                        <td className="px-4 py-2.5 font-bold text-slate-800 flex items-center gap-1.5">
                          <ShoppingBag className="w-3.5 h-3.5 text-amber-800 shrink-0" />
                          <span>{item.name}</span>
                        </td>
                        <td className="px-3 py-2.5 text-slate-500 font-medium">{item.category}</td>
                        <td className="px-3 py-2.5 text-center text-slate-600 font-medium">{item.unit}</td>
                        <td className="px-3 py-2.5 text-center font-bold text-slate-800 font-mono">{item.qty}</td>
                        <td className="px-3 py-2.5 font-mono text-slate-700 font-bold">
                          {formatPersianPrice(item.avgUnitPrice)}
                        </td>
                        <td className="px-4 py-2.5 font-black text-emerald-800 font-mono">
                          {formatPersianPrice(item.totalAmount)}
                        </td>
                        <td className="px-4 py-2.5 text-center font-mono font-bold text-slate-700">
                          {item.percentage}%
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {filteredSalesItemsReportList.length > 0 && (
                  <tfoot className="bg-slate-50 font-black border-t-2 border-slate-300">
                    <tr>
                      <td colSpan={6} className="px-4 py-3 text-slate-900">
                        جمع کل فروش اقلام:
                      </td>
                      <td className="px-4 py-3 font-mono text-emerald-800">
                        {formatPersianPrice(
                          filteredSalesItemsReportList.reduce((sum, item) => sum + item.totalAmount, 0)
                        )}{' '}
                        تومان
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-slate-700">۱۰۰٪</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 6. SALES INVOICES LIST REPORT                                             */}
        {/* ========================================================================= */}
        {activeReportTab === 'SALES_INVOICES' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-800" />
                گزارش لیست فاکتورهای فروش صادر شده
              </h3>

              <button
                onClick={handleExportSalesInvoicesExcel}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>خروجی فایل اکسل</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold">
                  <tr>
                    <th className="px-3 py-2.5 text-center">شماره سریال</th>
                    <th className="px-3 py-2.5">تاریخ</th>
                    <th className="px-4 py-2.5">نام {customerTitle} / طرف حساب</th>
                    <th className="px-3 py-2.5 font-extrabold text-amber-950">مبلغ قابل پرداخت</th>
                    <th className="px-3 py-2.5 font-extrabold text-emerald-950">پرداخت شده</th>
                    <th className="px-3 py-2.5 font-extrabold text-rose-950">مانده</th>
                    <th className="px-3 py-2.5 text-center">وضعیت تسویه</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSales.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-400">
                        هیچ فاکتور فروشی در این بازه زمانی ثبت نشده است.
                      </td>
                    </tr>
                  ) : (
                    filteredSales.map((inv) => (
                      <tr key={inv.id} className="hover:bg-amber-50/20 transition-colors">
                        <td className="px-3 py-2.5 text-center font-mono font-bold text-amber-900">
                          {inv.serialNumber}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-slate-600">{inv.date}</td>
                        <td className="px-4 py-2.5 font-bold text-slate-800">{inv.guestName}</td>
                        <td className="px-3 py-2.5 font-black text-amber-950 font-mono">
                          {formatPersianPrice(inv.totalPayable)}
                        </td>
                        <td className="px-3 py-2.5 font-black text-emerald-800 font-mono">
                          {formatPersianPrice(inv.totalPaidAmount || 0)}
                        </td>
                        <td className="px-3 py-2.5 font-black text-rose-800 font-mono">
                          {formatPersianPrice(inv.remainingBalance || 0)}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              inv.paid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {inv.paid ? 'تسویه کامل' : 'دارای مانده'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 7. PURCHASE INVOICES LIST REPORT                                          */}
        {/* ========================================================================= */}
        {activeReportTab === 'PURCHASE_INVOICES' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-rose-700" />
                گزارش خریدها و هزینه‌های ثبت شده
              </h3>

              <button
                onClick={handleExportPurchaseInvoicesExcel}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>خروجی فایل اکسل</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold">
                  <tr>
                    <th className="px-3 py-2.5 text-center">شماره ردیف</th>
                    <th className="px-3 py-2.5">تاریخ</th>
                    <th className="px-4 py-2.5">نام فروشنده / تامین‌کننده</th>
                    <th className="px-3 py-2.5 font-extrabold text-rose-900">مبلغ پرداخت شده</th>
                    <th className="px-3 py-2.5 text-center">وضعیت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPurchases.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-slate-400">
                        هیچ فاکتور خریدی در این بازه زمانی ثبت نشده است.
                      </td>
                    </tr>
                  ) : (
                    filteredPurchases.map((inv) => (
                      <tr key={inv.id} className="hover:bg-amber-50/20 transition-colors">
                        <td className="px-3 py-2.5 text-center font-mono font-bold text-emerald-800">
                          {inv.serialNumber}
                        </td>
                        <td className="px-3 py-2.5 font-bold text-slate-700">{formatPersianDate(inv.date)}</td>
                        <td className="px-4 py-2.5 font-bold text-slate-800">{inv.vendorName}</td>
                        <td className="px-3 py-2.5 font-black text-rose-800 font-mono">
                          {formatPersianPrice(inv.totalPaid)}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              inv.paid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {inv.paid ? 'تسویه شده' : 'معوق'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 8. GUEST HISTORY REPORT                                                   */}
        {/* ========================================================================= */}
        {activeReportTab === 'GUEST_HISTORY' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <User className="w-5 h-5 text-amber-800" />
                گزارش سابقه حضور و فاکتورها بر اساس نام {customerTitle}
              </h3>

              {selectedGuestName && selectedGuestInvoices.length > 0 && (
                <button
                  onClick={handleExportGuestHistoryExcel}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>خروجی فایل اکسل</span>
                </button>
              )}
            </div>

            {/* Guest Selector */}
            <div className="max-w-md space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                انتخاب یا جستجوی نام {customerTitle}:
              </label>
              <input
                type="text"
                list="guest-list"
                value={selectedGuestName}
                onChange={(e) => setSelectedGuestName(e.target.value)}
                placeholder={`تایپ نام ${customerTitle}...`}
                className="w-full px-3 py-2 border border-slate-300 rounded-2xl text-xs focus:ring-2 focus:ring-amber-700 outline-hidden font-bold"
              />
              <datalist id="guest-list">
                {guestNamesList.map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
            </div>

            {selectedGuestName ? (
              <div className="space-y-4">
                <div className="bg-amber-50/70 border border-amber-900/15 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-amber-950">
                  <div>
                    {customerTitle}:{' '}
                    <span className="text-slate-900 text-sm mr-1 font-black">{selectedGuestName}</span>
                  </div>
                  <div>
                    تعداد دفعات حضور / فاکتور:{' '}
                    <span className="text-amber-900 font-mono">{selectedGuestInvoices.length} فاکتور</span>
                  </div>
                  <div>
                    مجموع خریدهای {customerTitle}:{' '}
                    <span className="text-amber-950 font-black text-sm font-mono">
                      {formatPersianPrice(guestTotalSpent)}
                    </span>{' '}
                    تومان
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold">
                      <tr>
                        <th className="px-3 py-2.5">تاریخ حضور / فاکتور</th>
                        <th className="px-3 py-2.5">شماره فاکتور</th>
                        <th className="px-3 py-2.5">تعداد اقلام</th>
                        <th className="px-4 py-2.5 font-bold text-amber-950">مبلغ کل فاکتور</th>
                        <th className="px-3 py-2.5 text-center">وضعیت پرداخت</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedGuestInvoices.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-6 text-slate-400">
                            هیچ فاکتوری برای این {customerTitle} در بازه زمانی مشخص شده یافت نشد.
                          </td>
                        </tr>
                      ) : (
                        selectedGuestInvoices.map((inv) => (
                          <tr key={inv.id} className="hover:bg-amber-50/20 transition-colors">
                            <td className="px-3 py-2.5 font-bold text-slate-800">
                              {formatPersianDate(inv.date)}
                            </td>
                            <td className="px-3 py-2.5 font-mono text-amber-900 font-bold">
                              {inv.serialNumber}
                            </td>
                            <td className="px-3 py-2.5 text-slate-600">{inv.items?.length || 0} ردیف</td>
                            <td className="px-4 py-2.5 font-black text-amber-950 font-mono">
                              {formatPersianPrice(inv.totalPayable)} تومان
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  inv.paid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {inv.paid ? 'تسویه شده' : 'معوق'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                لطفاً نام {customerTitle} را جهت مشاهده سابقه حضور و فاکتورهای وی وارد کنید.
              </p>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
