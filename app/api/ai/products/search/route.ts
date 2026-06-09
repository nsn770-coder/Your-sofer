import { NextRequest, NextResponse } from 'next/server';
import { searchAiKnowledge } from '@/lib/aiProductSearch';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      query?: string;
      category?: string;
      minPrice?: number;
      maxPrice?: number;
      limit?: number;
    };

    const { query = '', category, minPrice, maxPrice, limit } = body;

    if (!query && !category) {
      return NextResponse.json({ error: 'query or category required' }, { status: 400 });
    }

    const results = await searchAiKnowledge(query, {
      category,
      minPrice,
      maxPrice,
      limit: Math.min(limit ?? 3, 10),
    });

    return NextResponse.json({ results });
  } catch (err) {
    console.error('[/api/ai/products/search]', err);
    return NextResponse.json({ results: [] });
  }
}
