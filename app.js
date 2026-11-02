/**
 * СЕМЕЙНЫЙ НОВОГОДНИЙ ПОРТАЛ 2027 // APP.JS
 * Полная реактивная логика:
 * - 60 FPS Canvas снегопад
 * - Web Audio API для тактильных звуков
 * - Управление расписанием (Timeline CRUD)
 * - Интерактивное голосование по датам
 * - Витрина детского конкурса талантов
 * - Защищенная админка для Чолпонки с сохранением в LocalStorage + экспорт JSON
 */

// ==========================================
// 1. НАЧАЛЬНЫЕ ДАННЫЕ (ИЗ ЧАТА СЕМЬИ)
// ==========================================
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
  currentVoter: localStorage.getItem("ny_current_voter") || "",
  selectedDateId: null,
  isAdmin: false
};

// ==========================================
// 2. ХРАНИЛИЩЕ LOCALSTORAGE
// ==========================================
const STORAGE_KEY = "ny_family_portal_2027_data";

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_STATE, ...parsed };
    }
  } catch (e) {
    console.error("Ошибка загрузки данных из LocalStorage:", e);
  }
  return { ...DEFAULT_STATE };
}

let appState = loadState();

function saveState() {
  try {
    const toSave = {
      timeline: appState.timeline,
      dates: appState.dates,
      contestants: appState.contestants
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (e) {
    console.error("Ошибка сохранения в LocalStorage:", e);
  }
}

// ==========================================
// 3. ЗВУКОВОЙ ДВИЖОК WEB AUDIO API
// ==========================================
let audioCtx = null;
function playSound(type) {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    if (type === 'tab') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(587.33, now + 0.08);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'vote') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.12);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 'like') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, now);
      osc.frequency.exponentialRampToValueAtTime(880.00, now + 0.15);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.08);
      osc.frequency.setValueAtTime(783.99, now + 0.16);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.start(now);
      osc.stop(now + 0.28);
    }
  } catch (e) {
    // Тихо игнорируем, если аудио запрещено браузером
  }
}

// ==========================================
// 4. УВЕДОМЛЕНИЯ TOAST
// ==========================================
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.remove("hidden");
  setTimeout(() => {
    toast.classList.add("hidden");
  }, 2800);
}

// ==========================================
// 5. РЕНДЕРИНГ: ТАЙМЛАЙН ДНЯ
// ==========================================
function renderTimeline() {
  const container = document.getElementById("timelineList");
  const badge = document.getElementById("totalDurationBadge");

  // Сортировка по времени начала
  appState.timeline.sort((a, b) => a.time.localeCompare(b.time));

  let totalMin = appState.timeline.reduce((sum, item) => sum + Number(item.duration || 0), 0);
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
      <button class="timeline-delete-btn" onclick="deleteTimelineEvent('${item.id}')" title="Удалить пункт">
        ✕
      </button>
    ` : '';

    return `
      <div class="timeline-card">
        <div class="timeline-time-block">
          <span class="timeline-start-time">${item.time}</span>
          <span class="timeline-dur-badge">${item.duration} мин</span>
        </div>
        <div class="timeline-info">
          <div class="timeline-title-row">
            <span class="timeline-icon">${item.icon || '✨'}</span>
            <span class="timeline-title">${item.title}</span>
          </div>
          ${item.desc ? `<p class="timeline-desc">${item.desc}</p>` : ''}
        </div>
        <div>
          ${deleteBtn}
        </div>
      </div>
    `;
  }).join("");
}

window.deleteTimelineEvent = function(id) {
  if (!confirm("Удалить это событие из расписания?")) return;
  appState.timeline = appState.timeline.filter(e => e.id !== id);
  saveState();
  renderTimeline();
  showToast("Событие удалено из таймлайна");
};

// ==========================================
// 6. РЕНДЕРИНГ: ГОЛОСОВАНИЕ ПО ДАТАМ
// ==========================================
function renderVoting() {
  const container = document.getElementById("votingGrid");
  const voterNameInput = document.getElementById("voterNameInput");
  if (appState.currentVoter) {
    voterNameInput.value = appState.currentVoter;
  }

  // Расчет максимального числа голосов
  const maxVotes = Math.max(1, ...appState.dates.map(d => d.voters.length));

  container.innerHTML = appState.dates.map(d => {
    const isSelected = appState.selectedDateId === d.id;
    const count = d.voters.length;
    const pct = Math.round((count / maxVotes) * 100);

    const voterBadges = d.voters.map(name => `<span class="voter-tag">${name}</span>`).join("");

    return `
      <div class="vote-card ${isSelected ? 'selected' : ''}" onclick="selectDateOption('${d.id}')">
        <div class="vote-card-header">
          <span class="vote-date-title">${d.label}</span>
          <span class="vote-count-badge">${count} голосов</span>
        </div>
        ${d.note ? `<p class="vote-note">${d.note}</p>` : ''}
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
  playSound('tab');
  appState.selectedDateId = dateId;
  renderVoting();
};

