import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Gemini AI Voice Invoice Parser Endpoint
app.post('/api/parse-invoice-voice', async (req, res) => {
  try {
    const { transcript, catalog = [], customerTitle = 'مهمان' } = req.body;
    if (!transcript || typeof transcript !== 'string' || !transcript.trim()) {
      return res.status(400).json({ error: 'متن صوتی ارسالی خالی است' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.json({ fallback: true, message: 'No Gemini API key provided' });
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `شما یک دستیار هوشمند، بسیار دقیق و مسلط به زبان فارسی و اصطلاحات اقامتگاه‌های بوم‌گردی و رستوران‌ها و فروشگاه‌های ایران هستید.
وظیفه شما استخراج اطلاعات صورتحساب / فاکتور از متن پیاده‌سازی شده صدای گوینده است.

عنوان خریدار در سیستم: ${customerTitle}
کاتالوگ کالاهای موجود اقامتگاه:
${JSON.stringify(
  catalog.map((c: any) => ({
    id: c.id,
    name: c.name,
    unit: c.unit,
    basePrice: c.basePrice,
    categoryName: c.categoryName
  })),
  null,
  2
)}

متن صوتی ورودی کاربر:
"${transcript}"

دستورالعمل‌ها:
1. نام شخص یا شرکت یا مهمان/خریدار را استخراج کنید (مثلا "آقای مسعود ملایی"، "خانواده رضایی"، "مهمان اتاق شاه‌نشین").
2. شماره تماس در صورت ذکر شدن (مثلا 0913... یا 0912...) را استخراج کنید.
3. تمام اقلام، کالاها و خدمات ذکر شده را با دقت به ردیف‌های مجزا تبدیل کنید.
   - نام کالا: در صورت تطابق با کاتالوگ، نام کاتالوگ؛ در غیر این صورت نام گفته شده در صوت (مثلا "دیزی سنگی"، "اقامت در سوئیت سنتی"، "چای و قلیان").
   - تعداد (quantity): عدد صحیح بر اساس گفتار (مثلا دو = 2، سه = 3).
   - واحد (unit): مثل "پرس"، "عدد"، "شب"، "دست"، "وعده"، "کیلو"، "بطری".
   - قیمت واحد (unitPrice): به تومان. اگر کالا در کاتالوگ بود، قیمت کاتالوگ را قرار دهید. اگر گوینده قیمتی اعلام کرد، آن قیمت به تومان را قرار دهید.
4. آیا فاکتور پیش‌فاکتور (رزرو/استعلام) است یا نهایی؟ status: "FINAL" یا "PROFORMA".
5. آیا فاکتور خرید (هزینه) است یا فاکتور فروش؟ isPurchase: true / false.

خروجی باید صرفاً یک آبجکت معتبر JSON خالص بدون هیچ توضیح دیگری باشد:
{
  "customerName": "نام شخص یا مهمان",
  "phone": "شماره تلفن در صورت وجود",
  "status": "FINAL",
  "isPurchase": false,
  "items": [
    {
      "itemName": "دیزی سنگی",
      "quantity": 2,
      "unit": "پرس",
      "unitPrice": 250000,
      "discountPercent": 0,
      "description": ""
    }
  ],
  "notes": "توضیحات کلی در صورت وجود"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '{}';
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      // Clean potential code block markdown
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      data = JSON.parse(cleaned);
    }

    return res.json({ success: true, data });
  } catch (err: any) {
    console.error('Error in /api/parse-invoice-voice:', err);
    return res.status(200).json({ fallback: true, error: err.message });
  }
});

// Vite middleware & static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
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
