const native = window.Neutralino;
const hasNative = Boolean(native && native.window);

const els = {
  root: document.documentElement,
  hours: document.getElementById('hours'),
  minutes: document.getElementById('minutes'),
  seconds: document.getElementById('seconds'),
  meridiem: document.getElementById('meridiem'),
  date: document.getElementById('date'),
  weekday: document.getElementById('weekday'),
  unix: document.getElementById('unix'),
  unixMs: document.getElementById('unix-ms'),
  tz: document.getElementById('tz'),
  toast: document.getElementById('toast'),
  btnFormat: document.getElementById('btn-format'),
  btnPin: document.getElementById('btn-pin'),
  btnTheme: document.getElementById('btn-theme'),
  btnFull: document.getElementById('btn-full'),
  btnMin: document.getElementById('btn-min'),
  btnClose: document.getElementById('btn-close'),
  btnTs: document.getElementById('btn-ts'),
  btnTsMs: document.getElementById('btn-ts-ms'),
  btnLang: document.getElementById('btn-lang'),
  searchForm: document.getElementById('search-form'),
  engine: document.getElementById('engine'),
  query: document.getElementById('query'),
  tzPanel: document.getElementById('tz-panel'),
  tzSearch: document.getElementById('tz-search'),
  tzList: document.getElementById('tz-list'),
  tzClose: document.getElementById('tz-close'),
};

const STORAGE_KEYS = {
  hour12: 'tf.hour12',
  theme: 'tf.theme',
  pinned: 'tf.pinned',
  engine: 'tf.engine',
  lang: 'tf.lang',
  timeZone: 'tf.tz',
};

const prefersLight =
  window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;

const savedEngine = localStorage.getItem(STORAGE_KEYS.engine);
const savedLang = localStorage.getItem(STORAGE_KEYS.lang);
const systemZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

const state = {
  hour12: localStorage.getItem(STORAGE_KEYS.hour12) === 'true',
  theme: localStorage.getItem(STORAGE_KEYS.theme) || (prefersLight ? 'light' : 'dark'),
  pinned: localStorage.getItem(STORAGE_KEYS.pinned) === 'true',
  engine: isSupportedEngine(savedEngine) ? savedEngine : 'google',
  lang:
    savedLang === 'zh' || savedLang === 'en'
      ? savedLang
      : (navigator.language || '').toLowerCase().startsWith('zh')
        ? 'zh'
        : 'en',
  timeZone: 'local',
  fullscreen: false,
};

const pad2 = (value) => String(value).padStart(2, '0');
const t = (key) => I18N[state.lang][key];

let nativeReady = false;
let lastRenderedSecond = -1;
let toastTimer = null;
let tzItemsBuilt = false;
let tzPanelOpen = false;

function normalizeZone(value) {
  if (!value || value === 'local') return 'local';
  return isValidZone(value) ? value : 'local';
}

state.timeZone = normalizeZone(localStorage.getItem(STORAGE_KEYS.timeZone));

function zoneDisplay(zone) {
  if (zone === 'local') return t('followSystem');
  return zoneName(zone, state.lang);
}

