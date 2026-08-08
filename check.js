const fs = require('fs');
const prices = JSON.parse(fs.readFileSync('scripts/supplier-prices.json', 'utf8'));
const products = JSON.parse(fs.readFileSync('scripts/israel-judaica-products.json', 'utf8'));
const scrapedSkus = new Set(products.map(p => p.sku));
const newSkus = Object.keys(prices).filter(sku => !scrapedSkus.has(sku));

console.log(SKUs in price file: );
console.log(SKUs in scraped data: );
console.log(NEW SKUs (not in scraped): \n);
newSkus.slice(0, 20).forEach((sku, i) => console.log(${i+1}. : ₪));
