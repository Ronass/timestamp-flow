const test = require('node:test');
const assert = require('node:assert/strict');

const { I18N } = require('../resources/js/i18n.js');

test('中英文文案键完全一致', () => {
  const zh = Object.keys(I18N.zh).sort();
  const en = Object.keys(I18N.en).sort();
  assert.deepEqual(en, zh);
});

test('日期格式随语言变化', () => {
  assert.equal(I18N.zh.formatDate(2026, 10, 22), '2026年10月22日');
  assert.equal(I18N.en.formatDate(2026, 10, 22), 'Oct 22, 2026');
  assert.equal(I18N.en.formatDate(2026, 1, 5), 'Jan 5, 2026');
});

test('星期名称完整且顺序正确', () => {
  for (const lang of ['zh', 'en']) {
    assert.equal(I18N[lang].weekdays.length, 7);
  }

  assert.equal(I18N.zh.weekdays[0], '星期日');
  assert.equal(I18N.en.weekdays[4], 'Thursday');
});

test('带变量的提示文案', () => {
  assert.equal(I18N.zh.copied('1792487804'), '已复制 1792487804');
  assert.equal(I18N.en.copied('1792487804'), 'Copied 1792487804');
  assert.equal(I18N.zh.searchOpened('时钟'), '已在浏览器中搜索：时钟');
  assert.equal(I18N.en.searchOpened('clock'), 'Searching in browser: clock');
});
