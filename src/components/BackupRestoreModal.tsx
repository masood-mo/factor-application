import React, { useState, useRef } from 'react';
import {
  Download,
  Upload,
  Database,
  CheckCircle2,
  AlertTriangle,
  X,
  FileJson,
  Loader2,
  Calendar,
  Layers,
  Users,
  Receipt,
  ShoppingBag,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import {
  FullBackupData,
  createFullDatabaseBackup,
  downloadDatabaseBackup,
  restoreDatabase
} from '../services/backupService';
import { toPersianDigits, formatPersianPrice } from '../utils/persianDate';

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataRestored?: () => Promise<void> | void;
}

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({
  isOpen,
  onClose,
  onDataRestored,
}) => {
  const [activeTab, setActiveTab] = useState<'backup' | 'restore'>('backup');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null);

  // Restore states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedBackup, setParsedBackup] = useState<FullBackupData | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreSuccessMessage, setRestoreSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDownloadBackup = async () => {
    setIsExporting(true);
    setExportSuccessMessage(null);
    try {
      const fileName = await downloadDatabaseBackup();
      setExportSuccessMessage(`نسخه پشتیبان با نام «${fileName}» با موفقیت در پوشه دانلودهای شما ذخیره شد.`);
    } catch (err: any) {
      console.error('Backup download error:', err);
      alert('خطا در تهیه نسخه پشتیبان: ' + (err?.message || 'لطفاً دوباره تلاش فرمایید.'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setParseError(null);
    setParsedBackup(null);
    setRestoreSuccessMessage(null);

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (!parsed || typeof parsed !== 'object' || !parsed.data) {
        throw new Error('ساختار فایل انتخاب‌شده معتبر نیست. این فایل حاوی اطلاعات پشتیبان معتبر اقامتگاه نمی‌باشد.');
      }

      setParsedBackup(parsed as FullBackupData);
    } catch (err: any) {
      setParseError(err?.message || 'فایل نامعتبر است یا در خواندن آن خطایی رخ داده است.');
      setParsedBackup(null);
    }
  };

  const handleApplyRestore = async () => {
    if (!parsedBackup) return;

    const confirmed = window.confirm(
      'آیا از بازیابی این نسخه پشتیبان اطمینان دارید؟ تمام فاکتورها، اطلاعات مهمانان و تنظیمات با داده‌های این فایل به‌روزرسانی خواهند شد.'
    );
    if (!confirmed) return;

    setIsRestoring(true);
    setParseError(null);
    setRestoreSuccessMessage(null);

    try {
      const result = await restoreDatabase(parsedBackup);
      if (result.success) {
        setRestoreSuccessMessage(result.message);
        if (onDataRestored) {
          await onDataRestored();
        }
      } else {
        setParseError(result.message);
      }
    } catch (err: any) {
      console.error('Restore error:', err);
      setParseError('خطا در فرآیند بازیابی: ' + (err?.message || 'لطفاً دوباره امتحان کنید.'));
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-amber-900/15 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        style={{ direction: 'rtl' }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-950 via-amber-900 to-amber-950 text-white p-5 sm:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-800/80 flex items-center justify-center text-amber-200 border border-amber-700/50 shadow-inner">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight">پشتیبان‌گیری و بازیابی پایگاه داده</h2>
              <p className="text-[11px] sm:text-xs text-amber-200/80 mt-0.5">
                حفظ امنیت کامل اطلاعات، دانلود نسخه آفلاین روی کامپیوتر و بازیابی در صورت نیاز
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-amber-300/80 hover:text-white p-1.5 rounded-xl hover:bg-amber-800/50 transition-colors"
            title="بستن پنجره"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50/80 p-2 gap-2 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('backup')}
            className={`flex-1 py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'backup'
                ? 'bg-white text-amber-950 shadow-xs border border-amber-900/10'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Download className="w-4 h-4 text-amber-800" />
            <span>پشتیبان‌گیری (دانلود فایل JSON)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('restore')}
            className={`flex-1 py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'restore'
                ? 'bg-white text-amber-950 shadow-xs border border-amber-900/10'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Upload className="w-4 h-4 text-amber-800" />
            <span>بازیابی اطلاعات (آپلود فایل JSON)</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-5">
          {activeTab === 'backup' ? (
            /* TAB 1: BACKUP */
            <div className="space-y-4">
              <div className="bg-amber-50/60 rounded-2xl p-4 border border-amber-900/15 text-xs text-amber-950 leading-relaxed flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">تهیه نسخه پشتیبان آفلاین روی کامپیوتر شما:</p>
                  <p className="text-slate-600 mt-1">
                    با کلیک روی دکمه زیر، فایل کاملی از تمامی اطلاعات شامل فاکتورهای فروش و خرید، پرونده مهمانان، کاتالوگ اقلام و خدمات، چک‌های صیادی، دستمزد پرسنل، حساب‌های سرمایه‌گذاران و تنظیمات اقامتگاه به صورت استاندارد در قالب یک فایل با پسوند <span className="font-mono font-bold text-amber-900">.json</span> روی رایانه شما ذخیره می‌شود.
                  </p>
                </div>
              </div>

              {exportSuccessMessage && (
                <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 text-xs text-emerald-900 flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                  <div className="leading-relaxed font-medium">
                    {exportSuccessMessage}
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-center">
                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  disabled={isExporting}
                  className="w-full sm:w-auto px-8 py-3.5 bg-amber-800 hover:bg-amber-900 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-amber-900/20 hover:shadow-xl transition-all cursor-pointer disabled:opacity-60"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>در حال آماده‌سازی و ساخت فایل پشتیبان...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      <span>دانلود نسخه پشتیبان کامل از دیتابیس (JSON)</span>
                    </>
                  )}
                </button>
              </div>

              <div className="text-[11px] text-slate-500 text-center">
                توصیه می‌شود هر هفته یا پس از ثبت دوره‌ای فاکتورها، یک نسخه پشتیبان دانلود و در رایانه خود نگهداری فرمایید.
              </div>
            </div>
          ) : (
            /* TAB 2: RESTORE */
            <div className="space-y-4">
              <div className="bg-rose-50/60 rounded-2xl p-4 border border-rose-200 text-xs text-rose-950 leading-relaxed flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">نکات بسیار مهم قبل از بازیابی:</p>
                  <ul className="list-disc list-inside text-rose-900/90 mt-1 space-y-1">
                    <li>فقط فایل‌های خروجی با پسوند JSON که توسط همین سیستم صادر شده‌اند را انتخاب فرمایید.</li>
                    <li>با تایید بازیابی، داده‌های این فایل در حافظه محلی و پایگاه داده فایربیس جایگزین خواهند شد.</li>
                    <li>پیش از بازیابی، جهت اطمینان می‌توانید از وضعیت فعلی سیستم نیز یک پشتیبان دانلود فرمایید.</li>
                  </ul>
                </div>
              </div>

              {/* File Input Box */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-amber-900/25 hover:border-amber-800 rounded-3xl p-6 text-center cursor-pointer transition-colors bg-amber-50/20 hover:bg-amber-50/50"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mb-2">
                  <FileJson className="w-6 h-6" />
                </div>
                <p className="text-xs font-black text-slate-800">
                  {selectedFile ? selectedFile.name : 'انتخاب یا کشیدن فایل پشتیبان (JSON) به اینجا'}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  برای انتخاب فایل پشتیبان از روی کامپیوتر خود کلیک نمایید
                </p>
              </div>

              {parseError && (
                <div className="bg-rose-50 border border-rose-300 rounded-2xl p-4 text-xs text-rose-900 flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
                  <div className="leading-relaxed font-bold">{parseError}</div>
                </div>
              )}

              {restoreSuccessMessage && (
                <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 text-xs text-emerald-900 flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                  <div className="leading-relaxed font-bold">{restoreSuccessMessage}</div>
                </div>
              )}

              {/* Parsed File Preview */}
              {parsedBackup && !restoreSuccessMessage && (
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      مشخصات فایل پشتیبان شناسایی‌شده:
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      نسخه {parsedBackup.version || '1.0'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-[11px]">
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                      <span className="text-slate-500 block">نام اقامتگاه:</span>
                      <span className="font-bold text-slate-800 truncate block mt-0.5">
                        {parsedBackup.lodgeName || parsedBackup.data?.settings?.lodgeName || '—'}
                      </span>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                      <span className="text-slate-500 block">تاریخ خروجی:</span>
                      <span className="font-bold text-slate-800 block mt-0.5 font-mono">
                        {parsedBackup.exportedAtJalali ? toPersianDigits(parsedBackup.exportedAtJalali) : '—'}
                      </span>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                      <span className="text-slate-500 block">فاکتورهای فروش:</span>
                      <span className="font-bold text-emerald-700 block mt-0.5 font-mono">
                        {toPersianDigits(parsedBackup.data?.salesInvoices?.length || 0)} عدد
                      </span>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                      <span className="text-slate-500 block">فاکتورهای خرید:</span>
                      <span className="font-bold text-blue-700 block mt-0.5 font-mono">
                        {toPersianDigits(parsedBackup.data?.purchaseInvoices?.length || 0)} عدد
                      </span>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                      <span className="text-slate-500 block">پرونده مهمانان:</span>
                      <span className="font-bold text-amber-800 block mt-0.5 font-mono">
                        {toPersianDigits(parsedBackup.data?.guests?.length || 0)} نفر
                      </span>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                      <span className="text-slate-500 block">اقلام و خدمات:</span>
                      <span className="font-bold text-purple-700 block mt-0.5 font-mono">
                        {toPersianDigits((parsedBackup.data?.items?.length || 0) + (parsedBackup.data?.purchaseItems?.length || 0))} قلم
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={handleApplyRestore}
                      disabled={isRestoring}
                      className="w-full sm:w-auto px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-60"
                    >
                      {isRestoring ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>در حال ذخیره و بازیابی در پایگاه داده...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>تایید و اعمال بازیابی اطلاعات در سیستم</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            سیستم مدیریت یکپارچه اقامتگاه بوم‌گردی خانه برزک
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs transition-colors cursor-pointer"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
};
