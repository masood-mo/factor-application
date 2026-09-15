import React, { useState } from 'react';
import { SalesInvoice, PurchaseInvoice, Category } from '../types';
import { formatPersianPrice, numberToWordsPersian } from '../utils/numberToWords';
import { isDateInRange, formatPersianDate } from '../utils/persianDate';
import { PersianDatePicker } from './PersianDatePicker';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
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
  Clock,
  Printer,
  Package,
  Folder
} from 'lucide-react';

interface ReportsViewProps {
  salesInvoices: SalesInvoice[];
  purchaseInvoices: PurchaseInvoice[];
  categories: Category[];
  wagePayments?: any[];
  customerTitle?: string;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  salesInvoices,
  purchaseInvoices,
  categories,
  wagePayments = [],
  customerTitle = 'مهمان',
}) => {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [activeReportTab, setActiveReportTab] = useState<
    'PROFIT_LOSS' | 'PURCHASE_REPORTS' | 'CATEGORY_SALES' | 'SALES_INVOICES' | 'EXPENSES' | 'GUEST_HISTORY'
  >('PROFIT_LOSS');

  const [purchaseReportSubTab, setPurchaseReportSubTab] = useState<'BY_ITEM' | 'BY_CATEGORY'>('BY_ITEM');
  const [selectedGuestName, setSelectedGuestName] = useState<string>('');

  // Filtered sales invoices in date range
  const filteredSales = salesInvoices.filter((inv) =>
    isDateInRange(inv.date, startDate, endDate)
  );

  // Filtered purchase invoices in date range
  const filteredPurchases = purchaseInvoices.filter((inv) =>
    isDateInRange(inv.date, startDate, endDate)
  );

  // Totals
  const totalRevenue = filteredSales.reduce((sum, inv) => sum + inv.totalPayable, 0);
  const totalExpenses = filteredPurchases.reduce((sum, inv) => sum + inv.totalPaid, 0);
  const netProfit = totalRevenue - totalExpenses;

  // Pie chart data
  const pieChartData = [
    { name: 'درآمد کل فروش', value: totalRevenue, color: '#15803d' },
    { name: 'هزینه‌ها و خریدها', value: totalExpenses, color: '#b91c1c' },
  ];

  // Report: Purchased Items Breakdown
  const purchasedItemsMap: { [key: string]: { name: string; unit: string; qty: number; totalCost: number; category: string } } = {};
  const purchaseCategoryMap: { [catName: string]: { totalCost: number; itemCount: number } } = {};

  filteredPurchases.forEach((inv) => {
    inv.items?.forEach((item) => {
      const key = `${item.itemName}-${item.unit}`;
      const cat = item.categoryName || 'سایر ملزومات و خریدهای عمومی';

      if (!purchasedItemsMap[key]) {
        purchasedItemsMap[key] = {
          name: item.itemName,
          unit: item.unit,
          qty: 0,
          totalCost: 0,
          category: cat,
        };
      }
      purchasedItemsMap[key].qty += item.quantity || 0;
      purchasedItemsMap[key].totalCost += item.paidAmount || (item.quantity * item.unitPrice) || 0;

      if (!purchaseCategoryMap[cat]) {
        purchaseCategoryMap[cat] = { totalCost: 0, itemCount: 0 };
      }
      purchaseCategoryMap[cat].totalCost += item.paidAmount || (item.quantity * item.unitPrice) || 0;
      purchaseCategoryMap[cat].itemCount += item.quantity || 0;
    });
  });

  const purchasedItemsList = Object.values(purchasedItemsMap);
  const purchaseCategoriesList = Object.entries(purchaseCategoryMap).map(([name, data]) => ({
    name,
    totalCost: data.totalCost,
    itemCount: data.itemCount,
    percentage: totalExpenses > 0 ? Math.round((data.totalCost / totalExpenses) * 100) : 0,
  }));

  // Report: Category Sales Breakdown
  const categorySalesMap: { [catName: string]: number } = {};
  filteredSales.forEach((inv) => {
    inv.items?.forEach((item) => {
      const catName = 'اقلام و خدمات اقامتگاه';
      categorySalesMap[catName] = (categorySalesMap[catName] || 0) + (item.payableAmount || 0);
    });
  });
  const categorySalesList = Object.entries(categorySalesMap).map(([name, amount]) => ({
    name,
    amount,
    percentage: totalRevenue > 0 ? Math.round((amount / totalRevenue) * 100) : 0,
  }));

  // Report: Guest History
  const guestNamesList = Array.from(new Set(salesInvoices.map((inv) => inv.guestName.trim()))).filter(Boolean);
  const selectedGuestInvoices = salesInvoices.filter(
    (inv) =>
      selectedGuestName &&
      inv.guestName.trim().toLowerCase().includes(selectedGuestName.trim().toLowerCase()) &&
      isDateInRange(inv.date, startDate, endDate)
  );
  const guestTotalSpent = selectedGuestInvoices.reduce((sum, inv) => sum + inv.totalPayable, 0);

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 space-y-6">
      
      {/* Title */}
      <div>
        <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-amber-800" />
          گزارش‌ها و تحلیل‌های مالی و آماری اقامتگاه
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          محاسبه سود و زیان، گزارش تفکیکی خرید بر اساس کالا و دسته، تحلیل فروش و سابقه مهمانان
        </p>
      </div>

      {/* Date Filter Toolbar */}
      <div className="bg-white rounded-3xl p-4 border border-amber-900/15 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 text-xs w-full sm:w-auto">
          <span className="font-bold text-slate-700 flex items-center gap-1">
            <Calendar className="w-4 h-4 text-amber-800" />
            فیلتر بازه زمانی گزارش:
          </span>

          <div className="flex items-center gap-2">
            <span className="text-slate-500">از:</span>
            <div className="w-36">
              <PersianDatePicker
                placeholder="۱۴۰۳/۰۱/۰۱"
                value={startDate}
                onChange={(newD) => setStartDate(newD)}
                allowClear
                inputClassName="py-1 px-2 text-xs"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500">تا:</span>
            <div className="w-36">
              <PersianDatePicker
                placeholder="۱۴۰۳/۱۲/۲۹"
                value={endDate}
                onChange={(newD) => setEndDate(newD)}
                allowClear
                inputClassName="py-1 px-2 text-xs"
              />
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            setStartDate('');
            setEndDate('');
          }}
          className="text-xs text-amber-800 hover:text-amber-900 font-bold cursor-pointer"
        >
          پاک کردن فیلتر تاریخ (تمام دوره‌ها)
        </button>
      </div>

      {/* Top 3 KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Total Income */}
        <div className="bg-white border border-amber-900/15 rounded-3xl p-5 flex items-center justify-between shadow-xs hover:shadow-md transition-all">
          <div>
            <p className="text-xs font-bold text-emerald-800 uppercase tracking-wide">کل درآمد فروش (فاکتورها)</p>
            <p className="text-2xl font-black text-slate-900 mt-1.5 font-mono">
              {formatPersianPrice(totalRevenue)} <span className="text-xs font-semibold text-slate-500">تومان</span>
            </p>
            <p className="text-[11px] text-emerald-700 font-medium mt-1">{filteredSales.length} فاکتور فروش صادر شده</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-white border border-amber-900/15 rounded-3xl p-5 flex items-center justify-between shadow-xs hover:shadow-md transition-all">
          <div>
            <p className="text-xs font-bold text-rose-800 uppercase tracking-wide">کل هزینه‌ها و خریدهای اقامتگاه</p>
            <p className="text-2xl font-black text-slate-900 mt-1.5 font-mono">
              {formatPersianPrice(totalExpenses)} <span className="text-xs font-semibold text-slate-500">تومان</span>
            </p>
            <p className="text-[11px] text-rose-700 font-medium mt-1">{filteredPurchases.length} فاکتور خرید ثبت شده</p>
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
              {netProfit >= 0 ? 'تراز مالی مثبت (سوددهی)' : 'تراز مالی منفی (کسری)'}
            </p>
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
            netProfit >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}>
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Reports Navigation Tabs */}
      <div className="bg-white rounded-3xl p-1.5 border border-amber-900/15 shadow-xs flex flex-wrap gap-1">
        {[
          { id: 'PROFIT_LOSS', label: 'نمودار دایره‌ای و تراز سود', icon: PieIcon },
          { id: 'PURCHASE_REPORTS', label: 'گزارش خرید (بر اساس کالا و دسته)', icon: ShoppingBag },
          { id: 'CATEGORY_SALES', label: 'فروش بر اساس دسته‌بندی', icon: Layers },
          { id: 'SALES_INVOICES', label: 'لیست فاکتورهای فروش', icon: FileText },
          { id: 'EXPENSES', label: 'ریز هزینه‌ها و خریدها', icon: TrendingDown },
          { id: 'GUEST_HISTORY', label: `سوابق و تاریخچه ${customerTitle}ان`, icon: User },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeReportTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveReportTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
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
        
        {/* 1. Profit & Loss Pie Chart */}
        {activeReportTab === 'PROFIT_LOSS' && (
          <div className="space-y-6">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <PieIcon className="w-5 h-5 text-amber-800" />
              نمودار دایره‌ای نسبت درآمد به هزینه و محاسبه تراز سود خالص
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              
              {/* Pie Chart */}
              <div className="h-64 w-full">
                {totalRevenue === 0 && totalExpenses === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                    داده‌ای در این بازه زمانی برای رسم نمودار ثبت نشده است.
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
                  خلاصه تراز سود و زیان دوره:
                </h4>

                <div className="flex justify-between text-emerald-800 font-bold">
                  <span>(+) کل درآمد حاصل از فروش:</span>
                  <span className="font-mono">{formatPersianPrice(totalRevenue)} تومان</span>
                </div>

                <div className="flex justify-between text-rose-800 font-bold">
                  <span>(-) کل خریدها و هزینه‌های اجرایی:</span>
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

        {/* 2. Purchase Reports (Requirement 6: By Item and By Category) */}
        {activeReportTab === 'PURCHASE_REPORTS' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-emerald-700" />
                گزارش تفکیکی خریدهای اقامتگاه
              </h3>

              <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1">
                <button
                  onClick={() => setPurchaseReportSubTab('BY_ITEM')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    purchaseReportSubTab === 'BY_ITEM'
                      ? 'bg-white text-emerald-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>تفکیک بر اساس کالا</span>
                </button>

                <button
                  onClick={() => setPurchaseReportSubTab('BY_CATEGORY')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    purchaseReportSubTab === 'BY_CATEGORY'
                      ? 'bg-white text-emerald-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Folder className="w-3.5 h-3.5" />
                  <span>تفکیک بر اساس دسته</span>
                </button>
              </div>
            </div>

            {purchaseReportSubTab === 'BY_ITEM' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2.5 text-center">#</th>
                      <th className="px-4 py-2.5">نام کالای خریداری شده</th>
                      <th className="px-3 py-2.5">دسته</th>
                      <th className="px-3 py-2.5">واحد</th>
                      <th className="px-3 py-2.5 text-center">مجموع مقدار / تعداد</th>
                      <th className="px-4 py-2.5 font-bold text-emerald-900">مجموع هزینه کل (تومان)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {purchasedItemsList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-slate-400">
                          هیچ خرید ثبت‌شده‌ای در این بازه زمانی یافت نشد.
                        </td>
                      </tr>
                    ) : (
                      purchasedItemsList.map((item, idx) => (
                        <tr key={idx} className="hover:bg-amber-50/20">
                          <td className="px-3 py-2.5 text-center font-semibold text-slate-400">{idx + 1}</td>
                          <td className="px-4 py-2.5 font-bold text-slate-800">{item.name}</td>
                          <td className="px-3 py-2.5 text-slate-500">{item.category}</td>
                          <td className="px-3 py-2.5 text-slate-600">{item.unit}</td>
                          <td className="px-3 py-2.5 text-center font-bold text-slate-800 font-mono">{item.qty}</td>
                          <td className="px-4 py-2.5 font-black text-emerald-800 font-mono">
                            {formatPersianPrice(item.totalCost)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2.5 text-center">#</th>
                      <th className="px-4 py-2.5">عنوان دسته خرید</th>
                      <th className="px-4 py-2.5">مجموع مبالغ هزینه شده (تومان)</th>
                      <th className="px-4 py-2.5">سهم از کل هزینه‌ها (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {purchaseCategoriesList.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-8 text-slate-400">
                          هیچ خریدی در این بازه ثبت نشده است.
                        </td>
                      </tr>
                    ) : (
                      purchaseCategoriesList.map((cat, idx) => (
                        <tr key={idx} className="hover:bg-amber-50/20">
                          <td className="px-3 py-2.5 text-center font-semibold text-slate-400">{idx + 1}</td>
                          <td className="px-4 py-2.5 font-bold text-slate-800">{cat.name}</td>
                          <td className="px-4 py-2.5 font-black text-rose-800 font-mono">
                            {formatPersianPrice(cat.totalCost)}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="w-28 bg-slate-200 h-2 rounded-full overflow-hidden">
                                <div
                                  className="bg-rose-600 h-full rounded-full"
                                  style={{ width: `${cat.percentage}%` }}
                                />
                              </div>
                              <span className="font-bold text-slate-700 font-mono">{cat.percentage}%</span>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 3. Category Sales Report */}
        {activeReportTab === 'CATEGORY_SALES' && (
          <div className="space-y-4">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Layers className="w-5 h-5 text-amber-800" />
              گزارش تفکیکی فروش بر اساس دسته‌بندی کالاها و خدمات
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2.5 text-center">#</th>
                    <th className="px-4 py-2.5">نام دسته‌بندی</th>
                    <th className="px-4 py-2.5">مبلغ کل فروش (تومان)</th>
                    <th className="px-4 py-2.5">سهم از کل فروش (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {categorySalesList.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-slate-400">
                        هیچ فروشی در این بازه ثبت نشده است.
                      </td>
                    </tr>
                  ) : (
                    categorySalesList.map((cat, idx) => (
                      <tr key={idx} className="hover:bg-amber-50/20">
                        <td className="px-3 py-2.5 text-center font-semibold text-slate-400">{idx + 1}</td>
                        <td className="px-4 py-2.5 font-bold text-slate-800">{cat.name}</td>
                        <td className="px-4 py-2.5 font-black text-amber-900 font-mono">
                          {formatPersianPrice(cat.amount)}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-slate-200 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-amber-700 h-full rounded-full"
                                style={{ width: `${cat.percentage}%` }}
                              />
                            </div>
                            <span className="font-bold text-slate-700 font-mono">{cat.percentage}%</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. Sales Invoices Report */}
        {activeReportTab === 'SALES_INVOICES' && (
          <div className="space-y-4">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <FileText className="w-5 h-5 text-amber-800" />
              گزارش لیست فاکتورهای فروش صادر شده
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold">
                  <tr>
                    <th className="px-3 py-2.5 text-center">شماره سریال</th>
                    <th className="px-3 py-2.5">تاریخ</th>
                    <th className="px-4 py-2.5">نام مهمان / طرف حساب</th>
                    <th className="px-3 py-2.5 font-extrabold text-amber-950">مبلغ قابل پرداخت</th>
                    <th className="px-3 py-2.5 text-center">وضعیت تسویه</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSales.map((inv) => (
                    <tr key={inv.id} className="hover:bg-amber-50/20">
                      <td className="px-3 py-2.5 text-center font-mono font-bold text-amber-900">{inv.serialNumber}</td>
                      <td className="px-3 py-2.5 font-mono text-slate-600">{inv.date}</td>
                      <td className="px-4 py-2.5 font-bold text-slate-800">{inv.guestName}</td>
                      <td className="px-3 py-2.5 font-black text-amber-950 font-mono">{formatPersianPrice(inv.totalPayable)}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          inv.paid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {inv.paid ? 'تسویه کامل' : 'دارای مانده'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 5. Purchase & Expenses Report */}
        {activeReportTab === 'EXPENSES' && (
          <div className="space-y-4">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <TrendingDown className="w-5 h-5 text-rose-700" />
              گزارش خریدها و هزینه‌های ثبت شده
            </h3>

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
                  {filteredPurchases.map((inv) => (
                    <tr key={inv.id} className="hover:bg-amber-50/20">
                      <td className="px-3 py-2.5 text-center font-mono font-bold text-emerald-800">{inv.serialNumber}</td>
                      <td className="px-3 py-2.5 font-bold text-slate-700">{formatPersianDate(inv.date)}</td>
                      <td className="px-4 py-2.5 font-bold text-slate-800">{inv.vendorName}</td>
                      <td className="px-3 py-2.5 font-black text-rose-800 font-mono">{formatPersianPrice(inv.totalPaid)}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          inv.paid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {inv.paid ? 'تسویه شده' : 'معوق'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 6. Guest History Report (Requirement 4) */}
        {activeReportTab === 'GUEST_HISTORY' && (
          <div className="space-y-6">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <User className="w-5 h-5 text-amber-800" />
              گزارش سابقه حضور و فاکتورها بر اساس نام مهمان
            </h3>

            {/* Guest Selector */}
            <div className="max-w-md space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                انتخاب یا جستجوی نام مهمان:
              </label>
              <input
                type="text"
                list="guest-list"
                value={selectedGuestName}
                onChange={(e) => setSelectedGuestName(e.target.value)}
                placeholder="تایپ نام مهمان..."
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
                    مهمان: <span className="text-slate-900 text-sm mr-1 font-black">{selectedGuestName}</span>
                  </div>
                  <div>
                    تعداد دفعات حضور / فاکتور: <span className="text-amber-900 font-mono">{selectedGuestInvoices.length} فاکتور</span>
                  </div>
                  <div>
                    مجموع خریدهای مهمان: <span className="text-amber-950 font-black text-sm font-mono">{formatPersianPrice(guestTotalSpent)}</span> تومان
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
                            هیچ فاکتوری برای این مهمان در بازه زمانی مشخص شده یافت نشد.
                          </td>
                        </tr>
                      ) : (
                        selectedGuestInvoices.map((inv) => (
                          <tr key={inv.id} className="hover:bg-amber-50/20">
                            <td className="px-3 py-2.5 font-bold text-slate-800">{formatPersianDate(inv.date)}</td>
                            <td className="px-3 py-2.5 font-mono text-amber-900 font-bold">{inv.serialNumber}</td>
                            <td className="px-3 py-2.5 text-slate-600">{inv.items?.length || 0} ردیف</td>
                            <td className="px-4 py-2.5 font-black text-amber-950 font-mono">{formatPersianPrice(inv.totalPayable)} تومان</td>
                            <td className="px-3 py-2.5 text-center">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                inv.paid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}>
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
              <p className="text-xs text-slate-400">لطفاً نام مهمان را جهت مشاهده سابقه حضور و فاکتورهای وی وارد کنید.</p>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