function submitVote() {
  const name = document.getElementById("voterNameInput").value.trim();
  if (!name) {
    alert("Пожалуйста, введите ваше имя (например: Медер, Чолпон, Дастан)!");
    return;
  }
  if (!appState.selectedDateId) {
    alert("Пожалуйста, нажмите на карточку даты, за которую голосуете!");
    return;
  }

  appState.currentVoter = name;
  localStorage.setItem("ny_current_voter", name);

  // Удаляем старый голос этого человека со всех дат
  appState.dates.forEach(d => {
    d.voters = d.voters.filter(v => v.toLowerCase() !== name.toLowerCase());
  });

  // Добавляем в выбранную дату
  const targetDate = appState.dates.find(d => d.id === appState.selectedDateId);
  if (targetDate) {
    targetDate.voters.push(name);
  }

  saveState();
  playSound('vote');
  showToast(`Спасибо, ${name}! Ваш голос учтен за ${targetDate.label} 🎉`);
  renderVoting();
}

// ==========================================
// 7. РЕНДЕРИНГ: ДЕТСКИЙ КОНКУРС
// ==========================================
function renderContest() {
  const container = document.getElementById("contestList");

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

    return `
      <div class="contestant-card">
        <div class="contestant-header">
          <span class="contestant-name">${c.name}</span>
          <span class="contestant-category">${c.category}</span>
        </div>
        <div class="contestant-details">
          <div class="detail-row">
            <span class="detail-label">Костюм:</span>
            <span class="detail-val">🎭 ${c.costume}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Номер:</span>
            <span class="detail-val">⭐ ${c.act}</span>
          </div>
        </div>
        <div class="contestant-footer">
          <button class="like-btn ${isLiked ? 'liked' : ''}" onclick="toggleLike('${c.id}')">
            <span>❤️</span>
            <span id="likes-cnt-${c.id}">${c.likes}</span>
          </button>
          ${appState.isAdmin ? `
            <button class="timeline-delete-btn" onclick="deleteContestant('${c.id}')" title="Удалить участника">
              ✕
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }).join("");
}

window.toggleLike = function(id) {
  const target = appState.contestants.find(c => c.id === id);
  if (!target) return;

  const key = `ny_liked_${id}`;
  const isLiked = localStorage.getItem(key) === "1";

  if (isLiked) {
    target.likes = Math.max(0, target.likes - 1);
    localStorage.removeItem(key);
  } else {
    target.likes += 1;
    localStorage.setItem(key, "1");
    playSound('like');
    showToast(`Вы поддержали участника ${target.name}! 🌟`);
  }

  saveState();
  renderContest();
};

window.deleteContestant = function(id) {
  if (!confirm("Удалить участника из конкурса?")) return;
  appState.contestants = appState.contestants.filter(c => c.id !== id);
  saveState();
  renderContest();
  showToast("Участник удален");
};

// ==========================================
// 8. ПАНЕЛЬ ОРГАНИЗАТОРА (ЧОЛПОНКА)
// ==========================================
const ADMIN_PIN = "2027";

