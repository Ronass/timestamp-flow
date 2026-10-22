const test = require('node:test');
const assert = require('node:assert/strict');

const {
  COMMON_ZONES,
  ZONE_NAMES,
  getTimeParts,
  isValidZone,
  zoneName,
} = require('../resources/js/zones.js');

test('常用时区都有中文名称，英文回退到 IANA 标识', () => {
  for (const zone of COMMON_ZONES) {
    assert.ok(ZONE_NAMES[zone], `缺少中文名：${zone}`);
    assert.equal(zoneName(zone, 'zh'), ZONE_NAMES[zone]);
    assert.equal(zoneName(zone, 'en'), zone);
  }
});

test('UTC 时间换算到目标时区正确', () => {
  // 2026-10-22T04:30:15Z
  const moment = new Date(Date.UTC(2026, 9, 22, 4, 30, 15));

  const shanghai = getTimeParts(moment, 'Asia/Shanghai');
  assert.equal(shanghai.year, 2026);
  assert.equal(shanghai.month, 10);
  assert.equal(shanghai.day, 22);
  assert.equal(shanghai.hours, 12);
  assert.equal(shanghai.minutes, 30);
  assert.equal(shanghai.seconds, 15);
  assert.equal(shanghai.weekday, 4); // 星期四

  const newYork = getTimeParts(moment, 'America/New_York');
  assert.equal(newYork.day, 22);
  assert.equal(newYork.hours, 0);
  assert.equal(newYork.minutes, 30);
});

test('目标时区跨日时日期随之变化', () => {
  // 2026-10-22T20:00:00Z -> 上海已经是 23 日 04:00
  const moment = new Date(Date.UTC(2026, 9, 22, 20, 0, 0));
  const shanghai = getTimeParts(moment, 'Asia/Shanghai');

  assert.equal(shanghai.day, 23);
  assert.equal(shanghai.hours, 4);
});

test('local 与非法时区回退到本地时间', () => {
  const moment = new Date();

  const local = getTimeParts(moment, 'local');
  assert.equal(local.hours, moment.getHours());
  assert.equal(local.minutes, moment.getMinutes());

  const invalid = getTimeParts(moment, 'Not/AZone');
  assert.equal(invalid.hours, moment.getHours());
});

test('isValidZone 拒绝未知时区', () => {
  assert.equal(isValidZone('Asia/Shanghai'), true);
  assert.equal(isValidZone('UTC'), true);
  assert.equal(isValidZone('bad/zone'), false);
  assert.equal(isValidZone(''), false);
  assert.equal(isValidZone(undefined), false);
});
