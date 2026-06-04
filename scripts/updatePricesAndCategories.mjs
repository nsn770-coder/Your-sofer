/**
 * updatePricesAndCategories.mjs
 * Creates 6 new category docs + patches prices/categories for israel-judaica SKUs.
 *
 * Usage: node scripts/updatePricesAndCategories.mjs [--dry-run]
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DRY_RUN = process.argv.includes('--dry-run');

// ── Firebase Admin ────────────────────────────────────────────────────────────
const SA_PATH = 'C:/Users/Owner/Downloads/your-sofer-firebase-adminsdk-fbsvc-a682983bfd.json';
const serviceAccount = JSON.parse(readFileSync(SA_PATH, 'utf8'));
if (!getApps().length) initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// ── Pricing formula ───────────────────────────────────────────────────────────
function roundUp90(n) {
  const floored = Math.floor(n);
  const base = floored - (floored % 10);
  const candidate = base + 9.9;
  return candidate < n ? candidate + 10 : candidate;
}

function calcPrice(supplierPrice, isJewelry = false) {
  if (isJewelry) return roundUp90(supplierPrice * 3.18);
  let m;
  if (supplierPrice <= 10)       m = 3.00;
  else if (supplierPrice <= 150) m = 2.18;
  else if (supplierPrice <= 200) m = 1.98;
  else if (supplierPrice <= 399) m = 1.78;
  else                            m = 1.68;
  return roundUp90(supplierPrice * m);
}

// מחיר קבוע: מחיר_ספק_בשח × multiplier, מעוגל לשקל שלם
function calcPriceFixed(supplierPrice, multiplier) {
  return Math.round(supplierPrice * multiplier);
}

// ── New categories ────────────────────────────────────────────────────────────
const NEW_CATEGORIES = [
  { slug: 'netilat-yadaim',       name: 'נטילת ידיים',      displayName: 'נטילת ידיים' },
  { slug: 'paamotim',             name: 'פמוטים',            displayName: 'פמוטים' },
  { slug: 'kupot-tzedaka',        name: 'קופות צדקה',        displayName: 'קופות צדקה' },
  { slug: 'matzatim-melachiot',   name: 'מצתים ומלחיות',     displayName: 'מצתים ומלחיות' },
  { slug: 'atim',                 name: 'עטים',              displayName: 'עטים' },
  { slug: 'mapot-shulchan',       name: 'מפות שולחן',        displayName: 'מפות שולחן' },
];

// ── Raw SKU data (parsed below) ───────────────────────────────────────────────
const RAW = {
  'מצתים ומלחיות': {
    category: 'מצתים ומלחיות', subcategory: 'מצתים ומלחיות', isJewelry: false,
    raw: `UK80654:34.99 UK80657:34.99 UK46284:49.99 UK46285:49.99 UK48152:49.99 UK48153:49.99 UK83945:19.99 UK42427:16.99 UK54042:17.99 UK42476:24.99 UK48284:29.99 UK49272:26.99 UK40487:32.99 UK47812:26.99 UK47813:26.99 UK81650:32.99 UK81652:32.99 UK41716:32.99 UK41717:32.99 UK80998:32.99 UK81017:49.99 UK81065:32.99 UK40354:32.99 UK40485:32.99 UK40486:34.99 UK41504:26.99 UK40002:24.99 UK42611:24.99 UK42612:24.99 UK81468:24.99 UK42158:27.99 UK42159:27.99 UK81604:29.99 UK81825:29.99 UK81824:27.99 UK81826:27.99 UK82141:27.99 UK55841:46.99 UK55842:49.99 UK55843:49.99 UK42372:44.99 UK42373:44.99 UK81631:39.99 UK82604:46.99 UK42666:49.99 UK49229:49.99 UK49230:49.99 UK81258:49.99 UK40923:49.99 UK49227:49.99 UK49228:49.99 UK81488:49.99 UK42721:34.99 UK42722:34.99 UK42723:34.99 UK50088:36.99 UK82367:36.99 UK81343:39.99 UK81810:39.99 UK81811:39.99 UK81097:64.99 UK81098:64.99 UK49026:17.99 UK49032:17.99 UK49281:13.99 UK49282:13.99 UK45537:19.99 UK46190:24.99 UK81840:54.99 UK81841:54.99 UK82951:49.99 UK42430:49.99 UK42432:49.99 UK42433:49.99 UK42664:49.99 UK80951:39.99 UK80072:109.99 UK85349:21.99 UK85543:21.99 UK85736:21.99 UK86040:21.99 UK55650:32.99 UK81842:54.99 UK83299:49.99 UK82140:27.99 UK82155:49.99 UK82157:64.99 UK82156:49.99 UK82158:64.99 UK82953:49.99 UK51149:5.49 UK84273:5.49 UK80821:15.99 UK80822:13.99 UK80655:34.99 UK82997:54.99 UK83465:59.99 UK60266:34.99 UK60267:34.99 UK60268:34.99 UK60269:34.99`,
  },
  'נטילת ידיים': {
    category: 'נטילת ידיים', subcategory: 'נטילת ידיים', isJewelry: false,
    raw: `UK82834:59.99 UK82835:59.99 UK82836:59.99 UK48985:54.99 UK82721:11.99 UK49558:11.99 UK82705:11.99 UK82714:11.99 UK82760:11.99 UK48741:19.99 UK48743:19.99 UK48747:19.99 UK48806:19.99 UK42873:18.99 UK42874:18.99 UK48744:19.99 UK41007:34.99 UK42912:34.99 UK42914:34.99 UK42915:34.99 UK41008:34.99 UK41009:34.99 UK42918:39.99 UK42922:39.99 UK42916:39.99 UK42917:39.99 UK42921:39.99 UK42923:39.99 UK80664:59.99 UK80677:59.99 UK80678:59.99 UK80679:59.99 UK82018:59.99 UK82019:59.99 UK82020:59.99 UK80686:59.99 UK80687:59.99 UK80688:59.99 UK80689:59.99 UK42996:44.99 UK42997:44.99 UK48265:44.99 UK48266:44.99 UK42910:34.99 UK49144:44.99 UK80949:59.99 UK80950:59.99 UK42479:49.99 UK42929:44.99 UK42931:44.99 UK42477:49.99 UK42930:44.99 UK49136:44.99 UK49137:44.99 UK42902:39.99 UK42903:39.99 UK81408:44.99 UK83102:64.99 UK83104:64.99 UK83105:64.99 UK83119:64.99 UK83106:64.99 UK83107:64.99 UK83120:64.99 UK83634:64.99 UK82677:64.99 UK83132:64.99 UK83134:64.99 UK83138:64.99 UK82676:64.99 UK83131:64.99 UK83133:64.99 UK83137:64.99 UK83139:159.99 UK83140:159.99 UK83141:159.99 UK40592:39.99 UK40646:39.99 UK40655:39.99 UK40657:39.99 UK48986:44.99 UK40066:54.99 UK40068:54.99 UK67553:54.99 UK67552:54.99 UK81420:54.99 UK81421:54.99 UK81543:54.99 UK40069:54.99 UK40070:54.99 UK40594:54.99 UK48990:54.99 UK40065:54.99 UK47289:54.99 UK47290:54.99 UK45915:54.99 UK47288:54.99 UK49155:54.99 UK80378:54.99 UK41157:54.99 UK80076:54.99 UK80078:54.99 UK81544:54.99 UK42714:54.99 UK42715:54.99 UK42716:54.99 UK41134:54.99 UK42701:54.99 UK80397:54.99 UK80398:54.99 UK48161:54.99 UK48980:54.99 UK82584:59.99 UK82815:59.99 UK82816:59.99 UK82817:59.99 UK82588:59.99 UK82821:59.99 UK82828:59.99 UK82830:59.99 UK82591:59.99 UK82831:59.99 UK82832:59.99 UK82833:59.99 UK82818:59.99 UK82819:59.99 UK82820:59.99 UK82592:59.99 UK82594:59.99 UK82840:59.99 UK82841:59.99 UK82842:59.99 UK82590:59.99 UK82822:59.99 UK82823:59.99 UK82829:59.99 UK82695:59.99 UK82696:59.99 UK82824:59.99 UK82845:59.99 UK82593:59.99 UK82595:59.99 UK82837:59.99 UK82838:59.99 UK82589:59.99 UK82825:59.99 UK82826:59.99 UK82827:59.99 UK82596:59.99 UK82839:59.99 UK83321:59.99 UK81165:119.99 UK81166:119.99 UK81368:119.99 UK82770:129.99 UK82773:129.99 UK82771:129.99 UK82772:129.99 UK41245:49.99 UK41272:49.99 UK80877:49.99 UK80880:49.99 UK80879:49.99 UK80881:49.99 UK80883:54.99 UK80884:54.99 UK80887:54.99 UK41238:54.99 UK41271:54.99 UK41273:54.99 UK41276:49.99 UK41239:54.99 UK41246:54.99 UK80833:54.99 UK80909:39.99 UK80910:54.99 UK45374:39.99 UK80489:39.99 UK80500:39.99 UK56048:54.99 UK56049:54.99 UK86567:54.99 UK86568:54.99 UK86566:54.99 UK80320:54.99 UK80372:54.99 UK42699:54.99 UK80357:54.99 UK82243:54.99 UK82244:54.99 UK80379:54.99 UK80381:54.99 UK42707:54.99 UK42708:54.99 UK42710:54.99 UK42711:54.99 UK80394:54.99 UK82242:54.99 UK82246:59.99 UK48987:54.99 UK80917:54.99 UK80918:54.99 UK81355:54.99 UK40846:54.99 UK40858:54.99 UK41139:54.99 UK41146:54.99 UK40598:54.99 UK80922:54.99 UK80923:54.99 UK80924:54.99`,
  },
  'סידורים ותהילים': {
    category: 'ספרי קודש וסידורים', subcategory: 'סידורים ותהילים', isJewelry: false,
    raw: `UK48639:2.49 UK49957:7.99 UK51173:2.49 UK51175:2.49 UK51174:3.99 UK43174:3.99 UK51176:3.69 UK43600:2.99 UK43601:2.99 UK48105:3.69 UK48186:3.69 UK45541:13.99 UK52216:15.99 UK48187:13.99 UK80297:9.99 UK80298:9.99 UK81360:9.99 UK49849:54.99 UK81682:54.99 UK81683:54.99 UK81736:54.99 UK81681:54.99 UK42614:54.99 UK81679:54.99 UK81680:54.99 UK81735:54.99 UK81684:54.99 UK81685:54.99 UK81686:54.99 UK81737:54.99 UK42613:54.99 UK81667:54.99 UK81668:54.99 UK81677:54.99 UK83996:54.99 UK42616:49.99 UK81694:49.99 UK81695:49.99 UK81696:49.99 UK42615:49.99 UK81687:49.99 UK81688:49.99 UK49875:49.99 UK81689:49.99 UK81692:49.99 UK81693:49.99`,
  },
  'פמוטים': {
    category: 'פמוטים', subcategory: 'פמוטים', isJewelry: false,
    raw: `UK81981:109.99 UK44278:3.99 UK49466:3.99 UK52224:3.99 UK44071:8.49 UK44072:8.49 UK44073:8.49 UK51650:8.49 UK58223:8.49 UK58224:8.49 UK50389:34.99 UK83145:34.99 UK83146:34.99 UK49859:49.99 UK53724:49.99 UK49858:49.99 UK86870:49.99 UK41856:49.99 UK40430:44.99 UK40541:44.99 UK40126:29.99 UK41223:29.99 UK80333:79.99 UK81317:79.99 UK35968:79.99 UK81321:79.99 UK83142:109.99 UK83143:109.99 UK83144:109.99 UK81482:79.99 UK89354:89.99 UK47379:79.99 UK80940:79.99 UK81419:79.99 UK82606:79.99 UK40203:39.99 UK47378:79.99 UK47458:199.99 UK49941:59.99 UK49942:39.99 UK80615:39.99 UK82552:44.99 UK82553:44.99 UK42435:44.99 UK49496:19.99 UK49497:24.99 UK82041:54.99 UK82042:54.99 UK80700:44.99 UK81527:44.99 UK81528:44.99 UK59343:74.99 UK59346:74.99 UK82088:109.99 UK81633:109.99 UK81978:99.99 UK81979:119.99 UK81980:139.99 UK47192:149.99 UK47194:169.99 UK42975:99.99 UK42976:109.99 UK40177:10.99 UK40178:10.99 UK40179:10.99 UK40905:21.99 UK47918:11.99 UK80069:21.99 UK82724:19.99 UK82725:19.99 UK82726:19.99 UK82727:19.99 UK53375:49.99 UK82754:14.99 UK40158:13.99 UK45920:39.99 UK82753:12.99 UK44752:64.99 UK46896:32.99 UK55805:44.99 UK81109:109.99 UK82442:109.99 UK82443:109.99 UK81786:119.99 UK82232:119.99 UK82233:119.99 UK82571:119.99 UK82759:119.99 UK42124:139.99 UK80329:139.99 UK81471:139.99 UK80658:44.99 UK80660:44.99 UK82066:44.99 UK82067:44.99 UK44122:26.99 UK44795:36.99 UK40757:49.99 UK54303:64.99 UK81047:69.99 UK81048:69.99 UK40149:44.99 UK41421:79.99 UK41915:54.99 UK42500:59.99 UK40756:49.99 UK42160:64.99 UK43925:69.99 UK43975:69.99 UK46693:99.99 UK49255:34.99 UK49835:109.99 UK49838:109.99 UK49697:89.99 UK49698:109.99 UK49699:89.99 UK49201:149.99 UK49696:149.99 UK81819:44.99 UK82153:44.99 UK82154:44.99 UK42622:44.99 UK42623:44.99 UK81817:44.99 UK81818:44.99 UK81087:49.99 UK81820:49.99 UK81086:49.99 UK82954:49.99 UK42621:49.99 UK49205:49.99 UK81816:49.99 UK49202:39.99 UK49203:39.99 UK81257:49.99 UK81857:49.99 UK42428:29.99 UK42429:29.99 UK81469:29.99 UK41492:79.99 UK50046:89.99 UK50049:89.99 UK42401:64.99 UK42957:64.99 UK81593:64.99 UK80302:79.99 UK80471:79.99 UK81869:64.99 UK42626:74.99 UK42837:59.99 UK42123:74.99 UK42769:74.99 UK81870:74.99 UK40666:74.99 UK42343:59.99 UK49651:59.99 UK49652:59.99 UK50040:129.99 UK82078:129.99 UK83948:99.99 UK83949:99.99 UK49783:79.99`,
  },
  'קופות צדקה': {
    category: 'קופות צדקה', subcategory: 'קופות צדקה', isJewelry: false,
    raw: `UK40618:6.49 UK42770:29.99 UK80663:29.99 UK81192:99.99 UK82384:69.99 UK50067:69.99 UK40609:6.49 UK40622:6.49 UK40623:6.49 UK42385:6.49 UK40616:6.49 UK40617:6.49 UK00512:7.99 UK48546:7.99 UK49383:7.99 UK49384:7.99 UK40274:12.99 UK48549:7.99 UK48550:7.99 UK81358:49.99 UK81464:49.99 UK81465:49.99 UK81481:49.99 UK48975:54.99 UK80907:54.99 UK80908:54.99 UK81204:49.99 UK82195:49.99 UK82437:59.99 UK82438:59.99 UK46399:26.99 UK47261:32.99 UK53698:24.99 UK48442:29.99 UK48758:29.99 UK49734:32.99 UK42799:34.99 UK42800:34.99 UK81997:29.99 UK81383:29.99 UK81384:29.99 UK35944:34.99 UK35945:34.99 UK42906:34.99 UK49487:32.99 UK50072:69.99 UK50384:69.99 UK81124:69.99 UK82893:69.99 UK40094:99.99 UK40460:89.99 UK40461:89.99 UK41318:99.99 UK49215:99.99 UK49216:79.99 UK43655:49.99 UK45400:54.99 UK81990:89.99 UK82427:89.99 UK46823:79.99 UK47106:79.99 UK81935:79.99 UK35951:69.99 UK45481:149.99 UK46586:44.99 UK80859:69.99 UK81598:9.99 UK41805:12.99 UK81623:12.99 UK66714:12.99 UK67520:12.99`,
  },
  'תכשיטים': {
    category: 'תכשיטים', subcategory: 'תכשיטים', isJewelry: true,
    raw: `UK80965:79.99 UK80966:79.99 UK80967:79.99 UK80969:79.99 UK80986:79.99 UK80991:99.99 UK80970:79.99 UK80971:79.99 UK80974:99.99 UK80975:79.99 UK80987:79.99 UK80984:79.99 UK80990:79.99 UK82904:99.99 UK82908:99.99 UK82911:99.99 UK82905:89.99 UK82906:99.99 UK82907:89.99 UK82909:89.99 UK82910:89.99 UK82903:79.99 UK82912:99.99 UK82913:99.99 UK82914:89.99 UK80977:79.99 UK80978:79.99 UK80979:79.99 UK80992:79.99 UK80980:89.99 UK80981:89.99 UK80982:89.99 UK80993:89.99 UK80983:89.99 UK80997:99.99 UK81019:169.99 UK40371:10.99 UK40385:10.99 UK40893:10.99 UK41672:10.99 UK50454:13.99 UK41204:5.49 UK41324:5.49 UK41344:5.49 UK40000:5.49 UK40938:16.99 UK41323:6.99 UK47481:6.99 UK40937:16.99 UK47495:6.99 UK56009:49.99 UK59001:49.99 UK49355:19.99 UK80976:99.99 UK80694:54.99 UK80699:89.99 UK80726:109.99 UK80727:109.99 UK66001:99.99 UK66564:119.99 UK66565:119.99 UK66561:119.99 UK66562:119.99`,
  },
  'עטים': {
    category: 'עטים', subcategory: 'עטים', isJewelry: false,
    raw: `UK51632:15.99 UK40472:26.99 UK45866:26.99 UK53164:26.99 UK53937:26.99 UK57381:26.99 UK57382:26.99 UK57383:26.99 UK40471:26.99 UK52839:26.99 UK87539:26.99 UK55312:0.99`,
  },
  'מפות שולחן': {
    category: 'מפות שולחן', subcategory: 'מפות שולחן', isJewelry: false,
    raw: `UK49056:12.99 UK67122:17.99 UK67130:17.99 UK67536:44.99 UK66987:29.99 UK66988:34.99 UK66989:39.99 UK66990:29.99 UK66991:39.99 UK66992:39.99 UK64717:32.99 UK67314:49.99 UK67315:54.99 UK67316:64.99 UK67317:79.99 UK67112:89.99 UK67113:99.99 UK67114:109.99 UK67115:129.99 UK67116:89.99 UK67117:99.99 UK67119:129.99 UK67716:99.99 UK67718:99.99 UK67719:109.99`,
  },
  // הפרשת חלה — מחיר ספק בש"ח × 2.08 = מחיר ללקוח (מעוגל לשקל שלם)
  // פורמט: UK{SKU}:{מחיר_ספק_בשח}  (מופרד ברווחים)
  'הפרשת חלה': {
    category: 'שבת', subcategory: 'הפרשת חלה', isJewelry: false, fixedMultiplier: 2.08,
    raw: ``,  // ← הדבק כאן את רשימת המחירים מהספק
  },
};

// ── Parse raw strings into SKU map ────────────────────────────────────────────
const skuMap = {};
for (const [, { category, subcategory, isJewelry, fixedMultiplier, raw }] of Object.entries(RAW)) {
  for (const token of raw.trim().split(/\s+/)) {
    const [sku, priceStr] = token.split(':');
    if (!sku || !priceStr) continue;
    skuMap[sku.trim()] = { category, subcategory, isJewelry, fixedMultiplier, supplierPrice: parseFloat(priceStr) };
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(DRY_RUN ? '🔍 DRY RUN — no writes' : '✏️  LIVE RUN — writing to Firestore');
  console.log(`SKUs in map: ${Object.keys(skuMap).length}`);

  // 1. Create new categories
  console.log(`\nיוצר ${NEW_CATEGORIES.length} קטגוריות חדשות...`);
  for (const cat of NEW_CATEGORIES) {
    if (!DRY_RUN) {
      await db.collection('categories').doc(cat.slug).set(
        { name: cat.name, slug: cat.slug, displayName: cat.displayName },
        { merge: true }
      );
    }
    console.log('  ✓', cat.name);
  }

  // 2. Fetch all israel-judaica products
  console.log('\nמושך מוצרי israel-judaica...');
  const snap = await db.collection('products').where('source', '==', 'israel-judaica').get();
  console.log(`נמצאו: ${snap.size}`);

  const stats = {};
  const unmatched = [];
  let updated = 0;
  const samples = [];

  // Batch write in chunks of 400
  const CHUNK = 400;
  let ops = [];

  const flush = async () => {
    if (!ops.length || DRY_RUN) { ops = []; return; }
    const batch = db.batch();
    for (const { ref, data } of ops) batch.update(ref, data);
    await batch.commit();
    ops = [];
  };

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const sku = String(data.sku || data.SKU || '').trim();
    const row = skuMap[sku];

    if (!row) {
      unmatched.push(sku || data.name?.slice(0, 40) || '???');
      continue;
    }

    const price = row.fixedMultiplier
      ? calcPriceFixed(row.supplierPrice, row.fixedMultiplier)
      : calcPrice(row.supplierPrice, row.isJewelry);
    const update = {
      price,
      soferBasePrice: row.supplierPrice,
      category: row.category,
      subcategory: row.subcategory,
      outOfStock: false,
    };

    ops.push({ ref: docSnap.ref, data: update });
    updated++;
    stats[row.category] = (stats[row.category] || 0) + 1;
    if (samples.length < 5) samples.push({ sku, supplier: row.supplierPrice, price, category: row.category });

    if (ops.length >= CHUNK) await flush();
  }
  await flush();

  // ── Report ────────────────────────────────────────────────────────────────
  console.log('\n════ תוצאות ════');
  console.log(`עודכנו:  ${updated}`);
  console.log(`לא נמצאו: ${unmatched.length}`);
  console.log('\nפי קטגוריה:');
  Object.entries(stats).sort((a, b) => b[1] - a[1]).forEach(([c, n]) => console.log(`  ${n.toString().padStart(4)}  ${c}`));
  console.log('\n5 דוגמאות מחיר:');
  samples.forEach(s => console.log(`  ${s.sku}  ספק: ₪${s.supplier}  → מכירה: ₪${s.price}  [${s.category}]`));
  if (unmatched.length && unmatched.length <= 20) {
    console.log('\nלא נמצאו ב-map:');
    unmatched.forEach(s => console.log('  ', s));
  }
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
