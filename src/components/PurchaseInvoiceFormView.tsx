import React, { useState, useEffect, useRef, useMemo } from 'react';
import { LodgeSettings, PurchaseInvoice, PurchaseInvoiceItem, Item, Category, Vendor } from '../types';
import { getCurrentJalaliDate, normalizePersianText } from '../utils/persianDate';
import { savePurchaseItem } from '../services/dbService';
import { PersianDatePicker } from './PersianDatePicker';
import { formatPersianPrice } from '../utils/numberToWords';
import { ShoppingBag, Plus, Trash2, Save, CheckCircle2, Clock, Building2, Store, FileText, AlertCircle, X, Search, ArrowRight, UserCheck, Check } from 'lucide-react';

export function detectPurchaseCategory(
  itemName: string,
  categories: Category[]
): Category | null {
  const norm = normalizePersianText(itemName || '');
  if (!norm) return null;

  for (const cat of categories) {
    const cName = normalizePersianText(cat.name);
    // Bills & Utilities & Internet
    if (
      (cName.includes('قبض') || cName.includes('اینترنت') || cName.includes('انرژی') || cat.id === 'pcat-2' || cat.id === 'b-pcat-2') &&
      /قبض|آب|اب|برق|گاز|اینترنت|تلفن|مخابرات|وای‌فای|وای فای|شارژ|بسته اینترنت|سیمکارت|سیم کارت/.test(norm)
    ) {
      return cat;
    }
    // Repairs & Maintenance
    if (
      (cName.includes('تعمیر') || cName.includes('نگهداری') || cName.includes('تاسیسات') || cat.id === 'pcat-3' || cat.id === 'b-pcat-3') &&
      /تعمیر|سرویس|نگهداری|رنگ|لوله|سیم‌کشی|سیم کشی|شیرآلات|بنا|ابزار|تاسیسات|کاهگل|مرمت|ساختمانی|کلید|پریز/.test(norm)
    ) {
      return cat;
    }
    // Advertising & Environment
    if (
      (cName.includes('تبلیغ') || cName.includes('محیط') || cat.id === 'pcat-4' || cat.id === 'b-pcat-4') &&
      /تبلیغ|چاپ|بنر|کاتالوگ|بروشور|عکاسی|فیلمبرداری|محیط زیست|فضای سبز|پسماند|زباله|تراکت/.test(norm)
    ) {
      return cat;
    }
    // Equipment & Operating Supplies
    if (
      (cName.includes('تجهیزات') || cName.includes('ملزومات') || cat.id === 'pcat-5' || cat.id === 'b-pcat-5') &&
      /تجهیز|ملزومات|پتو|تشک|ملحفه|بالش|ظروف|قاشق|لیوان|لامپ|فرش|وسایل|پنکه|بخاری/.test(norm)
    ) {
      return cat;
    }
    // Food & Groceries & Hygiene
    if (
      (cName.includes('غذایی') || cName.includes('بهداشتی') || cat.id === 'pcat-1' || cat.id === 'b-pcat-1') &&
      /غذا|پذیرایی|صبحانه|دیزی|کباب|برنج|گوشت|مرغ|نان|پنیر|روغن|چای|قند|شوینده|بهداشتی|شامپو|مایع|دستمال|میوه|سبزی|ماست|شیر|لبنیات|سوپرمارکت|خواربار|ادویه|زعفران|حبوبات/.test(norm)
    ) {
      return cat;
    }
  }

  // Generic keyword match
  for (const cat of categories) {
    const cName = normalizePersianText(cat.name);
    const keywords = cName.split(/[\s،,و/]+/).filter((k) => k.length > 2);
    if (keywords.some((k) => norm.includes(k))) {
      return cat;
    }
  }

  return null;
}

