import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';

interface ProductResult {
  id: string;
  name: string;
  price: number;
  imgUrl: string;
  cat: string;
}

const STAM_KEYWORD_MAP: { keywords: string[]; cat: string }[] = [
  { keywords: ['מזוזה', 'mezuzah', 'מזוזות', 'קלף מזוזה'], cat: 'קלפי מזוזה' },
  { keywords: ['תפילין', 'tefillin', 'תפלין', 'קומפלט'], cat: 'תפילין קומפלט' },
  { keywords: ['מגילה', 'megillah', 'מגילות', 'מגילת אסתר'], cat: 'מגילות' },
  { keywords: ['ספר תורה', 'sefer torah', 'ספרי תורה'], cat: 'ספרי תורה' },
];

const BASE_SYSTEM = `You are Shira (שירה), a warm and knowledgeable STaM and Judaica advisor \
for YourSofer.com — Israel's leading STaM marketplace.

Your personality:
- Warm, helpful, and patient
- Expert in STaM (Sifrei Torah, Tefillin, Mezuzot, Megillot)
- Knowledgeable in halacha relevant to purchasing STaM
- Speaks Hebrew naturally, can switch to English if needed
- Never pushy — guides customers to the right product for them

Your capabilities:
- Help customers choose between kashrut levels (כשר לכתחילה, מהודר, מהודר בתכלית)
- Explain nusach differences (אשכנזי, ספרדי, אדמוה"ז)
- Guide Bar Mitzvah families through tefillin selection
- Explain what makes a quality mezuzah scroll
- Recommend products based on budget and needs
- Answer halachic questions about STaM at a general level

When recommending products:
- Ask about budget, nusach, and purpose first
- Suggest the appropriate kashrut level
- Direct to relevant category pages with links
- Keep responses concise 2-4 sentences max unless asked for detail

You represent YourSofer where every STaM product is rabbinically \
supervised by Rav Binyamin Gelis and written by certified soferim.`;

async function getRelevantProducts(userMessage: string): Promise<ProductResult[]> {
  const lower = userMessage.toLowerCase();
  let matchedCat: string | null = null;
  for (const { keywords, cat } of STAM_KEYWORD_MAP) {
    if (keywords.some(kw => lower.includes(kw.toLowerCase()))) {
      matchedCat = cat;
      break;
    }
  }
  if (!matchedCat) return [];

  try {
    const db = getAdminDb();
    const snap = await db.collection('products')
      .where('status', '==', 'active')
      .where('cat', '==', matchedCat)
      .limit(50)
      .get();
    const docs = snap.docs.map(d => ({ id: d.id, ...(d.data() as Record<string, unknown>) }));
    docs.sort((a, b) => Number(b.priority ?? 0) - Number(a.priority ?? 0));
    return docs.slice(0, 3).map(p => ({
      id: String(p.id),
      name: String(p.name ?? ''),
      price: Number(p.price ?? 0),
      imgUrl: String((p.imgUrl as string) || (p.image_url as string) || ''),
      cat: String(p.cat ?? ''),
    }));
  } catch {
    return [];
  }
}

export async function GET() {
  return NextResponse.json({ status: 'shira route ok' });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages } = body as {
      messages: { role: string; content: string }[];
    };
    const userMessage = messages[messages.length - 1]?.content ?? '';

    const [aiResponse, products] = await Promise.all([
      fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY || '',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 400,
          system: BASE_SYSTEM,
          messages: messages.slice(-12),
        }),
      }),
      getRelevantProducts(userMessage),
    ]);

    if (!aiResponse.ok) {
      const errBody = await aiResponse.text();
      console.error('Shira Anthropic error:', aiResponse.status, errBody);
      throw new Error(`API error: ${aiResponse.status}`);
    }

    const data = await aiResponse.json();
    const message = data.content?.[0]?.text ?? 'סליחה, לא הצלחתי להגיב כרגע.';

    return NextResponse.json({
      message,
      ...(products.length > 0 && { products }),
    });
  } catch (error) {
    console.error('Shira API error:', error);
    return NextResponse.json(
      { message: 'סליחה, נתקלתי בבעיה קטנה. נסה שוב בעוד רגע 💛' },
      { status: 200 }
    );
  }
}
