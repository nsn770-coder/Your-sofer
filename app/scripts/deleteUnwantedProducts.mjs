import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Try the known local SA path; fall back to the Owner path if it exists
let sa;
try {
  sa = require('./your-sofer-firebase-adminsdk-fbsvc-dd43a60da9.json');
} catch {
  sa = require('C:/Users/Owner/Downloads/your-sofer-firebase-adminsdk-fbsvc-a682983bfd.json');
}

initializeApp({ credential: cert(sa) });
const db = getFirestore();

const IDS = [
  'yofIuNKVxnd9tydiGKL9','vyxWU60r2nNrQDgWTSzx','tQPqkG9nwQih3Or1Hs6p','tDxyXYLozFOCKjdZUqsw',
  'weWVsdwkbnu3byChSnfd','w1VTlQi1Np79Dh3rHaw2','wYThdUK0CXGiKocQONFq','yhR9sPz1XXkp3PtRZeth',
  'xKn125NRlCtOoyxrt6fh','uOk4LzpZyt4ajqcx6PXi','svKgmGxhf42ey4fBv80g','wPKhermBPqcreDYGEek9',
  'uyt0txxPUgwk2CbeEC8L','u2i2Yol91mQFz7BgGEXp','z8DHZ9ICuqzGeTwq3sPM','xz0X4c737s3mOUKtG8hR',
  'sfFjgebdf9uSCBpRiFAT','x4wYoyHff3fR79aXQcJ0','syBpfFsgbOhUnP8Qd0OD','wEOzooxwtaH8ZJjlmxzd',
  'zA0yogjNxXAbGreHPh0q','yOCSguy9n2XbOYBwFQNr','u6aSkrJwGluvAcTNARWf','pm5TGKRZg7olBVGoaPvR',
  'xxB4YpuUZKwEcyVSn6Av','sMmODAUk7qTzmMdbYLoP','voD0BArcVLajf5GGgcEb','plb25jiBzFQDMRHcnroO',
  'srlSDDq1GOjPq4tmx7v8','tr6MijZbkCosHCV5RvJM','xhqRzoy0eg21Rt16DPf1','Lx4nsoPLy9EoEGE1BSyZ',
  'yXjuQBjGkskmED0I3Ln8','v4NlmQJ794xrVcaDEtuv','ppMbGGZzVjhoDiBtWE0W','RprWc0hmFiJkyNVflq1X',
  'yupjp4DzlH6jDwturwFX','poFEsA56RoNTDUBo5ExV','xvd3MrLGL4GKMhUj1cOs','sJrocEnVvTihjxibBNjx',
  'wnwcX6OdDOipdX9ejYrU','sUhzT9jzswWp354LNraD','xoJ2pqot3uZ7pPQMfN3G','vYE95wlqtVnHgqkZrlgz',
  'zsUHMZYTUvbc9ijW7DYa','x4fOZEjoGm2yEqt1qrUM','yllmN8pvez2oCW1aT1ID','tZ6mKXYGYMeW1fJ11ncj',
  'w16eDENfAnNshzlG48IV','waQXEIDTLgTQDmWtPOxw','wJJI5nrnfmEiQTrxTdfo','wAhFyFagsPZm9sp0XFPR',
  'zyBUFS9IWCf5wa5VQNVz','z0PnAkiSReftsf7mwFRc','zt1aSoeWyV7Qc5MtyEhd','t3owiN9QRcTWgRTwr9ov',
  'wBto5Tsh3Ne0W24X2TpI','yCoZYrYCKrgK4khWovVa','sxoO3HvbHmbqeDeQTqjK','xDf6AyGK2hYVh2L4u7Az',
  'sPFneJsvbqpe3tEaOzjy','wFKbbVRZJQVHiYdhMmej','wbChDoHbIg1w47Sb2i18','w12crRkZDPOv24HvegvR',
  'tRPwMqJmzI9FGxp8GDrL','phOdJKWE9c1dxvJcXbHC','uHLmCuPjKTS5KGUWLlwL','ptAcuAqIV3db7Cm4Bhs9',
  'vEtX1SusTAYVmvt6dzua','zDgwLjoAIluoo7VqNrGX','wbqsWYhxyV9tH5CicR0x','wZYaXesNpXFhLPWSXwYR',
  't2Igk6eTz2w7djsYfMWg','xLSc2oyKiLOIfmDC0fjO','uP59VPeTCzI1tsYcxweo','uk6chasLCcp9QobH5LSj',
  'xf854Dbd4nXOazd7lNI0','ppYhSb6uVp76G8p0PG1e','wqT5W5PSKFylFwn6KjTj','pwtqvRE45CaTzgNXlFAb',
  'wyax4EYC7AndV4JjCCn8','w6v97yg857nxmY75LvSd','xu1XQ5fsqbEUIHqJfDOQ','whldbTqA4pYlRzgCMQ2a',
  'xrfsN9b2x7gI6Xu2kI5J','pqSsQE4X2WVeXT7fRehe','zp8g28kCfciD184rJibV','vjBweMrg6YD47dqBOYnx',
  'pkSL8acDqxWbsEq7IlxZ','yoYOiViIQNrBzVnXCXG9','yjZvijKAoted4Si2wVEF','ppTXaW9yLLZ2lxtOliMY',
  'ybwCuMcJGVUcjJylmcby','wm6lx6FnAiiqAxWnFwYd','um6cA0HyP4glqoBi2nki','xuGfiPIb1fFPBSs0hb5A',
  'vqsuw3TciYZBRvzRLeEm','x8WKF1ZlaoahsbMo5loC','szlpKtJ91EqqWD5RxtUO','twjX66laBaSOYBQ4Fel1',
  'sf70u7SOJfp5rj5zxwgq','tdtOR9gKe2k9ppf52Zn4','uXy23s7L8HVgLzGQYmvq','u9KCV6QXg8GL8ZkjDhdO',
  'uObQ2lO2o9kNSiERLAxA','tDGtoxHKtvHzyLn1WmqJ','wT7QVQOtiiKw67JvqS2M','xMnxWWmaL3IM3clZhFdb',
  'pzP0Fh9G5NoXGaFY2JHm','sPvfsEIzmEx3cBwd4Z9Q','yOSisoCOo3E1QZKKTATG','vjpR27xMnNhmh0NM84EN',
  'sRCN92sWjJAGvDUsXpjj','snQfLixqlyhdf7ajZNwQ','xXBKDL3kdDtxDM2jOAtv','wGc2LIq4NO2VTuTob9br',
  'tNhYhwgHO2baL0fH0Iyf','veSbkkUifAadMV8eNPpg','tmYAmdI7KvK3OlHnbLU5','sN79t2KO6oDUGivFcj1G',
  'ttPlK1x1BDxN9Q7TlZgC','wV96ewug0BzbC4l6cQ2I','zRZM1r1QkY1QEyQh5EyA','zBATNWaAz7uboZe3wXIZ',
  'w2hwO8rMKfQo1ZR1wTdx','zJ7vs8qzSQjjFd0azlql','v0IilDKJl1441QYsI9Xf','squ6nEnAwGQ5fKPSNELi',
  'tD9DV9rooApa3Y7nG33w','vwUiVLMRH53Hc6dlFLRM','uLpTMCifHZwuJNohmSdq','yW34GEMK7JTDVfFHT6KH',
  'snnucj9AD99DsBpPOTtx','sitrpwYCz7FWPVqrm2S7','ytN8YxNxykQN6IUeC9pr','H5TnCtMm4hhQMR0RQ5Zp',
  'epZWJzjLAdasj02STcxe','SgJ6aiUou11INxnD7Op9','y5c3A3qVeg8i6FTZ8LyD','btseRE7LSbIjWqs5TQDk',
  'DtcKSTTUJJTBK4p3bhdC','GrYfLQocWrL4WbhOjzB5','MretOWXNieisztcAwuPS','P7NuVmoezakpr2IJe1EX',
  'uHh4Rvv4mhatd0ejPQG8','cCo31L0MTnYuH0S3qNwg','g8LBw3j4BC1XphWiD1mq','JuCTtUfkgusiFesFTQoM',
  '42KJvooTMR36JQTt4AYN','pK2x1vLOV1Ig0uO3vFPz','wCFANrHaiu43csYzB3FF','o15sNnNaVFOyFojhaPQr',
  'JNdB6PxpPx1VeF4eoilS','eMSmdV0EGB3q7jmQJqwX','2W4jerXqmePwI1wCzCu1','1T3LzB8qV0tHRBADVTaw',
  'sZDgLUiMUMTKopkBLsfR','PbEv2ZCiuDyUP6YnusWs','7bfspPFv57fSLtI0epUL','ndcH7r5QTR9UqUpXsgEG',
  'lhKa2QZELCXdot2HeZtb','rx2v4VDUFs4QdShZghRT','meqG9AM4BaxWvT2ZizHs','Jf0LpyqUnwq0UHv2K6Tw',
  'no1q3EqYVutiwIJxhQKY','6Fgt9keHtLkAb06Qg95b','HlERp7qNes5GjqsUb6Bg','lhI08LCRLiWnJND81aYX',
  'a0TxlgtSLRgnYJvvuEzF','IFp9gJtiJamGjHFaZSU8','Nj9WAmMqQveDZ3GMklm1',
];

const BATCH_SIZE = 500;

let deleted = 0;
let notFound = 0;

for (let i = 0; i < IDS.length; i += BATCH_SIZE) {
  const batch = db.batch();
  const chunk = IDS.slice(i, i + BATCH_SIZE);
  for (const id of chunk) {
    batch.delete(db.collection('products').doc(id));
  }
  await batch.commit();
  deleted += chunk.length;
  process.stdout.write(`\rמחיקה: ${deleted}/${IDS.length}...`);
}

console.log(`\nסיום. נמחקו ${IDS.length} מוצרים מפיירסטור.`);
