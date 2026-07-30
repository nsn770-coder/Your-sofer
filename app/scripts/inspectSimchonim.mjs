/**
 * inspectSimchonim.mjs
 *
 * לראות את ה-HTML של Simchonim כדי להבין את המבנה
 */

import fetch from 'node-fetch';

async function inspect() {
  const url = 'https://simchonim.co.il/product-catalog/%d7%9b%d7%9c-%d7%94%d7%a1%d7%99%d7%93%d7%95%d7%a8%d7%99%d7%9d/';

  console.log('Fetching:', url, '\n');

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });

  const html = await res.text();

  // חפש אחר מוצרים - הדפס חלקים עם context
  console.log('=== Looking for product containers ===\n');

  // חפש דוגמאות של potential product elements
  const patterns = [
    { name: '<li class="product', regex: /<li[^>]*class="[^"]*product[^"]*"[^>]*>[\s\S]{0,500}?<\/li>/gi },
    { name: '<div class="product', regex: /<div[^>]*class="[^"]*product[^"]*"[^>]*>[\s\S]{0,500}?<\/div>/gi },
    { name: '<article class="product', regex: /<article[^>]*class="[^"]*product[^"]*"[^>]*>[\s\S]{0,500}?<\/article>/gi },
    { name: 'href="/product', regex: /<a[^>]*href="\/[^"]*product[^"]*"[^>]*>[\s\S]{0,200}?<\/a>/gi },
  ];

  for (const { name, regex } of patterns) {
    const matches = [...html.matchAll(regex)];
    if (matches.length > 0) {
      console.log(`\n✓ Found ${matches.length} matches for: ${name}`);
      console.log('First match:');
      console.log(matches[0][0].substring(0, 600));
      console.log('\n---\n');
      break;
    }
  }

  // חפש מחירים
  console.log('=== Looking for prices ===\n');
  const priceMatches = [...html.matchAll(/[₪$]?\s*[\d.,]+/g)].slice(0, 10);
  priceMatches.forEach((m, i) => {
    console.log(`${i + 1}. ${m[0]}`);
  });

  // חפש שמות מוצרים (טקסט בתוך h2, h3, etc)
  console.log('\n=== Looking for product names ===\n');
  const h2Matches = [...html.matchAll(/<h[2-3][^>]*>([^<]+)<\/h[2-3]>/gi)].slice(0, 10);
  h2Matches.forEach((m, i) => {
    console.log(`${i + 1}. ${m[1]}`);
  });
}

inspect().catch(console.error);
