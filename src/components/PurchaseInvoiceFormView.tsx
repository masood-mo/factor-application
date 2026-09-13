import React, { useState, useEffect } from 'react';
import { LodgeSettings, PurchaseInvoice, PurchaseInvoiceItem, Item } from '../types';
import { getCurrentJalaliDate } from '../utils/persianDate';
import { formatPersianPrice } from '../utils/numberToWords';
import { ShoppingBag, Plus, Trash2, Save, CheckCircle2, Clock, Building2, Store, FileText } from 'lucide-react';

interface PurchaseInvoiceFormViewProps {
  settings: LodgeSettings;
  existingItems?: Item[];
  invoiceToEdit?: PurchaseInvoice | null;
  onSaveInvoice: (invoice: Partial<PurchaseInvoice>) => Promise<PurchaseInvoice>;
  onCancelEdit?: () => void;
}

export const PurchaseInvoiceFormView: React.FC<PurchaseInvoiceFormViewProps> = ({
  settings,
  existingItems = [],
  invoiceToEdit,
  onSaveInvoice,
  onCancelEdit,
}) => {
  const [serialNumber, setSerialNumber] = useState<string>(
    invoiceToEdit?.serialNumber || `PUR-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [date, setDate] = useState<string>(invoiceToEdit?.date || getCurrentJalaliDate());
  const [vendorName, setVendorName] = useState<string>(invoiceToEdit?.vendorName || '');
  const [notes, setNotes] = useState<string>(invoiceToEdit?.notes || '');
  const [paid, setPaid] = useState<boolean>(invoiceToEdit?.paid ?? true);

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

  useEffect(() => {
    if (invoiceToEdit) {
      setSerialNumber(invoiceToEdit.serialNumber);
      setDate(invoiceToEdit.date);
      setVendorName(invoiceToEdit.vendorName);
      setNotes(invoiceToEdit.notes || '');
      setPaid(invoiceToEdit.paid);
      setItems(invoiceToEdit.items);
    }
  }, [invoiceToEdit]);

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
    (row as any)[field] = value;
    newItems[index] = recalculateRow(row);
    setItems(newItems);
  };

  // When user selects a predefined item from the catalog list
  const handleSelectCatalogItem = (index: number, itemId: string) => {
    const selected = existingItems.find((it) => it.id === itemId);
    if (!selected) return;

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
      alert('فاکتور خرید باید حداقل شامل یک ردیف باشد.');
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
    if (!vendorName.trim()) {
      alert('لطفاً نام فروشنده یا تأمین‌کننده را وارد کنید.');
      return;
    }
    if (items.some((it) => !it.itemName.trim())) {
      alert('لطفاً نام تمام اقلام فاکتور خرید را وارد کنید.');
      return;
    }

    setSaving(true);
    try {
      await onSaveInvoice({
        id: invoiceToEdit?.id,
        serialNumber,
        date,
        vendorName,
        notes,
        items,
        totalAmount,
        totalDiscount,
        totalPaid,
        paid,
      });

      alert(invoiceToEdit ? 'فاکتور خرید با موفقیت بروزرسانی شد.' : 'فاکتور خرید با موفقیت ثبت شد.');
    } catch (err) {
      console.error(err);
      alert('خطا در ثبت فاکتور خرید');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-6 px-3 sm:px-6">
      <form onSubmit={handleSubmit} className="space-y-6">
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
                  required
                  className="bg-emerald-950 text-amber-300 font-mono font-bold px-2 py-0.5 rounded-md border border-emerald-700 w-28 text-center outline-hidden"
                />
              </div>

              <div className="bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-800 flex items-center gap-2">
                <span className="text-emerald-300">تاریخ فاکتور:</span>
                <input
                  type="text"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  placeholder="۱۴۰۳/۰۱/۰۱"
                  className="bg-emerald-950 text-emerald-100 font-bold px-2 py-0.5 rounded-md border border-emerald-700 w-28 text-center outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Vendor Details */}
          <div className="p-5 bg-emerald-50/40 border-b border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Store className="w-3.5 h-3.5 text-emerald-700" />
                نام فروشنده / تامین‌کننده <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                required
                placeholder="مثال: فروشگاه مواد غذایی نمونه / صنایع دستی اصفهان"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden"
              />
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
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                <tr>
                  <th className="px-2 py-3 text-center w-10">ردیف</th>
                  <th className="px-3 py-3 min-w-[220px]">نام کالا / انتخاب از فهرست کالاها</th>
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
                {items.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-2 py-2 text-center font-bold text-slate-500 bg-slate-50">
                      {idx + 1}
                    </td>

                    {/* Item Name / Catalog Select */}
                    <td className="px-2 py-2">
                      <div className="space-y-1">
                        {existingItems.length > 0 && (
                          <select
                            onChange={(e) => handleSelectCatalogItem(idx, e.target.value)}
                            value={row.itemId || ''}
                            className="w-full p-1 bg-emerald-50/70 border border-emerald-200 rounded-lg text-[11px] font-semibold text-emerald-950 focus:ring-1 focus:ring-emerald-700 outline-hidden"
                          >
                            <option value="">-- انتخاب از لیست کالاهای تعریف شده --</option>
                            {existingItems.map((catIt) => (
                              <option key={catIt.id} value={catIt.id}>
                                {catIt.name} ({catIt.categoryName}) - واحد: {catIt.unit}
                              </option>
                            ))}
                          </select>
                        )}
                        <input
                          type="text"
                          value={row.itemName}
                          onChange={(e) => handleItemChange(idx, 'itemName', e.target.value)}
                          placeholder="نام کالای خریداری شده..."
                          required
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-500 outline-hidden"
                        />
                      </div>
                    </td>

                    {/* Unit auto-set based on catalog item or customizable */}
                    <td className="px-1 py-2">
                      <select
                        value={row.unit}
                        onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                        className="w-full px-1.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden bg-white font-medium"
                      >
                        {settings.units.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="px-1 py-2">
                      <input
                        type="number"
                        min="0.1"
                        step="any"
                        value={row.quantity || ''}
                        onChange={(e) => handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                        required
                        className="w-full px-1.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-center focus:ring-2 focus:ring-emerald-500 outline-hidden"
                      />
                    </td>

                    <td className="px-2 py-2">
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        value={row.unitPrice || ''}
                        onChange={(e) => handleItemChange(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                        required
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
                ))}
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
    </div>
  );
};
