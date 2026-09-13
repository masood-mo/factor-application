import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Sparkles, Check, AlertCircle, RefreshCw, X, Edit3, Plus, Trash2, Volume2 } from 'lucide-react';
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
    items: Array<{ itemName: string; quantity: number; unitPrice: number; unit: string; isNewCatalogItem?: boolean }>;
    notes: string;
  } | null>(null);

  // Audio recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Speech recognition refs
  const recognitionRef = useRef<any>(null);
  const isRecordingRef = useRef<boolean>(false);
  const baseTextRef = useRef<string>('');
  const timerRef = useRef<any>(null);

  // Initialize Web Speech API for live transcription preview
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'fa-IR';

        recognition.onresult = (event: any) => {
          let currentSessionFinal = '';
          let currentSessionInterim = '';

          // Reconstruct cleanly from event.results to prevent duplicate words
          for (let i = 0; i < event.results.length; i++) {
            const res = event.results[i];
            if (res[0] && res[0].transcript) {
              if (res.isFinal) {
                currentSessionFinal += res[0].transcript.trim() + ' ';
              } else {
                currentSessionInterim += res[0].transcript.trim() + ' ';
              }
            }
          }

          const combined = (
            baseTextRef.current +
            ' ' +
            currentSessionFinal +
            ' ' +
            currentSessionInterim
          )
            .replace(/\s+/g, ' ')
            .trim();

          if (combined) {
            setTranscript(combined);
          }
        };

        recognition.onerror = (event: any) => {
          if (event.error === 'no-speech') {
            return;
          }
          if (event.error === 'not-allowed') {
            setErrorMessage('دسترسی به میکروفون غیرفعال است. لطفاً در مرورگر اجازه دسترسی دهید.');
          } else {
            console.warn('Speech recognition status:', event.error);
          }
        };

        recognition.onend = () => {
          // If still marked as recording, update base text with what was captured
          if (isRecordingRef.current) {
            baseTextRef.current = transcript.trim();
            // Re-start gracefully only if still recording
            try {
              recognition.start();
            } catch (e) {
              // already running or stopped
            }
          }
        };

        recognitionRef.current = recognition;
      } catch (err) {
        console.warn('SpeechRecognition init error:', err);
      }
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

  const startRecording = async () => {
    setErrorMessage('');
    setExtractedPreview(null);
    baseTextRef.current = transcript.trim();
    isRecordingRef.current = true;
    setIsRecording(true);

    // 1. Start MediaRecorder for lossless continuous audio capture
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        audioChunksRef.current = [];

        let mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported('audio/webm')) {
          if (MediaRecorder.isTypeSupported('audio/mp4')) {
            mimeType = 'audio/mp4';
          } else {
            mimeType = '';
          }
        }

        const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };
        recorder.start(250);
        mediaRecorderRef.current = recorder;
      }
    } catch (err: any) {
      console.warn('MediaRecorder permission or error:', err);
    }

    // 2. Start SpeechRecognition for real-time text feedback on screen
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        // already started
      }
    }
  };

  const stopRecording = () => {
    isRecordingRef.current = false;
    setIsRecording(false);

    // Stop MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }

    // Stop audio stream tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    // Stop Speech Recognition
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

  // Convert Persian/Arabic digits to Latin
  const toEnglishDigits = (str: string): string => {
    return str
      .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776))
      .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));
  };

  // High-Precision Persian NLP parser fallback if Gemini is offline
  const parseLocallyWithPersianNLP = (text: string) => {
    let raw = text.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();

    // 1. Customer Name
    let customerName = '';
    const nameMatch = raw.match(
      /(?:برای|به\s+نام|مهمان|آقای|خانم|مشتری)\s+([آ-یa-zA-Z\s]+?)(?:\s+(?:و|با|شامل|به\s+تعداد|شماره|تعداد|قیمت|دو|سه|یک|چهار|پنج|\d|[۰-۹]|ثبت|بزن|بنویس))/i
    );
    if (nameMatch && nameMatch[1]) {
      customerName = nameMatch[1].trim();
      raw = raw.replace(nameMatch[0], ' ');
    } else {
      const simpleNameMatch = raw.match(/(?:برای|به\s+نام)\s+([آ-یa-zA-Z]{3,25})/);
      if (simpleNameMatch && simpleNameMatch[1]) {
        customerName = simpleNameMatch[1].trim();
        raw = raw.replace(simpleNameMatch[0], ' ');
      } else {
        customerName = `${customerTitle} گرامی`;
      }
    }

    // 2. Phone
    const phoneMatch = raw.match(/(?:09|۰۹)[0-9۰-۹]{9}/);
    const phone = phoneMatch ? toEnglishDigits(phoneMatch[0]) : '';
    if (phoneMatch) {
      raw = raw.replace(phoneMatch[0], ' ');
    }

    const wordNums: Record<string, number> = {
      یک: 1, یه: 1, '۱': 1, '1': 1,
      دو: 2, '۲': 2, '2': 2,
      سه: 3, '۳': 3, '3': 3,
      چهار: 4, '۴': 4, '4': 4,
      پنج: 5, '۵': 5, '5': 5,
      شش: 6, شیش: 6, '۶': 6, '6': 6,
      هفت: 7, '۷': 7, '7': 7,
      هشت: 8, '۸': 8, '8': 8,
      نه: 9, '۹': 9, '9': 9,
      ده: 10, '۱۰': 10, '10': 10,
    };

    // 3. Split by natural Persian separators
    const rawSegments = raw
      .split(/(?:\s+و\s+|\s*،\s*|\s*,\s*|\n|\s+سپس\s+|\s+همچنین\s+)/)
      .map((s) => s.trim())
      .filter((s) => s.length > 1);

    const detectedItems: Array<{
      itemName: string;
      quantity: number;
      unitPrice: number;
      unit: string;
      isNewCatalogItem?: boolean;
      catalogItemId?: string;
      suggestedCategoryName?: string;
    }> = [];

    for (const seg of rawSegments) {
      let segClean = seg
        .replace(/^(?:یک\s+فاکتور\s+بزن|ثبت\s+کن|بنویس|فاکتور|لطفاً)\s*/, '')
        .replace(/(?:ثبت\s+کن|بزن|باشه|ممنون)$/, '')
        .trim();

      if (!segClean || segClean.length < 2) continue;

      let unitPrice = 0;
      const priceMatch = segClean.match(/(\d+|[۰-۹]+)(?:\s*(هزار|میلیون))?\s*(?:تومان|تومن|ریال)?/);
      if (priceMatch) {
        const rawNum = parseInt(toEnglishDigits(priceMatch[1]), 10);
        const scale = priceMatch[2];
        if (scale === 'هزار') {
          unitPrice = rawNum * 1000;
          segClean = segClean.replace(priceMatch[0], ' ').trim();
        } else if (scale === 'میلیون') {
          unitPrice = rawNum * 1000000;
          segClean = segClean.replace(priceMatch[0], ' ').trim();
        } else if (rawNum >= 1000) {
          unitPrice = rawNum;
          segClean = segClean.replace(priceMatch[0], ' ').trim();
        }
      }

      let quantity = 1;
      let unit = 'عدد';
      const qtyUnitMatch = segClean.match(
        /^(\d+|[۰-۹]+|یک|یه|دو|سه|چهار|پنج|شش|شیش|هفت|هشت|نه|ده)\s*(شب|پرس|عدد|دست|وعده|کیلو|بطری|قوری|بسته|نفر\/شب)?\s*(?:تا)?\s*(.*)$/
      );
      let itemName = segClean;

      if (qtyUnitMatch) {
        const numStr = qtyUnitMatch[1];
        quantity = wordNums[numStr] || parseInt(toEnglishDigits(numStr), 10) || 1;
        if (qtyUnitMatch[2]) {
          unit = qtyUnitMatch[2];
        }
        if (qtyUnitMatch[3]) {
          itemName = qtyUnitMatch[3].trim();
        }
      }

      itemName = itemName
        .replace(/^(?:از|در|برای)\s+/, '')
        .replace(/\s+(?:تومان|تومن|هزار|میلیون)$/, '')
        .trim();

      if (!itemName) continue;

      // Strict matching to prevent replacing items with wrong ones
      const directMatch = itemsCatalog.find(
        (cat) => cat.name.trim().toLowerCase() === itemName.toLowerCase()
      );

      const closeMatch = !directMatch
        ? itemsCatalog.find((cat) => {
            const cName = cat.name.trim().toLowerCase();
            const iName = itemName.toLowerCase();
            if (iName.includes('چلوکباب') && !cName.includes('چلوکباب')) return false;
            if (iName.includes('کالجوش') && !cName.includes('کالجوش')) return false;
            return cName === iName;
          })
        : null;

      const matchedCat = directMatch || closeMatch;

      if (matchedCat) {
        detectedItems.push({
          itemName: matchedCat.name,
          quantity,
          unitPrice: unitPrice > 0 ? unitPrice : matchedCat.basePrice || 0,
          unit: matchedCat.unit || unit,
          isNewCatalogItem: false,
          catalogItemId: matchedCat.id,
        });
      } else {
        let suggestedCategory = 'سایر خدمات و پذیرایی اختصاصی';
        if (/کباب|خورشت|کالجوش|دیزی|غذا|شام|ناهار|صبحانه|پرس|سوپ|پلو|ماست|سالاد|شربت|دمنوش/.test(itemName)) {
          suggestedCategory = 'رستوران و نوشیدنی‌های سنتی';
          if (unit === 'عدد') unit = 'پرس';
        } else if (/صنایع\s*دستی|سوغات|عرقیجات|گلاب|دست‌آفرید|فرش|گلیم|سفال/.test(itemName)) {
          suggestedCategory = 'دست‌آفرید و صنایع دستی برزک';
        } else if (/اقامت|سوئیت|اتاق|شب|رزرو/.test(itemName)) {
          suggestedCategory = 'اقامت و صبحانه محلی';
          if (unit === 'عدد') unit = 'نفر/شب';
        }

        detectedItems.push({
          itemName,
          quantity,
          unitPrice,
          unit,
          isNewCatalogItem: true,
          suggestedCategoryName: suggestedCategory,
        });
      }
    }

    return {
      customerName: customerName || `${customerTitle} گرامی`,
      phone,
      items: detectedItems,
      notes: '',
    };
  };

  // Convert audio blob to base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = reader.result as string;
        const base64 = res.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Main parse function: calls Gemini 3.8 Flash server API
  const handleProcessVoiceText = async () => {
    stopRecording();

    if (!transcript.trim() && audioChunksRef.current.length === 0) {
      setErrorMessage('لطفاً ابتدا صحبت کنید یا متن فاکتور را در کادر زیر بنویسید.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      let audioBase64 = '';
      let audioMimeType = '';
      if (audioChunksRef.current.length > 0) {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: audioChunksRef.current[0].type || 'audio/webm',
        });
        audioMimeType = audioBlob.type || 'audio/webm';
        audioBase64 = await blobToBase64(audioBlob);
      }

      // 1. Call server-side Gemini 3.8 Flash
      const res = await fetch('/api/parse-invoice-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: transcript.trim(),
          audioBase64: audioBase64 || undefined,
          audioMimeType: audioMimeType || undefined,
          catalog: itemsCatalog,
          customerTitle,
        }),
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
              unit: it.unit || 'عدد',
              isNewCatalogItem: Boolean(it.isNewCatalogItem),
              catalogItemId: it.catalogItemId || undefined,
              suggestedCategoryName: it.suggestedCategoryName || undefined,
            })),
            notes: parsed.notes || '',
          });
          setIsProcessing(false);
          return;
        }
      }
    } catch (e) {
      console.warn('Gemini 3.8 Flash request error:', e);
    }

    // 2. Client-side fallback if server fails
    const localResult = parseLocallyWithPersianNLP(transcript);
    setExtractedPreview(localResult);
    setIsProcessing(false);
  };

  const handleApplyExtractedData = () => {
    if (!extractedPreview) return;

    onApplyParsedInvoice({
      type: 'SALES',
      customerOrVendorName: extractedPreview.customerName,
      phone: extractedPreview.phone,
      items: extractedPreview.items,
      notes: extractedPreview.notes,
    });

    onClose();
  };

  const samplePhrases = [
    '۲ شب اقامت برای مسعود و یک پرس چلوکباب ۸۰۰ هزار تومان و یک پرس کالجوش ۴۰۰ هزار تومان و صنایع دستی ۵۰۰ هزار تومان',
    '۳ پرس دیزی سنگی، ۲ قوری چای آتشی برای آقای ملایی',
    'یک شب اقامت در سوئیت سنتی و ناهار برای مهمان احمدی',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-xs no-print overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-amber-900/20 flex flex-col gap-4 text-right my-auto max-h-[95vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-amber-950/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-800 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                صدور فاکتور صوتی هوشمند
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                  مدل هوش مصنوعی Gemini 3.8
                </span>
              </h3>
              <p className="text-xs text-slate-500">صحبت کنید یا متن را بنویسید؛ هوش مصنوعی بدون تغییر اقلام فاکتور را می‌سازد</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Sample Phrases */}
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3 text-xs text-amber-900 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-amber-950 flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-amber-700" />
              نمونه جملات آماده (کلیک برای پر شدن فوری):
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            {samplePhrases.map((phrase, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setTranscript(phrase)}
                className="text-right p-2 rounded-xl bg-white/80 hover:bg-white border border-amber-200/60 text-slate-700 hover:text-amber-950 text-xs transition-all cursor-pointer leading-relaxed shadow-2xs"
              >
                «{phrase}»
              </button>
            ))}
          </div>
        </div>

        {/* Recording Visualizer & Button */}
        <div className="flex flex-col items-center justify-center py-4 gap-3 bg-slate-50 rounded-2xl border border-slate-200/70 p-4">
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
              {isRecording ? 'در حال ضبط صدا... لطفاً صحبت کنید' : 'برای شروع صحبت روی میکروفون بزنید'}
            </p>
            {isRecording ? (
              <div className="flex items-center justify-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
                <span className="text-xs font-mono font-bold text-rose-600">
                  {recordingSeconds} ثانیه ضبط زنده
                </span>
                <span className="text-[11px] text-slate-500">(قطع و وصل نمی‌شود)</span>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500">همچنین می‌توانید متن را مستقیماً در کادر زیر تایپ یا ویرایش کنید</p>
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
            className="w-full p-3 border border-amber-900/20 rounded-2xl text-xs focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700 outline-hidden bg-white font-sans leading-relaxed text-slate-800"
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
                اطلاعات استخراج شده توسط هوش مصنوعی:
              </span>
              <span className="text-[11px] font-bold text-emerald-800">
                طرف‌حساب: {extractedPreview.customerName}
              </span>
            </div>

            <div className="max-h-40 overflow-y-auto space-y-1.5">
              {extractedPreview.items.map((it, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs text-slate-800 ${
                    it.isNewCatalogItem
                      ? 'bg-amber-100/90 border-amber-300 shadow-2xs'
                      : 'bg-white border-emerald-100'
                  }`}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{idx + 1}. {it.itemName}</span>
                    {it.isNewCatalogItem && (
                      <span className="text-[10px] bg-amber-200 text-amber-950 border border-amber-400 font-black px-1.5 py-0.2 rounded-md">
                        کالای جدید (افزوده می‌شود)
                      </span>
                    )}
                  </div>
                  <span className="font-bold text-slate-700">
                    {it.quantity} {it.unit} {it.unitPrice > 0 ? `| ${it.unitPrice.toLocaleString('fa-IR')} تومان` : '(بدون قیمت)'}
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
                disabled={(!transcript.trim() && audioChunksRef.current.length === 0) || isProcessing}
                className="flex items-center gap-2 bg-amber-800 hover:bg-amber-900 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-50 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
                    <span>تحلیل با Gemini 3.8...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>تحلیل و استخراج هوشمند فاکتور</span>
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
                <span>اعمال در فرم فاکتور و تایید نهایی</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
