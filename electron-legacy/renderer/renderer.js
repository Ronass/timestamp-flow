const api = window.clockApi;

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
  searchForm: document.getElementById('search-form'),
  engine: document.getElementById('engine'),
  query: document.getElementById('query'),
};

const STORAGE_KEYS = {
  hour12: 'tf.hour12',
  theme: 'tf.theme',
  pinned: 'tf.pinned',
  engine: 'tf.engine',
};

const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

// 仅用于浏览器预览时的降级；Electron 下由主进程按同一份白名单拼装 URL。
const ENGINES = {
  bing: 'https://www.bing.com/search?q=',
  google: 'https://www.google.com/search?q=',
  baidu: 'https://www.baidu.com/s?wd=',
};

const prefersLight =
  window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;

const savedEngine = localStorage.getItem(STORAGE_KEYS.engine);

const state = {
  hour12: localStorage.getItem(STORAGE_KEYS.hour12) === 'true',
  theme: localStorage.getItem(STORAGE_KEYS.theme) || (prefersLight ? 'light' : 'dark'),
  pinned: localStorage.getItem(STORAGE_KEYS.pinned) === 'true',
  engine: Object.hasOwn(ENGINES, savedEngine) ? savedEngine : 'bing',
  fullscreen: false,
};

const pad2 = (value) => String(value).padStart(2, '0');

let lastRenderedSecond = -1;
let toastTimer = null;

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
  els.btnPin.title = state.pinned ? '取消置顶' : '窗口置顶';
  localStorage.setItem(STORAGE_KEYS.pinned, String(state.pinned));
}

function applyFullscreen(value) {
  state.fullscreen = Boolean(value);
  els.root.dataset.fullscreen = String(state.fullscreen);
  els.btnFull.classList.toggle('active', state.fullscreen);
  els.btnFull.setAttribute('aria-pressed', String(state.fullscreen));
  els.btnFull.title = state.fullscreen ? '退出全屏（F11）' : '全屏（F11）';
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove('show'), 1300);
}

function render(now) {
  let hours = now.getHours();
  if (state.hour12) {
    els.meridiem.textContent = hours < 12 ? 'AM' : 'PM';
    hours = hours % 12 || 12;
  } else {
    els.meridiem.textContent = '';
  }

  els.hours.textContent = pad2(hours);
  els.minutes.textContent = pad2(now.getMinutes());
  els.seconds.textContent = pad2(now.getSeconds());

  els.date.textContent = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
  els.weekday.textContent = WEEKDAYS[now.getDay()];

  els.unix.textContent = String(Math.floor(now.getTime() / 1000));
  els.unixMs.textContent = String(now.getTime());
}

function tick() {
  const now = new Date();
  const second = now.getSeconds();
  if (second !== lastRenderedSecond) {
    lastRenderedSecond = second;
    render(now);
  }
  requestAnimationFrame(tick);
}

async function copyTimestamp(ms) {
  const value = ms ? String(Date.now()) : String(Math.floor(Date.now() / 1000));
  try {
    if (api) {
      await api.copy(value);
    } else {
      await navigator.clipboard.writeText(value);
    }
    showToast(`已复制 ${value}`);
  } catch {
    showToast('复制失败');
  }
}

async function runSearch() {
  const query = els.query.value.trim();
  if (!query) {
    els.query.focus();
    return;
  }

  try {
    if (api?.openSearch) {
      const result = await api.openSearch(state.engine, query);
      if (!result?.ok) throw new Error(result?.reason || 'failed');
    } else {
      const base = ENGINES[state.engine] ?? ENGINES.bing;
      window.open(base + encodeURIComponent(query), '_blank');
    }
    showToast(`已在浏览器中搜索：${query}`);
    els.query.select();
  } catch {
    showToast('无法打开浏览器');
  }
}

function bindEvents() {
  els.btnFormat.addEventListener('click', () => {
    state.hour12 = !state.hour12;
    applyFormat();
  });

  els.btnTheme.addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme();
  });

  els.btnPin.addEventListener('click', async () => {
    if (api) {
      applyPinned(await api.togglePin());
    } else {
      applyPinned(!state.pinned);
    }
  });

  els.btnFull.addEventListener('click', async () => {
    if (api?.toggleFullscreen) {
      applyFullscreen(await api.toggleFullscreen());
    } else {
      applyFullscreen(!state.fullscreen);
    }
  });

  els.btnMin.addEventListener('click', () => api?.minimize());

  els.btnClose.addEventListener('click', () => {
    if (api) {
      api.close();
    } else {
      window.close();
    }
  });

  els.btnTs.addEventListener('click', () => copyTimestamp(false));
  els.btnTsMs.addEventListener('click', () => copyTimestamp(true));

  els.searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    runSearch();
  });

  els.engine.addEventListener('change', () => {
    state.engine = Object.hasOwn(ENGINES, els.engine.value) ? els.engine.value : 'bing';
    els.engine.value = state.engine;
    localStorage.setItem(STORAGE_KEYS.engine, state.engine);
  });

  // 键盘：F11 全屏，Ctrl/⌘+K 聚焦搜索，Esc 清空搜索框 / 退出全屏 / 关闭窗口。
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
      if (document.activeElement === els.query) {
        if (els.query.value) {
          els.query.value = '';
        } else {
          els.query.blur();
        }
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
  bindEvents();
  api?.onFullscreenChange?.(applyFullscreen);

  if (api) {
    applyPinned(await api.setPin(state.pinned));
  } else {
    applyPinned(state.pinned);
  }

  els.tz.textContent = Intl.DateTimeFormat().resolvedOptions().timeZone || '本地时间';

  render(new Date());
  requestAnimationFrame(tick);
}

init();
