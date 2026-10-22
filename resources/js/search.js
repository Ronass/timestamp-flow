/**
 * 搜索引擎白名单与 URL 拼装。同时支持浏览器与 Node（便于单元测试）。
 */
(function (root) {
  'use strict';

  const ENGINES = {
    google: 'https://www.google.com/search?q=',
    bing: 'https://www.bing.com/search?q=',
    baidu: 'https://www.baidu.com/s?wd=',
  };

  function isSupportedEngine(engine) {
    return Object.hasOwn(ENGINES, engine);
  }

  function buildSearchUrl(engine, query) {
    const base = isSupportedEngine(engine) ? ENGINES[engine] : ENGINES.google;
    return base + encodeURIComponent(String(query ?? '').trim());
  }

  const api = { ENGINES, isSupportedEngine, buildSearchUrl };

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    Object.assign(root, api);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
