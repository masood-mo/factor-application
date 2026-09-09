import React, { useState, useEffect } from 'react';
import {
  LodgeSettings,
  Item,
  SalesInvoice,
  SalesInvoiceItem,
  InvoicePayment,
  Guest
} from '../types';
import { getCurrentJalaliDate } from '../utils/persianDate';
import { numberToWordsPersian, formatPersianPrice } from '../utils/numberToWords';
import { VoiceInvoiceModal } from './VoiceInvoiceModal';
import {
  FileText,
  Plus,
  Trash2,
  Save,
  Printer,
  CheckCircle2,
  Clock,
  Building2,
  User,
  Phone,
  Mic,
  CreditCard,
  AlertCircle,
  Users,
  ChevronDown,
  Layers,
  Send,
  MessageSquare,
  Sparkles,
  ArrowRight,
  RefreshCw,
  X,
  Share2
} from 'lucide-react';

interface SalesInvoiceFormViewProps {
  settings: LodgeSettings;
  existingItems: Item[];
  existingGuests?: Guest[];
  invoiceToEdit?: SalesInvoice | null;
  onSaveInvoice: (invoice: Partial<SalesInvoice>) => Promise<SalesInvoice>;
  onAutoCreateItem?: (item: Partial<Item>) => Promise<Item>;
  onPrintInvoice?: (invoice: SalesInvoice) => void;
  onCancelEdit?: () => void;
  onNavigateToList?: () => void;
}

