module.exports = {
  // 小程序不能像网页端一样自动使用 window.location.origin。
  // 开发测试使用公网 IP；正式上线微信小程序时需要换成已备案并配置 HTTPS 的合法域名。
  DEFAULT_SERVER_URL: 'http://8.136.107.225:3000',
  ALLOW_SERVER_OVERRIDE: false,
  DEFAULT_PROFILE: {
    gender: 'male',
    age: 25,
    height: 175,
    weight: 70,
    activity: 1.375,
    tdee: 2100,
    deficit: 500
  },
  STORAGE_KEYS: {
    token: 'whatueat_token',
    username: 'whatueat_username',
    profile: 'whatueat_profile',
    dailyTdee: 'whatueat_daily_tdee',
    water: 'whatueat_water_logs'
  }
};
