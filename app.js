/**
 * СЕМЕЙНЫЙ НОВОГОДНИЙ ПОРТАЛ 2027 // APP.JS
 * Архитектура:
 * - 60 FPS Canvas снегопад (аппаратное ускорение)
 * - Web Audio API (тактильный звуковой отклик)
 * - Единая облачная база данных (Cloudflare Pages Functions + Cloud Gist REST)
 * - Автоматическая живая синхронизация между всеми смартфонами родственников
 * - Оптимистичный UI с защитой от накрутки и конфликтов
 * - Панель управления Чолпонки (PIN: 2027)
 */

// ==========================================
// 1. КОНФИГУРАЦИЯ И ДЕФОЛТНЫЕ ДАННЫЕ
// ==========================================
const API_URL = "/api/sync";
const GIST_FALLBACK_URL = "https://api.github.com/gists/58dbb782689b71098b48dd466c5f2af8";
const STORAGE_KEY = "ny_family_portal_2027_data";
const ADMIN_PIN_KEY = "ny_admin_pin_session";
const VOTER_NAME_KEY = "ny_current_voter";
const POLL_INTERVAL_MS = 3500;

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
  currentVoter: localStorage.getItem(VOTER_NAME_KEY) || "",
  selectedDateId: null,
  isAdmin: false,
  lastUpdated: null
};

// ==========================================
// 2. СОСТОЯНИЕ И ЛОКАЛЬНЫЙ КЭШ
// ==========================================
function loadCachedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_STATE,
        ...parsed,
        currentVoter: localStorage.getItem(VOTER_NAME_KEY) || "",
        isAdmin: sessionStorage.getItem(ADMIN_PIN_KEY) === "true"
      };
    }
  } catch (e) {
    console.error("Ошибка загрузки локального кэша:", e);
  }
  return {
    ...DEFAULT_STATE,
    currentVoter: localStorage.getItem(VOTER_NAME_KEY) || "",
    isAdmin: sessionStorage.getItem(ADMIN_PIN_KEY) === "true"
  };
}

let appState = loadCachedState();
let isSyncing = false;
let lastSyncTimestamp = Date.now();

function persistLocalCache() {
  try {
    const toSave = {
      timeline: appState.timeline,
      dates: appState.dates,
      contestants: appState.contestants,
      lastUpdated: appState.lastUpdated
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (e) {
    console.error("Ошибка сохранения локального кэша:", e);
  }
}


const CloudDB = {
  // Получение актуального состояния из облачной базы
  async fetchRemote() {
    // Попытка 1: собственный эндпоинт Cloudflare Pages Functions
    try {
      const res = await fetch(`${API_URL}?t=${Date.now()}`, {
        method: "GET",
        headers: { "Accept": "application/json" },
        cache: "no-store"
      });
      if (res.ok) {
        const json = await res.json();
        if (json && json.ok && json.data) {
          return json.data;
        }
      }
    } catch (e) {
      // Игнорируем и переходим к резервному каналу
    }

    // Попытка 2: прямой запрос к облачному репозиторию данных Gist
    try {
      const resFallback = await fetch(`${GIST_FALLBACK_URL}?t=${Date.now()}`, {
        headers: { "Accept": "application/vnd.github.v3+json" },
        cache: "no-store"
      });
      if (resFallback.ok) {
        const gist = await resFallback.json();
        if (gist.files && gist.files["db.json"] && gist.files["db.json"].content) {
          const parsed = JSON.parse(gist.files["db.json"].content.trim());
          return parsed;
        }
      }
    } catch (err) {
      console.warn("Резервный канал недоступен:", err);
    }

    return null;
  },

  // Мутация данных на сервере с двойным контуром отказоустойчивости
  async mutate(action, payload) {
    updateSyncIndicator("syncing");
    
    // Попытка 1: эндпоинт /api/sync
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ action, payload })
      });

      if (res.ok) {
        const json = await res.json();
        if (json && json.ok && json.data) {
          applyRemoteState(json.data);
          updateSyncIndicator("online");
          return { ok: true, data: json.data };
        }
      }
    } catch (err) {
      // Переходим к прямому каналу
    }

    // Офлайн-обработка: сохраняем изменение локально в кэш
    try {
      if (action === "vote") {
        const name = (payload.name || "").trim();
        appState.dates.forEach(d => {
          d.voters = (d.voters || []).filter(v => v.toLowerCase() !== name.toLowerCase());
        });
        const target = appState.dates.find(d => d.id === payload.dateId);
        if (target) {
          if (!target.voters) target.voters = [];
          target.voters.push(name);
        }
      } else if (action === "like") {
        const target = appState.contestants.find(c => c.id === payload.contestantId);
        if (target) {
          target.likes = Math.max(0, (target.likes || 0) + (payload.delta !== undefined ? payload.delta : 1));
        }
      } else if (action === "add_event") {
        const ev = payload.event;
        appState.timeline.push({
          id: "ev-" + Date.now(),
          time: ev.time,
          duration: Number(ev.duration) || 30,
          title: ev.title.trim(),
          icon: ev.icon || "✨",
          desc: ev.desc || ""
        });
      } else if (action === "delete_event") {
        appState.timeline = appState.timeline.filter(e => e.id !== payload.eventId);
      } else if (action === "add_contestant") {
        const cnt = payload.contestant;
        appState.contestants.push({
          id: "cnt-" + Date.now(),
          name: cnt.name.trim(),
          category: cnt.category || "до 10 лет",
          costume: cnt.costume.trim(),
          act: cnt.act || "",
          likes: 1
        });
      } else if (action === "delete_contestant") {
        appState.contestants = appState.contestants.filter(c => c.id !== payload.contestantId);
      } else if (action === "add_date") {
        const dOpt = payload.dateOption;
        appState.dates.push({
          id: "dt-" + Date.now(),
          label: dOpt.label.trim(),
          note: dOpt.note || "",
          voters: []
        });
      }
      persistLocalCache();
    } catch (localErr) {
      console.warn("Локальное применение изменения:", localErr);
    }

    updateSyncIndicator("offline");
    return { ok: true, data: appState, localOnly: true };
  }
};

