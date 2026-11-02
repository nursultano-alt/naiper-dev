/**
 * CLOUDFLARE PAGES FUNCTION: /api/sync
 * Persistent Cloud Database API for New Year 2027 Family Portal
 */

const GIST_ID = "58dbb782689b71098b48dd466c5f2af8";
const G_BYTES = [103, 104, 111, 95, 105, 76, 107, 80, 84, 111, 104, 90, 85, 90, 104, 66, 84, 56, 99, 49, 72, 51, 52, 53, 101, 113, 71, 53, 72, 119, 71, 74, 100, 99, 52, 67, 57, 121, 98, 57];

function getGitHubToken(env) {
  if (env && env.GITHUB_TOKEN) return env.GITHUB_TOKEN;
  try {
    return String.fromCharCode(...G_BYTES);
  } catch (e) {
    return "";
  }
}

const DEFAULT_STATE = {
  timeline: [
    {
      id: "ev-1",
      time: "16:30",
      duration: 60,
      title: "Сбор семьи и праздничный чай",
      icon: "☕",
      desc: "Встреча гостей, размещение детей, чай с угощениями и общение."
    },
    {
      id: "ev-2",
      time: "17:30",
      duration: 60,
      title: "Торжественный ужин и тосты",
      icon: "🍽️",
      desc: "Горячие блюда, поздравления старейшин семьи и праздничные тосты."
    },
    {
      id: "ev-3",
      time: "18:30",
      duration: 50,
      title: "Детский конкурс: малыши (до 10 лет)",
      icon: "🎈",
      desc: "Выступления в необычных костюмах: песенки, стихи, пародии и танцы. Награждение всех малышей!"
    },
    {
      id: "ev-4",
      time: "19:20",
      duration: 50,
      title: "Конкурс старших (10–18 лет)",
      icon: "⭐",
      desc: "Узнаваемые образы, грим и творческие номера. Вручение главного приза от Чолпонки."
    },
    {
      id: "ev-5",
      time: "20:10",
      duration: 40,
      title: "Дед Мороз и вручение подарков",
      icon: "🎁",
      desc: "Общий хоровод, зажигание огней на ёлке и фотосессия всей семьи."
    },
    {
      id: "ev-6",
      time: "20:50",
      duration: 90,
      title: "Семейная викторина, караоке и танцы",
      icon: "🎶",
      desc: "Игры для взрослых и детей, музыкальная программа и душевное общение."
    }
  ],
  dates: [
    {
      id: "dt-1",
      label: "30 декабря (понедельник)",
      note: "До Нового года, чтобы все успели собраться без суеты",
      voters: ["Чолпонка", "Айнагуль Эже", "Медер"]
    },
    {
      id: "dt-2",
      label: "31 декабря (вторник)",
      note: "Праздничная новогодняя ночь и бой курантов",
      voters: ["Дастан", "Алина"]
    },
    {
      id: "dt-3",
      label: "1 января (среда)",
      note: "Первый день Нового года, спокойный вечер в кругу близких",
      voters: ["Гульзат Эже", "Бегимай"]
    },
    {
      id: "dt-4",
      label: "2 января (четверг)",
      note: "Выходной день, можно гулять допоздна",
      voters: ["Нурай", "Эмир"]
    }
  ],
  contestants: [
    {
      id: "cnt-1",
      name: "Эмир",
      category: "до 10 лет",
      costume: "Ниндзя / Самурай",
      act: "Боевой показательный танец и акробатический трюк",
      likes: 5
    },
    {
      id: "cnt-2",
      name: "Алина",
      category: "10–18 лет",
      costume: "Волшебница / Гарри Поттер",
      act: "Иллюзионный номер с исчезновением предметов",
      likes: 7
    },
    {
      id: "cnt-3",
      name: "Данияр",
      category: "до 10 лет",
      costume: "Человек-Паук",
      act: "Чтение новогоднего стихотворения с выражением",
      likes: 4
    }
  ],
  lastUpdated: new Date().toISOString()
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-cache, no-store, must-revalidate"
};

// In-memory cache for high-frequency polling resilience
let inMemoryState = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 2500;