function applyLanguage() {
  const dict = I18N[state.lang];
  els.root.lang = state.lang === 'zh' ? 'zh-CN' : 'en';

  document.querySelectorAll('[data-i18n]').forEach((node) => {
    const value = dict[node.dataset.i18n];
    if (typeof value === 'string') node.textContent = value;
  });

  document.querySelectorAll('[data-i18n-title]').forEach((node) => {
    const value = dict[node.dataset.i18nTitle];
    if (typeof value === 'string') node.title = value;
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach((node) => {
    const value = dict[node.dataset.i18nPlaceholder];
    if (typeof value === 'string') node.placeholder = value;
  });

  els.btnLang.textContent = dict.langLabel;

  tzItemsBuilt = false;
  els.tzList.textContent = '';

  applyPinned(state.pinned);
  applyFullscreen(state.fullscreen);
  updateTzLabel();
  lastRenderedSecond = -1;
}

function applyTheme() {
  els.root.dataset.theme = state.theme;
  localStorage.setItem(STORAGE_KEYS.theme, state.theme);
}

function applyFormat() {
  els.btnFormat.textContent = state.hour12 ? '12H' : '24H';
  localStorage.setItem(STORAGE_KEYS.hour12, String(state.hour12));
  lastRenderedSecond = -1;
}

function applyPinned(pinned) {
  state.pinned = Boolean(pinned);
  els.btnPin.classList.toggle('active', state.pinned);
  els.btnPin.setAttribute('aria-pressed', String(state.pinned));
  els.btnPin.title = state.pinned ? t('pinOn') : t('pinOff');
  localStorage.setItem(STORAGE_KEYS.pinned, String(state.pinned));
}

function applyFullscreen(value) {
  state.fullscreen = Boolean(value);
  els.root.dataset.fullscreen = String(state.fullscreen);
  els.btnFull.classList.toggle('active', state.fullscreen);
  els.btnFull.setAttribute('aria-pressed', String(state.fullscreen));
  els.btnFull.title = state.fullscreen ? t('fullOn') : t('fullOff');
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove('show'), 1500);
}

function render(now) {
  const dict = I18N[state.lang];
  const parts = getTimeParts(now, state.timeZone);
  let hours = parts.hours;

  if (state.hour12) {
    els.meridiem.textContent = hours < 12 ? 'AM' : 'PM';
    hours = hours % 12 || 12;
  } else {
    els.meridiem.textContent = '';
  }

  els.hours.textContent = pad2(hours);
  els.minutes.textContent = pad2(parts.minutes);
  els.seconds.textContent = pad2(parts.seconds);

  els.date.textContent = dict.formatDate(parts.year, parts.month, parts.day);
  els.weekday.textContent = dict.weekdays[parts.weekday] ?? '';

  els.unix.textContent = String(Math.floor(now.getTime() / 1000));
  els.unixMs.textContent = String(now.getTime());
}

function tick() {
  const now = new Date();
  if (now.getSeconds() !== lastRenderedSecond) {
    lastRenderedSecond = now.getSeconds();
    render(now);
  }
  requestAnimationFrame(tick);
}

/* ---------- time zone panel ---------- */

function updateTzLabel() {
  const zone = state.timeZone === 'local' ? systemZone : state.timeZone;
  const label = zoneDisplay(zone);

  els.tz.textContent = label;
  els.tz.title =
    state.timeZone === 'local'
      ? `${t('selectTimeZone')} · ${t('followSystem')} (${zone})`
      : `${t('selectTimeZone')} · ${zone}`;
}

function getZones() {
  const zones = [...COMMON_ZONES];

  // 若之前选过不在常用列表里的时区，仍保留在列表首位，避免出现"选中项不在列表"的情况。
  if (state.timeZone !== 'local' && !zones.includes(state.timeZone)) {
    zones.unshift(state.timeZone);
  }

  return zones;
}

function markActiveZone() {
  els.tzList.querySelectorAll('.tz-item').forEach((item) => {
    item.classList.toggle('active', item.dataset.zone === state.timeZone);
  });
}

function buildTzList() {
  if (tzItemsBuilt) return;

  const entries = [
    { zone: 'local', label: `${t('followSystem')} · ${zoneDisplay(systemZone)}` },
  ];
  for (const zone of getZones()) entries.push({ zone, label: zoneDisplay(zone) });

  const fragment = document.createDocumentFragment();
  for (const entry of entries) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'tz-item';
    item.dataset.zone = entry.zone;
    // 搜索同时匹配 IANA 标识和中文名称，方便中英文输入。
    item.dataset.search = `${entry.zone} ${ZONE_NAMES[entry.zone] || ''}`.toLowerCase();

    const name = document.createElement('span');
    name.className = 'tz-name';
    name.textContent = entry.label;

    const time = document.createElement('span');
    time.className = 'tz-time';
    time.textContent = zoneTimeLabel(entry.zone);

    item.append(name, time);
    item.addEventListener('click', () => selectZone(entry.zone));
    fragment.append(item);
  }

  els.tzList.append(fragment);
  tzItemsBuilt = true;
}