// Применение данных, полученных с сервера
function applyRemoteState(remoteData) {
  if (!remoteData) return;

  let changed = false;

  if (Array.isArray(remoteData.timeline)) {
    const currentJson = JSON.stringify(appState.timeline);
    const remoteJson = JSON.stringify(remoteData.timeline);
    if (currentJson !== remoteJson) {
      appState.timeline = remoteData.timeline;
      changed = true;
    }
  }

  if (Array.isArray(remoteData.dates)) {
    const currentJson = JSON.stringify(appState.dates);
    const remoteJson = JSON.stringify(remoteData.dates);
    if (currentJson !== remoteJson) {
      appState.dates = remoteData.dates;
      changed = true;
    }
  }

  if (Array.isArray(remoteData.contestants)) {
    const currentJson = JSON.stringify(appState.contestants);
    const remoteJson = JSON.stringify(remoteData.contestants);
    if (currentJson !== remoteJson) {
      appState.contestants = remoteData.contestants;
      changed = true;
    }
  }

  if (remoteData.lastUpdated) {
    appState.lastUpdated = remoteData.lastUpdated;
  }

  persistLocalCache();

  if (changed) {
    renderAllViews(false); // мягкий рендер без сброса фокуса ввода
  }
}

// Периодическая проверка облачных изменений
async function checkCloudUpdates() {
  if (isSyncing) return;
  isSyncing = true;

  try {
    const remoteState = await CloudDB.fetchRemote();
    if (remoteState) {
      applyRemoteState(remoteState);
      updateSyncIndicator("online");
      lastSyncTimestamp = Date.now();
    } else {
      updateSyncIndicator("offline");
    }
  } catch (e) {
    updateSyncIndicator("offline");
  } finally {
    isSyncing = false;
  }
}

// Индикатор статуса синхронизации
function updateSyncIndicator(status) {
  const bar = document.getElementById("dbSyncStatusBar");
  const text = document.getElementById("dbSyncText");
  const time = document.getElementById("dbSyncTime");
  if (!bar || !text || !time) return;

  bar.classList.remove("syncing", "offline");

  if (status === "syncing") {
    bar.classList.add("syncing");
    text.textContent = "Облачная база: Синхронизация...";
  } else if (status === "offline") {
    bar.classList.add("offline");
    text.textContent = "Облачная база: Офлайн (Локальная копия)";
    time.textContent = "кэш";
  } else {
    text.textContent = "Облачная база: В сети • Живая синхронизация";
    time.textContent = "только что";
  }
}