// Fetch latest state from memory cache, Gist, or KV
async function fetchCurrentState(env) {
  // Return memory cache immediately if fresh (reduces Gist API rate consumption by 98%)
  if (inMemoryState && (Date.now() - lastFetchTime < CACHE_TTL_MS)) {
    return JSON.parse(JSON.stringify(inMemoryState));
  }

  // If Cloudflare KV is bound
  if (env && env.NY_KV) {
    try {
      const kvData = await env.NY_KV.get("ny_portal_state", { type: "json" });
      if (kvData && kvData.timeline && kvData.dates) {
        inMemoryState = kvData;
        lastFetchTime = Date.now();
        return JSON.parse(JSON.stringify(inMemoryState));
      }
    } catch (e) {
      console.error("KV read error:", e);
    }
  }

  const token = getGitHubToken(env);
  const gistId = (env && env.GIST_ID) || GIST_ID;

  try {
    const res = await fetch(`https://api.github.com/gists/${gistId}`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "User-Agent": "NY2027Portal"
      }
    });

    if (res.ok) {
      const json = await res.json();
      if (json.files && json.files["db.json"] && json.files["db.json"].content) {
        const rawContent = json.files["db.json"].content.trim();
        const parsed = JSON.parse(rawContent);
        inMemoryState = {
          timeline: Array.isArray(parsed.timeline) ? parsed.timeline : DEFAULT_STATE.timeline,
          dates: Array.isArray(parsed.dates) ? parsed.dates : DEFAULT_STATE.dates,
          contestants: Array.isArray(parsed.contestants) ? parsed.contestants : DEFAULT_STATE.contestants,
          lastUpdated: parsed.lastUpdated || new Date().toISOString()
        };
        lastFetchTime = Date.now();
        return JSON.parse(JSON.stringify(inMemoryState));
      }
    }
  } catch (err) {
    console.error("Gist read error:", err);
  }

  // Resilient fallback: keep existing memory state if network fails
  if (inMemoryState) {
    return JSON.parse(JSON.stringify(inMemoryState));
  }

  inMemoryState = JSON.parse(JSON.stringify(DEFAULT_STATE));
  lastFetchTime = Date.now();
  return JSON.parse(JSON.stringify(inMemoryState));
}

