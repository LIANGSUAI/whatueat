const config = require('../../config');
const api = require('../../utils/api');
const storage = require('../../utils/storage');

const genderOptions = [
  { value: 'male', label: '男性' },
  { value: 'female', label: '女性' }
];

const activityOptions = [
  { value: 1.2, label: '久坐办公' },
  { value: 1.375, label: '轻度活动' },
  { value: 1.55, label: '中度活动' },
  { value: 1.725, label: '高强度训练' },
  { value: 1.9, label: '体力劳动/运动员' }
];

function findIndexByValue(list, value) {
  const index = list.findIndex(function(item) {
    return String(item.value) === String(value);
  });
  return index >= 0 ? index : 0;
}

function calculateTdee(profile) {
  const gender = profile.gender || 'male';
  const weight = Number(profile.weight || 70);
  const height = Number(profile.height || 175);
  const age = Number(profile.age || 25);
  const activity = Number(profile.activity || 1.375);
  const bmr = gender === 'male'
    ? 10 * weight + 6.25 * height - 5 * age + 5
    : 10 * weight + 6.25 * height - 5 * age - 161;
  return Math.round(bmr * activity);
}

Page({
  data: {
    authMode: 'login',
    username: '',
    password: '',
    loggedIn: false,
    currentUsername: '',
    heroTitle: '未登录',
    heroSubtitle: '登录后同步饮食记录',
    profile: Object.assign({}, config.DEFAULT_PROFILE),
    calculatedTdee: 2100,
    genderOptions: genderOptions,
    genderIndex: 0,
    genderLabel: genderOptions[0].label,
    activityOptions: activityOptions,
    activityIndex: 1,
    activityLabel: activityOptions[1].label,
    authTitle: '登录账号',
    authButtonText: '登录',
    switchAuthText: '没有账号，去注册',
    savingProfile: false,
    authLoading: false
  },

  onShow: function() {
    this.loadState();
  },

  loadState: function() {
    const profile = storage.getProfile();
    this.setData({
      loggedIn: api.isLoggedIn(),
      currentUsername: api.getUsername(),
      heroTitle: api.isLoggedIn() ? api.getUsername() : '未登录',
      heroSubtitle: api.isLoggedIn() ? '已连接云端饮食记录' : '登录后同步饮食记录',
      profile: profile,
      calculatedTdee: calculateTdee(profile),
      genderIndex: findIndexByValue(genderOptions, profile.gender),
      genderLabel: genderOptions[findIndexByValue(genderOptions, profile.gender)].label,
      activityIndex: findIndexByValue(activityOptions, profile.activity),
      activityLabel: activityOptions[findIndexByValue(activityOptions, profile.activity)].label
    });
  },

  switchAuthMode: function() {
    const nextMode = this.data.authMode === 'login' ? 'register' : 'login';
    this.setData({
      authMode: nextMode,
      authTitle: nextMode === 'login' ? '登录账号' : '注册账号',
      authButtonText: nextMode === 'login' ? '登录' : '注册并登录',
      switchAuthText: nextMode === 'login' ? '没有账号，去注册' : '已有账号，去登录'
    });
  },

  onAuthInput: function(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [field]: e.detail.value });
  },

  submitAuth: function() {
    const page = this;
    const username = String(this.data.username || '').trim();
    const password = String(this.data.password || '');

    if (!username || !password) {
      wx.showToast({ title: '请输入用户名和密码', icon: 'none' });
      return;
    }

    this.setData({ authLoading: true });

    api.request({
      url: this.data.authMode === 'register' ? '/api/meals/register' : '/api/meals/login',
      method: 'POST',
      data: { username: username, password: password },
      auth: false
    })
      .then(function(data) {
        api.setAuth(data.token, data.username || username);
        if (data.profile) {
          const mergedProfile = Object.assign({}, storage.getProfile(), data.profile);
          storage.setProfile(mergedProfile);
        }
        wx.showToast({ title: page.data.authMode === 'register' ? '注册成功' : '登录成功', icon: 'success' });
        page.setData({ password: '', authLoading: false });
        page.loadState();
      })
      .catch(function(err) {
        page.setData({ authLoading: false });
        wx.showToast({ title: err.message, icon: 'none' });
      });
  },

  logout: function() {
    api.clearAuth();
    wx.showToast({ title: '已退出', icon: 'success' });
    this.loadState();
  },

  onProfileInput: function(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    const profile = Object.assign({}, this.data.profile, { [field]: value });
    this.setData({
      profile: profile,
      calculatedTdee: calculateTdee(profile)
    });
  },

  onGenderChange: function(e) {
    const index = Number(e.detail.value);
    const profile = Object.assign({}, this.data.profile, { gender: genderOptions[index].value });
    this.setData({
      genderIndex: index,
      genderLabel: genderOptions[index].label,
      profile: profile,
      calculatedTdee: calculateTdee(profile)
    });
  },

  onActivityChange: function(e) {
    const index = Number(e.detail.value);
    const profile = Object.assign({}, this.data.profile, { activity: activityOptions[index].value });
    this.setData({
      activityIndex: index,
      activityLabel: activityOptions[index].label,
      profile: profile,
      calculatedTdee: calculateTdee(profile)
    });
  },

  useCalculatedTdee: function() {
    const profile = Object.assign({}, this.data.profile, { tdee: calculateTdee(this.data.profile) });
    this.setData({ profile: profile });
  },

  saveProfile: function() {
    const page = this;
    const profile = {
      gender: this.data.profile.gender,
      age: Number(this.data.profile.age),
      height: Number(this.data.profile.height),
      weight: Number(this.data.profile.weight),
      activity: Number(this.data.profile.activity),
      tdee: Number(this.data.profile.tdee),
      deficit: Number(this.data.profile.deficit)
    };

    if (!profile.age || !profile.height || !profile.weight || !profile.tdee) {
      wx.showToast({ title: '请补全个人指标', icon: 'none' });
      return;
    }

    storage.setProfile(profile);

    if (!api.isLoggedIn()) {
      wx.showToast({ title: '已保存到本地', icon: 'success' });
      this.loadState();
      return;
    }

    this.setData({ savingProfile: true });

    api.request({
      url: '/api/meals/profile',
      method: 'PUT',
      data: profile
    })
      .then(function() {
        wx.showToast({ title: '档案已同步', icon: 'success' });
      })
      .catch(function(err) {
        wx.showToast({ title: err.message, icon: 'none' });
      })
      .finally(function() {
        page.setData({ savingProfile: false });
        page.loadState();
      });
  }
});
