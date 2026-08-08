import json

prices = json.load(open('scripts/supplier-prices.json'))
products = json.load(open('scripts/israel-judaica-products.json'))
scraped_skus = set(p['sku'] for p in products)
new_skus = [sku for sku in prices.keys() if sku not in scraped_skus]

print(f'SKUs in price file: {len(prices)}')
print(f'SKUs in scraped data: {len(scraped_skus)}')
print(f'NEW SKUs (not in scraped): {len(new_skus)}')
print()
for i, sku in enumerate(new_skus[:20], 1):
    print(f'{i}. {sku}: {prices[sku]}')
