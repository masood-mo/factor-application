import React, { useRef, useState } from 'react';
import { PurchaseInvoice, LodgeSettings } from '../types';
import { formatPersianPrice, numberToWordsPersian } from '../utils/numberToWords';
import { formatPersianDate } from '../utils/persianDate';
import { getInvoiceUrl } from '../utils/invoiceUrl';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  Printer,
  X,
  Building2,
  Phone,
  CreditCard,
  Download,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  FileDown,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShoppingBag
} from 'lucide-react';

interface PurchaseInvoicePrintModalProps {
  invoice: PurchaseInvoice | null;
  settings: LodgeSettings;
  onClose: () => void;
  standaloneMode?: boolean;
}

export const PurchaseInvoicePrintModal: React.FC<PurchaseInvoicePrintModalProps> = ({
  invoice,
  settings,
  onClose,
  standaloneMode = false,
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [exportingPDF, setExportingPDF] = useState<boolean>(false);
  const [exportingImage, setExportingImage] = useState<boolean>(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  // Export to JPG Image
  const handleExportImage = async () => {
    if (!printRef.current || exportingImage || exportingPDF) return;
    setExportingImage(true);
    setExportError(null);
    setExportSuccess(null);
    try {
      const element = printRef.current;
      const originalOverflow = element.style.overflow;
      element.style.overflow = 'visible';

      const canvas = await html2canvas(element, {
        scale: 2.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#FFFFFF',
        logging: false,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
      });

      element.style.overflow = originalOverflow;

      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      const link = document.createElement('a');
      const safeVendorName = (invoice.vendorName || 'vendor').replace(/[/\\?%*:|"<>]/g, '_');
      link.download = `PurchaseInvoice-${invoice.serialNumber}-${safeVendorName}.jpg`;
      link.href = dataUrl;
      link.click();
      setExportSuccess('تصویر فاکتور خرید (JPG) با موفقیت ذخیره شد.');
      setTimeout(() => setExportSuccess(null), 4000);
    } catch (err) {
      console.error('Error generating image:', err);
      setExportError('خطا در ایجاد تصویر فاکتور خرید');
      setTimeout(() => setExportError(null), 5000);
    } finally {
      setExportingImage(false);
    }
  };

  // Export to PDF Document using jsPDF
  const handleExportPDF = async () => {
    if (!printRef.current || exportingPDF || exportingImage) return;
    setExportingPDF(true);
    setExportError(null);
    setExportSuccess(null);
    try {
      const element = printRef.current;
      const originalOverflow = element.style.overflow;
      element.style.overflow = 'visible';

      const canvas = await html2canvas(element, {
        scale: 2.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#FFFFFF',
        logging: false,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
      });

      element.style.overflow = originalOverflow;

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const pageWidth = pdf.internal.pageSize.getWidth(); // 210mm
      const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm
      const margin = 8;
      const contentWidth = pageWidth - margin * 2;
      const contentHeight = (canvas.height * contentWidth) / canvas.width;

      if (contentHeight <= pageHeight - margin * 2) {
        pdf.addImage(imgData, 'PNG', margin, margin, contentWidth, contentHeight);
      } else {
        const usablePageHeight = pageHeight - margin * 2;
        let heightLeft = contentHeight;
        let position = margin;

        pdf.addImage(imgData, 'PNG', margin, position, contentWidth, contentHeight);
        heightLeft -= usablePageHeight;

        while (heightLeft > 0) {
          position = position - usablePageHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', margin, position, contentWidth, contentHeight);
          heightLeft -= usablePageHeight;
        }
      }

      const safeVendor = (invoice.vendorName || 'فروشنده').replace(/[/\\?%*:|"<>]/g, '_');
      const fileName = `PurchaseInvoice-${invoice.serialNumber}-${safeVendor}.pdf`;

      pdf.save(fileName);
      setExportSuccess('سند PDF فاکتور خرید با موفقیت دانلود شد.');
      setTimeout(() => setExportSuccess(null), 4000);
    } catch (err) {
      console.error('Error generating PDF:', err);
      setExportError('خطا در ایجاد سند PDF فاکتور');
      setTimeout(() => setExportError(null), 5000);
    } finally {
      setExportingPDF(false);
    }
  };

  const invoiceUrl = getInvoiceUrl(invoice.id, 'purchase');
  const totalPayable = invoice.totalAmount - (invoice.totalDiscount || 0);
  const remaining = Math.max(0, totalPayable - (invoice.totalPaid || 0));

  const content = (
    <div className={`bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-emerald-900/20 overflow-hidden flex flex-col ${
      standaloneMode ? 'my-4' : 'my-auto max-h-[95vh]'
    }`}>
      {/* Top Control Bar (Hidden on print) */}
      <div className="no-print bg-slate-900 text-white p-4 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-emerald-400" />
          <span className="text-xs sm:text-sm font-bold">
            فاکتور خرید و هزینه‌های اقامتگاه (شماره {invoice.serialNumber})
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Open in new tab link */}
          {!standaloneMode && (
            <a
              href={invoiceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold px-3 py-1.5 rounded-xl text-xs transition-all border border-slate-700"
              title="مشاهده فاکتور در تب جدید مرورگر"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">باز کردن در تب جدید</span>
            </a>
          )}

          {/* Export JPG */}
          <button
            onClick={handleExportImage}
            disabled={exportingImage || exportingPDF}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-amber-200 font-bold px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer border border-slate-700 disabled:opacity-50"
            title="دانلود تصویر JPG"
          >
            {exportingImage ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span className="hidden sm:inline">در حال ایجاد عکس...</span>
              </>
            ) : (
              <>
                <ImageIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">خروجی عکس</span>
              </>
            )}
          </button>

          {/* Download PDF */}
          <button
            onClick={handleExportPDF}
            disabled={exportingPDF || exportingImage}
            className="flex items-center gap-1.5 bg-rose-700 hover:bg-rose-800 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs transition-all cursor-pointer shadow-xs disabled:opacity-50"
            title="دانلود فایل PDF"
          >
            {exportingPDF ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>در حال ساخت PDF...</span>
              </>
            ) : (
              <>
                <FileDown className="w-3.5 h-3.5" />
                <span>دانلود PDF</span>
              </>
            )}
          </button>

          {/* Print */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-3 sm:px-4 py-1.5 rounded-xl text-xs transition-all cursor-pointer shadow-xs"
          >
            <Printer className="w-4 h-4 text-emerald-200" />
            <span>چاپ</span>
          </button>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
            title="بستن"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Success / Error Banners */}
      {exportSuccess && (
        <div className="no-print bg-emerald-50 border-b border-emerald-200 p-2.5 px-4 text-xs font-bold text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{exportSuccess}</span>
          </div>
          <button onClick={() => setExportSuccess(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {exportError && (
        <div className="no-print bg-rose-50 border-b border-rose-200 p-2.5 px-4 text-xs font-bold text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{exportError}</span>
          </div>
          <button onClick={() => setExportError(null)} className="text-rose-700 hover:text-rose-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Printable Invoice Document Body */}
      <div className="overflow-y-auto p-4 sm:p-8 flex-1 bg-slate-50/50">
        <div
          ref={printRef}
          id="purchase-invoice-print-content"
          className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-300 shadow-sm mx-auto text-slate-900 space-y-6 max-w-3xl"
        >
          {/* Header */}
          <div className="border-b-2 border-emerald-900/30 pb-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {settings.lodgeLogo ? (
                <img
                  src={settings.lodgeLogo}
                  alt={settings.lodgeName}
                  className="w-16 h-16 object-contain rounded-xl border border-slate-200 p-1"
                />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-emerald-800 text-white flex items-center justify-center font-black">
                  <Building2 className="w-7 h-7 text-emerald-300" />
                </div>
              )}
              <div>
                <h1 className="text-base sm:text-lg font-black text-slate-900">
                  {settings.lodgeName || 'اقامتگاه بوم‌گردی'}
                </h1>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  سند فاکتور خرید اقلام و مواد اولیه
                </p>
                {settings.phone && (
                  <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span className="font-mono dir-ltr">{settings.phone}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="text-left bg-emerald-50/80 p-3 rounded-2xl border border-emerald-200/80 space-y-1">
              <div className="text-xs font-bold text-slate-700 flex items-center justify-between gap-3">
                <span className="text-slate-500">شماره سند:</span>
                <span className="font-mono font-black text-emerald-950 text-sm">{invoice.serialNumber}</span>
              </div>
              <div className="text-xs font-bold text-slate-700 flex items-center justify-between gap-3">
                <span className="text-slate-500">تاریخ ثبت:</span>
                <span className="font-mono text-slate-800">{formatPersianDate(invoice.date)}</span>
              </div>
              <div className="text-xs font-bold flex items-center justify-between gap-3 pt-1 border-t border-emerald-200">
                <span className="text-slate-500">وضعیت پرداخت:</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                  invoice.paid ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900'
                }`}>
                  {invoice.paid ? 'تسویه کامل' : 'دارای مانده بدهی'}
                </span>
              </div>
            </div>
          </div>

          {/* Vendor Details */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[11px] text-slate-500 font-semibold block">فروشنده / تامین‌کننده:</span>
              <p className="text-sm font-bold text-slate-900 mt-0.5">{invoice.vendorName}</p>
            </div>
            {invoice.vendorPhone && (
              <div>
                <span className="text-[11px] text-slate-500 font-semibold block">شماره تماس فروشنده:</span>
                <p className="text-xs font-bold text-slate-800 mt-0.5 font-mono dir-ltr">{invoice.vendorPhone}</p>
              </div>
            )}
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 text-center w-12">#</th>
                  <th className="py-2.5 px-4">شرح کالا یا خدمات خریداری شده</th>
                  <th className="py-2.5 px-3">دسته‌بندی</th>
                  <th className="py-2.5 px-3 text-center">تعداد / مقدار</th>
                  <th className="py-2.5 px-3 text-center">واحد</th>
                  <th className="py-2.5 px-3">قیمت واحد (تومان)</th>
                  <th className="py-2.5 px-4 text-left">قیمت کل (تومان)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(invoice.items || []).map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 text-center font-mono text-slate-400 font-bold">{idx + 1}</td>
                    <td className="py-2.5 px-4 font-bold text-slate-900">{item.itemName}</td>
                    <td className="py-2.5 px-3 text-slate-500 font-medium">{item.categoryName || '-'}</td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800">{item.quantity}</td>
                    <td className="py-2.5 px-3 text-center text-slate-600">{item.unit || 'عدد'}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-700">
                      {formatPersianPrice(item.unitPrice)}
                    </td>
                    <td className="py-2.5 px-4 text-left font-mono font-black text-slate-900">
                      {formatPersianPrice(item.totalPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Calculation Box */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col gap-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-bold">جمع کل اقلام خرید:</span>
              <span className="font-mono font-bold text-slate-800 text-sm">
                {formatPersianPrice(invoice.totalAmount)} تومان
              </span>
            </div>

            {invoice.totalDiscount > 0 && (
              <div className="flex items-center justify-between text-rose-700">
                <span className="font-bold">تخفیف دریافتی:</span>
                <span className="font-mono font-bold">
                  -{formatPersianPrice(invoice.totalDiscount)} تومان
                </span>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <span className="text-slate-800 font-black text-sm">مبلغ کل قابل پرداخت:</span>
              <span className="font-mono font-black text-base text-slate-950">
                {formatPersianPrice(totalPayable)} تومان
              </span>
            </div>

            <div className="flex items-center justify-between text-emerald-800">
              <span className="font-bold">مبلغ پرداخت شده نقدی:</span>
              <span className="font-mono font-bold">
                {formatPersianPrice(invoice.totalPaid || 0)} تومان
              </span>
            </div>

            {remaining > 0 ? (
              <div className="flex items-center justify-between text-amber-900 font-black bg-amber-100/70 p-2 rounded-xl border border-amber-300">
                <span>مانده بدهی به فروشنده:</span>
                <span className="font-mono text-sm">{formatPersianPrice(remaining)} تومان</span>
              </div>
            ) : (
              <div className="flex items-center justify-between text-emerald-800 font-bold bg-emerald-100/60 p-1.5 rounded-xl border border-emerald-300 text-[11px]">
                <span>وضعیت تسویه حساب:</span>
                <span>فاکتور به طور کامل تسویه شده است</span>
              </div>
            )}

            <div className="pt-2 text-[11px] text-slate-500 font-medium border-t border-slate-200">
              مبلغ نهایی به حروف: <span className="font-bold text-slate-700">{numberToWordsPersian(totalPayable)} تومان</span>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="bg-amber-50/50 rounded-xl p-3 border border-amber-200 text-xs text-amber-950 font-medium">
              <span className="font-bold block mb-1">یادداشت فاکتور:</span>
              {invoice.notes}
            </div>
          )}

          {/* Signatures */}
          <div className="pt-6 grid grid-cols-2 text-center text-xs text-slate-500">
            <div>
              <p className="font-bold text-slate-700">امضا و تایید خریدار (اقامتگاه)</p>
              <div className="h-16"></div>
            </div>
            <div>
              <p className="font-bold text-slate-700">امضا و تایید فروشنده / تامین‌کننده</p>
              <div className="h-16"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (standaloneMode) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      {content}
    </div>
  );
};
