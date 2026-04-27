import puppeteer from 'puppeteer';
import { createWriteStream } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function scrapeRabbis() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  console.log('Loading page...');
  await page.goto('https://irk.org.il/map/', { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 3000));

  // Scroll until no new cards appear
  console.log('Scrolling to load all cards...');
  let prevCount = 0;
  let stableRounds = 0;

  while (stableRounds < 5) {
    // Scroll in smaller increments for lazy-load triggers
    for (let s = 0; s < 5; s++) {
      await page.evaluate(() => window.scrollBy(0, 600));
      await new Promise(r => setTimeout(r, 400));
    }
    await new Promise(r => setTimeout(r, 1500));

    const count = await page.evaluate(
      () => document.querySelectorAll('a[href*="whatsapp.com/send?phone="]').length
    );

    if (count === prevCount) {
      stableRounds++;
    } else {
      console.log(`  Cards found so far: ${count}`);
      stableRounds = 0;
      prevCount = count;
    }
  }

  console.log(`Total WhatsApp links loaded: ${prevCount}`);

  // Extract data
  const data = await page.evaluate(() => {
    const seen = new Set();
    const results = [];

    const waLinks = document.querySelectorAll('a[href*="whatsapp.com/send?phone="]');

    waLinks.forEach(link => {
      const phone = link.href.replace(/.*phone=/, '').trim();

      // Walk up the DOM to find a container with at least 2 h2 headings
      let searchEl = link;
      for (let i = 0; i < 35; i++) {
        searchEl = searchEl?.parentElement;
        if (!searchEl) break;
        const headings = searchEl.querySelectorAll('h2.elementor-heading-title');
        if (headings.length >= 2) {
          const city = headings[0].textContent.trim();
          const rabbiName = headings[1].textContent.trim();
          const key = `${city}|${rabbiName}|${phone}`;
          if (!seen.has(key)) {
            seen.add(key);
            results.push({ city, rabbi_name: rabbiName, whatsapp_number: phone });
          }
          break;
        }
      }
    });

    return results;
  });

  await browser.close();

  // Write CSV
  const outputPath = join(__dirname, 'rabbis_list.csv');
  const stream = createWriteStream(outputPath, { encoding: 'utf8' });

  // BOM for Excel Hebrew compatibility
  stream.write('\uFEFF');
  stream.write('city,rabbi_name,whatsapp_number\n');

  for (const row of data) {
    const city = `"${row.city.replace(/"/g, '""')}"`;
    const name = `"${row.rabbi_name.replace(/"/g, '""')}"`;
    const phone = `"${row.whatsapp_number}"`;
    stream.write(`${city},${name},${phone}\n`);
  }

  stream.end();

  console.log(`\nSaved ${data.length} rabbis to rabbis_list.csv`);
  data.forEach(r => console.log(`  ${r.city} | ${r.rabbi_name} | ${r.whatsapp_number}`));
}

scrapeRabbis().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
