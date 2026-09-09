import React, { useRef, useState } from 'react';
import { SalesInvoice, LodgeSettings } from '../types';
import { formatPersianPrice } from '../utils/numberToWords';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  Printer,
  X,
  Building2,
  Phone,
  MapPin,
  CreditCard,
  CheckCircle2,
  Download,
  Image as ImageIcon,
  Share2,
  MessageSquare,
  Send,
  FileCheck,
  Tag
} from 'lucide-react';

interface InvoicePrintModalProps {
  invoice: SalesInvoice | null;
  settings: LodgeSettings;
  onClose: () => void;
  onConvertToFinalInvoice?: (invoiceId: string) => Promise<void>;
}

export const InvoicePrintModal: React.FC<InvoicePrintModalProps> = ({
  invoice,
  settings,
  onClose,
  onConvertToFinalInvoice
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState<boolean>(false);
  const customerTitle = settings.customerTitle || 'مهمان';

  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [sharePhone, setSharePhone] = useState<string>(invoice.guestPhone || '');
  const [shareType, setShareType] = useState<'whatsapp' | 'telegram'>('whatsapp');
  const [customShareText, setCustomShareText] = useState<string>('');

  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  // Export to JPG Image
  const handleExportImage = async () => {
    if (!printRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#FFFFFF'
      });
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      const link = document.createElement('a');
      link.download = `Invoice-${invoice.serialNumber}.jpg`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error generating image:', err);
      alert('خطا در ایجاد خروجی تصویر فاکتور');
    } finally {
      setExporting(false);
    }
  };

  // Export to PDF Document
  const handleExportPDF = async () => {
    if (!printRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#FFFFFF'
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Invoice-${invoice.serialNumber}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('خطا در ایجاد خروجی PDF فاکتور');
    } finally {
      setExporting(false);
    }
  };

  // Prepare WhatsApp & Telegram formatted text with configurable intro
  const generateShareMessage = () => {
    const rawIntro =
      settings.whatsappShareTemplate ||
      settings.whatsappTemplate ||
      'دوست گرامی با احترام، فاکتور شما به پیوست تقدیم می‌گردد:';

    let intro = rawIntro
      .replace(/{مهمان}/g, invoice.guestName || customerTitle)
      .replace(/{مشتری}/g, invoice.guestName || customerTitle)
      .replace(/{خریدار}/g, invoice.guestName || customerTitle)
      .replace(/{طرف_حساب}/g, invoice.guestName || customerTitle)
      .replace(/{شماره_فاکتور}/g, invoice.serialNumber)
      .replace(/{مبلغ}/g, formatPersianPrice(invoice.totalPayable))
      .replace(/{اقامتگاه}/g, settings.lodgeName || 'اقامتگاه بوم‌گردی خانه برزک');

    const itemsSummary = invoice.items
      .map((item, idx) => {
        return `▫️ ${idx + 1}. ${item.itemName} (${item.quantity} ${item.unit}) : ${formatPersianPrice(item.payableAmount)} تومان`;
      })
      .join('\n');

    let msg = `🌿 *${settings.lodgeName || 'اقامتگاه بوم‌گردی خانه برزک'}*\n\n`;
    msg += `${intro}\n\n`;
    msg += `📄 *شماره سند:* ${invoice.serialNumber}\n`;
    msg += `📅 *تاریخ:* ${invoice.date}\n`;
    msg += `👤 *نام ${customerTitle}:* ${invoice.guestName}\n\n`;
    msg += `📋 *ریز اقلام و خدمات:*\n${itemsSummary}\n\n`;
    msg += `💰 *جمع اقلام:* ${formatPersianPrice(invoice.totalItemsAmount)} تومان\n`;

    if (invoice.totalDiscountAmount > 0) {
      msg += `🏷 *تخفیف:* ${formatPersianPrice(invoice.totalDiscountAmount)} تومان\n`;
    }
    if (invoice.totalTaxAmount > 0) {
      msg += `🏛 *مالیات ارزش افزوده:* ${formatPersianPrice(invoice.totalTaxAmount)} تومان\n`;
    }

    msg += `⭐️ *مبلغ نهایی قابل پرداخت:* ${formatPersianPrice(invoice.totalPayable)} تومان\n`;
    msg += `(به حروف: ${invoice.totalPayableInWords} تومان)\n\n`;

    if (settings.cardNumber || settings.shaba || settings.accountOwner) {
      msg += `💳 *اطلاعات حساب جهت واریز:*\n`;
      if (settings.accountOwner) msg += `صاحب حساب: ${settings.accountOwner}\n`;
      if (settings.cardNumber) msg += `شماره کارت: ${settings.cardNumber}\n`;
      if (settings.shaba) msg += `شماره شبا: ${settings.shaba}\n`;
      msg += `\n`;
    }

    msg += `با سپاس از حسن انتخاب و همراهی شما ✨`;
    return msg;
  };

  const handleOpenShareModal = (type: 'whatsapp' | 'telegram') => {
    setShareType(type);
    setSharePhone(invoice.guestPhone || '');
    setCustomShareText(generateShareMessage());
    setShowShareModal(true);
  };

  const executeSendShare = () => {
    const text = encodeURIComponent(customShareText);
    const cleanedPhone = sharePhone ? sharePhone.replace(/\D/g, '').replace(/^0/, '98') : '';

    if (shareType === 'whatsapp') {
      const url = cleanedPhone
        ? `https://wa.me/${cleanedPhone}?text=${text}`
        : `https://api.whatsapp.com/send?text=${text}`;
      window.open(url, '_blank');
    } else {
      const url = `https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=${text}`;
      window.open(url, '_blank');
    }
    setShowShareModal(false);
  };

  const isProforma = invoice.status === 'PROFORMA';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-amber-900/20 overflow-hidden my-auto max-h-[95vh] flex flex-col">
        
        {/* Top Control Bar (Hidden on print) */}
        <div className="no-print bg-slate-900 text-white p-4 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-amber-300" />
            <span className="text-xs sm:text-sm font-bold">
              {isProforma ? `پیش‌فاکتور رسمی ${customerTitle}` : `فاکتور رسمی فروش اقامتگاه`}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Convert Proforma to Final */}
            {isProforma && onConvertToFinalInvoice && (
              <button
                onClick={async () => {
                  if (confirm('آیا مایلید این پیش‌فاکتور به فاکتور نهایی قطعی تبدیل شود؟')) {
                    await onConvertToFinalInvoice(invoice.id);
                  }
                }}
                className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer shadow-xs"
              >
                <FileCheck className="w-4 h-4" />
                <span>تبدیل به فاکتور نهایی</span>
              </button>
            )}

            {/* WhatsApp Share */}
            <button
              onClick={() => handleOpenShareModal('whatsapp')}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer shadow-xs"
              title="ارسال فاکتور در واتساپ"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ارسال واتساپ</span>
            </button>

            {/* Telegram Share */}
            <button
              onClick={() => handleOpenShareModal('telegram')}
              className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer shadow-xs"
              title="ارسال فاکتور در تلگرام"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ارسال تلگرام</span>
            </button>

            {/* Export JPG */}
            <button
              onClick={handleExportImage}
              disabled={exporting}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-amber-200 font-bold px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer border border-slate-700 disabled:opacity-50"
              title="دانلود به عنوان تصویر JPG"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">خروجی عکس</span>
            </button>

            {/* Export PDF */}
            <button
              onClick={handleExportPDF}
              disabled={exporting}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-amber-200 font-bold px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer border border-slate-700 disabled:opacity-50"
              title="دانلود فایل PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">خروجی PDF</span>
            </button>

            {/* Standard Print */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-amber-800 hover:bg-amber-900 text-white font-bold px-4 py-1.5 rounded-xl text-xs transition-all cursor-pointer shadow-xs"
            >
              <Printer className="w-4 h-4 text-amber-300" />
              <span>چاپ</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable & Exportable Canvas Area */}
        <div ref={printRef} className="p-6 sm:p-8 bg-white overflow-y-auto print-shadow-none flex-1 font-sans text-slate-800">
          
          {/* Top Header */}
          <div className="border-b-2 border-slate-900 pb-5 mb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            
            {/* Logo & Lodge Info */}
            <div className="flex items-center gap-4">
              {settings.lodgeLogo ? (
                <img
                  src={settings.lodgeLogo}
                  alt="Logo"
                  className="w-16 h-16 rounded-2xl object-cover border border-amber-900/20 shadow-xs"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-amber-800 text-white flex items-center justify-center font-bold shadow-xs">
                  <Building2 className="w-8 h-8 text-amber-200" />
                </div>
              )}

              <div>
                <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  {settings.lodgeName || 'اقامتگاه بوم‌گردی خانه برزک'}
                  {isProforma && (
                    <span className="text-xs bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-md font-bold border border-amber-300">
                      (پیش‌فاکتور رزرو)
                    </span>
                  )}
                </h1>
                <div className="text-xs text-slate-600 mt-1 space-y-0.5 font-medium">
                  <p className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-amber-800 shrink-0" />
                    <span>{settings.address}</span>
                  </p>
                  <p className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-amber-800 shrink-0" />
                    <span>تلفن: {settings.phone}</span>
                    {settings.economicCode && (
                      <span className="mr-3 font-mono text-slate-500 font-bold">
                        • کد اقتصادی: {settings.economicCode}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Serial & Date Box */}
            <div className="bg-amber-50/50 p-3.5 rounded-2xl border border-amber-900/15 text-xs space-y-1.5 min-w-[190px] text-right">
              <div className="flex justify-between items-center gap-3">
                <span className="text-slate-500 font-bold">شماره سند:</span>
                <span className="font-mono font-black text-amber-950 text-sm">{invoice.serialNumber}</span>
              </div>
              <div className="flex justify-between items-center gap-3">
                <span className="text-slate-500 font-bold">تاریخ صدور:</span>
                <span className="font-mono font-bold text-slate-900">{invoice.date}</span>
              </div>
              <div className="flex justify-between items-center gap-3 pt-1 border-t border-amber-900/10">
                <span className="text-slate-500 font-bold">وضعیت تسویه:</span>
                <span className={`font-bold px-2.5 py-0.5 rounded-full text-[10px] ${
                  invoice.paid || (invoice.remainingBalance === 0 && Number(invoice.totalPayable) > 0)
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}>
                  {invoice.paid || (invoice.remainingBalance === 0 && Number(invoice.totalPayable) > 0) ? 'تسویه شده کامل' : 'دارای مانده پرداخت'}
                </span>
              </div>
            </div>
          </div>

          {/* Customer / Guest Info */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 mb-5 text-xs grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <span className="text-slate-500 font-bold">مشخصات طرف حساب ({customerTitle}):</span>{' '}
              <span className="font-bold text-slate-900 text-sm">{invoice.guestName}</span>
            </div>
            {invoice.guestPhone && (
              <div>
                <span className="text-slate-500 font-bold">شماره تماس:</span>{' '}
                <span className="font-mono font-bold text-slate-900">{invoice.guestPhone}</span>
              </div>
            )}
            {invoice.notes && (
              <div className="sm:col-span-2 pt-1 border-t border-slate-200 text-slate-700 leading-relaxed font-medium">
                <span className="text-slate-500 font-bold">یادداشت و توضیحات:</span> {invoice.notes}
              </div>
            )}
          </div>

          {/* Line Items Table */}
          <table className="w-full text-right text-xs border-collapse mb-5">
            <thead>
              <tr className="bg-slate-900 text-amber-200 font-bold text-[11px]">
                <th className="p-2.5 border border-slate-900 text-center w-8">#</th>
                <th className="p-2.5 border border-slate-900">شرح کالا یا خدمت</th>
                <th className="p-2.5 border border-slate-900 text-center w-16">واحد</th>
                <th className="p-2.5 border border-slate-900 text-center w-12">تعداد</th>
                <th className="p-2.5 border border-slate-900 w-24">قیمت پایه</th>
                <th className="p-2.5 border border-slate-900 w-24">مبلغ کل</th>
                {invoice.totalDiscountAmount > 0 && (
                  <th className="p-2.5 border border-slate-900 w-20">تخفیف</th>
                )}
                {invoice.totalTaxAmount > 0 && (
                  <th className="p-2.5 border border-slate-900 w-20">مالیات</th>
                )}
                <th className="p-2.5 border border-slate-900 w-28 bg-slate-950 text-amber-300">مبلغ قابل پرداخت</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((row, i) => (
                <tr key={row.id || i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'}>
                  <td className="p-2.5 border border-slate-200 text-center font-bold text-slate-400">{i + 1}</td>
                  <td className="p-2.5 border border-slate-200 font-bold text-slate-900">{row.itemName}</td>
                  <td className="p-2.5 border border-slate-200 text-center text-slate-600 font-medium">{row.unit}</td>
                  <td className="p-2.5 border border-slate-200 text-center font-bold font-mono">{row.quantity}</td>
                  <td className="p-2.5 border border-slate-200 font-mono">{formatPersianPrice(row.basePrice)}</td>
                  <td className="p-2.5 border border-slate-200 font-mono font-semibold">{formatPersianPrice(row.totalPrice)}</td>
                  {invoice.totalDiscountAmount > 0 && (
                    <td className="p-2.5 border border-slate-200 font-mono text-rose-700">{formatPersianPrice(row.discountAmount)}</td>
                  )}
                  {invoice.totalTaxAmount > 0 && (
                    <td className="p-2.5 border border-slate-200 font-mono">{formatPersianPrice(row.taxAmount)}</td>
                  )}
                  <td className="p-2.5 border border-slate-200 font-black font-mono text-amber-950 bg-amber-50/50">
                    {formatPersianPrice(row.payableAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Multi-Stage Payments Table (If recorded) */}
          {invoice.payments && invoice.payments.length > 0 && (
            <div className="mb-5 bg-slate-50 rounded-2xl p-3.5 border border-slate-200 text-xs">
              <h4 className="font-black text-slate-900 mb-2 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-emerald-700" />
                سوابق مراحل پرداخت و تسویه:
              </h4>
              <div className="space-y-1.5">
                {invoice.payments.map((pmt, pIdx) => (
                  <div key={pmt.id || pIdx} className="flex justify-between items-center p-2 bg-white rounded-xl border border-slate-100 font-medium">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-700">{pmt.date}</span>
                      <span className="text-slate-500">
                        {pmt.method === 'POS' ? 'کارتخوان' : pmt.method === 'CASH' ? 'نقدی' : pmt.method === 'CHEQUE' ? 'چک صیادی' : 'کارت‌به‌کارت'}
                      </span>
                      {pmt.chequeNumber && <span className="font-mono text-slate-600 text-[11px]">چک: {pmt.chequeNumber}</span>}
                      {pmt.referenceNumber && <span className="font-mono text-slate-400 text-[11px]">پیگیری: {pmt.referenceNumber}</span>}
                    </div>
                    <span className="font-mono font-bold text-emerald-800">
                      {formatPersianPrice(pmt.amount)} تومان
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Totals & Bank Box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            {/* Bank Info */}
            <div className="border border-amber-900/15 rounded-2xl p-3.5 text-xs bg-amber-50/30 space-y-1">
              <h4 className="font-black text-amber-950 flex items-center gap-1 mb-1.5">
                <CreditCard className="w-3.5 h-3.5 text-emerald-700" />
                اطلاعات حساب بانکی جهت واریز وجه:
              </h4>
              <p className="text-slate-700">صاحب حساب: <span className="font-bold text-slate-900">{settings.accountOwner}</span></p>
              {settings.cardNumber && <p className="text-slate-700">شماره کارت: <span className="font-mono font-bold text-slate-900">{settings.cardNumber}</span></p>}
              {settings.shaba && <p className="text-slate-700">شماره شبا: <span className="font-mono text-[11px] font-bold text-slate-900">{settings.shaba}</span></p>}
            </div>

            {/* Total Calculations */}
            {/* Requirement 8: If tax or discount is 0, do not show in bottom summary */}
            <div className="border border-slate-200 rounded-2xl p-3.5 text-xs space-y-1.5 bg-slate-50">
              <div className="flex justify-between text-slate-600 font-medium">
                <span>جمع اقلام:</span>
                <span className="font-mono font-bold text-slate-900">{formatPersianPrice(invoice.totalItemsAmount)} تومان</span>
              </div>

              {invoice.totalDiscountAmount > 0 && (
                <div className="flex justify-between text-rose-700 font-medium">
                  <span>تخفیف:</span>
                  <span className="font-mono font-bold">({formatPersianPrice(invoice.totalDiscountAmount)}) تومان</span>
                </div>
              )}

              {invoice.totalTaxAmount > 0 && (
                <div className="flex justify-between text-slate-600 font-medium">
                  <span>مالیات و عوارض ارزش افزوده:</span>
                  <span className="font-mono font-bold text-slate-900">{formatPersianPrice(invoice.totalTaxAmount)} تومان</span>
                </div>
              )}

              <div className="flex justify-between text-sm font-black pt-2 border-t border-slate-300 text-slate-900">
                <span>مبلغ کل قابل پرداخت:</span>
                <span className="text-amber-950 text-base font-mono">{formatPersianPrice(invoice.totalPayable)} تومان</span>
              </div>

              {invoice.totalPaidAmount !== undefined && invoice.totalPaidAmount > 0 && (
                <>
                  <div className="flex justify-between text-emerald-800 font-bold pt-1 border-t border-slate-200">
                    <span>مجموع مبالغ پرداخت شده:</span>
                    <span className="font-mono">{formatPersianPrice(invoice.totalPaidAmount)} تومان</span>
                  </div>
                  <div className="flex justify-between text-rose-800 font-black">
                    <span>مانده حساب قابل تسویه:</span>
                    <span className="font-mono">{formatPersianPrice(invoice.remainingBalance || 0)} تومان</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Total in Words */}
          <div className="bg-amber-100/70 text-amber-950 p-3.5 rounded-2xl text-xs font-bold border border-amber-300">
            مبلغ کل به حروف: {invoice.totalPayableInWords}
          </div>

          {/* NOTE: Requirement 9 explicitly mandates: "مهر و امضای مدیریت اقامتگاه، امضا و تایید خریدار / مهمان، از پایین فاکتور حذف بشه"
              Therefore signature section is removed here completely. */}

        </div>
      </div>

      {/* Interactive WhatsApp / Telegram Sharing Modal Dialog */}
      {showShareModal && (
        <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-lg w-full shadow-2xl border border-amber-900/20 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                {shareType === 'whatsapp' ? (
                  <MessageSquare className="w-5 h-5 text-emerald-600" />
                ) : (
                  <Send className="w-5 h-5 text-sky-600" />
                )}
                <h3 className="text-sm font-bold text-slate-900">
                  ارسال فاکتور از طریق {shareType === 'whatsapp' ? 'واتساپ' : 'تلگرام'}
                </h3>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  شماره موبایل دریافت‌کننده ({customerTitle}):
                </label>
                <input
                  type="text"
                  value={sharePhone}
                  onChange={(e) => setSharePhone(e.target.value)}
                  placeholder="مثال: 09123456789"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-amber-700 outline-hidden"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  پیام مستقیماً به صفحه چت با این شماره هدایت می‌شود.
                </p>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  پیش‌نمایش و ویرایش متن پیام:
                </label>
                <textarea
                  rows={8}
                  value={customShareText}
                  onChange={(e) => setCustomShareText(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-sans text-[11px] leading-relaxed focus:ring-2 focus:ring-amber-700 outline-hidden"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={executeSendShare}
                className={`flex items-center gap-1.5 text-white font-bold px-5 py-2 rounded-xl text-xs shadow-md cursor-pointer transition-all ${
                  shareType === 'whatsapp'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-sky-600 hover:bg-sky-700'
                }`}
              >
                {shareType === 'whatsapp' ? <MessageSquare className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                <span>ارسال نهایی به {shareType === 'whatsapp' ? 'واتساپ' : 'تلگرام'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