function refreshZoneTimes() {
  els.tzList.querySelectorAll('.tz-item').forEach((item) => {
    const time = item.querySelector('.tz-time');
    if (time) time.textContent = zoneTimeLabel(item.dataset.zone);
  });
}

function filterZoneList(value) {
  const query = value.trim().toLowerCase();
  els.tzList.querySelectorAll('.tz-item').forEach((item) => {
    const text = (item.dataset.search || item.dataset.zone).toLowerCase();
    item.hidden = Boolean(query) && !text.includes(query);
  });
}

function openTzPanel() {
  buildTzList();
  refreshZoneTimes();
  markActiveZone();
  els.tzPanel.hidden = false;
  tzPanelOpen = true;
  els.tzSearch.value = '';
  filterZoneList('');
  els.tzSearch.focus();
}

function closeTzPanel() {
  els.tzPanel.hidden = true;
  tzPanelOpen = false;
}

function toggleTzPanel() {
  if (tzPanelOpen) closeTzPanel();
  else openTzPanel();
}

function selectZone(zone) {
  state.timeZone = normalizeZone(zone);
  localStorage.setItem(STORAGE_KEYS.timeZone, state.timeZone);
  updateTzLabel();
  markActiveZone();
  lastRenderedSecond = -1;
  closeTzPanel();
}

/* ---------- actions ---------- */

async function copyTimestamp(ms) {
  const value = ms ? String(Date.now()) : String(Math.floor(Date.now() / 1000));
  try {
    if (nativeReady) {
      await native.clipboard.writeText(value);
    } else {
      await navigator.clipboard.writeText(value);
    }
    showToast(t('copied')(value));
  } catch {
    showToast(t('copyFailed'));
  }
}

async function runSearch() {
  const query = els.query.value.trim();
  if (!query) {
    els.query.focus();
    return;
  }

  const url = buildSearchUrl(state.engine, query);

  try {
    if (nativeReady) {
      await native.os.open(url);
    } else {
      window.open(url, '_blank');
    }
    showToast(t('searchOpened')(query));
    els.query.select();
  } catch {
    showToast(t('openFailed'));
  }
}

async function togglePin() {
  const next = !state.pinned;
  if (nativeReady) {
    try {
      await native.window.setAlwaysOnTop(next);
    } catch (error) {
      console.error(error);
    }
  }
  applyPinned(next);
}

async function toggleFullscreen() {
  const next = !state.fullscreen;
  if (nativeReady) {
    try {
      if (next) {
        await native.window.setFullScreen();
      } else {
        await native.window.exitFullScreen();
      }
    } catch (error) {
      console.error(error);
    }
  }
  applyFullscreen(next);
}

/* ---------- native shell ---------- */

async function initNative() {
  if (!hasNative) return false;

  try {
    native.init();
    return true;
  } catch (error) {
    console.error('Neutralino 初始化失败', error);
    return false;
  }
}

// 不使用 window.setDraggableRegion：它在 Windows 上会把整条标题栏变成拖动区，
// 导致内部按钮收不到点击。改为手动拖动，仅在非按钮区域触发。
function enableWindowDrag() {
  if (!nativeReady) return;

  const titlebar = document.getElementById('titlebar');
  if (!titlebar) return;

  titlebar.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;

    const target = event.target;
    if (target instanceof Element && target.closest('.actions')) return;

    native.window.beginDrag().catch((error) => console.error(error));
  });
}

