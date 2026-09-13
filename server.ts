import express from 'express';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { ZipArchive } from 'archiver';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Download Full Project Source Code as ZIP
app.get('/api/download-zip', (req, res) => {
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="factor-application.zip"');

  const archive = new ZipArchive({
    zlib: { level: 9 },
  });

  archive.on('error', (err) => {
    console.error('Archive error:', err);
    if (!res.headersSent) {
      res.status(500).send({ error: err.message });
    }
  });

  archive.pipe(res);

  archive.glob('**/*', {
    cwd: process.cwd(),
    dot: true,
    ignore: [
      'node_modules/**',
      'dist/**',
      '.git/**',
      'bun.lock',
      'bun.lockb',
      '**/*.log',
      'factor-application.zip',
    ],
  });

  archive.finalize();
});

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Gemini AI Voice Invoice Parser Endpoint
app.post('/api/parse-invoice-voice', async (req, res) => {
  try {
    const { transcript, audioBase64, audioMimeType, catalog = [], customerTitle = 'مهمان' } = req.body;
    if ((!transcript || typeof transcript !== 'string' || !transcript.trim()) && !audioBase64) {
      return res.status(400).json({ error: 'متن صوتی یا فایل صوتی ارسالی خالی است' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY is not set in environment.');
      return res.json({ fallback: true, message: 'No Gemini API key provided' });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const catalogSummary = catalog.map((c: any) => ({
      id: c.id,
      name: c.name,
      unit: c.unit,
      basePrice: c.basePrice,
      categoryName: c.categoryName,
    }));

    const systemInstruction = `شما یک دستیار هوش مصنوعی فوق‌العاده باهوش، مسلط به زبان فارسی و با دقت حسابداری ۱۰۰٪ (Zero Hallucination) برای اقامتگاه بوم‌گردی و رستوران سنتی ایرانی هستید.
وظیفه شما استخراج دقیق اقلام فاکتور از صحبت‌های گفتاری یا متن ورودی و تطبیق هوشمند با کاتالوگ یا شناسایی کالاهای جدید است.

قوانین حیاتی:
۱. عدم حدس و عدم تغییر نام کالاها (Zero Hallucination):
- فقط و فقط مواردی که کاربر صریحاً ذکر کرده را استخراج کنید.
- هرگز نباید کلمه‌ای که کاربر نگفته را اختراع، تعویض یا به کاتالوگ تحمیل کنید.
- اگر کاربر گفت «۲ شب اقامت برای مسعود و یک چلوکباب ۸۰۰ هزار تومن و یک کالجوش ۴۰۰ تومن و صنایع دستی ۵۰۰ تومن»:
  * اقامت باید دقیقاً «اقامت» با تعداد ۲ باشد (نه اینکه به نام سوئیت‌های خاص کاتالوگ تغییر کند).
  * «چلوکباب» باید دقیقاً «چلوکباب» باشد (به کباب شامی یا اقلام دیگر تغییر نکند).
  * «کالجوش» و «صنایع دستی» باید دقیقاً با همان نام استخراج شوند.

۲. تطبیق با کاتالوگ و کالای جدید:
- اگر نام کالا با یکی از اقلام کاتالوگ همخوانی دقیق یا بسیار بالا دارد (مثلا «چای» برای «چای آتشی»)، isNewCatalogItem: false قرار دهید و catalogItemId را شناسه آن کالا بگذارید.
- اگر کالا در کاتالوگ نیست یا تفاوت اساسی دارد (مانند چلوکباب، کالجوش، دیزی، صنایع دستی)، isNewCatalogItem: true و catalogItemId: null بگذارید و فیلد suggestedCategoryName را با یکی از دسته‌بندی‌های مناسب (مانند «رستوران و نوشیدنی‌های سنتی»، «دست‌آفرید و صنایع دستی برزک»، «اقامت و صبحانه محلی»، «سایر خدمات و پذیرایی اختصاصی») پر کنید.

۳. مبالغ، قیمت واحد و تفکیک نام کالا:
- کلمات قیمت (مانند «۳۵۰ هزار تومن»، «۴۰۰ تومن»، «۸۰۰ هزار تومان»، «۵۰۰ هزار») به هیچ عنوان نباید به عنوان بخشی از نام کالا در نظر گرفته شوند!
- به عنوان مثال:
  * ورودی: «کالجوش ۳ پرس ۳۵۰ هزار تومن» ->
    itemName: "کالجوش"
    quantity: 3
    unit: "پرس"
    unitPrice: 350000
    (هرگز نام کالا را "کالجوش ۳۵۰ هزار تومن" یا مشابه آن نگذارید!)
  * ورودی: «دیزی سنگی ۲ دست ۴۵۰ تومن» ->
    itemName: "دیزی سنگی"
    quantity: 2
    unit: "دست"
    unitPrice: 450000
  * ورودی: «۲ شب اقامت هر شب ۱ میلیون و ۵۰۰ هزار تومان» ->
    itemName: "اقامت"
    quantity: 2
    unit: "شب"
    unitPrice: 1500000
- تمام قیمت‌ها به تومان و عدد صحیح باشند («۳۵۰ هزار تومن» -> 350000).
- اگر برای کالایی قیمتی ذکر نشده و در کاتالوگ هم نیست، unitPrice را 0 قرار دهید.
- اگر کالا در کاتالوگ است و کاربر قیمت جدیدی نگفت، از basePrice کاتالوگ استفاده کنید. اگر کاربر قیمتی گفت، قیمت کاربر بر قیمت کاتالوگ اولویت دارد.

۴. نام مشتری:
- نام شخص یا مشتری (مثلاً مسعود، آقای ملایی) در customerName قرار گیرد. در غیر این صورت "${customerTitle} گرامی".

۵. یادداشت:
- متن گفتار یا نام اقلام را در فیلد notes تکرار نکنید.`;

    const promptText = `کاتالوگ اقلام سیستم:
${JSON.stringify(catalogSummary, null, 2)}

عنوان طرف‌حساب: ${customerTitle}

${transcript ? `متن ورودی گوینده:\n"${transcript}"` : 'لطفاً صدای ضبط‌شده پیوست را با دقت گوش داده و اقلام فاکتور را استخراج کنید.'}

فرمت خروجی صرفاً یک شیء JSON با ساختار زیر باشد:
{
  "customerName": "نام مشتری یا '${customerTitle} گرامی'",
  "phone": "شماره همراه در صورت ذکر شدن یا خالی",
  "items": [
    {
      "itemName": "نام دقیق کالا یا خدمت",
      "quantity": 1,
      "unit": "واحد مثل پرس، شب، نفر/شب، عدد",
      "unitPrice": 800000,
      "isNewCatalogItem": false,
      "catalogItemId": "شناسه کاتالوگ یا null",
      "suggestedCategoryName": "نام دسته پیشنهادی",
      "discountPercent": 0,
      "description": ""
    }
  ],
  "notes": ""
}`;

    let contentsPayload: any;
    if (audioBase64) {
      contentsPayload = {
        parts: [
          {
            inlineData: {
              mimeType: audioMimeType || 'audio/webm',
              data: audioBase64,
            },
          },
          { text: promptText },
        ],
      };
    } else {
      contentsPayload = promptText;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: contentsPayload,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '{}';
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      data = JSON.parse(cleaned);
    }

    console.log('Gemini 3.8 Flash successfully parsed invoice:', data?.items?.length, 'items');
    return res.json({ success: true, data });
  } catch (err: any) {
    console.error('Error in /api/parse-invoice-voice with Gemini 3.8 Flash:', err);
    return res.status(200).json({ fallback: true, error: err.message });
  }
});

// Vite middleware & static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