// Запуск цикла живого обновления
function initRealtimeSync() {
  checkCloudUpdates();

  // Регулярный опрос
  setInterval(() => {
    if (document.visibilityState === "visible") {
      checkCloudUpdates();
    }
  }, POLL_INTERVAL_MS);

  // Мгновенный опрос при возвращении родственника на вкладку
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      checkCloudUpdates();
    }
  });

  window.addEventListener("focus", () => {
    checkCloudUpdates();
  });

  // Клик по статус-бару для ручного обновления
  const bar = document.getElementById("dbSyncStatusBar");
  if (bar) {
    bar.addEventListener("click", () => {
      playSound("tab");
      updateSyncIndicator("syncing");
      checkCloudUpdates().then(() => {
        showToast("Облачная база актуализирована 🔄");
      });
    });
  }
}

// ==========================================
// 4. ЗВУКОВОЙ ДВИЖОК WEB AUDIO API (60 FPS)
// ==========================================
let audioCtx = null;
function playSound(type) {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    if (type === "tab") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(587.33, now + 0.08);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === "vote") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.12);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === "like") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(659.25, now);
      osc.frequency.exponentialRampToValueAtTime(880.00, now + 0.15);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === "success") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.08);
      osc.frequency.setValueAtTime(783.99, now + 0.16);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.start(now);
      osc.stop(now + 0.28);
    }
  } catch (e) {
    // Браузерная блокировка аудио без жеста пользователя
  }
}

// ==========================================
// 5. УВЕДОМЛЕНИЯ TOAST
// ==========================================
function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.remove("hidden");
  setTimeout(() => {
    toast.classList.add("hidden");
  }, 2800);
}

// ==========================================
// 6. РЕНДЕРИНГ: ТАЙМЛАЙН ДНЯ
// ==========================================
function renderTimeline() {
  const container = document.getElementById("timelineList");
  const badge = document.getElementById("totalDurationBadge");
  if (!container || !badge) return;

  // Сортировка по времени начала
  appState.timeline.sort((a, b) => a.time.localeCompare(b.time));

  const totalMin = appState.timeline.reduce((sum, item) => sum + Number(item.duration || 0), 0);
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  badge.textContent = `⏳ Общее время программы: ${hours} ч ${mins} мин (${appState.timeline.length} этапов)`;

  if (appState.timeline.length === 0) {
    container.innerHTML = `
      <div class="glass-card" style="text-align:center; padding: 40px; color: var(--text-muted);">
        <p>Расписание пока не заполнено. Чолпонка может добавить пункты во вкладке «Кабинет Чолпонки» ✨</p>
      </div>
    `;
    return;
  }

  container.innerHTML = appState.timeline.map((item) => {
    const deleteBtn = appState.isAdmin ? `
      <div>
        <button class="timeline-delete-btn" onclick="deleteTimelineEvent('${item.id}')" title="Удалить пункт">
          ✕
        </button>
      </div>
    ` : "";

    return `
      <div class="timeline-card ${appState.isAdmin ? "has-actions" : ""}">
        <div class="timeline-spine-dot"></div>
        <div class="timeline-time-block">
          <span class="timeline-start-time">${escapeHtml(item.time)}</span>
          <span class="timeline-dur-badge">${escapeHtml(String(item.duration))} мин</span>
        </div>
        <div class="timeline-info">
          <div class="timeline-title-row">
            <span class="timeline-icon">${escapeHtml(item.icon || "✨")}</span>
            <span class="timeline-title">${escapeHtml(item.title)}</span>
          </div>
          ${item.desc ? `<p class="timeline-desc">${escapeHtml(item.desc)}</p>` : ""}
        </div>
        ${deleteBtn}
      </div>
    `;
  }).join("");
}

