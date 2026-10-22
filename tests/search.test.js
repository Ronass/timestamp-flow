const test = require('node:test');
const assert = require('node:assert/strict');

const {
  ENGINES,
  isSupportedEngine,
  buildSearchUrl,
} = require('../resources/js/search.js');

test('只允许白名单内的搜索引擎', () => {
  assert.equal(isSupportedEngine('google'), true);
  assert.equal(isSupportedEngine('bing'), true);
  assert.equal(isSupportedEngine('baidu'), true);
  assert.equal(isSupportedEngine('duckduckgo'), false);
  assert.equal(isSupportedEngine(''), false);
});

test('搜索 URL 正确编码特殊字符', () => {
  assert.equal(
    buildSearchUrl('google', 'electron 时钟'),
    'https://www.google.com/search?q=electron%20%E6%97%B6%E9%92%9F'
  );
  assert.equal(
    buildSearchUrl('baidu', 'a & b'),
    'https://www.baidu.com/s?wd=a%20%26%20b'
  );
  assert.equal(buildSearchUrl('bing', '  spaced  '), `${ENGINES.bing}spaced`);
});

test('未知引擎回退到 Google', () => {
  assert.equal(buildSearchUrl('unknown', 'test'), `${ENGINES.google}test`);
  assert.equal(buildSearchUrl(undefined, 'x'), `${ENGINES.google}x`);
});

test('空关键词不产生非法地址', () => {
  assert.equal(buildSearchUrl('google', ''), ENGINES.google);
});
