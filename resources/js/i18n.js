/**
 * 界面文案字典。同时支持浏览器（挂到 globalThis）与 Node（module.exports），
 * 便于单元测试校验中英文键一致。
 */
(function (root) {
  'use strict';

  const MONTHS_EN = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  const I18N = {
    zh: {
      langLabel: '中文',
      formatTitle: '切换 12/24 小时制',
      pinOn: '取消置顶',
      pinOff: '窗口置顶',
      themeTitle: '切换明暗主题',
      fullOn: '退出全屏（F11）',
      fullOff: '全屏（F11）',
      minimize: '最小化',
      close: '关闭',
      searchPlaceholder: '搜索网页…（Ctrl+K）',
      searchTitle: '在浏览器中搜索（Enter）',
      copySeconds: '点击复制 Unix 时间戳（秒）',
      copyMillis: '点击复制 Unix 时间戳（毫秒）',
      selectTimeZone: '选择时区',
      switchLanguage: '切换语言',
      tzPanelTitle: '选择时区',
      tzSearch: '搜索时区',
      followSystem: '跟随系统',
      copied: (value) => `已复制 ${value}`,
      copyFailed: '复制失败',
      searchOpened: (query) => `已在浏览器中搜索：${query}`,
      openFailed: '无法打开浏览器',
      weekdays: ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'],
      formatDate: (year, month, day) => `${year}年${month}月${day}日`,
    },
    en: {
      langLabel: 'EN',
      formatTitle: 'Toggle 12/24-hour format',
      pinOn: 'Unpin window',
      pinOff: 'Always on top',
      themeTitle: 'Toggle theme',
      fullOn: 'Exit fullscreen (F11)',
      fullOff: 'Fullscreen (F11)',
      minimize: 'Minimize',
      close: 'Close',
      searchPlaceholder: 'Search the web… (Ctrl+K)',
      searchTitle: 'Search in browser (Enter)',
      copySeconds: 'Click to copy Unix timestamp (seconds)',
      copyMillis: 'Click to copy Unix timestamp (milliseconds)',
      selectTimeZone: 'Select time zone',
      switchLanguage: 'Switch language',
      tzPanelTitle: 'Select time zone',
      tzSearch: 'Search time zone',
      followSystem: 'Follow system',
      copied: (value) => `Copied ${value}`,
      copyFailed: 'Copy failed',
      searchOpened: (query) => `Searching in browser: ${query}`,
      openFailed: 'Could not open the browser',
      weekdays: [
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
      ],
      formatDate: (year, month, day) => `${MONTHS_EN[month - 1]} ${day}, ${year}`,
    },
  };

  const api = { I18N, MONTHS_EN };

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    Object.assign(root, api);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
