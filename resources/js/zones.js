/**
 * 时区数据与格式化。同时支持浏览器（挂到 globalThis）与 Node（module.exports）。
 */
(function (root) {
  'use strict';

  // 只保留常用时区，避免几百项列表带来的构建延迟与滚动负担。
  const COMMON_ZONES = [
    'UTC',
    'Asia/Shanghai',
    'Asia/Hong_Kong',
    'Asia/Taipei',
    'Asia/Tokyo',
    'Asia/Seoul',
    'Asia/Singapore',
    'Asia/Bangkok',
    'Asia/Jakarta',
    'Asia/Kolkata',
    'Asia/Dubai',
    'Asia/Riyadh',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Europe/Madrid',
    'Europe/Moscow',
    'Africa/Cairo',
    'Africa/Johannesburg',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Toronto',
    'America/Mexico_City',
    'America/Sao_Paulo',
    'America/Argentina/Buenos_Aires',
    'Australia/Sydney',
    'Australia/Perth',
    'Pacific/Auckland',
  ];

  // 中文界面下的时区名称；英文界面直接使用 IANA 标识。
  const ZONE_NAMES = {
    UTC: '协调世界时',
    'Asia/Shanghai': '上海',
    'Asia/Hong_Kong': '香港',
    'Asia/Taipei': '台北',
    'Asia/Tokyo': '东京',
    'Asia/Seoul': '首尔',
    'Asia/Singapore': '新加坡',
    'Asia/Bangkok': '曼谷',
    'Asia/Jakarta': '雅加达',
    'Asia/Kolkata': '加尔各答',
    'Asia/Dubai': '迪拜',
    'Asia/Riyadh': '利雅得',
    'Europe/London': '伦敦',
    'Europe/Paris': '巴黎',
    'Europe/Berlin': '柏林',
    'Europe/Madrid': '马德里',
    'Europe/Moscow': '莫斯科',
    'Africa/Cairo': '开罗',
    'Africa/Johannesburg': '约翰内斯堡',
    'America/New_York': '纽约',
    'America/Chicago': '芝加哥',
    'America/Denver': '丹佛',
    'America/Los_Angeles': '洛杉矶',
    'America/Toronto': '多伦多',
    'America/Mexico_City': '墨西哥城',
    'America/Sao_Paulo': '圣保罗',
    'America/Argentina/Buenos_Aires': '布宜诺斯艾利斯',
    'Australia/Sydney': '悉尼',
    'Australia/Perth': '珀斯',
    'Pacific/Auckland': '奥克兰',
  };

  const WEEKDAY_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const formatters = new Map();

  function isValidZone(zone) {
    if (!zone || typeof zone !== 'string') return false;
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: zone });
      return true;
    } catch {
      return false;
    }
  }

  function getZoneFormatter(zone) {
    if (!formatters.has(zone)) {
      formatters.set(
        zone,
        new Intl.DateTimeFormat('en-US', {
          timeZone: zone,
          hourCycle: 'h23',
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          weekday: 'short',
        })
      );
    }
    return formatters.get(zone);
  }

  function localParts(date) {
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      hours: date.getHours(),
      minutes: date.getMinutes(),
      seconds: date.getSeconds(),
      weekday: date.getDay(),
    };
  }

  function getTimeParts(date, zone) {
    if (!zone || zone === 'local') return localParts(date);

    try {
      const values = {};
      for (const part of getZoneFormatter(zone).formatToParts(date)) {
        values[part.type] = part.value;
      }

      return {
        year: Number(values.year),
        month: Number(values.month),
        day: Number(values.day),
        hours: Number(values.hour) % 24,
        minutes: Number(values.minute),
        seconds: Number(values.second),
        weekday: WEEKDAY_INDEX[values.weekday] ?? 0,
      };
    } catch {
      return localParts(date);
    }
  }

  function zoneName(zone, lang) {
    if (lang === 'zh' && ZONE_NAMES[zone]) return ZONE_NAMES[zone];
    return zone;
  }

  function zoneTimeLabel(zone) {
    try {
      const options = { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' };
      if (zone && zone !== 'local') options.timeZone = zone;
      return new Intl.DateTimeFormat('en-GB', options).format(new Date());
    } catch {
      return '';
    }
  }

  const api = {
    COMMON_ZONES,
    ZONE_NAMES,
    WEEKDAY_INDEX,
    isValidZone,
    getZoneFormatter,
    getTimeParts,
    zoneName,
    zoneTimeLabel,
  };

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    Object.assign(root, api);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