interface PurchaseInvoiceFormViewProps {
  settings: LodgeSettings;
  existingItems?: Item[];
  categories?: Category[];
  existingVendors?: (Vendor | string)[];
  invoiceToEdit?: PurchaseInvoice | null;
  onSaveInvoice: (invoice: Partial<PurchaseInvoice>) => Promise<PurchaseInvoice>;
  onAutoCreatePurchaseItem?: (item: Partial<Item>) => Promise<Item>;
  onNavigateToList?: () => void;
  onCancelEdit?: () => void;
}

export const PurchaseInvoiceFormView: React.FC<PurchaseInvoiceFormViewProps> = ({
  settings,
  existingItems = [],
  categories = [],
  existingVendors = [],
  invoiceToEdit,
  onSaveInvoice,
  onAutoCreatePurchaseItem,
  onNavigateToList,
  onCancelEdit,
}) => {
  const [currentInvoiceId, setCurrentInvoiceId] = useState<string | undefined>(invoiceToEdit?.id);
  const [serialNumber, setSerialNumber] = useState<string>(
    invoiceToEdit?.serialNumber || `PUR-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [date, setDate] = useState<string>(invoiceToEdit?.date || getCurrentJalaliDate());
  const [vendorName, setVendorName] = useState<string>(invoiceToEdit?.vendorName || '');
  const [notes, setNotes] = useState<string>(invoiceToEdit?.notes || '');
  const [paid, setPaid] = useState<boolean>(invoiceToEdit?.paid ?? true);
  const [activeItemSuggestIndex, setActiveItemSuggestIndex] = useState<number | null>(null);

  // Vendor autocomplete state (Requirement ب)
  const [showVendorSuggestions, setShowVendorSuggestions] = useState<boolean>(false);
  const vendorDropdownRef = useRef<HTMLDivElement>(null);

  // Success modal state (Requirement د)
  const [savedPurchaseModal, setSavedPurchaseModal] = useState<PurchaseInvoice | null>(null);

  const [items, setItems] = useState<PurchaseInvoiceItem[]>(
    invoiceToEdit?.items || [
      {
        id: `prow-1`,
        rowNum: 1,
        itemName: '',
        unit: settings.units[0] || 'عدد',
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0,
        discount: 0,
        paidAmount: 0,
        description: '',
      },
    ]
  );

  const [saving, setSaving] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [errorModal, setErrorModal] = useState<{ title: string; message: string; fieldId?: string } | null>(null);

  useEffect(() => {
    if (invoiceToEdit) {
      setCurrentInvoiceId(invoiceToEdit.id);
      setSerialNumber(invoiceToEdit.serialNumber);
      setDate(invoiceToEdit.date);
      setVendorName(invoiceToEdit.vendorName);
      setNotes(invoiceToEdit.notes || '');
      setPaid(invoiceToEdit.paid);
      setItems(invoiceToEdit.items);
    }
  }, [invoiceToEdit]);

  // Click outside to close vendor autocomplete
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (vendorDropdownRef.current && !vendorDropdownRef.current.contains(e.target as Node)) {
        setShowVendorSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Normalized vendors list for autocomplete
  const normalizedVendors = useMemo(() => {
    const list: { id: string; name: string; phone?: string; category?: string }[] = [];
    const seenNames = new Set<string>();

    existingVendors.forEach((v, idx) => {
      const vName = typeof v === 'string' ? v.trim() : (v.name || '').trim();
      const norm = normalizePersianText(vName);
      if (vName && !seenNames.has(norm)) {
        seenNames.add(norm);
        if (typeof v === 'string') {
          list.push({ id: `vnd-${idx}`, name: vName });
        } else {
          list.push({
            id: v.id || `vnd-${idx}`,
            name: vName,
            phone: v.phone || '',
            category: v.category || ''
          });
        }
      }
    });

    return list;
  }, [existingVendors]);

  // Filtered vendor suggestions based on typed input
  const filteredVendorSuggestions = useMemo(() => {
    const q = normalizePersianText(vendorName.trim());
    if (!q) return normalizedVendors.slice(0, 8);
    return normalizedVendors.filter((v) => normalizePersianText(v.name).includes(q));
  }, [normalizedVendors, vendorName]);

  const isExactExistingVendor = useMemo(() => {
    const norm = normalizePersianText(vendorName.trim());
    if (!norm) return true;
    return normalizedVendors.some((v) => normalizePersianText(v.name) === norm);
  }, [normalizedVendors, vendorName]);

  const recalculateRow = (row: PurchaseInvoiceItem): PurchaseInvoiceItem => {
    const qty = Math.max(0, row.quantity || 0);
    const unitP = Math.max(0, row.unitPrice || 0);
    const total = qty * unitP;
    const disc = Math.min(total, Math.max(0, row.discount || 0));
    const paidAmt = Math.max(0, total - disc);

    return {
      ...row,
      quantity: qty,
      unitPrice: unitP,
      totalPrice: total,
      discount: disc,
      paidAmount: paidAmt,
    };
  };

  const handleItemChange = (index: number, field: keyof PurchaseInvoiceItem, value: any) => {
    const newItems = [...items];
    let row = { ...newItems[index] };
    if (field === 'itemName') {
      row.itemName = value;
      // Disconnect itemId if user changed or typed a custom item name
      row.itemId = undefined;
      // Auto-detect category on typing if not explicitly set
      if (!row.categoryId) {
        const detected = detectPurchaseCategory(value, categories);
        if (detected) {
          row.categoryId = detected.id;
          row.categoryName = detected.name;
        }
      }
    } else {
      (row as any)[field] = value;
    }
    newItems[index] = recalculateRow(row);
    setItems(newItems);
  };

  // When user selects a suggestion from the item autocomplete
  const handleSelectCatalogItem = (index: number, selected: Item) => {
    const newItems = [...items];
    let row = { ...newItems[index] };
    row.itemId = selected.id;
    row.itemName = selected.name;
    row.unit = selected.unit || row.unit;
    row.unitPrice = selected.basePrice || 0;
    row.categoryId = selected.categoryId;
    row.categoryName = selected.categoryName;

    newItems[index] = recalculateRow(row);
    setItems(newItems);
    setActiveItemSuggestIndex(null);
  };

  const handleAddRow = () => {
    const nextRowNumber = items.length + 1;
    const newRow = recalculateRow({
      id: `prow-${Date.now()}-${nextRowNumber}`,
      rowNum: nextRowNumber,
      itemName: '',
      unit: settings.units[0] || 'عدد',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
      discount: 0,
      paidAmount: 0,
      description: '',
    });
    setItems([...items, newRow]);
  };

  const handleRemoveRow = (index: number) => {
    if (items.length <= 1) {
      setFormError('فاکتور خرید باید حداقل شامل یک ردیف باشد.');
      setErrorModal({
        title: 'حداقل تعداد ردیف',
        message: 'فاکتور خرید باید حداقل شامل یک ردیف کالا یا هزینه باشد.'
      });
      return;
    }
    const updated = items.filter((_, i) => i !== index).map((row, i) => ({ ...row, rowNum: i + 1 }));
    setItems(updated);
  };

  // Totals
  const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const totalDiscount = items.reduce((sum, item) => sum + item.discount, 0);
  const totalPaid = items.reduce((sum, item) => sum + item.paidAmount, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!vendorName.trim()) {
      const msg = 'لطفاً نام فروشنده یا تأمین‌کننده را وارد کنید.';
      setFormError(msg);
      setErrorModal({
        title: 'نام فروشنده وارد نشده است',
        message: msg,
        fieldId: 'vendorNameInput'
      });
      return;
    }
    const filledItems = items.filter((it) => it.itemName && it.itemName.trim().length > 0);
    if (filledItems.length === 0) {
      const msg = 'لطفاً حداقل یک ردیف کالا یا هزینه به فاکتور خرید اضافه کنید.';
      setFormError(msg);
      setErrorModal({
        title: 'جدول اقلام خالی است',
        message: msg
      });
      return;
    }

    setSaving(true);
    try {
      // Process items: auto-save newly typed items into purchase items database (Requirement 5)
      const processedItems = [...filledItems];
      for (let i = 0; i < processedItems.length; i++) {
        const row = processedItems[i];
        if (!row.itemId && row.itemName.trim()) {
          const trimmed = row.itemName.trim();
          const existing = existingItems.find(
            (ex) => normalizePersianText(ex.name) === normalizePersianText(trimmed)
          );
          if (existing) {
            row.itemId = existing.id;
            row.categoryId = existing.categoryId;
            row.categoryName = existing.categoryName;
          } else {
            const detected = detectPurchaseCategory(trimmed, categories);
            const catId = row.categoryId || detected?.id || (categories.length > 0 ? categories[0].id : '');
            const catName = row.categoryName || detected?.name || (categories.find((c) => c.id === catId)?.name) || 'سایر هزینه‌ها';
            try {
              let savedItem: Item | null = null;
              if (onAutoCreatePurchaseItem) {
                savedItem = await onAutoCreatePurchaseItem({
                  name: trimmed,
                  categoryId: catId,
                  categoryName: catName,
                  unit: row.unit || 'عدد',
                  basePrice: Number(row.unitPrice) || 0,
                  type: 'PURCHASE',
                });
              } else {
                savedItem = await savePurchaseItem({
                  name: trimmed,
                  categoryId: catId,
                  categoryName: catName,
                  unit: row.unit || 'عدد',
                  basePrice: Number(row.unitPrice) || 0,
                  type: 'PURCHASE',
                });
              }
              if (savedItem?.id) {
                row.itemId = savedItem.id;
                row.categoryId = catId;
                row.categoryName = catName;
              }
            } catch (err) {
              console.warn('Could not auto-create purchase item:', err);
            }
          }
        }
      }

      const saved = await onSaveInvoice({
        id: currentInvoiceId || invoiceToEdit?.id,
        serialNumber: serialNumber.trim() || `PUR-${Math.floor(1000 + Math.random() * 9000)}`,
        date: date || getCurrentJalaliDate(),
        vendorName: vendorName.trim(),
        notes: notes.trim(),
        items: processedItems,
        totalAmount,
        totalDiscount,
        totalPaid,
        paid,
      });

      setCurrentInvoiceId(saved.id);
      setSerialNumber(saved.serialNumber);
      setFormSuccess(invoiceToEdit ? 'فاکتور خرید با موفقیت بروزرسانی شد.' : 'فاکتور خرید با موفقیت در سیستم ثبت گردید.');
      setSavedPurchaseModal(saved);
    } catch (err) {
      console.error(err);
      const msg = 'خطا در ثبت فاکتور خرید. لطفاً مجدداً بررسی فرمایید.';
      setFormError(msg);
      setErrorModal({
        title: 'خطا در ذخیره‌سازی',
        message: msg
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResetForNewPurchaseInvoice = () => {
    setSavedPurchaseModal(null);
    setCurrentInvoiceId(undefined);
    if (onCancelEdit) onCancelEdit();
    setSerialNumber(`PUR-${Math.floor(1000 + Math.random() * 9000)}`);
    setDate(getCurrentJalaliDate());
    setVendorName('');
    setNotes('');
    setPaid(true);
    setFormSuccess(null);
    setFormError(null);
    setItems([
      {
        id: `prow-${Date.now()}-1`,
        rowNum: 1,
        itemName: '',
        unit: settings.units[0] || 'عدد',
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0,
        discount: 0,
        paidAmount: 0,
        description: '',
      },
    ]);
  };

  return (
    <div className="max-w-6xl mx-auto py-6 px-3 sm:px-6">
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {formError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl flex items-center gap-2">
            <span>⚠️</span>
            <span>{formError}</span>
          </div>
        )}
        {formSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{formSuccess}</span>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden">
          
          {/* Header */}
          <div className="bg-emerald-900 text-white p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {settings.lodgeLogo ? (
                <img src={settings.lodgeLogo} alt="Logo" className="w-12 h-12 rounded-xl object-cover bg-white p-1" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold">
                  <Building2 className="w-6 h-6" />
                </div>
              )}
              <div>
                <h2 className="text-base font-bold text-white">
                  {settings.lodgeName || 'اقامتگاه بوم‌گردی'}
                </h2>
                <p className="text-xs text-emerald-200 font-medium">فاکتور خرید کالا و هزینه‌ها</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="bg-emerald-850 bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-800 flex items-center gap-2">
                <span className="text-emerald-300">شماره ردیف خرید:</span>
                <input
                  type="text"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  className="bg-emerald-950 text-amber-300 font-mono font-bold px-2 py-0.5 rounded-md border border-emerald-700 w-28 text-center outline-hidden"
                />
              </div>

              <div className="bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-800 flex items-center gap-2">
                <span className="text-emerald-300 text-xs font-bold shrink-0">تاریخ فاکتور:</span>
                <div className="w-56 sm:w-60 min-w-[210px]">
                  <PersianDatePicker
                    value={date}
                    onChange={(newD) => setDate(newD)}
                    placeholder="تاریخ فاکتور"
                    inputClassName="bg-emerald-950 text-emerald-100 border-emerald-700 font-bold py-1.5 px-2.5 text-xs"
                    iconColor="text-emerald-400"
                    align="left"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Vendor Details & Autocomplete (Requirement ب) */}
          <div className="p-5 bg-emerald-50/40 border-b border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div ref={vendorDropdownRef} className="relative">
              <label htmlFor="vendorNameInput" className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Store className="w-3.5 h-3.5 text-emerald-700" />
                  نام فروشنده / تامین‌کننده <span className="text-rose-500">*</span>
                </span>
                {normalizedVendors.length > 0 && (
                  <span className="text-[10px] text-emerald-700 font-normal">
                    (امکان انتخاب از {normalizedVendors.length} فروشنده قبلی یا تایپ نام جدید)
                  </span>
                )}
              </label>

              <div className="relative">
                <input
                  id="vendorNameInput"
                  type="text"
                  value={vendorName}
                  onFocus={() => setShowVendorSuggestions(true)}
                  onChange={(e) => {
                    setVendorName(e.target.value);
                    setShowVendorSuggestions(true);
                    if (formError && e.target.value.trim()) setFormError(null);
                  }}
                  placeholder="نام فروشگاه، تأمین‌کننده یا سازمان (مثلاً: هایپرمارکت باران / اداره برق)..."
                  className={`w-full px-3 py-2 bg-white border rounded-xl text-xs outline-hidden transition-all pl-8 ${
                    formError && !vendorName.trim()
                      ? 'border-rose-400 ring-2 ring-rose-200 bg-rose-50/30'
                      : 'border-slate-300 focus:ring-2 focus:ring-emerald-500'
                  }`}
                  autoComplete="off"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3 pointer-events-none" />
              </div>

              {/* Vendor suggestions dropdown */}
              {showVendorSuggestions && filteredVendorSuggestions.length > 0 && (
                <div className="absolute z-30 mt-1 w-full bg-white border border-emerald-700/20 rounded-2xl shadow-xl max-h-56 overflow-y-auto p-1.5 animate-in fade-in duration-100">
                  <div className="text-[10px] font-bold text-slate-400 px-2.5 py-1 flex items-center justify-between border-b border-slate-100 mb-1">
                    <span>فروشندگان و طرف‌حساب‌های قبلی</span>
                    <span>{filteredVendorSuggestions.length} مورد</span>
                  </div>
                  {filteredVendorSuggestions.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setVendorName(v.name);
                        setShowVendorSuggestions(false);
                        if (formError) setFormError(null);
                      }}
                      className="w-full text-right px-2.5 py-2 hover:bg-emerald-50 rounded-xl text-xs flex items-center justify-between group transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Store className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="font-bold text-slate-800 group-hover:text-emerald-800">{v.name}</span>
                        {v.category && (
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                            {v.category}
                          </span>
                        )}
                      </div>
                      {v.phone && (
                        <span className="text-[10px] font-mono text-slate-400 dir-ltr">
                          {v.phone}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* New Vendor Info Pill */}
              {vendorName.trim() && !isExactExistingVendor && (
                <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200/80 rounded-xl px-2.5 py-1">
                  <span className="text-emerald-600">✨</span>
                  <span>فروشنده جدید: <strong>{vendorName.trim()}</strong> (پس از ثبت، به فهرست فروشندگان اضافه می‌شود)</span>
                </div>
              )}

              {formError && !vendorName.trim() && (
                <span className="text-[11px] font-bold text-rose-600 mt-1 block">
                  ⚠️ نام فروشنده الزامی است
                </span>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                توضیحات فاکتور خرید
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="توضیحات خرید بابت اقامتگاه..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden"
              />
            </div>
          </div>

          {/* Purchase Items Table (All 9 Columns) */}
          <div className="overflow-x-auto min-h-[380px] pb-32">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                <tr>
                  <th className="px-2 py-3 text-center w-10">ردیف</th>
                  <th className="px-3 py-3 min-w-[280px]">نام کالا (با جستجوی خودکار)</th>
                  <th className="px-2 py-3 w-28">واحد اندازه‌گیری</th>
                  <th className="px-2 py-3 w-20 text-center">تعداد/مقدار</th>
                  <th className="px-3 py-3 w-32">قیمت خرید واحد (تومان)</th>
                  <th className="px-3 py-3 w-28">جمع مبلغ</th>
                  <th className="px-3 py-3 w-24">تخفیف</th>
                  <th className="px-3 py-3 w-32 font-black text-emerald-900 bg-emerald-100/50">جمع مبلغ پرداخت شده</th>
                  <th className="px-3 py-3 min-w-[120px]">توضیحات هر ردیف</th>
                  <th className="px-2 py-3 text-center w-10">#</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {items.map((row, idx) => {
                  const filteredItemSuggestions = (row.itemName || '').trim()
                    ? existingItems.filter((it) =>
                        normalizePersianText(it.name).includes(normalizePersianText((row.itemName || '').trim()))
                      )
                    : existingItems.slice(0, 8);

                  return (
                    <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-2 py-2 text-center font-bold text-slate-500 bg-slate-50">
                        {idx + 1}
                      </td>

                      {/* Item Name with Autocomplete */}
                      <td className="px-2 py-2 min-w-[280px]">
                        <div className="space-y-1">
                          <div className="relative">
                            <input
                              type="text"
                              value={row.itemName || ''}
                              onChange={(e) => {
                                handleItemChange(idx, 'itemName', e.target.value);
                                setActiveItemSuggestIndex(idx);
                              }}
                              onFocus={() => setActiveItemSuggestIndex(idx)}
                              onBlur={() => {
                                setTimeout(() => {
                                  setActiveItemSuggestIndex((curr) => (curr === idx ? null : curr));
                                }, 250);
                              }}
                              placeholder="تایپ نام کالا (با جستجوی خودکار در کاتالوگ خرید)..."
                              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-500 outline-hidden bg-white"
                            />

                            {/* Autocomplete Suggestions Dropdown */}
                            {activeItemSuggestIndex === idx && filteredItemSuggestions.length > 0 && (
                              <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-emerald-300 rounded-xl shadow-2xl overflow-hidden max-h-52 overflow-y-auto">
                                <div className="px-3 py-1.5 bg-emerald-50 border-b border-emerald-100 text-[10px] text-emerald-900 font-bold flex items-center justify-between">
                                  <span>کالاهای موجود در کاتالوگ خرید:</span>
                                  <span className="text-slate-400 font-normal">کلیک جهت انتخاب</span>
                                </div>
                                {filteredItemSuggestions.map((catIt) => (
                                  <div
                                    key={catIt.id}
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      handleSelectCatalogItem(idx, catIt);
                                    }}
                                    className="px-3 py-2 hover:bg-emerald-50 cursor-pointer flex items-center justify-between border-b border-slate-50 last:border-0 transition-colors"
                                  >
                                    <div>
                                      <p className="text-xs font-bold text-slate-800">{catIt.name}</p>
                                      <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                        دسته: {catIt.categoryName || 'عمومی'} | واحد: {catIt.unit || 'عدد'}
                                      </span>
                                    </div>
                                    {catIt.basePrice > 0 && (
                                      <span className="text-xs font-mono font-bold text-emerald-900 bg-emerald-100/70 px-2 py-0.5 rounded">
                                        {catIt.basePrice.toLocaleString('fa-IR')} ت
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {row.itemId && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded w-fit">
                              ✓ کاتالوگ خرید: {row.categoryName || 'خرید'}
                            </span>
                          )}

                          {categories.length > 0 && (
                            <div className="flex items-center gap-1.5 mt-1 bg-slate-50 border border-slate-200 rounded-lg p-1.5">
                              <span className="text-[10px] font-bold text-slate-600 whitespace-nowrap">
                                {row.itemId ? 'دسته هزینه:' : 'انتخاب دسته‌بندی کالا یا خدمات:'}
                              </span>
                              <select
                                value={row.categoryId || ''}
                                onChange={(e) => {
                                  const selCat = categories.find((c) => c.id === e.target.value);
                                  handleItemChange(idx, 'categoryId', e.target.value);
                                  handleItemChange(idx, 'categoryName', selCat?.name || '');
                                }}
                                className="w-full text-[11px] font-bold text-emerald-900 bg-white border border-slate-300 rounded px-1.5 py-1 outline-hidden"
                              >
                                <option value="">(انتخاب دسته‌بندی هزینه)</option>
                                {categories.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Unit auto-set based on catalog item or customizable */}
                      <td className="px-1 py-2">
                        <select
                          value={row.unit}
                          onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                          className="w-full px-1.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden bg-white font-medium text-center"
                        >
                          {settings.units.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                          {row.unit && !settings.units.includes(row.unit) && (
                            <option value={row.unit}>{row.unit}</option>
                          )}
                        </select>
                      </td>

                    <td className="px-1 py-2">
                      <input
                        type="number"
                        min="0.01"
                        step="any"
                        value={row.quantity !== undefined ? row.quantity : 1}
                        onChange={(e) => handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-full px-1.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-center focus:ring-2 focus:ring-emerald-500 outline-hidden"
                      />
                    </td>

                    <td className="px-2 py-2">
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        value={row.unitPrice !== undefined ? row.unitPrice : 0}
                        onChange={(e) => handleItemChange(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-500 outline-hidden"
                      />
                    </td>

                    <td className="px-2 py-2 font-bold text-slate-700 bg-slate-50">
                      {formatPersianPrice(row.totalPrice)}
                    </td>

                    <td className="px-2 py-2">
                      <input
                        type="number"
                        min="0"
                        value={row.discount || ''}
                        onChange={(e) => handleItemChange(idx, 'discount', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden text-rose-600 font-semibold"
                      />
                    </td>

                    <td className="px-2 py-2 font-extrabold text-emerald-900 bg-emerald-50">
                      {formatPersianPrice(row.paidAmount)}
                    </td>

                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={row.description}
                        onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                        placeholder="توضیحات..."
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-[11px] focus:ring-2 focus:ring-emerald-500 outline-hidden"
                      />
                    </td>

                    <td className="px-2 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                        title="حذف ردیف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>

              {/* Totals Summary Row */}
              <tfoot className="bg-emerald-100/60 font-bold text-slate-900 border-t-2 border-emerald-300">
                <tr>
                  <td colSpan={5} className="px-4 py-3 text-left font-black">
                    جمع کل مبالغ فاکتور خرید:
                  </td>
                  <td className="px-2 py-3 font-bold text-slate-800">
                    {formatPersianPrice(totalAmount)}
                  </td>
                  <td className="px-2 py-3 font-bold text-rose-600">
                    {formatPersianPrice(totalDiscount)}
                  </td>
                  <td className="px-2 py-3 font-extrabold text-emerald-900 text-sm">
                    {formatPersianPrice(totalPaid)} تومان
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
            <button
              type="button"
              onClick={handleAddRow}
              className="flex items-center gap-1.5 bg-emerald-800 hover:bg-emerald-900 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-emerald-200" />
              <span>افزودن ردیف خرید جدید</span>
            </button>
          </div>

          {/* Bottom Toolbar */}
          <div className="p-4 bg-slate-100 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setPaid(!paid)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                paid
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              {paid ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4 text-amber-600" />}
              <span>{paid ? 'پرداخت شده (تایید پرداخت)' : 'در انتظار پرداخت'}</span>
            </button>

            <div className="flex items-center gap-2">
              {onCancelEdit && (
                <button
                  type="button"
                  onClick={onCancelEdit}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  انصراف
                </button>
              )}

              <button
                type="submit"
                onClick={(e) => handleSubmit(e)}
                disabled={saving}
                className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-6 py-2 rounded-xl text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'در حال ثبت...' : invoiceToEdit ? 'بروزرسانی فاکتور خرید' : 'ثبت فاکتور خرید'}</span>
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Error Popup Modal (Requested Requirement) */}
      {errorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border-2 border-rose-300 text-center animate-in fade-in zoom-in-95">
            <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-200 shadow-xs">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-base font-black text-slate-900 mb-2">{errorModal.title}</h3>
            <p className="text-xs font-semibold text-rose-800 bg-rose-50 border border-rose-200 rounded-2xl p-3.5 mb-5 leading-relaxed">
              {errorModal.message}
            </p>
            <button
              type="button"
              onClick={() => {
                const fid = errorModal.fieldId;
                setErrorModal(null);
                if (fid) {
                  setTimeout(() => {
                    const el = document.getElementById(fid);
                    el?.focus();
                    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }, 100);
                }
              }}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              متوجه شدم و اصلاح می‌کنم
            </button>
          </div>
        </div>
      )}

      {/* Success Confirmation Modal (Requirement د) */}
      {savedPurchaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border-2 border-emerald-400 text-center animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-4 border border-emerald-200 shadow-sm">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <h3 className="text-lg font-black text-slate-900 mb-1">
              ثبت موفقیت‌آمیز فاکتور خرید
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              فاکتور خرید کالا و هزینه‌ها با موفقیت در دیتابیس اقامتگاه ذخیره شد.
            </p>

            {/* Quick Invoice Info Card */}
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 text-xs space-y-2 mb-6 text-right">
              <div className="flex justify-between items-center py-1 border-b border-emerald-100">
                <span className="text-slate-600 font-bold">شماره فاکتور:</span>
                <span className="font-mono font-black text-emerald-950">{savedPurchaseModal.serialNumber}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-emerald-100">
                <span className="text-slate-600 font-bold">نام فروشنده / طرف‌حساب:</span>
                <span className="font-bold text-slate-900">{savedPurchaseModal.vendorName}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-emerald-100">
                <span className="text-slate-600 font-bold">تاریخ فاکتور:</span>
                <span className="font-bold text-slate-800">{savedPurchaseModal.date}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-600 font-bold">مبلغ نهایی پرداخت شده:</span>
                <span className="font-black text-emerald-800 text-sm">
                  {formatPersianPrice(savedPurchaseModal.totalPaid || savedPurchaseModal.totalAmount)} تومان
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5">
              {onNavigateToList && (
                <button
                  type="button"
                  onClick={() => {
                    setSavedPurchaseModal(null);
                    onNavigateToList();
                  }}
                  className="w-full py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>مشاهده در لیست فاکتورهای خرید</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleResetForNewPurchaseInvoice}
                className="w-full py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-amber-800" />
                <span>صدور فاکتور خرید جدید</span>
              </button>

              <button
                type="button"
                onClick={() => setSavedPurchaseModal(null)}
                className="w-full py-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                بستن و ماندن در همین فرم
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