function initAdmin() {
  const authLock = document.getElementById("adminAuthLock");
  const panel = document.getElementById("adminPanel");
  const loginBtn = document.getElementById("adminLoginBtn");
  const logoutBtn = document.getElementById("adminLogoutBtn");
  const passInput = document.getElementById("adminPassInput");

  loginBtn.addEventListener("click", () => {
    if (passInput.value.trim() === ADMIN_PIN || passInput.value.trim().toLowerCase() === "cholponka") {
      appState.isAdmin = true;
      authLock.classList.add("hidden");
      panel.classList.remove("hidden");
      playSound('success');
      showToast("Добро пожаловать в кабинет организатора, Чолпонка! 👑");
      renderTimeline();
      renderContest();
    } else {
      alert("Неверный пин-код! По умолчанию: 2027");
    }
  });

  logoutBtn.addEventListener("click", () => {
    appState.isAdmin = false;
    authLock.classList.remove("hidden");
    panel.classList.add("hidden");
    passInput.value = "";
    showToast("Вы вышли из кабинета организатора");
    renderTimeline();
    renderContest();
  });

  // Добавление события в расписание
  document.getElementById("addEventForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const title = document.getElementById("evTitle").value.trim();
    const time = document.getElementById("evTime").value;
    const duration = parseInt(document.getElementById("evDuration").value, 10);
    const icon = document.getElementById("evIcon").value.trim() || "✨";
    const desc = document.getElementById("evDesc").value.trim();

    const newEvent = {
      id: "ev-" + Date.now(),
      time,
      duration,
      title,
      icon,
      desc
    };

    appState.timeline.push(newEvent);
    saveState();
    playSound('success');
    showToast(`Событие «${title}» добавлено в расписание! 🕒`);
    renderTimeline();
    e.target.reset();
    document.getElementById("evDuration").value = "45";
    document.getElementById("evIcon").value = "🍽️";
  });

  // Добавление участника в конкурс
  document.getElementById("addContestantForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("cntName").value.trim();
    const category = document.getElementById("cntCategory").value;
    const costume = document.getElementById("cntCostume").value.trim();
    const act = document.getElementById("cntAct").value.trim();

    const newContestant = {
      id: "cnt-" + Date.now(),
      name,
      category,
      costume,
      act,
      likes: 1
    };

    appState.contestants.push(newContestant);
    saveState();
    playSound('success');
    showToast(`Участник ${name} добавлен в конкурс! 🎭`);
    renderContest();
    e.target.reset();
  });

  // Добавление даты в опрос
  document.getElementById("addDateForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const label = document.getElementById("dateLabel").value.trim();
    const note = document.getElementById("dateNote").value.trim();

    const newDate = {
      id: "dt-" + Date.now(),
      label,
      note,
      voters: []
    };

    appState.dates.push(newDate);
    saveState();
    playSound('success');
    showToast(`Вариант «${label}» добавлен в семейное голосование! 📅`);
    renderVoting();
    e.target.reset();
  });

  // Экспорт копии конфигурации в JSON
  document.getElementById("adminExportBtn").addEventListener("click", () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appState, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `noviy_god_2027_config_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast("Файл конфигурации скачан на ПК 📥");
  });

  // Сброс к значениям по умолчанию
  document.getElementById("adminResetBtn").addEventListener("click", () => {
    if (confirm("Вы уверены, что хотите сбросить расписание и конкурс к исходному варианту?")) {
      appState.timeline = [...DEFAULT_STATE.timeline];
      appState.dates = [...DEFAULT_STATE.dates];
      appState.contestants = [...DEFAULT_STATE.contestants];
      saveState();
      renderTimeline();
      renderVoting();
      renderContest();
      showToast("Данные сброшены по умолчанию");
    }
  });
}

// ==========================================
// 9. СНЕГОПАД НА CANVAS (60 FPS АППАРАТНОЕ УСКОРЕНИЕ)
// ==========================================
function initSnowCanvas() {
  const canvas = document.getElementById("snowCanvas");
  const ctx = canvas.getContext("2d");

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener("resize", () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const flakeCount = Math.min(80, Math.floor(width / 16));
  const flakes = [];

  for (let i = 0; i < flakeCount; i++) {
    flakes.push({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 2.2 + 0.8,
      speedY: Math.random() * 0.9 + 0.4,
      speedX: (Math.random() - 0.5) * 0.5,
      opacity: Math.random() * 0.6 + 0.2
    });
  }

  function renderSnow() {
    ctx.clearRect(0, 0, width, height);
    for (let f of flakes) {
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${f.opacity})`;
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
// 10. ИНИЦИАЛИЗАЦИЯ И СЛУШАТЕЛИ
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  // Навигация по вкладкам
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabPanes = document.querySelectorAll(".tab-pane");

  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      playSound('tab');
      const target = btn.dataset.tab;

      tabButtons.forEach(b => b.classList.remove("active"));
      tabPanes.forEach(p => p.classList.remove("active"));

      btn.classList.add("active");
      const targetPane = document.getElementById(`tab-${target}`);
      if (targetPane) {
        targetPane.classList.add("active");
      }
    });
  });

  document.getElementById("submitVoteBtn").addEventListener("click", submitVote);

  // Инициализация компонентов
  renderTimeline();
  renderVoting();
  renderContest();
  initAdmin();
  initSnowCanvas();
});