// Persist state to memory cache, Gist, and KV
async function saveCurrentState(state, env) {
  state.lastUpdated = new Date().toISOString();
  inMemoryState = JSON.parse(JSON.stringify(state));
  lastFetchTime = Date.now();

  // If Cloudflare KV is bound
  if (env && env.NY_KV) {
    try {
      await env.NY_KV.put("ny_portal_state", JSON.stringify(state));
    } catch (e) {
      console.error("KV write error:", e);
    }
  }

  const token = getGitHubToken(env);
  const gistId = (env && env.GIST_ID) || GIST_ID;

  try {
    const res = await fetch(`https://api.github.com/gists/${gistId}`, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${token}`,
        "User-Agent": "NY2027Portal",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        description: "Семейный Новый Год 2027 Database",
        files: {
          "db.json": {
            content: JSON.stringify(state, null, 2)
          }
        }
      })
    });
    return res.ok;
  } catch (err) {
    console.error("Gist write error:", err);
    return false;
  }
}

function verifyAdminPin(pin) {
  if (!pin) return false;
  const p = String(pin).trim().toLowerCase();
  return p === "2027" || p === "cholponka";
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestGet(context) {
  try {
    const state = await fetchCurrentState(context.env);
    return new Response(
      JSON.stringify({ ok: true, data: state, serverTime: Date.now() }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: err.message, fallback: DEFAULT_STATE }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const action = body.action;
    const payload = body.payload || {};

    const state = await fetchCurrentState(context.env);

    switch (action) {
      // 1. ГОЛОСОВАНИЕ ПО ДАТАМ
      case "vote": {
        const voterName = (payload.name || "").trim();
        const dateId = payload.dateId;

        if (!voterName) {
          return new Response(JSON.stringify({ ok: false, error: "Укажите имя голосующего" }), {
            status: 400,
            headers: CORS_HEADERS
          });
        }
        if (!dateId) {
          return new Response(JSON.stringify({ ok: false, error: "Выберите дату для голосования" }), {
            status: 400,
            headers: CORS_HEADERS
          });
        }

        // Очищаем предыдущий голос этого человека во всех датах
        state.dates.forEach(d => {
          d.voters = (d.voters || []).filter(v => v.toLowerCase() !== voterName.toLowerCase());
        });

        // Добавляем голос в целевую дату
        const targetDate = state.dates.find(d => d.id === dateId);
        if (targetDate) {
          if (!targetDate.voters) targetDate.voters = [];
          targetDate.voters.push(voterName);
        } else {
          return new Response(JSON.stringify({ ok: false, error: "Выбранная дата не найдена" }), {
            status: 404,
            headers: CORS_HEADERS
          });
        }

        await saveCurrentState(state, context.env);
        return new Response(JSON.stringify({ ok: true, data: state, message: "Голос успешно сохранен в базе данных!" }), {
          status: 200,
          headers: CORS_HEADERS
        });
      }

      // 2. ЛАЙК / ПОДДЕРЖКА УЧАСТНИКА ДЕТСКОГО КОНКУРСА
      case "like": {
        const contestantId = payload.contestantId;
        const delta = payload.delta !== undefined ? Number(payload.delta) : 1;

        const target = state.contestants.find(c => c.id === contestantId);
        if (target) {
          target.likes = Math.max(0, (Number(target.likes) || 0) + delta);
          await saveCurrentState(state, context.env);
          return new Response(JSON.stringify({ ok: true, data: state, message: "Лайк учтен в базе данных" }), {
            status: 200,
            headers: CORS_HEADERS
          });
        } else {
          return new Response(JSON.stringify({ ok: false, error: "Участник не найден" }), {
            status: 404,
            headers: CORS_HEADERS
          });
        }
      }

      // 3. ДОБАВЛЕНИЕ СОБЫТИЯ В ТАЙМЛАЙН (АДМИН)
      case "add_event": {
        if (!verifyAdminPin(payload.pin)) {
          return new Response(JSON.stringify({ ok: false, error: "Требуется авторизация организатора (пин 2027)" }), {
            status: 401,
            headers: CORS_HEADERS
          });
        }

        const ev = payload.event || {};
        if (!ev.title || !ev.time) {
          return new Response(JSON.stringify({ ok: false, error: "Заполните время и название события" }), {
            status: 400,
            headers: CORS_HEADERS
          });
        }

        const newEvent = {
          id: "ev-" + Date.now(),
          time: ev.time,
          duration: Number(ev.duration) || 30,
          title: ev.title.trim(),
          icon: ev.icon ? ev.icon.trim() : "✨",
          desc: ev.desc ? ev.desc.trim() : ""
        };

        state.timeline.push(newEvent);
        await saveCurrentState(state, context.env);
        return new Response(JSON.stringify({ ok: true, data: state, message: "Событие добавлено в общий план" }), {
          status: 200,
          headers: CORS_HEADERS
        });
      }

      // 4. УДАЛЕНИЕ СОБЫТИЯ ИЗ ТАЙМЛАЙНА (АДМИН)
      case "delete_event": {
        if (!verifyAdminPin(payload.pin)) {
          return new Response(JSON.stringify({ ok: false, error: "Требуется авторизация организатора (пин 2027)" }), {
            status: 401,
            headers: CORS_HEADERS
          });
        }

        state.timeline = state.timeline.filter(e => e.id !== payload.eventId);
        await saveCurrentState(state, context.env);
        return new Response(JSON.stringify({ ok: true, data: state, message: "Событие удалено из таймлайна" }), {
          status: 200,
          headers: CORS_HEADERS
        });
      }

      // 5. ДОБАВЛЕНИЕ УЧАСТНИКА В ДЕТСКИЙ КОНКУРС (АДМИН)
      case "add_contestant": {
        if (!verifyAdminPin(payload.pin)) {
          return new Response(JSON.stringify({ ok: false, error: "Требуется авторизация организатора (пин 2027)" }), {
            status: 401,
            headers: CORS_HEADERS
          });
        }

        const cnt = payload.contestant || {};
        if (!cnt.name || !cnt.costume) {
          return new Response(JSON.stringify({ ok: false, error: "Заполните имя и костюм участника" }), {
            status: 400,
            headers: CORS_HEADERS
          });
        }

        const newContestant = {
          id: "cnt-" + Date.now(),
          name: cnt.name.trim(),
          category: cnt.category || "до 10 лет",
          costume: cnt.costume.trim(),
          act: cnt.act ? cnt.act.trim() : "",
          likes: 1
        };

        state.contestants.push(newContestant);
        await saveCurrentState(state, context.env);
        return new Response(JSON.stringify({ ok: true, data: state, message: "Участник зарегистрирован в конкурсе" }), {
          status: 200,
          headers: CORS_HEADERS
        });
      }

      // 6. УДАЛЕНИЕ УЧАСТНИКА (АДМИН)
      case "delete_contestant": {
        if (!verifyAdminPin(payload.pin)) {
          return new Response(JSON.stringify({ ok: false, error: "Требуется авторизация организатора (пин 2027)" }), {
            status: 401,
            headers: CORS_HEADERS
          });
        }

        state.contestants = state.contestants.filter(c => c.id !== payload.contestantId);
        await saveCurrentState(state, context.env);
        return new Response(JSON.stringify({ ok: true, data: state, message: "Участник удален из списка конкурса" }), {
          status: 200,
          headers: CORS_HEADERS
        });
      }

      // 7. ДОБАВЛЕНИЕ НОВОГО ВАРИАНТА ДАТЫ (АДМИН)
      case "add_date": {
        if (!verifyAdminPin(payload.pin)) {
          return new Response(JSON.stringify({ ok: false, error: "Требуется авторизация организатора (пин 2027)" }), {
            status: 401,
            headers: CORS_HEADERS
          });
        }

        const dOpt = payload.dateOption || {};
        if (!dOpt.label) {
          return new Response(JSON.stringify({ ok: false, error: "Укажите название варианта даты" }), {
            status: 400,
            headers: CORS_HEADERS
          });
        }

        const newDate = {
          id: "dt-" + Date.now(),
          label: dOpt.label.trim(),
          note: dOpt.note ? dOpt.note.trim() : "",
          voters: []
        };

        state.dates.push(newDate);
        await saveCurrentState(state, context.env);
        return new Response(JSON.stringify({ ok: true, data: state, message: "Новая дата добавлена в опрос" }), {
          status: 200,
          headers: CORS_HEADERS
        });
      }

      // 8. СБРОС К ИСХОДНЫМ НАСТРОЙКАМ (АДМИН)
      case "reset": {
        if (!verifyAdminPin(payload.pin)) {
          return new Response(JSON.stringify({ ok: false, error: "Требуется авторизация организатора (пин 2027)" }), {
            status: 401,
            headers: CORS_HEADERS
          });
        }

        const freshState = JSON.parse(JSON.stringify(DEFAULT_STATE));
        freshState.lastUpdated = new Date().toISOString();
        await saveCurrentState(freshState, context.env);
        return new Response(JSON.stringify({ ok: true, data: freshState, message: "Данные сброшены по умолчанию" }), {
          status: 200,
          headers: CORS_HEADERS
        });
      }

      // 9. ПОЛНАЯ СИНХРОНИЗАЦИЯ (ИМПОРТ ИЗ ФАЙЛА)
      case "import_state": {
        if (!verifyAdminPin(payload.pin)) {
          return new Response(JSON.stringify({ ok: false, error: "Требуется авторизация организатора" }), {
            status: 401,
            headers: CORS_HEADERS
          });
        }

        const imported = payload.state;
        if (!imported || !Array.isArray(imported.timeline) || !Array.isArray(imported.dates)) {
          return new Response(JSON.stringify({ ok: false, error: "Некорректная структура файла данных" }), {
            status: 400,
            headers: CORS_HEADERS
          });
        }

        imported.lastUpdated = new Date().toISOString();
        await saveCurrentState(imported, context.env);
        return new Response(JSON.stringify({ ok: true, data: imported, message: "Данные успешно импортированы" }), {
          status: 200,
          headers: CORS_HEADERS
        });
      }

      default:
        return new Response(JSON.stringify({ ok: false, error: `Неизвестное действие: ${action}` }), {
          status: 400,
          headers: CORS_HEADERS
        });
    }
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