// Neutralino 在 Windows 上按逻辑尺寸计算居中，高 DPI 下窗口会偏向右下并超出屏幕，
// 这里按物理像素重新计算一次位置。
async function centerWindow() {
  if (!nativeReady) return;

  try {
    const dpr = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * dpr);
    const height = Math.round(window.innerHeight * dpr);
    const screenWidth = Math.round(window.screen.width * dpr);
    const screenHeight = Math.round(window.screen.height * dpr);

    await native.window.move(
      Math.round((screenWidth - width) / 2),
      Math.round((screenHeight - height) / 2)
    );
  } catch (error) {
    console.error(error);
  }
}

/* ---------- events ---------- */

function bindEvents() {
  els.btnFormat.addEventListener('click', () => {
    state.hour12 = !state.hour12;
    applyFormat();
  });

  els.btnTheme.addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme();
  });

  els.btnPin.addEventListener('click', togglePin);
  els.btnFull.addEventListener('click', toggleFullscreen);

  els.btnMin.addEventListener('click', () => {
    if (nativeReady) native.window.minimize().catch((error) => console.error(error));
  });

  els.btnClose.addEventListener('click', () => {
    if (nativeReady) {
      native.app.exit();
    } else {
      window.close();
    }
  });

  els.btnLang.addEventListener('click', () => {
    closeTzPanel();
    state.lang = state.lang === 'zh' ? 'en' : 'zh';
    localStorage.setItem(STORAGE_KEYS.lang, state.lang);
    applyLanguage();
  });

  els.btnTs.addEventListener('click', () => copyTimestamp(false));
  els.btnTsMs.addEventListener('click', () => copyTimestamp(true));

  els.searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    runSearch();
  });

  els.engine.addEventListener('change', () => {
    state.engine = isSupportedEngine(els.engine.value) ? els.engine.value : 'google';
    els.engine.value = state.engine;
    localStorage.setItem(STORAGE_KEYS.engine, state.engine);
  });

  els.tz.addEventListener('click', toggleTzPanel);
  els.tzClose.addEventListener('click', closeTzPanel);
  els.tzSearch.addEventListener('input', () => filterZoneList(els.tzSearch.value));

  els.tzSearch.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const first = els.tzList.querySelector('.tz-item:not([hidden])');
    if (first) first.click();
  });

  document.addEventListener('pointerdown', (event) => {
    if (!tzPanelOpen) return;
    const target = event.target;
    if (target instanceof Node && (els.tzPanel.contains(target) || els.tz.contains(target))) return;
    closeTzPanel();
  });

  // 键盘：F11 全屏，Ctrl/⌘+K 聚焦搜索，Esc 逐级退出输入框 / 时区面板 / 全屏 / 窗口。
  window.addEventListener('keydown', (event) => {
    if (event.key === 'F11') {
      event.preventDefault();
      els.btnFull.click();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      els.query.focus();
      els.query.select();
      return;
    }

    if (event.key === 'Escape') {
      if (document.activeElement === els.tzSearch) {
        closeTzPanel();
        return;
      }
      if (document.activeElement === els.query) {
        if (els.query.value) {
          els.query.value = '';
        } else {
          els.query.blur();
        }
        return;
      }
      if (tzPanelOpen) {
        closeTzPanel();
        return;
      }
      if (state.fullscreen) {
        els.btnFull.click();
        return;
      }
      els.btnClose.click();
      return;
    }

    const target = event.target;
    const isTyping =
      target instanceof HTMLElement &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'SELECT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable);
    if (isTyping) return;

    if (event.key === 'p' || event.key === 'P') {
      els.btnPin.click();
    }
  });
}

async function init() {
  applyTheme();
  applyFormat();
  els.engine.value = state.engine;
  applyFullscreen(false);

  nativeReady = await initNative();
  enableWindowDrag();
  await centerWindow();

  applyLanguage();
  bindEvents();

  applyPinned(state.pinned);
  if (nativeReady) {
    try {
      await native.window.setAlwaysOnTop(state.pinned);
    } catch (error) {
      console.error(error);
    }
  }

  render(new Date());
  requestAnimationFrame(tick);
}

init();
