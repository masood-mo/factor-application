import React, { useState } from 'react';
import { LodgeSettings, BudgetRowConfig } from '../types';
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
  UserCheck
} from 'lucide-react';

interface SettingsViewProps {
  settings: LodgeSettings;
  onSaveSettings: (settings: LodgeSettings) => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, onSaveSettings }) => {
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
    budgetRows:
      settings.budgetRows && settings.budgetRows.length > 0
        ? settings.budgetRows
        : [
            { id: 'b-1', name: 'مواد غذایی، پذیرایی و صبحانه', percentage: 30 },
            { id: 'b-2', name: 'حقوق و دستمزد پرسنل', percentage: 25 },
            { id: 'b-3', name: 'تعمیرات، بهسازی و نگهداری بنا', percentage: 15 },
            { id: 'b-4', name: 'انرژی، اینترنت و قبوض', percentage: 10 },
            { id: 'b-5', name: 'تبلیغات و توسعه گردشگری', percentage: 10 },
            { id: 'b-6', name: 'صندوق ذخیره احتیاطی', percentage: 10 }
          ]
  });

  const [newUnit, setNewUnit] = useState<string>('');
  const [newBudgetRowName, setNewBudgetRowName] = useState<string>('');
  const [newBudgetRowPercent, setNewBudgetRowPercent] = useState<number>(10);
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

  // Budget Row Management
  const handleAddBudgetRow = () => {
    if (!newBudgetRowName.trim()) return;
    const newRow: BudgetRowConfig = {
      id: `b-${Date.now()}`,
      name: newBudgetRowName.trim(),
      percentage: Number(newBudgetRowPercent) || 0
    };
    setFormData((prev) => ({
      ...prev,
      budgetRows: [...(prev.budgetRows || []), newRow]
    }));
    setNewBudgetRowName('');
    setNewBudgetRowPercent(10);
  };

  const handleRemoveBudgetRow = (rowId: string) => {
    setFormData((prev) => ({
      ...prev,
      budgetRows: (prev.budgetRows || []).filter((r) => r.id !== rowId)
    }));
  };

  const handleUpdateBudgetRowPercent = (rowId: string, percent: number) => {
    setFormData((prev) => ({
      ...prev,
      budgetRows: (prev.budgetRows || []).map((r) => (r.id === rowId ? { ...r, percentage: percent } : r))
    }));
  };

  const totalBudgetPercent = (formData.budgetRows || []).reduce(
    (sum, r) => sum + (Number(r.percentage) || 0),
    0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSaveSettings(formData);
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

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                درصد پیش‌فرض سهم سرمایه‌گذار (%)
              </label>
              <input
                type="number"
                name="investorSharePercent"
                min="0"
                max="100"
                value={formData.investorSharePercent ?? 35}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-amber-700 outline-hidden"
              />
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

        {/* Section 4: Budget Rows Configuration */}
        <div className="bg-white rounded-3xl p-6 border border-amber-900/15 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-amber-950 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-amber-800" />
              تعریف ردیف‌های بودجه و درصد مصوب
            </h3>
            <span className={`text-xs font-bold font-mono px-2.5 py-1 rounded-xl ${
              totalBudgetPercent === 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              مجموع درصدها: {totalBudgetPercent}٪
            </span>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="عنوان ردیف بودجه جدید (مثال: توسعه فضای سبز و باغ)"
              value={newBudgetRowName}
              onChange={(e) => setNewBudgetRowName(e.target.value)}
              className="flex-1 px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-700 outline-hidden"
            />
            <div className="flex items-center gap-1">
              <input
                type="number"
                placeholder="درصد"
                value={newBudgetRowPercent}
                onChange={(e) => setNewBudgetRowPercent(Number(e.target.value))}
                className="w-20 px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono text-center focus:ring-2 focus:ring-amber-700 outline-hidden"
              />
              <span className="text-xs text-slate-500 font-bold">٪</span>
            </div>
            <button
              type="button"
              onClick={handleAddBudgetRow}
              className="bg-amber-800 hover:bg-amber-900 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>افزودن</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            {(formData.budgetRows || []).map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs"
              >
                <span className="font-bold text-slate-800">{row.name}</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={row.percentage}
                    onChange={(e) => handleUpdateBudgetRowPercent(row.id, Number(e.target.value))}
                    className="w-16 p-1 border border-slate-300 rounded-lg text-center font-mono font-bold text-xs bg-white"
                  />
                  <span className="font-bold text-slate-600">٪</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveBudgetRow(row.id)}
                    className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
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
