// scripts/test-loyalty-accrual.mjs
// Simulates loyalty points accrual without touching any database.
// Run: node scripts/test-loyalty-accrual.mjs

const TIER_CONFIG = {
  bronze: { id: 'bronze', label: 'ברונזה', accrualRate: 10, minSpent: 0,    maxSpent: 1399 },
  silver: { id: 'silver', label: 'כסף',   accrualRate: 10, minSpent: 1400,  maxSpent: 3599 },
  gold:   { id: 'gold',   label: 'זהב',   accrualRate: 12, minSpent: 3600,  maxSpent: null },
};

function getTier(totalSpent) {
  if (totalSpent >= 3600) return TIER_CONFIG.gold;
  if (totalSpent >= 1400) return TIER_CONFIG.silver;
  return TIER_CONFIG.bronze;
}

function simulate({ prevSpent, prevPoints, total, shippingCost, cartItems, silverBonusGranted, goldBonusGranted }) {
  const currentTier = getTier(prevSpent);
  const baseAmount  = Math.max(0, total - (shippingCost || 0));
  const kippotBase  = cartItems.filter(i => i.cat === 'כיפות').reduce((s, i) => s + i.price * i.quantity, 0);
  const regularBase = Math.max(0, baseAmount - kippotBase);
  const pointsEarned = Math.floor(kippotBase * 0.05) + Math.floor(regularBase * currentTier.accrualRate / 100);
  const newTotalSpent = prevSpent + baseAmount;
  const newTier = getTier(newTotalSpent);

  const bonuses = [];
  if (newTier.id !== 'bronze' && !silverBonusGranted) bonuses.push({ amount: 200, reason: 'silver_bonus' });
  if (newTier.id === 'gold'   && !goldBonusGranted)   bonuses.push({ amount: 400, reason: 'gold_bonus'   });
  const bonusTotal = bonuses.reduce((s, b) => s + b.amount, 0);

  return { currentTier: currentTier.id, newTier: newTier.id, baseAmount, kippotBase, regularBase, pointsEarned, bonusTotal, totalPoints: pointsEarned + bonusTotal, newTotalSpent, newPoints: prevPoints + pointsEarned + bonusTotal, bonuses };
}

const scenarios = [
  {
    name: 'ברונזה — עגלה מעורבת (כיפות + מזוזה)',
    prevSpent: 0, prevPoints: 0, total: 350, shippingCost: 35,
    cartItems: [
      { name: 'כיפה', price: 20, quantity: 10, cat: 'כיפות' },   // 200
      { name: 'מזוזה', price: 80, quantity: 1,  cat: 'מזוזה'  },  //  80
      { name: 'ספר',  price: 35, quantity: 1,  cat: ''        },  //  35
    ],
  },
  {
    name: 'חצייה לכסף מ-₪1300 (בונוס 200 נקודות)',
    prevSpent: 1300, prevPoints: 130, total: 200, shippingCost: 0,
    cartItems: [{ name: 'תפילין', price: 200, quantity: 1, cat: 'תפילין' }],
  },
  {
    name: 'זהב — הזמנת כיפות גדולה (5% בלבד, בונוסים כבר ניתנו)',
    prevSpent: 4000, prevPoints: 520, total: 500, shippingCost: 0,
    silverBonusGranted: true, goldBonusGranted: true,
    cartItems: [{ name: 'כיפה', price: 5, quantity: 100, cat: 'כיפות' }],
  },
  {
    name: 'ברונזה → זהב בקנייה אחת (בונוס כסף + זהב)',
    prevSpent: 0, prevPoints: 0, total: 4000, shippingCost: 35,
    cartItems: [{ name: 'ספר תורה', price: 4000, quantity: 1, cat: '' }],
  },
  {
    name: 'אורח בלי חשבון (לוגיקה: accruePoints מחזיר מוקדם)',
    prevSpent: 0, prevPoints: 0, total: 150, shippingCost: 35,
    cartItems: [{ name: 'מזוזה', price: 150, quantity: 1, cat: 'מזוזה' }],
    isGuest: true,
  },
];

for (const s of scenarios) {
  if (s.isGuest) {
    console.log(`\n${s.name}`);
    console.log('  → uid=null, אין משתמש — accruePoints מדלג בשקט');
    continue;
  }
  const r = simulate(s);
  console.log(`\n${s.name}`);
  console.log(`  tier: ${r.currentTier} → ${r.newTier} | base: ₪${r.baseAmount} (kippot: ₪${r.kippotBase}, regular: ₪${r.regularBase})`);
  console.log(`  pointsEarned: ${r.pointsEarned} | bonus: ${r.bonusTotal}${r.bonuses.length ? ' (' + r.bonuses.map(b => b.reason).join('+') + ')' : ''} | total: ${r.totalPoints}`);
  console.log(`  newPoints: ${r.newPoints} | newTotalSpent: ₪${r.newTotalSpent}`);
}