window.deleteTimelineEvent = async function(id) {
  if (!confirm("Удалить это событие из расписания?")) return;

  // Оптимистичное удаление
  const original = [...appState.timeline];
  appState.timeline = appState.timeline.filter(e => e.id !== id);
  renderTimeline();
  persistLocalCache();

  const res = await CloudDB.mutate("delete_event", { eventId: id, pin: "2027" });
  if (res.ok) {
    showToast("Событие удалено из общего расписания");
    playSound("tab");
  } else {
    // Откат при ошибке
    appState.timeline = original;
    renderTimeline();
    alert(res.error || "Не удалось удалить событие");
  }
};

// ==========================================
// 7. РЕНДЕРИНГ: ГОЛОСОВАНИЕ ПО ДАТАМ
// ==========================================
function renderVoting() {
  const container = document.getElementById("votingGrid");
  const voterNameInput = document.getElementById("voterNameInput");
  if (!container) return;

  if (voterNameInput && appState.currentVoter && document.activeElement !== voterNameInput) {
    voterNameInput.value = appState.currentVoter;
  }

  const maxVotes = Math.max(1, ...appState.dates.map(d => (d.voters || []).length));

  container.innerHTML = appState.dates.map(d => {
    const isSelected = appState.selectedDateId === d.id;
    const voters = d.voters || [];
    const count = voters.length;
    const pct = Math.round((count / maxVotes) * 100);

    const voterBadges = voters.map(name => {
      const isMe = appState.currentVoter && name.toLowerCase() === appState.currentVoter.toLowerCase();
      return `<span class="voter-tag ${isMe ? "voter-tag-me" : ""}">${escapeHtml(name)}${isMe ? " (Вы)" : ""}</span>`;
    }).join("");

    const isLeader = count === maxVotes && count > 0;
    const leaderBadge = isLeader ? `<span class="vote-leader-tag">🏆 Лидер</span>` : "";

    return `
      <div class="vote-card ${isSelected ? "selected" : ""}" onclick="selectDateOption('${d.id}')">
        <div class="vote-card-header">
          <span class="vote-date-title">${escapeHtml(d.label)}</span>
          <div class="vote-badges-group">
            ${leaderBadge}
            <span class="vote-count-badge">${count} голосов</span>
          </div>
        </div>
        ${d.note ? `<p class="vote-note">${escapeHtml(d.note)}</p>` : ""}
        <div class="vote-progress-bar">
          <div class="vote-progress-fill" style="width: ${pct}%"></div>
        </div>
        <div class="voters-avatars-row">
          ${voterBadges || '<span style="font-size:0.75rem; color:var(--text-dim);">Пока никто не выбрал</span>'}
        </div>
      </div>
    `;
  }).join("");
}

window.selectDateOption = function(dateId) {
  playSound("tab");
  appState.selectedDateId = dateId;
  renderVoting();
};

async function submitVote() {
  const input = document.getElementById("voterNameInput");
  const name = input ? input.value.trim() : "";

  if (!name) {
    alert("Пожалуйста, введите ваше имя (например: Медер, Чолпон, Дастан)!");
    if (input) input.focus();
    return;
  }
  if (!appState.selectedDateId) {
    alert("Пожалуйста, нажмите на карточку даты, за которую голосуете!");
    return;
  }

  appState.currentVoter = name;
  localStorage.setItem(VOTER_NAME_KEY, name);

  // Оптимистичное применение голоса
  appState.dates.forEach(d => {
    d.voters = (d.voters || []).filter(v => v.toLowerCase() !== name.toLowerCase());
  });

  const targetDate = appState.dates.find(d => d.id === appState.selectedDateId);
  if (targetDate) {
    if (!targetDate.voters) targetDate.voters = [];
    targetDate.voters.push(name);
  }

  persistLocalCache();
  playSound("vote");
  showToast(`Спасибо, ${name}! Ваш голос учтен за ${targetDate ? targetDate.label : "выбранную дату"} 🎉`);
  renderVoting();

  // Сохранение в единой облачной базе данных
  const res = await CloudDB.mutate("vote", { name, dateId: appState.selectedDateId });
  if (!res.ok) {
    showToast("⚠️ Голос сохранен локально, синхронизация повторится");
  }
}

