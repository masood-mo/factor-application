import React, { useState } from 'react';
import { LodgeSettings, BudgetRowConfig, Category } from '../types';
import { DEFAULT_PURCHASE_CATEGORIES } from '../services/dbService';
import {
  Building2,
  CreditCard,
  Percent,
  Ruler,
  Save,
  Upload,
  Plus,
  Trash2,
  CheckCircle2,
  FileSignature,
  Stamp,
  MessageSquare,
  BellRing,
  PieChart,
  UserCheck,
  Download,
  FolderArchive,
  Award,
  Lock,
  FolderTree
} from 'lucide-react';

interface SettingsViewProps {
  settings: LodgeSettings;
  purchaseCategories?: Category[];
  onSaveSettings: (settings: LodgeSettings) => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, purchaseCategories, onSaveSettings }) => {
  const initialBudgetRows = (() => {
    const existing = settings.budgetRows || [];
    const pCats = (purchaseCategories && purchaseCategories.length > 0)
      ? purchaseCategories
      : DEFAULT_PURCHASE_CATEGORIES;

    // 1. Wage row
    const existingWageRow = existing.find((r) => r.isWageRow || r.name.includes('حقوق') || r.name.includes('دستمزد'));
    const wageRow: BudgetRowConfig = {
      id: 'b-wages',
      name: 'حقوق و دستمزد و انعام پرسنل',
      percentage: existingWageRow ? Number(existingWageRow.percentage) : 20,
      isWageRow: true,
      isLocked: true,
      description: 'هزینه‌های مربوط به حقوق، دستمزد و انعام پرسنل اقامتگاه'
    };

    // 2. Rows for each purchase category in the catalog
    const categoryRows: BudgetRowConfig[] = pCats.map((cat) => {
      const existingCatRow = existing.find(
        (r) => (r.purchaseCategoryId && r.purchaseCategoryId === cat.id) || r.name.trim() === cat.name.trim()
      );
      let defaultPercent = 10;
      if (cat.name.includes('غذایی') || cat.name.includes('بهداشتی')) defaultPercent = 25;
      else if (cat.name.includes('قبض') || cat.name.includes('اینترنت')) defaultPercent = 5;
      else if (cat.name.includes('تعمیر') || cat.name.includes('نگهداری')) defaultPercent = 10;
      else if (cat.name.includes('تبلیغ') || cat.name.includes('محیط')) defaultPercent = 5;
      else if (cat.name.includes('تجهیزات') || cat.name.includes('ملزومات')) defaultPercent = 5;

      return {
        id: `b-pcat-${cat.id}`,
        name: cat.name,
        purchaseCategoryId: cat.id,
        percentage: existingCatRow ? Number(existingCatRow.percentage) : defaultPercent,
        isLocked: true,
        description: cat.description || `هزینه‌های فاکتورهای خرید دسته‌بندی ${cat.name}`
      };
    });

    // 3. Investor Profit row
    const existingInvestorRow = existing.find((r) => r.isInvestorShare || r.name.includes('سرمایه‌گذار'));
    const investorRow: BudgetRowConfig = {
      id: 'b-investor',
      name: 'سود سرمایه‌گذار',
      percentage: existingInvestorRow
        ? Number(existingInvestorRow.percentage)
        : (settings.investorSharePercent ?? 35),
      isInvestorShare: true,
      isLocked: true,
      description: 'سهم مصوب سود سرمایه‌گذار از سود اقامتگاه'
    };

    return [wageRow, ...categoryRows, investorRow];
  })();

  const [formData, setFormData] = useState<LodgeSettings>({
    ...settings,
    customerTitle: settings.customerTitle || 'مهمان',
    chequeAlarmDays: settings.chequeAlarmDays ?? 2,
    investorSharePercent: settings.investorSharePercent ?? 35,
    whatsappShareTemplate:
      settings.whatsappShareTemplate ||
      settings.whatsappTemplate ||
      'دوست گرامی با احترام، فاکتور شما به پیوست تقدیم می‌گردد:',
    whatsappTemplate:
      settings.whatsappTemplate ||
      settings.whatsappShareTemplate ||
      'دوست گرامی با احترام، فاکتور شما به پیوست تقدیم می‌گردد:',
    budgetRows: initialBudgetRows
  });

  const [newUnit, setNewUnit] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === 'taxRate' || name === 'chequeAlarmDays' || name === 'investorSharePercent'
          ? parseFloat(value) || 0
          : value
    }));
  };

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'lodgeLogo' | 'signatureImage' | 'stampImage'
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('حجم تصویر نباید بیشتر از 2 مگابایت باشد.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({
          ...prev,
          [field]: reader.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddUnit = () => {
    const trimmed = newUnit.trim();
    if (trimmed && !formData.units.includes(trimmed)) {
      setFormData((prev) => ({
        ...prev,
        units: [...prev.units, trimmed]
      }));
      setNewUnit('');
    }
  };

  const handleRemoveUnit = (unitToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      units: prev.units.filter((u) => u !== unitToRemove)
    }));
  };

  // Budget Row Management - update percentage
  const handleUpdateBudgetRowPercent = (rowId: string, percent: number) => {
    setFormData((prev) => {
      const updatedRows = (prev.budgetRows || []).map((r) =>
        r.id === rowId ? { ...r, percentage: percent } : r
      );
      const investorRow = updatedRows.find(
        (r) => r.id === rowId && (r.isInvestorShare || r.name.includes('سرمایه‌گذار'))
      );
      return {
        ...prev,
        budgetRows: updatedRows,
        ...(investorRow ? { investorSharePercent: percent } : {})
      };
    });
  };

  const totalBudgetPercent = (formData.budgetRows || []).reduce(
    (sum, r) => sum + (Number(r.percentage) || 0),
    0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const investorRow = (formData.budgetRows || []).find(
        (r) => r.isInvestorShare || r.name.includes('سرمایه‌گذار')
      );
      const finalData: LodgeSettings = {
        ...formData,
        investorSharePercent: investorRow ? Number(investorRow.percentage) : (formData.investorSharePercent || 35)
      };
      await onSaveSettings(finalData);
      setSuccessMessage('تنظیمات با موفقیت ذخیره شد.');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error(err);
      alert('خطا در ذخیره تنظیمات');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-black text-amber-950 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-amber-800" />
            تنظیمات جامع اقامتگاه بوم‌گردی خانه برزک
          </h2>
          <p className="text-xs text-amber-900/70 mt-1">
            مشخصات حقوقی، کداقتصادی، لوگو، مهر، امضا، عنوان مشتری، قالب واتساپ و ردیف‌های بودجه
          </p>
        </div>
        {successMessage && (
          <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 px-3.5 py-2 rounded-xl text-xs font-bold border border-emerald-300 shadow-2xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {successMessage}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Eco-Lodge Identity & Customer Title */}
        <div className="bg-white rounded-3xl p-6 border border-amber-900/15 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-amber-950 pb-2 border-b border-slate-100 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-amber-800" />
            مشخصات عمومی و حقوقی اقامتگاه
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                نام اقامتگاه بوم‌گردی <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="lodgeName"
                value={formData.lodgeName}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-amber-700 outline-hidden"
                placeholder="مثال: اقامتگاه بوم‌گردی خانه برزک"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                تلفن‌های تماس <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-700 outline-hidden"
                placeholder="0913... - 031..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                کد اقتصادی / شناسه ملی اقامتگاه (اختیاری)
              </label>
              <input
                type="text"
                name="economicCode"
                value={formData.economicCode || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-amber-700 outline-hidden"
                placeholder="کد اقتصادی یا ثبت شرکت"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                عنوان طرف حساب / خریدار در فاکتورها و سیستم
              </label>
              <input
                type="text"
                name="customerTitle"
                value={formData.customerTitle || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-amber-700 outline-hidden"
                placeholder="مثال: مهمان، خریدار، مشتری، گردشگر، مسافر"
              />
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                <span className="text-[10px] text-slate-400">پیش‌فرض‌های پرکاربرد:</span>
                {['مهمان', 'مشتری', 'خریدار', 'گردشگر', 'مسافر', 'طرف حساب'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, customerTitle: t }))}
                    className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                      formData.customerTitle === t
                        ? 'bg-amber-800 text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">این عنوان به صورت پویا در سربرگ فاکتور، فرم‌ها و گزارش‌ها استفاده می‌شود.</p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                آدرس کامل اقامتگاه <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-700 outline-hidden"
                placeholder="استان اصفهان، کاشان، برزک..."
              />
            </div>
          </div>

          {/* Logo, Stamp & Signature Upload Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
            {/* Logo */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col items-center text-center gap-2">
              <span className="text-xs font-bold text-slate-700">لوگوی اقامتگاه</span>
              {formData.lodgeLogo ? (
                <div className="relative group">
                  <img
                    src={formData.lodgeLogo}
                    alt="Logo"
                    className="w-20 h-20 rounded-xl object-contain bg-white border border-slate-200 p-1"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, lodgeLogo: '' }))}
                    className="absolute -top-2 -right-2 bg-rose-600 text-white rounded-full p-1 shadow-xs hover:bg-rose-700 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="w-20 h-20 rounded-xl bg-white border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400">
                  <Building2 className="w-8 h-8" />
                </div>
              )}
              <label className="inline-flex items-center gap-1.5 bg-white hover:bg-amber-50 text-amber-900 border border-slate-300 px-3 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer transition-all">
                <Upload className="w-3.5 h-3.5" />
                <span>آپلود لوگو</span>
                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'lodgeLogo')} className="hidden" />
              </label>
            </div>

            {/* Signature */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col items-center text-center gap-2">
              <span className="text-xs font-bold text-slate-700">تصویر امضای مدیریت</span>
              {formData.signatureImage ? (
                <div className="relative group">
                  <img
                    src={formData.signatureImage}
                    alt="Signature"
                    className="w-24 h-20 rounded-xl object-contain bg-white border border-slate-200 p-1"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, signatureImage: '' }))}
                    className="absolute -top-2 -right-2 bg-rose-600 text-white rounded-full p-1 shadow-xs hover:bg-rose-700 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="w-24 h-20 rounded-xl bg-white border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400">
                  <FileSignature className="w-8 h-8" />
                </div>
              )}
              <label className="inline-flex items-center gap-1.5 bg-white hover:bg-amber-50 text-amber-900 border border-slate-300 px-3 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer transition-all">
                <Upload className="w-3.5 h-3.5" />
                <span>آپلود امضا</span>
                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'signatureImage')} className="hidden" />
              </label>
            </div>

            {/* Stamp */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col items-center text-center gap-2">
              <span className="text-xs font-bold text-slate-700">تصویر مهر اقامتگاه</span>
              {formData.stampImage ? (
                <div className="relative group">
                  <img
                    src={formData.stampImage}
                    alt="Stamp"
                    className="w-20 h-20 rounded-xl object-contain bg-white border border-slate-200 p-1"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, stampImage: '' }))}
                    className="absolute -top-2 -right-2 bg-rose-600 text-white rounded-full p-1 shadow-xs hover:bg-rose-700 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="w-20 h-20 rounded-xl bg-white border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400">
                  <Stamp className="w-8 h-8" />
                </div>
              )}
              <label className="inline-flex items-center gap-1.5 bg-white hover:bg-amber-50 text-amber-900 border border-slate-300 px-3 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer transition-all">
                <Upload className="w-3.5 h-3.5" />
                <span>آپلود مهر</span>
                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'stampImage')} className="hidden" />
              </label>
            </div>
          </div>
        </div>

        {/* Section 2: Bank Account Details */}
        <div className="bg-white rounded-3xl p-6 border border-amber-900/15 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-amber-950 pb-2 border-b border-slate-100 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-700" />
            اطلاعات حساب بانکی اقامتگاه (جهت درج در فاکتورها)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">نام صاحب حساب *</label>
              <input
                type="text"
                name="accountOwner"
                value={formData.accountOwner}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-amber-700 outline-hidden"
                placeholder="نام کامل صاحب حساب"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">شماره کارت بانکی (16 رقمی)</label>
              <input
                type="text"
                name="cardNumber"
                value={formData.cardNumber}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-amber-700 outline-hidden ltr text-right"
                placeholder="6037-xxxx-xxxx-xxxx"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">شماره حساب</label>
              <input
                type="text"
                name="accountNumber"
                value={formData.accountNumber}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-amber-700 outline-hidden ltr text-right"
                placeholder="123-456789-1"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">شماره شبا (IBAN)</label>
              <input
                type="text"
                name="shaba"
                value={formData.shaba}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-amber-700 outline-hidden ltr text-right"
                placeholder="IR000000000000000000000000"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Cheque Alarms, WhatsApp Message & Investor Share */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Cheque Alarms & Tax */}
          <div className="bg-white rounded-3xl p-6 border border-amber-900/15 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-amber-950 pb-2 border-b border-slate-100 flex items-center gap-2">
              <BellRing className="w-4 h-4 text-rose-600" />
              تنظیمات هشدار چک و درصد مالیات
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  آلارم سررسید چک (چند روز قبل)
                </label>
                <input
                  type="number"
                  name="chequeAlarmDays"
                  min="0"
                  max="30"
                  value={formData.chequeAlarmDays ?? 2}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-amber-700 outline-hidden"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">۰ = فقط روز سررسید</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  مالیات ارزش افزوده (%)
                </label>
                <input
                  type="number"
                  name="taxRate"
                  min="0"
                  max="100"
                  value={formData.taxRate}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-amber-700 outline-hidden"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">درصد ارزش افزوده پیش‌فرض</span>
              </div>
            </div>
          </div>

          {/* WhatsApp & Telegram Share Template */}
          <div className="bg-white rounded-3xl p-6 border border-amber-900/15 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-amber-950 pb-2 border-b border-slate-100 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              متن پیام پیش‌فرض ارسال فاکتور (واتساپ و تلگرام)
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                متن پیام / مقدمه ارسال صورتحساب برای {formData.customerTitle || 'مهمان'}:
              </label>
              <textarea
                name="whatsappShareTemplate"
                rows={3}
                value={formData.whatsappShareTemplate || formData.whatsappTemplate || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData((prev) => ({
                    ...prev,
                    whatsappShareTemplate: val,
                    whatsappTemplate: val
                  }));
                }}
                className="w-full p-3 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-700 outline-hidden leading-relaxed font-sans"
                placeholder="دوست گرامی با احترام، فاکتور شما به پیوست تقدیم می‌گردد:"
              />

              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-[10px] text-slate-400">قالب‌های آماده:</span>
                <button
                  type="button"
                  onClick={() => {
                    const val = 'دوست گرامی با احترام، فاکتور شما به پیوست تقدیم می‌گردد:';
                    setFormData((prev) => ({
                      ...prev,
                      whatsappShareTemplate: val,
                      whatsappTemplate: val
                    }));
                  }}
                  className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200 cursor-pointer font-medium"
                >
                  قالب رسمی (به پیوست است)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const val = `سلام {${formData.customerTitle || 'مهمان'}} عزیز،\nصورتحساب اقامت و پذیرایی شما در {اقامتگاه} به شماره {شماره_فاکتور} و مبلغ {مبلغ} تومان به شرح پیوست صادر گردید.\nاز میزبانی شما بسیار خرسندیم.`;
                    setFormData((prev) => ({
                      ...prev,
                      whatsappShareTemplate: val,
                      whatsappTemplate: val
                    }));
                  }}
                  className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200 cursor-pointer font-medium"
                >
                  قالب صمیمی با متغیرها
                </button>
              </div>

              <p className="text-[10px] text-slate-500 mt-2">
                متغیرهای قابل درج: {'{مهمان}'}، {'{مشتری}'}، {'{شماره_فاکتور}'}، {'{مبلغ}'} و {'{اقامتگاه}'}. این متن در ابتدای پیام ارسالی در واتساپ و تلگرام قرار می‌گیرد.
              </p>
            </div>
          </div>
        </div>

        {/* Section 4: Budget Rows Configuration (Requirement 7) */}
        <div className="bg-white rounded-3xl p-6 border border-amber-900/15 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-amber-950 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-amber-800" />
                تعریف ردیف‌های بودجه و درصد مصوب
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                شامل حقوق و دستمزد، ردیف‌های دسته‌بندی کاتالوگ خرید و سود سرمایه‌گذار (غیرقابل حذف یا تغییر عنوان)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold font-mono px-3 py-1.5 rounded-xl border ${
                totalBudgetPercent === 100
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                مجموع درصدها: {totalBudgetPercent}٪ {totalBudgetPercent === 100 ? '✓' : ''}
              </span>
            </div>
          </div>

          {/* Locked Explanation Notice */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 flex items-start gap-3">
            <Lock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-600 leading-relaxed">
              ردیف‌های این جدول به صورت خودکار و یکپارچه از <strong>حقوق و دستمزد پرسنل</strong>، <strong>دسته‌بندی‌های کاتالوگ کالا و خدمات خرید</strong> و <strong>سود سرمایه‌گذار</strong> تشکیل شده‌اند و امکان تغییر عنوان یا حذف آن‌ها وجود ندارد. شما می‌توانید <strong>درصد مصوب هر ردیف</strong> را در کادرهای زیر تنظیم نمایید. برای افزودن ردیف هزینه جدید، کافیست دسته‌بندی مربوطه را در «کاتالوگ کالا و خدمات خرید» اضافه کنید.
            </p>
          </div>

          {/* Budget Rows Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {(formData.budgetRows || []).map((row) => {
              const isInvestorRow = row.isInvestorShare || row.name.includes('سرمایه‌گذار');
              const isWage = row.isWageRow || row.name.includes('حقوق') || row.name.includes('دستمزد');

              return (
                <div
                  key={row.id}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border text-xs transition-all ${
                    isInvestorRow
                      ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-300/50 shadow-2xs'
                      : isWage
                      ? 'bg-blue-50/60 border-blue-200 shadow-2xs'
                      : 'bg-emerald-50/40 border-emerald-200/80 shadow-2xs'
                  }`}
                >
                  <div className="flex flex-col gap-1 min-w-0 pr-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 text-xs truncate">{row.name}</span>
                      <span className="text-slate-400" title="ردیف سیستمی قفل شده">
                        <Lock className="w-3 h-3 text-slate-400" />
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isInvestorRow ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded-md border border-amber-300">
                          <Award className="w-3 h-3 text-amber-700" />
                          سود سرمایه‌گذار
                        </span>
                      ) : isWage ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-900 bg-blue-100 px-2 py-0.5 rounded-md border border-blue-200">
                          حقوق و دستمزد پرسنل
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200">
                          <FolderTree className="w-3 h-3 text-emerald-700" />
                          دسته‌بندی کاتالوگ خرید
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-slate-500 font-semibold">درصد مصوب:</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={row.percentage}
                      onChange={(e) => handleUpdateBudgetRowPercent(row.id, Number(e.target.value))}
                      className="w-16 p-1.5 border border-slate-300 rounded-xl text-center font-mono font-black text-xs bg-white focus:ring-2 focus:ring-amber-700 outline-hidden shadow-2xs"
                    />
                    <span className="font-bold text-slate-700 text-xs">٪</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Measurement Units */}
        <div className="bg-white rounded-3xl p-6 border border-amber-900/15 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-amber-950 pb-2 border-b border-slate-100 flex items-center gap-2">
            <Ruler className="w-4 h-4 text-purple-600" />
            واحدهای اندازه‌گیری کالا و خدمات
          </h3>

          <div className="flex gap-2">
            <input
              type="text"
              value={newUnit}
              onChange={(e) => setNewUnit(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddUnit())}
              placeholder="عنوان واحد جدید (مثال: پرس، قوری، شب)"
              className="flex-1 px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-700 outline-hidden"
            />
            <button
              type="button"
              onClick={handleAddUnit}
              className="bg-amber-800 hover:bg-amber-900 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              افزودن
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pt-1">
            {formData.units.map((unit) => (
              <span
                key={unit}
                className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-800 border border-slate-200 px-3 py-1 rounded-xl text-xs font-medium"
              >
                {unit}
                <button
                  type="button"
                  onClick={() => handleRemoveUnit(unit)}
                  className="text-slate-400 hover:text-rose-600 cursor-pointer"
                  title="حذف واحد"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Source Code & Backup Export (ZIP) */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 rounded-3xl p-6 border border-amber-900/20 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-amber-900/10">
            <h3 className="text-sm font-bold text-amber-950 flex items-center gap-2">
              <FolderArchive className="w-4 h-4 text-amber-800" />
              دریافت نسخه پشتیبان و سورس‌کد کامل پروژه (فایل ZIP)
            </h3>
            <span className="text-[10px] bg-amber-800/10 text-amber-900 font-bold px-2 py-0.5 rounded-full">
              خروجی مستقیم
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            می‌توانید کل ساختار پروژه شامل فایل‌های برنامه، کامپوننت‌های فرانت‌اند، تنظیمات، اسکریپت‌های سرور Express و استایل‌ها را در قالب یک فایل فشرده ZIP دانلود و روی کامپیوتر خود اجرا نمایید.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <a
              href="/api/download-zip"
              download="factor-application.zip"
              className="inline-flex items-center gap-2 bg-amber-800 hover:bg-amber-900 text-white font-bold px-6 py-2.5 rounded-2xl text-xs shadow-md transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 text-amber-300" />
              دانلود سورس کامل پروژه (factor-application.zip)
            </a>
            <span className="text-[11px] text-slate-500 font-medium">
              (پوشه‌های حجیم node_modules و dist فیلتر شده‌اند تا حجم فایل بهینه باشد)
            </span>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-amber-800 hover:bg-amber-900 text-white font-bold px-8 py-3 rounded-2xl text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4 text-amber-300" />
            {saving ? 'در حال ذخیره‌سازی...' : 'ذخیره تمام تنظیمات'}
          </button>
        </div>
      </form>
    </div>
  );
};
