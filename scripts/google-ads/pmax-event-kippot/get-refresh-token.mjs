/**
 * get-refresh-token.mjs
 * ────────────────────────────────────────────────────────────────────────────
 * מפיק GOOGLE_ADS_REFRESH_TOKEN וכותב אותו ישירות ל-.env.local.
 *
 * ⚠️ הטוקן לא מודפס למסך ולא נשמר בשום מקום אחר.
 *
 * דרישות מוקדמות ב-.env.local:
 *   GOOGLE_ADS_CLIENT_ID=...
 *   GOOGLE_ADS_CLIENT_SECRET=...
 * (מ-OAuth client מסוג "Desktop app" ב-Google Cloud Console)
 *
 * הרצה:
 *   node scripts/google-ads/pmax-event-kippot/get-refresh-token.mjs
 *
 * הסקריפט מרים שרת מקומי, מדפיס קישור, ואתה מאשר בדפדפן עם החשבון
 * שיש לו גישה לחשבון ה-Google Ads.
 */

import { createServer } from 'http';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { ROOT, loadEnvLocal, header, cleanEnv } from './lib.mjs';

const PORT = Number(process.env.OAUTH_PORT ?? 8787);
const REDIRECT = `http://localhost:${PORT}/oauth2callback`;
const SCOPE = 'https://www.googleapis.com/auth/adwords';
const ENV_PATH = resolve(ROOT, '.env.local');

loadEnvLocal();

function writeEnvVar(name, value) {
  let raw = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, 'utf8') : '';
  const re = new RegExp(`^${name}=.*$`, 'm');
  if (re.test(raw)) raw = raw.replace(re, `${name}=${value}`);
  else raw = raw.replace(/\s*$/, '') + `\n${name}=${value}\n`;
  writeFileSync(ENV_PATH, raw, 'utf8');
}

async function main() {
  header('🔑 get-refresh-token — Google Ads API');

  const clientId     = cleanEnv(process.env.GOOGLE_ADS_CLIENT_ID);
  const clientSecret = cleanEnv(process.env.GOOGLE_ADS_CLIENT_SECRET);
  if (!clientId || !clientSecret) {
    console.error('❌ חסרים GOOGLE_ADS_CLIENT_ID / GOOGLE_ADS_CLIENT_SECRET ב-.env.local');
    console.error('   צור OAuth client מסוג "Desktop app" ב-Google Cloud Console והוסף אותם.');
    process.exit(1);
  }
  if (!/\.apps\.googleusercontent\.com$/.test(clientId)) {
    console.error(`❌ GOOGLE_ADS_CLIENT_ID לא נראה תקין — הוא חייב להסתיים ב-.apps.googleusercontent.com`);
    console.error(`   הערך שנקרא מסתיים ב: "...${clientId.slice(-32)}"`);
    console.error(`   בדוק שאין תווים זרים בסוף השורה ב-.env.local (גרשיים, > , רווח).`);
    process.exit(1);
  }

  const { OAuth2Client } = await import('google-auth-library');
  const oauth = new OAuth2Client({ clientId, clientSecret, redirectUri: REDIRECT });

  const url = oauth.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',            // חובה — בלי זה גוגל לא מחזיר refresh_token בפעם השנייה
    scope: [SCOPE],
  });

  console.log('פתח את הקישור הבא בדפדפן, והתחבר עם החשבון שיש לו גישה ל-Google Ads:\n');
  console.log(url);
  console.log(`\nממתין לאישור על ${REDIRECT} ...\n`);

  const server = createServer(async (req, res) => {
    if (!req.url?.startsWith('/oauth2callback')) { res.writeHead(404).end(); return; }
    const code = new URL(req.url, `http://localhost:${PORT}`).searchParams.get('code');
    const err  = new URL(req.url, `http://localhost:${PORT}`).searchParams.get('error');

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });

    if (err || !code) {
      res.end('<h2 dir="rtl">האישור בוטל. אפשר לסגור את החלון.</h2>');
      console.error(`\n❌ האישור נכשל: ${err ?? 'לא התקבל code'}`);
      server.close(); process.exit(1);
    }

    try {
      const { tokens } = await oauth.getToken(code);
      if (!tokens.refresh_token) {
        res.end('<h2 dir="rtl">לא התקבל refresh token. אפשר לסגור את החלון.</h2>');
        console.error('\n❌ גוגל לא החזיר refresh_token.');
        console.error('   בטל את הגישה של האפליקציה ב-https://myaccount.google.com/permissions ונסה שוב.');
        server.close(); process.exit(1);
      }
      writeEnvVar('GOOGLE_ADS_REFRESH_TOKEN', tokens.refresh_token);
      res.end('<h2 dir="rtl">✅ הטוקן נשמר ב-.env.local. אפשר לסגור את החלון.</h2>');
      console.log('✅ GOOGLE_ADS_REFRESH_TOKEN נכתב ל-.env.local (לא מודפס כאן בכוונה).');
      console.log('\nהצעד הבא:');
      console.log('  node scripts/google-ads/pmax-event-kippot/check-account.mjs\n');
      server.close(); process.exit(0);
    } catch (e) {
      res.end('<h2 dir="rtl">שגיאה בהחלפת הקוד. אפשר לסגור את החלון.</h2>');
      console.error(`\n❌ ${e.message}`);
      server.close(); process.exit(1);
    }
  });

  server.listen(PORT, '127.0.0.1');
}

main().catch(e => { console.error('\n❌ שגיאה:', e.message); process.exit(1); });
