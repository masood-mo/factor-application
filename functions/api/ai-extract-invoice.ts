// Cloudflare Pages Function: /api/ai-extract-invoice
// Serverless AI endpoint using Google Gemini for Cloudflare Pages

export async function onRequestPost(context: { env: { GEMINI_API_KEY?: string }; request: Request }) {
  const apiKey = context.env.GEMINI_API_KEY || '';
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'GEMINI_API_KEY environment variable is not configured in Cloudflare Pages settings' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const { message, catalog, audioBase64, audioMimeType } = (await context.request.json()) as any;

    const catalogContext = (catalog || [])
      .map((item: any) => `- نام: "${item.name}" | قیمت پایه: ${item.price} تومان | دسته‌بندی: ${item.category}`)
      .join('\n');

    const systemPrompt = `تو یک حسابدار ارشد، بسیار دقیق و باهوش در نرم‌افزار حسابداری و مدیریت اقامتگاه‌های بوم‌گردی، هتل‌ها و رستوران‌های سنتی هستی.
وظیفه تو استخراج دقیق اقلام و اطلاعات فاکتور از صحبت‌های شفاهی کاربر به زبان فارسی است.

کاتالوگ کالاها و خدمات تعریف‌شده در سیستم اقامتگاه:
${catalogContext || 'کاتالوگی تعریف نشده است.'}

قواعد بسیار حیاتی و غیرقابل نقض (Zero Hallucination):
1. عدم تغییر و تحریف نام کالا: نام کالاها و خدمات را دقیقاً بر اساس آنچه کاربر می‌گوید ثبت کن. هرگز نام کالایی که کاربر گفته را به کالای متفاوتی در کاتالوگ تحریف نکن.
2. اقلام جدید خارج از کاتالوگ: اگر کالایی در کاتالوگ بالا نبود، isNewItem را true قرار بده.
3. تفکیک نام مشتری، تاریخ، اقلام، تعداد و قیمت واحد به تومان.
4. خروجی فقط و فقط باید به صورت JSON معتبر و بدون هیچ متن اضافی یا مارک‌داون باشد.`;

    const parts: any[] = [];
    if (message) {
      parts.push({ text: `متن صدای کاربر یا درخواست متنی:\n"${message}"\n\nفاکتور را به فرمت JSON استخراج کن.` });
    }

    if (audioBase64) {
      parts.push({
        inlineData: {
          mimeType: audioMimeType || 'audio/webm',
          data: audioBase64,
        },
      });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    let parsedJson;
    try {
      parsedJson = JSON.parse(candidateText.replace(/```json/g, '').replace(/```/g, '').trim());
    } catch {
      parsedJson = { raw: candidateText };
    }

    return new Response(JSON.stringify(parsedJson), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