export const SalesInvoiceFormView: React.FC<SalesInvoiceFormViewProps> = ({
  settings,
  existingItems,
  existingGuests = [],
  invoiceToEdit,
  onSaveInvoice,
  onAutoCreateItem,
  onPrintInvoice,
  onCancelEdit,
  onNavigateToList,
}) => {
  const customerTitle = settings.customerTitle || 'مهمان';

  const [serialNumber, setSerialNumber] = useState<string>(
    invoiceToEdit?.serialNumber || `INV-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [date, setDate] = useState<string>(invoiceToEdit?.date || getCurrentJalaliDate());
  const [status, setStatus] = useState<'FINAL' | 'PROFORMA'>(invoiceToEdit?.status || invoiceToEdit?.invoiceKind || 'FINAL');
  const [guestId, setGuestId] = useState<string | undefined>(invoiceToEdit?.guestId);
  const [guestName, setGuestName] = useState<string>(invoiceToEdit?.guestName || '');
  const [guestPhone, setGuestPhone] = useState<string>(invoiceToEdit?.guestPhone || '');
  const [guestNationalCode, setGuestNationalCode] = useState<string>(invoiceToEdit?.guestNationalCode || '');
  const [guestJob, setGuestJob] = useState<string>(invoiceToEdit?.guestJob || '');
  const [notes, setNotes] = useState<string>(invoiceToEdit?.notes || '');
  const [paid, setPaid] = useState<boolean>(invoiceToEdit?.paid ?? false);

  // Multi-stage payments
  const [payments, setPayments] = useState<InvoicePayment[]>(
    invoiceToEdit?.payments || []
  );

  // Voice Modal State
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  // Success Confirmation Modal State
  const [savedInvoiceModal, setSavedInvoiceModal] = useState<SalesInvoice | null>(null);

  // Share Dialog State
  const [shareDialog, setShareDialog] = useState<{
    isOpen: boolean;
    type: 'whatsapp' | 'telegram';
    phone: string;
    text: string;
  }>({
    isOpen: false,
    type: 'whatsapp',
    phone: '',
    text: ''
  });

  // Line items state
  const [items, setItems] = useState<SalesInvoiceItem[]>(
    invoiceToEdit?.items && invoiceToEdit.items.length > 0
      ? invoiceToEdit.items
      : [
          {
            id: `row-1`,
            rowNum: 1,
            itemName: '',
            unit: settings.units[0] || 'عدد',
            quantity: 1,
            basePrice: 0,
            totalPrice: 0,
            discountPercent: 0,
            discountAmount: 0,
            taxAmount: 0,
            payableAmount: 0,
            description: '',
          },
        ]
  );

  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (invoiceToEdit) {
      setSerialNumber(invoiceToEdit.serialNumber);
      setDate(invoiceToEdit.date);
      setStatus(invoiceToEdit.status || invoiceToEdit.invoiceKind || 'FINAL');
      setGuestId(invoiceToEdit.guestId);
      setGuestName(invoiceToEdit.guestName);
      setGuestPhone(invoiceToEdit.guestPhone || '');
      setGuestNationalCode(invoiceToEdit.guestNationalCode || '');
      setGuestJob(invoiceToEdit.guestJob || '');
      setNotes(invoiceToEdit.notes || '');
      setPaid(invoiceToEdit.paid);
      setItems(invoiceToEdit.items || []);
      setPayments(invoiceToEdit.payments || []);
    }
  }, [invoiceToEdit]);

  // Recalculate line totals
  const recalculateRow = (row: SalesInvoiceItem, updatedTaxRate: number = settings.taxRate): SalesInvoiceItem => {
    const qty = Math.max(0, Number(row.quantity) || 0);
    const base = Math.max(0, Number(row.basePrice) || 0);
    const lineTotal = qty * base;

    let discPct = Math.min(100, Math.max(0, Number(row.discountPercent) || 0));
    let discAmt = Math.max(0, Number(row.discountAmount) || 0);

    if (discPct > 0) {
      discAmt = Math.round((lineTotal * discPct) / 100);
    } else if (discAmt > 0) {
      if (lineTotal > 0) {
        discPct = Math.min(100, Math.round((discAmt / lineTotal) * 100));
      }
    }

    if (discAmt > lineTotal) {
      discAmt = lineTotal;
      discPct = 100;
    }

    const taxableTotal = Math.max(0, lineTotal - discAmt);
    const tax = Math.round((taxableTotal * updatedTaxRate) / 100);
    const payable = taxableTotal + tax;

    return {
      ...row,
      quantity: qty,
      basePrice: base,
      totalPrice: lineTotal,
      discountPercent: discPct,
      discountAmount: discAmt,
      taxAmount: tax,
      payableAmount: payable,
    };
  };

  // Update a field in a line item
  const handleItemChange = (
    index: number,
    field: keyof SalesInvoiceItem,
    value: any
  ) => {
    const newItems = [...items];
    let row = { ...newItems[index] };

    if (field === 'discountPercent') {
      let pct = parseFloat(value) || 0;
      if (pct > 100) pct = 100;
      if (pct < 0) pct = 0;
      row.discountPercent = pct;
      row.discountAmount = 0;
    } else if (field === 'discountAmount') {
      let amt = parseFloat(value) || 0;
      if (amt < 0) amt = 0;
      row.discountAmount = amt;
      row.discountPercent = 0;
    } else {
      (row as any)[field] = value;
    }

    newItems[index] = recalculateRow(row);
    setItems(newItems);
  };

  // When user selects a predefined item from the dropdown list
  const handleSelectCatalogItem = (index: number, itemId: string) => {
    const selected = existingItems.find((it) => it.id === itemId);
    if (!selected) return;

    const newItems = [...items];
    let row = { ...newItems[index] };
    row.itemId = selected.id;
    row.itemName = selected.name;
    row.unit = selected.unit || row.unit;
    row.basePrice = selected.basePrice || 0;

    newItems[index] = recalculateRow(row);
    setItems(newItems);
  };

  // When guest is chosen from guest list
  const handleSelectExistingGuest = (selectedId: string) => {
    if (!selectedId) {
      setGuestId(undefined);
      return;
    }
    const guest = existingGuests.find((g) => g.id === selectedId);
    if (guest) {
      setGuestId(guest.id);
      setGuestName(guest.name);
      if (guest.phone) setGuestPhone(guest.phone);
      if (guest.nationalCode) setGuestNationalCode(guest.nationalCode);
      if (guest.job) setGuestJob(guest.job);
    }
  };

  // Add new row
  const handleAddRow = () => {
    const nextRowNumber = items.length + 1;
    const newRow: SalesInvoiceItem = recalculateRow({
      id: `row-${Date.now()}-${nextRowNumber}`,
      rowNum: nextRowNumber,
      itemName: '',
      unit: settings.units[0] || 'عدد',
      quantity: 1,
      basePrice: 0,
      totalPrice: 0,
      discountPercent: 0,
      discountAmount: 0,
      taxAmount: 0,
      payableAmount: 0,
      description: '',
    });
    setItems([...items, newRow]);
  };

  // Remove row
  const handleRemoveRow = (index: number) => {
    if (items.length <= 1) {
      alert('فاکتور باید حداقل یک ردیف کالا داشته باشد.');
      return;
    }
    const updated = items.filter((_, i) => i !== index).map((row, i) => ({ ...row, rowNum: i + 1 }));
    setItems(updated);
  };

  // --- Multi-stage Payment Handlers ---
  const handleAddPaymentStage = () => {
    const newPayment: InvoicePayment = {
      id: `pay-${Date.now()}`,
      date: getCurrentJalaliDate(),
      amount: remainingBalance > 0 ? remainingBalance : 0,
      method: 'POS',
      referenceNumber: '',
      description: 'مرحله پرداخت',
      createdAt: new Date().toISOString()
    };
    setPayments([...payments, newPayment]);
  };

  const handleUpdatePayment = (index: number, field: keyof InvoicePayment, value: any) => {
    const updated = [...payments];
    (updated[index] as any)[field] = field === 'amount' ? (parseFloat(value) || 0) : value;
    setPayments(updated);
  };

  const handleRemovePayment = (index: number) => {
    setPayments(payments.filter((_, i) => i !== index));
  };

  // Compute Invoice Totals
  const totalItemsAmount = items.reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0);
  const totalDiscountAmount = items.reduce((sum, item) => sum + (Number(item.discountAmount) || 0), 0);
  const totalTaxAmount = items.reduce((sum, item) => sum + (Number(item.taxAmount) || 0), 0);
  const totalPayable = items.reduce((sum, item) => sum + (Number(item.payableAmount) || 0), 0);
  const totalPayableInWords = numberToWordsPersian(totalPayable);

  const totalPaidAmount = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const remainingBalance = Math.max(0, totalPayable - totalPaidAmount);
  const isFullySettled = totalPayable > 0 && totalPaidAmount >= totalPayable;

  // Handle Voice Parsed Invoice
  const handleVoiceInvoiceApplied = (parsedData: any) => {
    const incomingName = parsedData.guestName || parsedData.customerOrVendorName || parsedData.customerName;
    if (incomingName && incomingName.trim()) setGuestName(incomingName.trim());
    if (parsedData.phone || parsedData.guestPhone) setGuestPhone(parsedData.phone || parsedData.guestPhone);
    if (parsedData.date) setDate(parsedData.date);
    if (parsedData.notes) setNotes(parsedData.notes);

    const incomingItems = parsedData.items || [];
    if (Array.isArray(incomingItems) && incomingItems.length > 0) {
      const parsedRows: SalesInvoiceItem[] = incomingItems.map((it: any, idx: number) => {
        const rawName = (it.itemName || it.name || '').trim();
        
        // Find matching catalog item if any
        const match = existingItems.find((catIt) => {
          if (!rawName) return false;
          return catIt.name.toLowerCase().includes(rawName.toLowerCase()) || rawName.toLowerCase().includes(catIt.name.toLowerCase());
        });

        const base = Number(it.unitPrice) || Number(it.basePrice) || (match ? match.basePrice : 0);
        const unit = it.unit || (match ? match.unit : settings.units[0] || 'عدد');
        const qty = Number(it.quantity) || 1;

        return recalculateRow({
          id: `voice-row-${Date.now()}-${idx + 1}`,
          rowNum: idx + 1,
          itemName: match ? match.name : rawName || `سفارش ${idx + 1}`,
          unit,
          quantity: qty,
          basePrice: base,
          totalPrice: qty * base,
          discountPercent: Number(it.discountPercent) || 0,
          discountAmount: 0,
          taxAmount: 0,
          payableAmount: 0,
          description: it.description || ''
        });
      });

      setItems(parsedRows);
    }
  };

  // Generate WhatsApp / Telegram sharing text
  const generateShareMessage = (customInv?: SalesInvoice) => {
    const inv = customInv || {
      serialNumber,
      date,
      guestName,
      items,
      totalItemsAmount,
      totalDiscountAmount,
      totalTaxAmount,
      totalPayable,
      totalPayableInWords
    };

    const rawIntro =
      settings.whatsappShareTemplate ||
      settings.whatsappTemplate ||
      'دوست گرامی با احترام، صورتحساب شما به پیوست تقدیم می‌گردد:';

    let intro = rawIntro
      .replace(/{مهمان}/g, inv.guestName || customerTitle)
      .replace(/{مشتری}/g, inv.guestName || customerTitle)
      .replace(/{خریدار}/g, inv.guestName || customerTitle)
      .replace(/{طرف_حساب}/g, inv.guestName || customerTitle)
      .replace(/{شماره_فاکتور}/g, inv.serialNumber)
      .replace(/{مبلغ}/g, formatPersianPrice(inv.totalPayable))
      .replace(/{اقامتگاه}/g, settings.lodgeName || 'اقامتگاه بوم‌گردی خانه برزک');

    const itemsSummary = (inv.items || [])
      .map((item, idx) => {
        return `▫️ ${idx + 1}. ${item.itemName} (${item.quantity} ${item.unit}) : ${formatPersianPrice(item.payableAmount || item.totalPrice)} تومان`;
      })
      .join('\n');

    let msg = `🌿 *${settings.lodgeName || 'اقامتگاه بوم‌گردی خانه برزک'}*\n\n`;
    msg += `${intro}\n\n`;
    msg += `📄 *شماره سند:* ${inv.serialNumber}\n`;
    msg += `📅 *تاریخ:* ${inv.date}\n`;
    msg += `👤 *نام ${customerTitle}:* ${inv.guestName || 'ثبت نشده'}\n\n`;
    if (itemsSummary) {
      msg += `📋 *ریز اقلام و خدمات:*\n${itemsSummary}\n\n`;
    }
    msg += `💰 *جمع اقلام:* ${formatPersianPrice(inv.totalItemsAmount)} تومان\n`;

    if (inv.totalDiscountAmount > 0) {
      msg += `🏷 *تخفیف:* ${formatPersianPrice(inv.totalDiscountAmount)} تومان\n`;
    }
    if (inv.totalTaxAmount > 0) {
      msg += `🏛 *مالیات ارزش افزوده:* ${formatPersianPrice(inv.totalTaxAmount)} تومان\n`;
    }

    msg += `⭐️ *مبلغ نهایی قابل پرداخت:* ${formatPersianPrice(inv.totalPayable)} تومان\n`;
    if (inv.totalPayableInWords) {
      msg += `(به حروف: ${inv.totalPayableInWords} تومان)\n\n`;
    }

    if (settings.cardNumber || settings.shaba || settings.accountOwner) {
      msg += `💳 *اطلاعات حساب جهت واریز:*\n`;
      if (settings.accountOwner) msg += `صاحب حساب: ${settings.accountOwner}\n`;
      if (settings.cardNumber) msg += `شماره کارت: ${settings.cardNumber}\n`;
      if (settings.shaba) msg += `شماره شبا: ${settings.shaba}\n`;
      msg += `\n`;
    }

    msg += `با سپاس از همراهی شما ✨`;
    return msg;
  };

  const handleOpenShare = (type: 'whatsapp' | 'telegram', customInv?: SalesInvoice) => {
    const text = generateShareMessage(customInv);
    const phone = (customInv ? customInv.guestPhone : guestPhone) || '';
    setShareDialog({
      isOpen: true,
      type,
      phone,
      text
    });
  };

  const executeSendShare = () => {
    const text = encodeURIComponent(shareDialog.text);
    const cleanedPhone = shareDialog.phone ? shareDialog.phone.replace(/\D/g, '').replace(/^0/, '98') : '';

    if (shareDialog.type === 'whatsapp') {
      const url = cleanedPhone
        ? `https://wa.me/${cleanedPhone}?text=${text}`
        : `https://api.whatsapp.com/send?text=${text}`;
      window.open(url, '_blank');
    } else {
      const url = `https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=${text}`;
      window.open(url, '_blank');
    }
    setShareDialog((prev) => ({ ...prev, isOpen: false }));
  };

  // Submit Handler
  const handleSubmitInvoice = async (e: React.FormEvent, shouldPrintAfter: boolean = false) => {
    e.preventDefault();
    if (!guestName.trim()) {
      alert(`لطفاً نام ${customerTitle} را وارد کنید.`);
      return;
    }
    if (items.some((it) => !it.itemName.trim())) {
      alert('لطفاً نام تمامی اقلام فاکتور را از لیست کاتالوگ یا به صورت دستی بنویسید.');
      return;
    }

    setSaving(true);
    try {
      const saved = await onSaveInvoice({
        id: invoiceToEdit?.id,
        serialNumber,
        date,
        status,
        invoiceKind: status,
        guestId,
        guestName: guestName.trim(),
        guestPhone: guestPhone.trim(),
        guestNationalCode: guestNationalCode.trim(),
        guestJob: guestJob.trim(),
        notes,
        items,
        totalItemsAmount,
        totalDiscountAmount,
        totalTaxAmount,
        totalPayable,
        totalPayableInWords,
        payments,
        totalPaidAmount,
        remainingBalance,
        paid: isFullySettled || paid,
      });

      if (shouldPrintAfter && onPrintInvoice) {
        onPrintInvoice(saved);
      } else {
        // Show rich success modal with WhatsApp/Telegram and Print actions
        setSavedInvoiceModal(saved);
      }
    } catch (err) {
      console.error('Error saving invoice:', err);
      alert('خطا در ثبت فاکتور. لطفاً دوباره تلاش کنید.');
    } finally {
      setSaving(false);
    }
  };

  // Reset form for a brand new invoice
  const handleResetForNewInvoice = () => {
    setSavedInvoiceModal(null);
    setSerialNumber(`INV-${Math.floor(1000 + Math.random() * 9000)}`);
    setDate(getCurrentJalaliDate());
    setStatus('FINAL');
    setGuestId(undefined);
    setGuestName('');
    setGuestPhone('');
    setGuestNationalCode('');
    setGuestJob('');
    setNotes('');
    setPaid(false);
    setPayments([]);
    setItems([
      {
        id: `row-1`,
        rowNum: 1,
        itemName: '',
        unit: settings.units[0] || 'عدد',
        quantity: 1,
        basePrice: 0,
        totalPrice: 0,
        discountPercent: 0,
        discountAmount: 0,
        taxAmount: 0,
        payableAmount: 0,
        description: '',
      },
    ]);
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-3 sm:px-6">
      <form onSubmit={(e) => handleSubmitInvoice(e, false)} className="space-y-6">
        
        {/* Main Invoice Card */}
        <div className="bg-white rounded-3xl border border-amber-900/15 shadow-md overflow-hidden">
          
          {/* Top Header Bar */}
          <div className="bg-slate-900 text-white p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-800 flex items-center justify-center text-amber-200 shadow-inner">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black tracking-tight">
                    {invoiceToEdit
                      ? `ویرایش فاکتور (${invoiceToEdit.serialNumber})`
                      : status === 'PROFORMA'
                      ? `صدور پیش‌فاکتور جدید ${customerTitle}`
                      : `صدور فاکتور فروش جدید`}
                  </h2>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    status === 'PROFORMA'
                      ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                      : 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/40'
                  }`}>
                    {status === 'PROFORMA' ? 'پیش‌فاکتور' : 'فاکتور قطعی'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {settings.lodgeName} • درج اقلام با صدای شما، تسویه چندمرحله‌ای و ارسال فوری در واتساپ و تلگرام
                </p>
              </div>
            </div>

            {/* Header Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Voice Recognition Button */}
              <button
                type="button"
                onClick={() => setIsVoiceModalOpen(true)}
                className="flex items-center gap-1.5 bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-800 hover:to-amber-900 text-white px-4 py-2 rounded-2xl text-xs font-bold shadow-md transition-all cursor-pointer ring-2 ring-amber-400/30"
                title="صدور فاکتور با صدای شما"
              >
                <Mic className="w-4 h-4 text-amber-300 animate-pulse" />
                <span>ثبت صوتی (هوشمند)</span>
              </button>

              {/* Direct WhatsApp Share Button */}
              <button
                type="button"
                onClick={() => handleOpenShare('whatsapp')}
                className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-2 rounded-2xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                title="ارسال فاکتور در واتساپ"
              >
                <MessageSquare className="w-4 h-4 text-emerald-300" />
                <span className="hidden sm:inline">ارسال واتساپ</span>
              </button>

              {/* Direct Telegram Share Button */}
              <button
                type="button"
                onClick={() => handleOpenShare('telegram')}
                className="flex items-center gap-1.5 bg-sky-700 hover:bg-sky-800 text-white px-3.5 py-2 rounded-2xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                title="ارسال فاکتور در تلگرام"
              >
                <Send className="w-4 h-4 text-sky-300" />
                <span className="hidden sm:inline">ارسال تلگرام</span>
              </button>
            </div>
          </div>

          {/* Metadata Grid (Invoice number, Date, Type, Guest Info) */}
          <div className="p-5 bg-amber-50/40 border-b border-amber-900/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Serial Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">شماره فاکتور / سریال:</label>
              <input
                type="text"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-amber-700 outline-hidden bg-white"
                required
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">تاریخ فاکتور (شمسی):</label>
              <input
                type="text"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder="1403/01/01"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-amber-700 outline-hidden bg-white"
                required
              />
            </div>

            {/* Invoice Kind / Status */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">نوع سند:</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'FINAL' | 'PROFORMA')}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-amber-700 outline-hidden bg-white"
              >
                <option value="FINAL">فاکتور نهایی و قطعی فروش</option>
                <option value="PROFORMA">پیش‌فاکتور (رزرو / استعلام)</option>
              </select>
            </div>

            {/* Select Existing Guest Dropdown */}
            {existingGuests.length > 0 && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  انتخاب سریع از لیست {customerTitle}ان:
                </label>
                <select
                  value={guestId || ''}
                  onChange={(e) => handleSelectExistingGuest(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-700 outline-hidden bg-white"
                >
                  <option value="">-- انتخاب {customerTitle} ثبت شده --</option>
                  {existingGuests.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} {g.phone ? `(${g.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

          </div>

          {/* Customer / Guest Detail Card */}
          <div className="p-5 border-b border-amber-900/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-amber-800" />
                نام و نام‌خانوادگی {customerTitle} <span className="text-rose-600">*</span>:
              </label>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder={`مثال: آقای مسعود ملایی`}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-700 outline-hidden bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-amber-800" />
                شماره همراه {customerTitle} (جهت واتساپ/تلگرام):
              </label>
              <input
                type="text"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                placeholder="09131234567"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-amber-700 outline-hidden bg-white text-left dir-ltr"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">کد ملی / شناسه اقامتی:</label>
              <input
                type="text"
                value={guestNationalCode}
                onChange={(e) => setGuestNationalCode(e.target.value)}
                placeholder="مثال: 0012345678"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-amber-700 outline-hidden bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">شغل / سمت:</label>
              <input
                type="text"
                value={guestJob}
                onChange={(e) => setGuestJob(e.target.value)}
                placeholder="مثال: گردشگر، استاد، طراح"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-700 outline-hidden bg-white"
              />
            </div>
          </div>

          {/* Line Items Table */}
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-800" />
                اقلام کالاها و خدمات فاکتور
              </h3>
              <button
                type="button"
                onClick={handleAddRow}
                className="flex items-center gap-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 text-amber-700" />
                <span>افزودن ردیف کالا</span>
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5 text-center w-10">#</th>
                    <th className="p-2.5 min-w-[200px]">شرح کالا یا خدمت</th>
                    <th className="p-2.5 min-w-[140px]">انتخاب از کاتالوگ</th>
                    <th className="p-2.5 w-24">واحد</th>
                    <th className="p-2.5 w-20 text-center">تعداد</th>
                    <th className="p-2.5 w-32">قیمت واحد (تومان)</th>
                    <th className="p-2.5 w-32">مبلغ کل (تومان)</th>
                    <th className="p-2.5 w-20">تخفیف %</th>
                    <th className="p-2.5 w-32">مبلغ نهایی ردیف</th>
                    <th className="p-2.5 text-center w-12">حذف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((row, idx) => (
                    <tr key={row.id || idx} className="hover:bg-amber-50/30">
                      <td className="p-2 text-center font-mono font-bold text-slate-400">{idx + 1}</td>
                      
                      {/* Item Name input */}
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.itemName}
                          onChange={(e) => handleItemChange(idx, 'itemName', e.target.value)}
                          placeholder="نام کالا، غذا، اقامت، سوغات..."
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-amber-700 outline-hidden bg-white"
                          required
                        />
                      </td>

                      {/* Catalog Select Dropdown */}
                      <td className="p-2">
                        <select
                          value={row.itemId || ''}
                          onChange={(e) => handleSelectCatalogItem(idx, e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-[11px] focus:ring-1 focus:ring-amber-700 outline-hidden bg-white"
                        >
                          <option value="">-- لیست کالاها --</option>
                          {existingItems.map((catIt) => (
                            <option key={catIt.id} value={catIt.id}>
                              {catIt.name} ({catIt.basePrice.toLocaleString('fa-IR')} ت)
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Unit */}
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.unit}
                          onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs text-center focus:ring-1 focus:ring-amber-700 outline-hidden bg-white"
                        />
                      </td>

                      {/* Quantity */}
                      <td className="p-2">
                        <input
                          type="number"
                          min="0.1"
                          step="any"
                          value={row.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold text-center focus:ring-1 focus:ring-amber-700 outline-hidden bg-white"
                          required
                        />
                      </td>

                      {/* Base Price */}
                      <td className="p-2">
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={row.basePrice}
                          onChange={(e) => handleItemChange(idx, 'basePrice', e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono focus:ring-1 focus:ring-amber-700 outline-hidden bg-white text-left dir-ltr"
                          required
                        />
                      </td>

                      {/* Line Total Price (Read-only) */}
                      <td className="p-2 font-mono font-bold text-slate-700 text-xs">
                        {formatPersianPrice(row.totalPrice)}
                      </td>

                      {/* Discount Percent */}
                      <td className="p-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={row.discountPercent || ''}
                          placeholder="0"
                          onChange={(e) => handleItemChange(idx, 'discountPercent', e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-mono text-center focus:ring-1 focus:ring-amber-700 outline-hidden bg-white"
                        />
                      </td>

                      {/* Final Line Payable Amount */}
                      <td className="p-2 font-mono font-bold text-amber-950 text-xs">
                        {formatPersianPrice(row.payableAmount)}
                      </td>

                      {/* Remove Button */}
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                          title="حذف ردیف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment Stages & Summary Grid */}
          <div className="p-5 border-t border-amber-900/10 grid grid-cols-1 lg:grid-cols-2 gap-6 bg-slate-50/50">
            
            {/* Multi-stage Payment Box */}
            <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-amber-800" />
                  مراحل پرداخت و تسویه {customerTitle}
                </h4>
                <button
                  type="button"
                  onClick={handleAddPaymentStage}
                  className="flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>ثبت واریزی جدید</span>
                </button>
              </div>

              {payments.length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                  هنوز واریزی برای این فاکتور ثبت نشده است. (در صورت تسویه نهایی، مبلغ به مانده حساب منظور می‌شود)
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {payments.map((p, idx) => (
                    <div key={p.id || idx} className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 text-xs">
                      <input
                        type="text"
                        value={p.date}
                        onChange={(e) => handleUpdatePayment(idx, 'date', e.target.value)}
                        placeholder="تاریخ"
                        className="w-24 px-2 py-1 border border-slate-300 rounded-lg font-mono text-[11px] bg-white"
                      />
                      <input
                        type="number"
                        value={p.amount}
                        onChange={(e) => handleUpdatePayment(idx, 'amount', e.target.value)}
                        placeholder="مبلغ (تومان)"
                        className="flex-1 px-2 py-1 border border-slate-300 rounded-lg font-mono font-bold text-xs bg-white text-left dir-ltr"
                      />
                      <select
                        value={p.method}
                        onChange={(e) => handleUpdatePayment(idx, 'method', e.target.value)}
                        className="w-24 px-1.5 py-1 border border-slate-300 rounded-lg text-[11px] bg-white"
                      >
                        <option value="POS">کارتخوان</option>
                        <option value="CARD_TO_CARD">کارت به کارت</option>
                        <option value="CASH">نقدی</option>
                        <option value="BANK_TRANSFER">حواله پایا</option>
                        <option value="WALLET">کیف پول</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handleRemovePayment(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">توضیحات و یادداشت فاکتور:</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="یادداشت‌های اختصاصی، تخفیف ویژه، شماره اتاق یا هماهنگی‌ها..."
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:ring-1 focus:ring-amber-700 outline-hidden bg-white"
                />
              </div>
            </div>

            {/* Financial Totals Summary Box */}
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4.5 flex flex-col justify-between space-y-3">
              <h4 className="text-xs font-black text-amber-950 border-b border-amber-900/10 pb-2">
                خلاصه محاسبات مالی فاکتور
              </h4>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-700">
                  <span>جمع کل اقلام:</span>
                  <span className="font-mono font-bold text-slate-900">{formatPersianPrice(totalItemsAmount)} تومان</span>
                </div>

                {totalDiscountAmount > 0 && (
                  <div className="flex justify-between text-rose-700">
                    <span>تخفیف کل اعمال شده:</span>
                    <span className="font-mono font-bold">- {formatPersianPrice(totalDiscountAmount)} تومان</span>
                  </div>
                )}

                {totalTaxAmount > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>مالیات ارزش افزوده ({settings.taxRate}%):</span>
                    <span className="font-mono font-bold">{formatPersianPrice(totalTaxAmount)} تومان</span>
                  </div>
                )}

                <div className="flex justify-between text-sm font-black text-amber-950 pt-2 border-t border-amber-900/20">
                  <span>مبلغ نهایی قابل پرداخت:</span>
                  <span className="font-mono text-base">{formatPersianPrice(totalPayable)} تومان</span>
                </div>

                <div className="text-[11px] text-amber-900/90 font-medium">
                  به حروف: <span className="font-bold">{totalPayableInWords} تومان</span>
                </div>

                {/* Settlement status */}
                <div className="pt-2 border-t border-amber-900/20 space-y-1.5">
                  <div className="flex justify-between text-emerald-800 font-bold text-xs">
                    <span>مجموع مبالغ پرداخت شده:</span>
                    <span className="font-mono">{formatPersianPrice(totalPaidAmount)} تومان</span>
                  </div>

                  <div className="flex justify-between text-xs font-black">
                    <span className={remainingBalance === 0 ? 'text-emerald-700' : 'text-rose-700'}>
                      {remainingBalance === 0 ? 'وضعیت تسویه:' : 'مانده بدهی / قابل پرداخت:'}
                    </span>
                    <span className={`font-mono ${remainingBalance === 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {remainingBalance === 0 ? 'تسویه کامل شد' : `${formatPersianPrice(remainingBalance)} تومان`}
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Bottom Action Buttons Bar */}
          <div className="p-5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {onCancelEdit && (
                <button
                  type="button"
                  onClick={onCancelEdit}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-all cursor-pointer"
                >
                  انصراف و بازگشت
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* WhatsApp button */}
              <button
                type="button"
                onClick={() => handleOpenShare('whatsapp')}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>ارسال به واتساپ</span>
              </button>

              {/* Telegram button */}
              <button
                type="button"
                onClick={() => handleOpenShare('telegram')}
                className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>ارسال به تلگرام</span>
              </button>

              {/* Save and preview print */}
              <button
                type="button"
                onClick={(e) => handleSubmitInvoice(e, true)}
                disabled={saving}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-amber-300 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                <Printer className="w-4 h-4" />
                <span>ذخیره و پیش‌نمایش چاپ / خروجی</span>
              </button>

              {/* Final Submit Button */}
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 bg-amber-800 hover:bg-amber-900 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg transition-all cursor-pointer disabled:opacity-50 ring-2 ring-amber-400/20"
              >
                <Save className="w-4 h-4 text-amber-300" />
                <span>{saving ? 'در حال ثبت...' : invoiceToEdit ? 'بروزرسانی فاکتور' : 'ثبت نهایی فاکتور'}</span>
              </button>
            </div>
          </div>

        </div>
      </form>

      {/* Voice Recognition Modal */}
      {isVoiceModalOpen && (
        <VoiceInvoiceModal
          isOpen={isVoiceModalOpen}
          onClose={() => setIsVoiceModalOpen(false)}
          itemsCatalog={existingItems}
          categories={[]}
          customerTitle={customerTitle}
          onApplyParsedInvoice={(parsed) => {
            handleVoiceInvoiceApplied(parsed);
            setIsVoiceModalOpen(false);
          }}
        />
      )}

      {/* Post-Submit Success Modal */}
      {savedInvoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-emerald-500/30 text-right flex flex-col gap-4 animate-in fade-in zoom-in-95">
            
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">فاکتور با موفقیت ثبت شد</h3>
                <p className="text-xs text-slate-500 font-mono">شماره سند: {savedInvoiceModal.serialNumber}</p>
              </div>
            </div>

            {/* Quick Details */}
            <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">{customerTitle}:</span>
                <span className="font-bold text-slate-900">{savedInvoiceModal.guestName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">مبلغ کل فاکتور:</span>
                <span className="font-bold font-mono text-amber-950">{formatPersianPrice(savedInvoiceModal.totalPayable)} تومان</span>
              </div>
              {savedInvoiceModal.guestPhone && (
                <div className="flex justify-between">
                  <span className="text-slate-500">شماره همراه:</span>
                  <span className="font-mono text-slate-700">{savedInvoiceModal.guestPhone}</span>
                </div>
              )}
            </div>

            {/* Direct Share Options */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-700">اشتراک‌گذاری فوری فاکتور:</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleOpenShare('whatsapp', savedInvoiceModal);
                  }}
                  className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-xs transition-all cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>ارسال در واتساپ</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleOpenShare('telegram', savedInvoiceModal);
                  }}
                  className="flex items-center justify-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-xs transition-all cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>ارسال در تلگرام</span>
                </button>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
              {onPrintInvoice && (
                <button
                  type="button"
                  onClick={() => {
                    const inv = savedInvoiceModal;
                    setSavedInvoiceModal(null);
                    onPrintInvoice(inv);
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>مشاهده، چاپ و خروجی PDF</span>
                </button>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleResetForNewInvoice}
                  className="flex items-center justify-center gap-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold py-2 rounded-xl text-xs transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>ثبت فاکتور جدید</span>
                </button>

                {onNavigateToList && (
                  <button
                    type="button"
                    onClick={() => {
                      setSavedInvoiceModal(null);
                      onNavigateToList();
                    }}
                    className="flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-xl text-xs transition-all cursor-pointer"
                  >
                    <ArrowRight className="w-4 h-4" />
                    <span>لیست فاکتورها</span>
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Share Dialog */}
      {shareDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs no-print">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 shadow-2xl border border-amber-900/20 text-right flex flex-col gap-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                {shareDialog.type === 'whatsapp' ? (
                  <MessageSquare className="w-5 h-5 text-emerald-600" />
                ) : (
                  <Send className="w-5 h-5 text-sky-600" />
                )}
                <h3 className="text-sm font-bold text-slate-900">
                  {shareDialog.type === 'whatsapp' ? 'ارسال فاکتور به واتساپ' : 'ارسال فاکتور به تلگرام'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShareDialog((prev) => ({ ...prev, isOpen: false }))}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                شماره همراه گیرنده (برای واتساپ):
              </label>
              <input
                type="text"
                value={shareDialog.phone}
                onChange={(e) => setShareDialog((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="مثال: 09131234567"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono text-left dir-ltr focus:ring-2 focus:ring-amber-700 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                پیش‌نمایش و ویرایش متن پیام:
              </label>
              <textarea
                value={shareDialog.text}
                onChange={(e) => setShareDialog((prev) => ({ ...prev, text: e.target.value }))}
                rows={7}
                className="w-full p-3 border border-slate-300 rounded-xl text-xs font-sans leading-relaxed focus:ring-2 focus:ring-amber-700 outline-hidden bg-slate-50"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShareDialog((prev) => ({ ...prev, isOpen: false }))}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={executeSendShare}
                className={`flex items-center gap-1.5 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer ${
                  shareDialog.type === 'whatsapp' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-sky-600 hover:bg-sky-700'
                }`}
              >
                {shareDialog.type === 'whatsapp' ? <MessageSquare className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                <span>ارسال مستقیم پیام</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