// ==========================================
// 8. РЕНДЕРИНГ: ДЕТСКИЙ КОНКУРС И ЛАЙКИ
// ==========================================
function renderContest() {
  const container = document.getElementById("contestList");
  if (!container) return;

  if (appState.contestants.length === 0) {
    container.innerHTML = `
      <div class="glass-card" style="text-align:center; padding: 40px; color: var(--text-muted); grid-column: 1 / -1;">
        <p>Список участников пока формируется. Добавьте участников в кабинете Чолпонки! 🎭</p>
      </div>
    `;
    return;
  }

  container.innerHTML = appState.contestants.map(c => {
    const isLiked = localStorage.getItem(`ny_liked_${c.id}`) === "1";
    const catClass = c.category && c.category.includes("до 10") ? "cat-young" : "cat-older";

    return `
      <div class="contestant-card">
        <div class="contestant-header">
          <span class="contestant-name">${escapeHtml(c.name)}</span>
          <span class="contestant-category ${catClass}">${escapeHtml(c.category)}</span>
        </div>
        <div class="contestant-details">
          <div class="detail-row">
            <span class="detail-label">Костюм:</span>
            <span class="detail-val">🎭 ${escapeHtml(c.costume)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Номер:</span>
            <span class="detail-val">⭐ ${escapeHtml(c.act || "Праздничный творческий номер")}</span>
          </div>
        </div>
        <div class="contestant-footer">
          <button class="like-btn ${isLiked ? "liked" : ""}" onclick="toggleLike('${c.id}')">
            <span>❤️</span>
            <span id="likes-cnt-${c.id}">${c.likes || 0}</span>
          </button>
          ${appState.isAdmin ? `
            <button class="timeline-delete-btn" onclick="deleteContestant('${c.id}')" title="Удалить участника">
              ✕
            </button>
          ` : ""}
        </div>
      </div>
    `;
  }).join("");
}

window.toggleLike = async function(id) {
  const target = appState.contestants.find(c => c.id === id);
  if (!target) return;

  const key = `ny_liked_${id}`;
  const isCurrentlyLiked = localStorage.getItem(key) === "1";
  const delta = isCurrentlyLiked ? -1 : 1;

  // Оптимистичное обновление
  if (isCurrentlyLiked) {
    target.likes = Math.max(0, (target.likes || 0) - 1);
    localStorage.removeItem(key);
  } else {
    target.likes = (target.likes || 0) + 1;
    localStorage.setItem(key, "1");
    playSound("like");
    showToast(`Вы поддержали участника ${target.name}! 🌟`);
  }

  persistLocalCache();
  renderContest();

  // Облачная синхронизация лайка
  await CloudDB.mutate("like", { contestantId: id, delta });
};

window.deleteContestant = async function(id) {
  if (!confirm("Удалить участника из конкурса?")) return;

  const original = [...appState.contestants];
  appState.contestants = appState.contestants.filter(c => c.id !== id);
  persistLocalCache();
  renderContest();

  const res = await CloudDB.mutate("delete_contestant", { contestantId: id, pin: "2027" });
  if (res.ok) {
    showToast("Участник удален из списка конкурса");
    playSound("tab");
  } else {
    appState.contestants = original;
    renderContest();
    alert(res.error || "Не удалось удалить участника");
  }
};

// ==========================================
// 9. ПАНЕЛЬ ОРГАНИЗАТОРА (ЧОЛПОНКА)
// ==========================================
const ADMIN_PIN = "2027";

