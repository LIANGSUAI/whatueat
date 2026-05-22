const api = require('../../utils/api');
const date = require('../../utils/date');
const storage = require('../../utils/storage');
const nutrition = require('../../utils/nutrition');

Page({
  data: {
    loggedIn: false,
    loading: false,
    days: [],
    hasDays: false,
    avgCalories: 0,
    avgDeficit: 0,
    avgProtein: 0,
    avgCarbs: 0,
    avgFat: 0,
    activeDays: 0
  },

  onShow: function() {
    this.loadAnalytics();
  },

  loadAnalytics: function() {
    const page = this;

    if (!api.isLoggedIn()) {
      this.setData({
        loggedIn: false,
        days: [],
        hasDays: false,
        loading: false
      });
      return;
    }

    this.setData({ loggedIn: true, loading: true });

    api.request({ url: '/api/meals' })
      .then(function(meals) {
        page.buildAnalytics(Array.isArray(meals) ? meals : []);
      })
      .catch(function(err) {
        wx.showToast({ title: err.message, icon: 'none' });
      })
      .finally(function() {
        page.setData({ loading: false });
      });
  },

  buildAnalytics: function(meals) {
    const profile = storage.getProfile();
    const dailyTdeeLogs = storage.getDailyTdeeLogs();
    const waterLogs = storage.getWaterLogs();
    const dayKeys = date.lastDays(7);
    const baseDays = dayKeys.map(function(dayKey) {
      const tdee = dailyTdeeLogs[dayKey] || profile.tdee || 2100;
      return {
        date: dayKey,
        label: dayKey.slice(5),
        intake: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        tdee: nutrition.round(tdee),
        deficit: nutrition.round(tdee),
        water: waterLogs[dayKey] || 0,
        count: 0
      };
    });

    meals.forEach(function(meal) {
      const recordDay = date.recordDate(meal);
      const target = baseDays.find(function(day) {
        return day.date === recordDay;
      });

      if (!target) return;

      target.intake += nutrition.safeNumber(meal.calories, 0);
      target.protein += nutrition.safeNumber(meal.protein, 0);
      target.carbs += nutrition.safeNumber(meal.carbs, 0);
      target.fat += nutrition.safeNumber(meal.fat, 0);
      target.count += 1;
    });

    const maxCalories = Math.max(1, ...baseDays.map(function(day) {
      return Math.max(day.intake, day.tdee);
    }));

    const days = baseDays.map(function(day) {
      const intake = nutrition.round(day.intake);
      const deficit = nutrition.round(day.tdee - day.intake);
      return Object.assign({}, day, {
        intake: intake,
        protein: nutrition.round(day.protein),
        carbs: nutrition.round(day.carbs),
        fat: nutrition.round(day.fat),
        deficit: deficit,
        intakeWidth: Math.max(3, Math.round((intake / maxCalories) * 100)),
        tdeeWidth: Math.max(3, Math.round((day.tdee / maxCalories) * 100)),
        deficitText: deficit >= 0 ? '缺口 ' + deficit : '超出 ' + (0 - deficit)
      });
    });

    const activeDays = days.filter(function(day) {
      return day.count > 0;
    });
    const divisor = Math.max(1, activeDays.length);
    const total = activeDays.reduce(function(acc, day) {
      return {
        intake: acc.intake + day.intake,
        deficit: acc.deficit + day.deficit,
        protein: acc.protein + day.protein,
        carbs: acc.carbs + day.carbs,
        fat: acc.fat + day.fat
      };
    }, { intake: 0, deficit: 0, protein: 0, carbs: 0, fat: 0 });

    this.setData({
      days: days,
      hasDays: days.length > 0,
      activeDays: activeDays.length,
      avgCalories: Math.round(total.intake / divisor),
      avgDeficit: Math.round(total.deficit / divisor),
      avgProtein: Math.round(total.protein / divisor),
      avgCarbs: Math.round(total.carbs / divisor),
      avgFat: Math.round(total.fat / divisor)
    });
  },

  goSettings: function() {
    wx.switchTab({ url: '/pages/settings/settings' });
  }
});
