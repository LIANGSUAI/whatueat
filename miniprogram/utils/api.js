const config = require('../config');

function normalizeServerUrl(url) {
  return String(url || '').trim().replace(/\/+$/, '');
}

function getServerUrl() {
  if (config.ALLOW_SERVER_OVERRIDE && config.STORAGE_KEYS.serverUrl) {
    return normalizeServerUrl(wx.getStorageSync(config.STORAGE_KEYS.serverUrl) || config.DEFAULT_SERVER_URL);
  }

  return normalizeServerUrl(config.DEFAULT_SERVER_URL);
}

function setServerUrl(url) {
  if (config.ALLOW_SERVER_OVERRIDE && config.STORAGE_KEYS.serverUrl) {
    wx.setStorageSync(config.STORAGE_KEYS.serverUrl, normalizeServerUrl(url));
  }
}

function getToken() {
  return wx.getStorageSync(config.STORAGE_KEYS.token) || '';
}

function getUsername() {
  return wx.getStorageSync(config.STORAGE_KEYS.username) || '';
}

function setAuth(token, username) {
  wx.setStorageSync(config.STORAGE_KEYS.token, token || '');
  wx.setStorageSync(config.STORAGE_KEYS.username, username || '');
}

function clearAuth() {
  wx.removeStorageSync(config.STORAGE_KEYS.token);
  wx.removeStorageSync(config.STORAGE_KEYS.username);
}

function isLoggedIn() {
  return Boolean(getToken());
}

function request(options) {
  const opts = options || {};
  const url = opts.url || '';
  const method = opts.method || 'GET';
  const data = opts.data || {};
  const auth = opts.auth !== false;
  const serverUrl = getServerUrl();

  return new Promise(function(resolve, reject) {
    if (!serverUrl) {
      reject(new Error('服务器地址未配置，请联系管理员。'));
      return;
    }

    const header = {
      'content-type': 'application/json'
    };

    if (auth && getToken()) {
      header.Authorization = 'Bearer ' + getToken();
    }

    wx.request({
      url: serverUrl + url,
      method: method,
      data: data,
      header: header,
      timeout: opts.timeout || 30000,
      success: function(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
          return;
        }

        const body = res.data || {};
        reject(new Error(body.message || body.error || ('请求失败：' + res.statusCode)));
      },
      fail: function(err) {
        reject(new Error(err.errMsg || '网络请求失败'));
      }
    });
  });
}

module.exports = {
  getServerUrl: getServerUrl,
  setServerUrl: setServerUrl,
  getToken: getToken,
  getUsername: getUsername,
  setAuth: setAuth,
  clearAuth: clearAuth,
  isLoggedIn: isLoggedIn,
  request: request
};
