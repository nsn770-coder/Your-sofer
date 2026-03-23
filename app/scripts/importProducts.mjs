import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createReadStream } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { parse } from 'csv-parse';

const __dirname = dirname(fileURLToPath(import.meta.url));

const serviceAccount = JSON.parse(
  await import('fs').then(fs => fs.promises.readFile(join(__dirname, 'serviceAccount.json'), 'utf8'))
);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

function readCSV(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    createReadStream(filePath, 'utf8')
      .pipe(parse({ columns: true, skip_empty_lines: true, trim: true }))
      .on('data', (row) => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
}

async function importProducts() {
  const csvPath = join(__dirname, 'products_import.csv');
  console.log('קורא קובץ:', csvPath);
  const rows = await readCSV(csvPath);
  console.log('נמצאו ' + rows.length + ' שורות');

  let added = 0, updated = 0, skipped = 0;

  for (const row of rows) {
    const name = row['name'] || '';
    const price = parseFloat(row['price'] || '0');

    if (!name || isNaN(price) || price <= 0) {
      skipped++;
      continue;
    }

    const data = {
      name,
      cat: row['cat'] || 'כללי',
      price,
      status: 'active',
    };

    if (row['was']) data.was = parseFloat(row['was']);
    if (row['desc']) data.desc = row['desc'];
    if (row['badge']) data.badge = row['badge'];
    if (row['days']) data.days = row['days'];
    if (row['imgUrl'] || row['imgurl']) data.imgUrl = row['imgUrl'] || row['imgurl'];
    if (row['imgUrl2'] || row['imgurl2']) data.imgUrl2 = row['imgUrl2'] || row['imgurl2'];
    if (row['imgUrl3'] || row['imgurl3']) data.imgUrl3 = row['imgUrl3'] || row['imgurl3'];
    if (row['soferId'] || row['soferid']) data.soferId = row['soferId'] || row['soferid'];

    const existingId = row['id'] || '';

    try {
      if (existingId) {
        await db.collection('products').doc(existingId).set(data, { merge: true });
        updated++;
        if (updated % 10 === 0) console.log('עודכנו: ' + updated);
      } else {
        data.createdAt = new Date();
        await db.collection('products').add(data);
        added++;
        if (added % 10 === 0) console.log('נוספו: ' + added);
      }
    } catch (e) {
      console.error('שגיאה במוצר ' + name + ': ' + e.message);
      skipped++;
    }
  }

  console.log('סיום!');
  console.log('נוספו: ' + added);
  console.log('עודכנו: ' + updated);
  console.log('דולגו: ' + skipped);
  process.exit(0);
}

importProducts().catch(e => { console.error(e); process.exit(1); });
