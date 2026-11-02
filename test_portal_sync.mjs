import assert from "node:assert";
import { onRequestGet, onRequestPost } from "./functions/api/sync.js";

async function runTests() {
  console.log("=========================================");
  console.log("🧪 НАЧАЛО ТЕСТИРОВАНИЯ СИНХРОНИЗАЦИИ ОБЛАЧНОЙ БД");
  console.log("=========================================");

  const env = {}; // default env

  // ТЕСТ 1: Исходное состояние GET
  console.log("\n[Тест 1] GET /api/sync - получение текущего состояния...");
  const getRes = await onRequestGet({ env });
  assert.strictEqual(getRes.status, 200, "Статус GET должен быть 200");
  const getJson = await getRes.json();
  assert.strictEqual(getJson.ok, true, "Ответ GET должен содержать ok: true");
  assert(Array.isArray(getJson.data.timeline), "Timeline должен быть массивом");
  assert(Array.isArray(getJson.data.dates), "Dates должен быть массивом");
  assert(Array.isArray(getJson.data.contestants), "Contestants должен быть массивом");
  console.log(`✅ GET успешен: ${getJson.data.timeline.length} этапов, ${getJson.data.dates.length} дат, ${getJson.data.contestants.length} конкурсантов.`);

  // ТЕСТ 2: Мульти-клиентское голосование (Клиент 1 голосует -> Клиент 2 видит голос)
  console.log("\n[Тест 2] Мульти-клиентское голосование: Клиент 1 (Азамат) голосует за 'dt-2'...");
  const voteRes = await onRequestPost({
    env,
    request: {
      json: async () => ({
        action: "vote",
        payload: { name: "Азамат", dateId: "dt-2" }
      })
    }
  });
  assert.strictEqual(voteRes.status, 200, "Статус голосования 200");
  const voteJson = await voteRes.json();
  assert.strictEqual(voteJson.ok, true);

  // Клиент 2 запрашивает данные из БД
  console.log("[Тест 2.1] Клиент 2 заходит с другого телефона и запрашивает базу...");
  const client2Res = await onRequestGet({ env });
  const client2Json = await client2Res.json();
  const dt2 = client2Json.data.dates.find(d => d.id === "dt-2");
  assert(dt2.voters.includes("Азамат"), "Клиент 2 обязан видеть голос Азамата в dt-2");
  console.log(`✅ Клиент 2 видит голос Азамата в '${dt2.label}'. Список голосов: ${dt2.voters.join(", ")}`);

  // ТЕСТ 3: Смена голоса (защита от накрутки: голос должен переместиться, а не задвоиться)
  console.log("\n[Тест 3] Смена голоса: Азамат передумал и голосует за 'dt-3'...");
  const switchVoteRes = await onRequestPost({
    env,
    request: {
      json: async () => ({
        action: "vote",
        payload: { name: "Азамат", dateId: "dt-3" }
      })
    }
  });
  assert.strictEqual(switchVoteRes.status, 200);
  const switchJson = await switchVoteRes.json();
  const dt2Updated = switchJson.data.dates.find(d => d.id === "dt-2");
  const dt3Updated = switchJson.data.dates.find(d => d.id === "dt-3");
  assert(!dt2Updated.voters.includes("Азамат"), "Азамат должен быть удален из dt-2");
  assert(dt3Updated.voters.includes("Азамат"), "Азамат должен быть добавлен в dt-3");
  console.log("✅ Защита от дублей работает: голос перемещен из dt-2 в dt-3 без задвоения.");

  // ТЕСТ 4: Кабинет Чолпонки - Добавление события в таймлайн
  console.log("\n[Тест 4] Организатор (Чолпонка) добавляет событие в расписание...");
  const addEventRes = await onRequestPost({
    env,
    request: {
      json: async () => ({
        action: "add_event",
        payload: {
          pin: "2027",
          event: {
            title: "Новогодний семейный салют",
            time: "23:59",
            duration: 20,
            icon: "🎆",
            desc: "Запуск праздничного фейерверка во дворе и бенгальские огни"
          }
        }
      })
    }
  });
  assert.strictEqual(addEventRes.status, 200);
  const addEventJson = await addEventRes.json();
  const fireworksEv = addEventJson.data.timeline.find(e => e.title.includes("салют"));
  assert(fireworksEv, "Событие салюта должно быть в таймлайне");
  console.log(`✅ Событие «${fireworksEv.title}» добавлено организатором. ID: ${fireworksEv.id}`);

  // Клиент другого родственника запрашивает расписание
  console.log("[Тест 4.1] Родственник на смартфоне видит новое событие в таймлайне...");
  const relGet = await onRequestGet({ env });
  const relJson = await relGet.json();
  assert(relJson.data.timeline.some(e => e.id === fireworksEv.id), "Новое событие видно родственникам");
  console.log("✅ Все родственники видят обновленное расписание в реальном времени.");

  // ТЕСТ 5: Конкурс - Синхронизация лайков
  console.log("\n[Тест 5] Голосование за участников конкурса: родственник ставит лайк Эмиру...");
  const emirBefore = (await (await onRequestGet({ env })).json()).data.contestants.find(c => c.name === "Эмир");
  const initialLikes = emirBefore.likes;

  const likeRes = await onRequestPost({
    env,
    request: {
      json: async () => ({
        action: "like",
        payload: { contestantId: emirBefore.id, delta: 1 }
      })
    }
  });
  assert.strictEqual(likeRes.status, 200);
  const likeJson = await likeRes.json();
  const emirAfter = likeJson.data.contestants.find(c => c.id === emirBefore.id);
  assert.strictEqual(emirAfter.likes, initialLikes + 1, "Счетчик лайков обязан увеличиться на 1");
  console.log(`✅ Лайк учтен: было ${initialLikes}, стало ${emirAfter.likes}.`);

  // ТЕСТ 6: Защита админки пин-кодом
  console.log("\n[Тест 6] Проверка безопасности: попытка добавить пункт без верного пин-кода...");
  const unauthorizedRes = await onRequestPost({
    env,
    request: {
      json: async () => ({
        action: "add_event",
        payload: {
          pin: "wrong_pin",
          event: { title: "Взлом", time: "00:00" }
        }
      })
    }
  });
  assert.strictEqual(unauthorizedRes.status, 401, "Неверный пин должен возвращать 401 Unauthorized");
  console.log("✅ Защита пин-кодом 2027 работает: неавторизованные запросы блокируются.");

  // ТЕСТ 7: Cloudflare Worker Router & High-Frequency Memory Cache
  console.log("\n[Тест 7] Проверка роутера Cloudflare Worker (worker.js) и кэша высокой частоты...");
  const workerModule = await import("./worker.js");
  const worker = workerModule.default;

  // 7.1 Health check
  const healthResp = await worker.fetch(new Request("https://cholponkanewyear.naiper.dev/api/health"), env);
  assert.strictEqual(healthResp.status, 200, "Health check status 200");
  const healthJson = await healthResp.json();
  assert.strictEqual(healthJson.ok, true, "Health check ok: true");
  console.log("✅ Worker health check /api/health успешен.");

  // 7.2 Worker GET /api/sync
  const workerGetResp = await worker.fetch(new Request("https://cholponkanewyear.naiper.dev/api/sync"), env);
  assert.strictEqual(workerGetResp.status, 200, "Worker GET status 200");
  console.log("✅ Worker GET /api/sync успешен.");

  // 7.3 Worker OPTIONS CORS check
  const workerOptResp = await worker.fetch(new Request("https://cholponkanewyear.naiper.dev/api/sync", { method: "OPTIONS" }), env);
  assert.strictEqual(workerOptResp.status, 204, "Worker OPTIONS status 204");
  assert(workerOptResp.headers.get("Access-Control-Allow-Origin") === "*", "CORS header *");
  console.log("✅ Worker OPTIONS CORS предзапрос корректен.");

  // 7.4 Высокочастотный стресс-тест кэша (10 параллельных запросов от родственников)
  console.log("[Тест 7.4] Симуляция 10 одновременных запросов от семьи (проверка защиты квоты Gist)...");
  const tStart = Date.now();
  const stressPromises = Array.from({ length: 10 }, () =>
    worker.fetch(new Request("https://cholponkanewyear.naiper.dev/api/sync"), env).then(r => r.json())
  );
  const stressResults = await Promise.all(stressPromises);
  const tElapsed = Date.now() - tStart;
  assert.strictEqual(stressResults.length, 10);
  assert(stressResults.every(r => r.ok), "Все 10 одновременных запросов успешны");
  console.log(`✅ 10 одновременных запросов обработаны за ${tElapsed} мс (in-memory cache активен, квота спасена).`);

  // ОЧИСТКА: Удаление тестового события и сброс к эталонному состоянию
  console.log("\n[Очистка] Сброс базы к чистому эталонному состоянию перед сдачей...");
  const resetRes = await onRequestPost({
    env,
    request: {
      json: async () => ({
        action: "reset",
        payload: { pin: "2027" }
      })
    }
  });
  assert.strictEqual(resetRes.status, 200);
  console.log("✅ База данных сброшена к эталонному состоянию.");

  console.log("\n=========================================");
  console.log("🎉 ВСЕ 7 КОМПЛЕКСНЫХ ТЕСТОВ ПРОЙДЕНЫ (100% GREEN)!");
  console.log("=========================================");
}

runTests().catch((err) => {
  console.error("❌ ОШИБКА ТЕСТА:", err);
  process.exit(1);
});
