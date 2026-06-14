// scripts/exportClarityData.mjs
import fs from "fs";

const TOKEN = process.env.CLARITY_TOKEN;
if (!TOKEN) {
  console.error("Missing CLARITY_TOKEN env variable");
  process.exit(1);
}

const res = await fetch(
  "https://www.clarity.ms/export-data/api/v1/project-live-insights?numOfDays=3",
  { headers: { Authorization: `Bearer ${TOKEN}` } }
);

if (!res.ok) {
  console.error("שגיאה:", res.status, await res.text());
  process.exit(1);
}

const data = await res.json();
fs.writeFileSync("clarity-export.json", JSON.stringify(data, null, 2));
console.log("✅ נשמר ל-clarity-export.json");