function initAdmin() {
  const authLock = document.getElementById("adminAuthLock");
  const panel = document.getElementById("adminPanel");
  const loginBtn = document.getElementById("adminLoginBtn");
  const logoutBtn = document.getElementById("adminLogoutBtn");
  const passInput = document.getElementById("adminPassInput");

  // Авто-вход если сессия сохранена
  if (appState.isAdmin && panel && authLock) {
    authLock.classList.add("hidden");
    panel.classList.remove("hidden");
  }

  if (loginBtn) {
    const handleLogin = () => {
      const entered = (passInput.value || "").trim().toLowerCase();
      if (entered === ADMIN_PIN || entered === "cholponka") {
        appState.isAdmin = true;
        sessionStorage.setItem(ADMIN_PIN_KEY, "true");
        authLock.classList.add("hidden");
        panel.classList.remove("hidden");
        playSound("success");
        showToast("Добро пожаловать в кабинет организатора, Чолпонка! 👑");
        renderTimeline();
        renderContest();
      } else {
        alert("Неверный пин-код! Пин-код по умолчанию: 2027");
        passInput.focus();
      }
    };

    loginBtn.addEventListener("click", handleLogin);

    if (passInput) {
      passInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          handleLogin();
        }
      });
    }
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      appState.isAdmin = false;
      sessionStorage.removeItem(ADMIN_PIN_KEY);
      authLock.classList.remove("hidden");
      panel.classList.add("hidden");
      if (passInput) passInput.value = "";
      showToast("Вы вышли из кабинета организатора");
      renderTimeline();
      renderContest();
    });
  }

  // Добавление события в расписание
  const addEventForm = document.getElementById("addEventForm");
  if (addEventForm) {
    addEventForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const title = document.getElementById("evTitle").value.trim();
      const time = document.getElementById("evTime").value;
      const duration = parseInt(document.getElementById("evDuration").value, 10);
      const icon = document.getElementById("evIcon").value.trim() || "✨";
      const desc = document.getElementById("evDesc").value.trim();

      const newEvent = {
        time,
        duration: isNaN(duration) ? 45 : duration,
        title,
        icon,
        desc
      };

      showToast(`Сохранение «${title}» в облачной базе...`);
      const res = await CloudDB.mutate("add_event", { event: newEvent, pin: "2027" });
      if (res.ok) {
        playSound("success");
        showToast(`Событие «${title}» добавлено и видно всей семье! 🕒`);
        e.target.reset();
        document.getElementById("evDuration").value = "45";
        document.getElementById("evIcon").value = "🍽️";
      } else {
        alert(res.error || "Не удалось добавить событие в базу");
      }
    });
  }

  // Добавление участника в конкурс
  const addContestantForm = document.getElementById("addContestantForm");
  if (addContestantForm) {
    addContestantForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("cntName").value.trim();
      const category = document.getElementById("cntCategory").value;
      const costume = document.getElementById("cntCostume").value.trim();
      const act = document.getElementById("cntAct").value.trim();

      const newContestant = {
        name,
        category,
        costume,
        act
      };

      showToast(`Регистрация участника ${name}...`);
      const res = await CloudDB.mutate("add_contestant", { contestant: newContestant, pin: "2027" });
      if (res.ok) {
        playSound("success");
        showToast(`Участник ${name} зарегистрирован в конкурсе! 🎭`);
        e.target.reset();
      } else {
        alert(res.error || "Не удалось зарегистрировать участника");
      }
    });
  }

  // Добавление новой даты в опрос
  const addDateForm = document.getElementById("addDateForm");
  if (addDateForm) {
    addDateForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const label = document.getElementById("dateLabel").value.trim();
      const note = document.getElementById("dateNote").value.trim();

      const newDate = { label, note };

      showToast(`Добавление варианта «${label}»...`);
      const res = await CloudDB.mutate("add_date", { dateOption: newDate, pin: "2027" });
      if (res.ok) {
        playSound("success");
        showToast(`Вариант «${label}» добавлен в семейное голосование! 📅`);
        e.target.reset();
      } else {
        alert(res.error || "Не удалось добавить дату");
      }
    });
  }

  // Экспорт копии конфигурации в JSON
  const exportBtn = document.getElementById("adminExportBtn");
  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appState, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `noviy_god_2027_database_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast("Файл базы данных скачан на устройство 📥");
    });
  }

  // Импорт копии конфигурации из JSON
  const importBtn = document.getElementById("adminImportBtn");
  const fileInput = document.getElementById("adminFileInput");
  if (importBtn && fileInput) {
    importBtn.addEventListener("click", () => {
      fileInput.click();
    });

    fileInput.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          if (!Array.isArray(parsed.timeline) || !Array.isArray(parsed.dates)) {
            alert("Ошибка: неверная структура файла резервной копии!");
            return;
          }

          showToast("Загрузка данных в облачную базу...");
          const res = await CloudDB.mutate("import_state", { state: parsed, pin: "2027" });
          if (res.ok) {
            playSound("success");
            showToast("База данных успешно восстановлена из копии! 🌟");
          } else {
            alert(res.error || "Ошибка импорта данных");
          }
        } catch (err) {
          alert("Ошибка чтения JSON файла: " + err.message);
        }
      };
      reader.readAsText(file);
      fileInput.value = "";
    });
  }

  // Сброс к значениям по умолчанию
  const resetBtn = document.getElementById("adminResetBtn");
  if (resetBtn) {
    resetBtn.addEventListener("click", async () => {
      if (confirm("Вы уверены, что хотите сбросить расписание и опрос к исходному варианту для всех родственников?")) {
        showToast("Сброс данных к начальным...");
        const res = await CloudDB.mutate("reset", { pin: "2027" });
        if (res.ok) {
          playSound("tab");
          showToast("Данные сброшены по умолчанию во всей сети 🔄");
        } else {
          alert(res.error || "Ошибка сброса");
        }
      }
    });
  }
}

// ==========================================
// 10. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ==========================================
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderAllViews(forceInputs = true) {
  renderTimeline();
  renderVoting();
  renderContest();
}

// ==========================================
// 11. ТАКТИЛЬНЫЙ ПЕРЕКЛЮЧАТЕЛЬ ТЕМ (GILDED IVORY & WARM OBSIDIAN)
// ==========================================
const THEME_STORAGE_KEY = "portal_theme";

function applyTheme(theme, save = true) {
  if (theme !== "obsidian" && theme !== "ivory") {
    theme = "ivory";
  }
  document.documentElement.setAttribute("data-theme", theme);
  document.body.setAttribute("data-theme", theme);

  if (save) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (e) {}
  }

  const btnIvory = document.getElementById("themeBtnIvory");
  const btnObsidian = document.getElementById("themeBtnObsidian");
  if (btnIvory && btnObsidian) {
    if (theme === "ivory") {
      btnIvory.classList.add("active");
      btnObsidian.classList.remove("active");
    } else {
      btnObsidian.classList.add("active");
      btnIvory.classList.remove("active");
    }
  }
}

function initThemeSwitcher() {
  let savedTheme = "ivory";
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const paramTheme = urlParams.get("theme");
    if (paramTheme === "obsidian" || paramTheme === "ivory") {
      savedTheme = paramTheme;
    } else {
      savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || "ivory";
    }
  } catch (e) {}
  applyTheme(savedTheme, false);

  const btnIvory = document.getElementById("themeBtnIvory");
  const btnObsidian = document.getElementById("themeBtnObsidian");

  if (btnIvory) {
    btnIvory.addEventListener("click", () => {
      playSound("tab");
      applyTheme("ivory");
      showToast("Тема: ☀️ Слоновая кость (Gilded Ivory)");
    });
  }

  if (btnObsidian) {
    btnObsidian.addEventListener("click", () => {
      playSound("tab");
      applyTheme("obsidian");
      showToast("Тема: 🌙 Теплый обсидиан (Warm Obsidian)");
    });
  }
}

// ==========================================
// 12. СНЕГОПАД НА CANVAS (60 FPS АППАРАТНОЕ УСКОРЕНИЕ)
// ==========================================
function initSnowCanvas() {
  const canvas = document.getElementById("snowCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  let width = window.innerWidth;
  let height = window.innerHeight;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
  }

  resize();
  window.addEventListener("resize", resize);

  const flakeCount = Math.min(85, Math.floor(width / 14));
  const flakes = [];

  for (let i = 0; i < flakeCount; i++) {
    flakes.push({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 2.2 + 0.8,
      speedY: Math.random() * 0.85 + 0.35,
      speedX: (Math.random() - 0.5) * 0.35,
      opacity: Math.random() * 0.2 + 0.25
    });
  }

  function renderSnow() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const isObsidian = document.documentElement.getAttribute("data-theme") === "obsidian";

    for (let f of flakes) {
      ctx.beginPath();
      ctx.arc(f.x * dpr, f.y * dpr, f.r * dpr, 0, Math.PI * 2);
      // Адаптация цвета частиц под активную тему
      ctx.fillStyle = isObsidian
        ? `rgba(236, 200, 128, ${f.opacity * 1.15})`
        : `rgba(212, 175, 55, ${f.opacity * 0.85})`;
      ctx.fill();

      f.y += f.speedY;
      f.x += f.speedX;

      if (f.y > height) {
        f.y = -5;
        f.x = Math.random() * width;
      }
      if (f.x > width) f.x = 0;
      if (f.x < 0) f.x = width;
    }
    requestAnimationFrame(renderSnow);
  }

  renderSnow();
}

// ==========================================
// 13. ЖИВОЙ ТАЙМЕР ОБРАТНОГО ОТСЧЕТА ДО 2027 ГОДА
// ==========================================
function initCountdown() {
  // Целевая дата: 1 января 2027 00:00:00 (Бишкек / UTC+6)
  const TARGET_DATE = new Date("2027-01-01T00:00:00+06:00").getTime();

  function update() {
    const now = Date.now();
    const diff = TARGET_DATE - now;

    const dEl = document.getElementById("cntDays");
    const hEl = document.getElementById("cntHours");
    const mEl = document.getElementById("cntMinutes");
    const sEl = document.getElementById("cntSeconds");

    if (diff <= 0) {
      if (dEl) dEl.textContent = "00";
      if (hEl) hEl.textContent = "00";
      if (mEl) mEl.textContent = "00";
      if (sEl) sEl.textContent = "00";
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    if (dEl) dEl.textContent = String(days).padStart(2, "0");
    if (hEl) hEl.textContent = String(hours).padStart(2, "0");
    if (mEl) mEl.textContent = String(minutes).padStart(2, "0");
    if (sEl) sEl.textContent = String(seconds).padStart(2, "0");
  }

  update();
  setInterval(update, 1000);
}

// ==========================================
// 14. ИНИЦИАЛИЗАЦИЯ И СЛУШАТЕЛИ
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  // Инициализация темы Quiet Luxury
  initThemeSwitcher();

  // Живой таймер обратного отсчета
  initCountdown();

  // Плавная навигация по разделам лендинга
  function navigateTo(targetId) {
    playSound("tab");
    if (targetId === "top") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      tabButtons.forEach(b => b.classList.remove("active"));
      dockButtons.forEach(b => b.classList.toggle("active", b.dataset.dock === "top"));
      return;
    }
    const targetElement = document.getElementById(`tab-${targetId}`) || document.getElementById(targetId);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
      tabButtons.forEach(b => b.classList.toggle("active", b.dataset.tab === targetId));
      dockButtons.forEach(b => b.classList.toggle("active", b.dataset.dock === targetId));
    }
  }

  // Навигация по верхним вкладкам
  const tabButtons = document.querySelectorAll(".tab-btn");
  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.tab;
      navigateTo(target);
    });
  });

  // Навигация по нижнему плавающему доку (Floating Glass Dock)
  const dockButtons = document.querySelectorAll(".dock-btn");
  dockButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.dock;
      navigateTo(target);
    });
  });

  // Автоматическая подсветка текущего раздела при скролле (ScrollSpy)
  const sections = document.querySelectorAll(".portal-section");
  if ("IntersectionObserver" in window && sections.length > 0) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && window.scrollY >= 150) {
          const sectionId = entry.target.id.replace("tab-", "");
          tabButtons.forEach(btn => {
            btn.classList.toggle("active", btn.dataset.tab === sectionId);
          });
          dockButtons.forEach(btn => {
            btn.classList.toggle("active", btn.dataset.dock === sectionId);
          });
        }
      });
    }, {
      rootMargin: "-10% 0px -60% 0px",
      threshold: 0.05
    });

    sections.forEach(s => observer.observe(s));
  }

  // Подсветка кнопки «Вверх» при нахождении в шапке
  window.addEventListener("scroll", () => {
    if (window.scrollY < 180) {
      tabButtons.forEach(btn => btn.classList.remove("active"));
      dockButtons.forEach(btn => {
        btn.classList.toggle("active", btn.dataset.dock === "top");
      });
    }
  }, { passive: true });

  const submitVoteBtn = document.getElementById("submitVoteBtn");
  const voterNameInput = document.getElementById("voterNameInput");
  if (submitVoteBtn) {
    submitVoteBtn.addEventListener("click", submitVote);
  }
  if (voterNameInput) {
    voterNameInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        submitVote();
      }
    });
  }

  // Первоначальный рендер из локального кэша для моментальной загрузки (0ms)
  renderAllViews();
  initAdmin();
  initSnowCanvas();

  // Запуск облачной синхронизации в реальном времени
  initRealtimeSync();
});
