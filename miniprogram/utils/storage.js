const config = require('../config');
const api = require('./api');

function userScopedKey(baseKey) {
  const username = api.getUsername() || 'guest';
  return baseKey + '_' + username;
}

function readObject(key, fallback) {
  const value = wx.getStorageSync(key);
  if (value && typeof value === 'object') {
    return value;
  }
  return fallback;
}

function getProfile() {
  const profile = readObject(userScopedKey(config.STORAGE_KEYS.profile), null);
  return Object.assign({}, config.DEFAULT_PROFILE, profile || {});
}

function setProfile(profile) {
  wx.setStorageSync(userScopedKey(config.STORAGE_KEYS.profile), Object.assign({}, config.DEFAULT_PROFILE, profile || {}));
}

function getDailyTdeeLogs() {
  return readObject(userScopedKey(config.STORAGE_KEYS.dailyTdee), {});
}

function setDailyTdee(dateStr, value) {
  const logs = getDailyTdeeLogs();
  if (value === null || value === undefined || value === '') {
    delete logs[dateStr];
  } else {
    logs[dateStr] = Number(value);
  }
  wx.setStorageSync(userScopedKey(config.STORAGE_KEYS.dailyTdee), logs);
  return logs;
}

function getWaterLogs() {
  return readObject(userScopedKey(config.STORAGE_KEYS.water), {});
}

function setWater(dateStr, value) {
  const logs = getWaterLogs();
  logs[dateStr] = Math.max(0, Number(value) || 0);
  wx.setStorageSync(userScopedKey(config.STORAGE_KEYS.water), logs);
  return logs;
}

module.exports = {
  getProfile: getProfile,
  setProfile: setProfile,
  getDailyTdeeLogs: getDailyTdeeLogs,
  setDailyTdee: setDailyTdee,
  getWaterLogs: getWaterLogs,
  setWater: setWater
};
