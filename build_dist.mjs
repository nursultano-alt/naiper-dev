import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const rootDir = process.cwd();
const distDir = path.join(rootDir, "dist");

console.log("========================================================");
console.log("📦 СБОРКА ЧИСТОГО PRODUCTION-БАНДЛА (DIST)");
console.log("========================================================");

// 1. Очистка и создание директорий
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });
fs.mkdirSync(path.join(distDir, "functions", "api"), { recursive: true });

// 2. Копирование основных файлов
const filesToCopy = [
  "index.html",
  "style.css",
  "app.js"
];

for (const file of filesToCopy) {
  const src = path.join(rootDir, file);
  const dest = path.join(distDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    const size = (fs.statSync(dest).size / 1024).toFixed(1);
    console.log(`✅ Скопирован: ${file} (${size} KB)`);
  } else {
    console.error(`❌ Файл не найден: ${file}`);
    process.exit(1);
  }
}

// 3. Копирование Pages Functions
const funcSrc = path.join(rootDir, "functions", "api", "sync.js");
const funcDest = path.join(distDir, "functions", "api", "sync.js");
if (fs.existsSync(funcSrc)) {
  fs.copyFileSync(funcSrc, funcDest);
  const size = (fs.statSync(funcDest).size / 1024).toFixed(1);
  console.log(`✅ Скопирован: functions/api/sync.js (${size} KB)`);
}

// 4. Генерация _headers для Cloudflare Pages (жесткая ревалидация кэша)
const headersContent = `/*
  Cache-Control: public, max-age=0, must-revalidate
  CDN-Cache-Control: public, max-age=0, must-revalidate
  Surrogate-Control: no-store
  Access-Control-Allow-Origin: *

/style.css*
  Cache-Control: public, max-age=0, must-revalidate
  CDN-Cache-Control: public, max-age=0, must-revalidate

/app.js*
  Cache-Control: public, max-age=0, must-revalidate
  CDN-Cache-Control: public, max-age=0, must-revalidate
`;
fs.writeFileSync(path.join(distDir, "_headers"), headersContent, "utf8");
console.log(`✅ Сгенерирован: dist/_headers (защита от залипания CDN кэша Cloudflare)`);

// 5. Генерация _routes.json для Cloudflare Pages Functions
const routesContent = JSON.stringify({
  version: 1,
  include: ["/api/*"],
  exclude: []
}, null, 2);
fs.writeFileSync(path.join(distDir, "_routes.json"), routesContent, "utf8");
console.log(`✅ Сгенерирован: dist/_routes.json (маршрутизация Pages Functions)`);

// 6. Создание zip-архива dist_production_bundle.zip для ручной 1-клик загрузки в Cloudflare Dashboard
const zipPath = path.join(rootDir, "dist_production_bundle.zip");
try {
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }
  // В PowerShell используем Compress-Archive
  execSync(`powershell -Command "Compress-Archive -Path '${distDir}\\*' -DestinationPath '${zipPath}' -Force"`);
  const zipSize = (fs.statSync(zipPath).size / 1024).toFixed(1);
  console.log(`✅ Создан zip-архив: dist_production_bundle.zip (${zipSize} KB)`);
} catch (e) {
  console.warn(`⚠️ Архивация в zip не удалась: ${e.message}`);
}

console.log("\n========================================================");
console.log("🎉 ЧИСТЫЙ PRODUCTION-БАНДЛ УСПЕШНО СОБРАН В ПАПКЕ /dist!");
console.log("========================================================");
