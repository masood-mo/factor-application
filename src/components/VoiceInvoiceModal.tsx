import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Sparkles, Check, AlertCircle, RefreshCw, X, Edit3, Plus, Trash2 } from 'lucide-react';
import { Item, Category } from '../types';

interface VoiceInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemsCatalog: Item[];
  categories: Category[];
  customerTitle: string;
  onApplyParsedInvoice: (parsedData: {
    type: 'SALES' | 'PURCHASE';
    customerOrVendorName: string;
    phone?: string;
    items: Array<{
      itemName: string;
      quantity: number;
      unitPrice: number;
      unit?: string;
      discountPercent?: number;
      description?: string;
    }>;
    notes?: string;
  }) => void;
}

export function VoiceInvoiceModal({
  isOpen,
  onClose,
  itemsCatalog,
  categories,
  customerTitle,
  onApplyParsedInvoice,
}: VoiceInvoiceModalProps) {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [extractedPreview, setExtractedPreview] = useState<{
    customerName: string;
    phone: string;
    items: Array<{ itemName: string; quantity: number; unitPrice: number; unit: string }>;
    notes: string;
  } | null>(null);

  const recognitionRef = useRef<any>(null);
  const isRecordingRef = useRef<boolean>(false);
  const timerRef = useRef<any>(null);

  // Initialize Web Speech API
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'fa-IR';

      recognition.onresult = (event: any) => {
        let full = '';
        for (let i = 0; i < event.results.length; ++i) {
          full += event.results[i][0].transcript + ' ';
        }
        if (full.trim()) {
          setTranscript(full.trim());
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition warning/error:', event.error);
        if (event.error === 'not-allowed') {
          setErrorMessage('دسترسی به میکروفون داده نشده است. لطفاً در تنظیمات مرورگر اجازه دهید.');
          stopRecording();
        }
      };

      // When browser speech recognition automatically pauses/ends, auto-restart if user hasn't explicitly stopped!
      recognition.onend = () => {
        if (isRecordingRef.current) {
          try {
            recognition.start();
          } catch (e) {
            // Ignore if already active
          }
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      stopRecording();
    };
  }, []);

  // Timer effect during recording
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordingSeconds(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  if (!isOpen) return null;

  const startRecording = () => {
    setErrorMessage('');
    setExtractedPreview(null);
    if (!recognitionRef.current) {
      setErrorMessage('مرورگر شما از قابلیت تبدیل صوت پشتیبانی نمی‌کند. می‌توانید متن را در کادر زیر تایپ کنید.');
      return;
    }

    try {
      isRecordingRef.current = true;
      setIsRecording(true);
      recognitionRef.current.start();
    } catch (err) {
      console.warn('Start recording err:', err);
    }
  };

  const stopRecording = () => {
    isRecordingRef.current = false;
    setIsRecording(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Enhanced Persian NLP parser fallback when Gemini is offline/unavailable
  const parseLocallyWithPersianNLP = (text: string) => {
    const clean = text.replace(/,/g, '').trim();

    // 1. Extract Name (e.g. آقای مسعود ملایی، مهمان علیرضا افشار، خانم صبوری)
    let customerName = '';
    const nameMatch = clean.match(/(?:برای|به نام|مهمان|آقای|خانم|مشتری|خریدار)\s+([آ-یa-zA-Z\s]+?)(?:\s+(?:با|شامل|به تعداد|شماره|تعداد|قیمت|دو|سه|یک|چهار|پنج|\d|ثبت|بزن|بنویس))/i);
    if (nameMatch && nameMatch[1]) {
      customerName = nameMatch[1].trim();
    } else {
      const simpleNameMatch = clean.match(/(?:برای|به نام)\s+([آ-ی\s]{3,30})/);
      if (simpleNameMatch && simpleNameMatch[1]) {
        customerName = simpleNameMatch[1].trim();
      } else {
        customerName = `${customerTitle} گرامی`;
      }
    }

    // 2. Extract Phone (09... or ۰۹...)
    const phoneMatch = clean.match(/(?:09|۰۹)[0-9۰-۹]{9}/);
    const phone = phoneMatch ? phoneMatch[0] : '';

    // 3. Persian number mapping
    const persianWordNums: Record<string, number> = {
      'یک': 1, 'یه': 1, '۱': 1, '1': 1,
      'دو': 2, '۲': 2, '2': 2,
      'سه': 3, '۳': 3, '3': 3,
      'چهار': 4, '۴': 4, '4': 4,
      'پنج': 5, '۵': 5, '5': 5,
      'شش': 6, 'شیش': 6, '۶': 6, '6': 6,
      'هفت': 7, '۷': 7, '7': 7,
      'هشت': 8, '۸': 8, '8': 8,
      'نه': 9, '۹': 9, '9': 9,
      'ده': 10, '۱۰': 10, '10': 10,
      'یازده': 11, 'دوازده': 12, 'سیزده': 13, 'چهارده': 14, 'پانزده': 15,
      'بیست': 20, 'سی': 30, 'چهل': 40, 'پنجاه': 50
    };

    // 4. Extract Items: Split by conjunctions
    const parts = clean.split(/(?: و |\s*,\s*|،|\n|سپس|همچنین|همینطور)/);
    const detectedItems: Array<{ itemName: string; quantity: number; unitPrice: number; unit: string }> = [];

    // First, try matching catalog items across parts or full text
    itemsCatalog.forEach((catItem) => {
      const keywords = catItem.name.split(' ').filter(w => w.length > 2);
      const isMatch = keywords.some(k => clean.includes(k));

      if (isMatch) {
        // Find quantity associated with this item
        let qty = 1;
        const qtyRegex = new RegExp(`(\\d+|یک|یه|دو|سه|چهار|پنج|شش|شیش|هفت|هشت|نه|ده|پانزده|بیست)\\s*(?:عدد|پرس|نفر|شب|دست|کیلو|بطری|وعده|قوری|قوطی)?\\s*(?:تا)?\\s*${keywords[0]}`, 'i');
        const m = clean.match(qtyRegex);
        if (m && m[1]) {
          qty = persianWordNums[m[1]] || parseInt(m[1], 10) || 1;
        }

        // Avoid duplicate items
        if (!detectedItems.some(i => i.itemName === catItem.name)) {
          detectedItems.push({
            itemName: catItem.name,
            quantity: qty,
            unitPrice: catItem.basePrice || 0,
            unit: catItem.unit || 'عدد'
          });
        }
      }
    });

    // If no catalog items matched, extract spoken phrases into custom items
    if (detectedItems.length === 0) {
      parts.forEach((p) => {
        const trimmed = p.trim();
        if (trimmed.length > 3 && !trimmed.includes('فاکتور') && !trimmed.includes('ثبت کن')) {
          let qty = 1;
          const m = trimmed.match(/(\d+|یک|یه|دو|سه|چهار|پنج|شش|هفت|هشت|نه|ده)\s*(?:تا|عدد|پرس|نفر|شب|دست)?\s+(.+)/);
          let name = trimmed;
          let unit = 'عدد';

          if (m && m[1]) {
            qty = persianWordNums[m[1]] || parseInt(m[1], 10) || 1;
            name = m[2].trim();
          }

          if (name.includes('دیزی') || name.includes('غذا') || name.includes('کباب') || name.includes('صبحانه')) unit = 'پرس';
          else if (name.includes('اقامت') || name.includes('اتاق') || name.includes('سوئیت')) unit = 'شب';
          else if (name.includes('چای') || name.includes('دمنوش')) unit = 'وعده';
          else if (name.includes('گلاب') || name.includes('عرق')) unit = 'بطری';

          detectedItems.push({
            itemName: name,
            quantity: qty,
            unitPrice: 0,
            unit
          });
        }
      });
    }

    // Ultimate fallback if still empty
    if (detectedItems.length === 0) {
      detectedItems.push({
        itemName: 'سفارش اقامت و پذیرایی',
        quantity: 1,
        unitPrice: 0,
        unit: 'خدمت'
      });
    }

    return {
      customerName,
      phone,
      items: detectedItems,
      notes: `ثبت صوتی: "${clean.substring(0, 120)}"`
    };
  };

  // Main parse function: calls Gemini server API first, falls back to Persian NLP
  const handleProcessVoiceText = async () => {
    if (!transcript.trim()) {
      setErrorMessage('لطفاً ابتدا صحبت کنید یا متن فاکتور را تایپ نمایید.');
      return;
    }

    stopRecording();
    setIsProcessing(true);
    setErrorMessage('');

    try {
      // 1. Try server-side Gemini AI parsing
      const res = await fetch('/api/parse-invoice-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          catalog: itemsCatalog,
          customerTitle
        })
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data && json.data.items && json.data.items.length > 0) {
          const parsed = json.data;
          setExtractedPreview({
            customerName: parsed.customerName || `${customerTitle} گرامی`,
            phone: parsed.phone || '',
            items: parsed.items.map((it: any) => ({
              itemName: it.itemName || it.name || 'کالای ثبت شده',
              quantity: Number(it.quantity) || 1,
              unitPrice: Number(it.unitPrice) || 0,
              unit: it.unit || 'عدد'
            })),
            notes: parsed.notes || `ثبت صوتی: "${transcript.substring(0, 100)}"`
          });
          setIsProcessing(false);
          return;
        }
      }
    } catch (e) {
      console.warn('Gemini server parser skipped or offline, using local parser:', e);
    }

    // 2. Client-side Persian NLP parser fallback
    const localResult = parseLocallyWithPersianNLP(transcript);
    setExtractedPreview(localResult);
    setIsProcessing(false);
  };

  // Confirm and apply to invoice form
  const handleApplyExtractedData = () => {
    if (!extractedPreview) return;

    onApplyParsedInvoice({
      type: 'SALES',
      customerOrVendorName: extractedPreview.customerName,
      phone: extractedPreview.phone,
      items: extractedPreview.items,
      notes: extractedPreview.notes
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-xs no-print overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-amber-900/20 flex flex-col gap-4 text-right my-auto max-h-[95vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-amber-950/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-800 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">صدور فاکتور با صدای شما (هوشمند)</h3>
              <p className="text-xs text-slate-500">جملات خود را بگویید تا اقلام و مبالغ خودکار استخراج شوند</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Guidance Box */}
        <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-3 text-xs text-amber-900 flex flex-col gap-1.5 leading-relaxed">
          <p className="font-bold flex items-center gap-1.5 text-amber-950">
            <Sparkles className="w-4 h-4 text-amber-700" />
            نمونه جملات صوتی قابل بیان:
          </p>
          <p className="text-amber-800 font-sans">
            «یک فاکتور برای آقای مسعود ملایی ثبت کن، دو پرس دیزی سنگی، یک شب اقامت در سوئیت سنتی و دو قوری چای آتشی»
          </p>
        </div>

        {/* Recording Visualizer & Button */}
        <div className="flex flex-col items-center justify-center py-3 gap-3 bg-slate-50 rounded-2xl border border-slate-200/60 p-4">
          <button
            type="button"
            onClick={toggleRecording}
            className={`relative w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all cursor-pointer ${
              isRecording
                ? 'bg-rose-600 text-white ring-8 ring-rose-200 animate-pulse scale-105'
                : 'bg-amber-800 hover:bg-amber-900 text-white ring-4 ring-amber-100'
            }`}
          >
            {isRecording ? <MicOff className="w-8 h-8 text-white" /> : <Mic className="w-8 h-8 text-amber-200" />}
          </button>
          
          <div className="text-center space-y-1">
            <p className="text-sm font-bold text-slate-800">
              {isRecording ? 'در حال ضبط صدا... لطفاً صحبت کنید' : 'برای شروع ضبط صدا روی میکروفون کلیک کنید'}
            </p>
            {isRecording && (
              <div className="flex items-center justify-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
                <span className="text-xs font-mono font-bold text-rose-600">
                  {recordingSeconds} ثانیه ضبط پیوسته
                </span>
                <span className="text-[11px] text-slate-500">(هنگام مکث قطع نمی‌شود)</span>
              </div>
            )}
          </div>

          {isRecording && (
            <button
              type="button"
              onClick={stopRecording}
              className="mt-1 px-4 py-1.5 rounded-xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-700 transition-all cursor-pointer"
            >
              پایان صحبت و توقف میکروفون
            </button>
          )}
        </div>

        {/* Transcript Text Box */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            متن صدای ضبط شده (یا ویرایش دستی):
          </label>
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="صدای شما به متن تبدیل شده و اینجا نمایش داده می‌شود، یا می‌توانید مستقیماً متن را اینجا تایپ کنید..."
            rows={3}
            className="w-full p-3 border border-amber-900/20 rounded-2xl text-xs focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700 outline-hidden bg-white font-sans leading-relaxed"
          />
        </div>

        {errorMessage && (
          <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Extracted Preview Table */}
        {extractedPreview && (
          <div className="bg-emerald-50/70 border border-emerald-300 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
              <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-700" />
                اطلاعات استخراج شده از صوت:
              </span>
              <span className="text-[11px] font-bold text-emerald-800">
                {customerTitle}: {extractedPreview.customerName}
              </span>
            </div>

            <div className="max-h-36 overflow-y-auto space-y-1.5">
              {extractedPreview.items.map((it, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between bg-white px-3 py-1.5 rounded-xl border border-emerald-100 text-xs text-slate-800"
                >
                  <span className="font-semibold">{idx + 1}. {it.itemName}</span>
                  <span className="font-mono text-emerald-800 font-bold">
                    {it.quantity} {it.unit} {it.unitPrice > 0 ? `| ${it.unitPrice.toLocaleString('fa-IR')} تومان` : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => {
              setTranscript('');
              setExtractedPreview(null);
            }}
            className="px-3 py-2 text-slate-500 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-all cursor-pointer"
          >
            پاک کردن
          </button>

          <div className="flex items-center gap-2">
            {!extractedPreview ? (
              <button
                type="button"
                onClick={handleProcessVoiceText}
                disabled={!transcript.trim() || isProcessing}
                className="flex items-center gap-2 bg-amber-800 hover:bg-amber-900 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-50 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
                    <span>در حال استخراج هوشمند اقلام...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>تحلیل و استخراج فاکتور</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleApplyExtractedData}
                className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
              >
                <Check className="w-4 h-4 text-white" />
                <span>اعمال در فرم فاکتور و تایید</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
