import https from "https";

function fetchUrl(url) {
  return new Promise((resolve) => {
    const req = https.get(url, { headers: { "Cache-Control": "no-cache", "User-Agent": "Curl/Verify" } }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    req.on("error", (err) => resolve({ error: err.message }));
  });
}

async function verify() {
  console.log("========================================================");
  console.log("🔍 АУДИТ ЖИВОГО ПРОДАКШЕНА (CLOUDFLARE EDGE AUDIT)");
  console.log("========================================================");

  const targets = [
    "https://cholponkanewyear.naiper.dev",
    "https://naiper.dev"
  ];

  for (const domain of targets) {
    console.log(`\n🌐 Проверка ${domain}...`);
    const htmlRes = await fetchUrl(domain);
    if (htmlRes.error) {
      console.log(`❌ Ошибка запроса к ${domain}: ${htmlRes.error}`);
      continue;
    }

    const cssRes = await fetchUrl(`${domain}/style.css`);
    const healthRes = await fetchUrl(`${domain}/api/health`);

    console.log(`- Статус HTML: ${htmlRes.status} (CF-Cache: ${htmlRes.headers["cf-cache-status"] || "NONE"})`);
    console.log(`- Статус CSS:  ${cssRes.status} (CF-Cache: ${cssRes.headers["cf-cache-status"] || "NONE"})`);
    console.log(`- Статус API:  ${healthRes.status} (/api/health)`);

    const hasCinzel = htmlRes.body.includes("Cinzel");
    const hasThemeSwitch = htmlRes.body.includes("themeBtnIvory") || htmlRes.body.includes("theme-switch");
    const hasGildedIvory = cssRes.body.includes("Gilded Ivory") || cssRes.body.includes("FFFFFA");

    console.log(`- Наличие Cinzel:       ${hasCinzel ? "✅ ОБНОВЛЕНО" : "⚠️ СТАРЫЙ КЭШ"}`);
    console.log(`- Переключатель тем:    ${hasThemeSwitch ? "✅ ОБНОВЛЕНО" : "⚠️ СТАРЫЙ КЭШ"}`);
    console.log(`- Стили Gilded Ivory:   ${hasGildedIvory ? "✅ ОБНОВЛЕНО" : "⚠️ СТАРЫЙ КЭШ"}`);

    if (hasCinzel && hasGildedIvory) {
      console.log(`🎉 ${domain} УСПЕШНО РАБОТАЕТ НА НОВОЙ ДИЗАЙН-СИСТЕМЕ QUIET LUXURY!`);
    } else {
      console.log(`ℹ️ На ${domain} еще отдается старый бандл из кэша Cloudflare.`);
      console.log(`👉 Для обновления выполните: npx wrangler deploy (или запустите deploy_prod.bat)`);
    }
  }
}

verify();
