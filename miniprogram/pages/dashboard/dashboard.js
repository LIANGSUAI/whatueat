const api = require('../../utils/api');
const date = require('../../utils/date');
const storage = require('../../utils/storage');
const nutrition = require('../../utils/nutrition');
const imageUtils = require('../../utils/image');

function initialQuickMeal() {
  return {
    name: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    type: nutrition.mealTypeByTime(),
    items: []
  };
}

Page({
  data: {
    selectedDate: date.formatDate(new Date()),
    dateLabel: '',
    loggedIn: false,
    currentUsername: '',
    loading: false,
    saving: false,
    aiEstimating: false,
    meals: [],
    dayMeals: [],
    totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    stats: [],
    statCards: [],
    macroRows: [],
    mealGroups: [],
    waterCups: [],
    profile: {},
    dailyTdeeLogs: {},
    dailyTdeeDraft: '',
    effectiveTdee: 2100,
    targetCalories: 1600,
    targetPct: 0,
    ringStyle: '',
    remainingCalories: 0,
    remainingValue: 1600,
    remainingLabel: '剩余预算',
    remainingText: '剩余 1600',
    currentDeficit: 0,
    targetDeficit: 500,
    water: 0,
    quickMeal: initialQuickMeal(),
    aiText: '',
    mealTypes: nutrition.MEAL_TYPES,
    quickMealTypeIndex: 1,
    quickMealTypeLabel: nutrition.MEAL_TYPES[1].label,
    commonFoods: nutrition.COMMON_FOODS,
    commonFoodIndex: 0,
    commonFoodName: nutrition.COMMON_FOODS[0].name,
    commonFoodGrams: '100',
    hasDayMeals: false
  },

  onShow: function() {
    this.loadLocalState();
    this.fetchMeals();
  },

  onPullDownRefresh: function() {
    this.fetchMeals().finally(function() {
      wx.stopPullDownRefresh();
    });
  },

  loadLocalState: function() {
    const profile = storage.getProfile();
    const dailyTdeeLogs = storage.getDailyTdeeLogs();
    const waterLogs = storage.getWaterLogs();
    const selectedDate = this.data.selectedDate;
    const dailyTdee = dailyTdeeLogs[selectedDate] || profile.tdee;
    const targetCalories = nutrition.targetIntake(dailyTdee, profile.deficit);
    const water = waterLogs[selectedDate] || 0;

    this.setData({
      loggedIn: api.isLoggedIn(),
      currentUsername: api.getUsername(),
      profile: profile,
      dailyTdeeLogs: dailyTdeeLogs,
      dailyTdeeDraft: String(dailyTdee),
      effectiveTdee: dailyTdee,
      targetCalories: targetCalories,
      water: water
    });

    this.computeDay();
  },

  fetchMeals: function() {
    const page = this;

    if (!api.isLoggedIn()) {
      this.setData({
        loggedIn: false,
        meals: [],
        dayMeals: [],
        loading: false
      });
      this.computeDay();
      return Promise.resolve();
    }

    this.setData({ loading: true, loggedIn: true });

    return api.request({ url: '/api/meals' })
      .then(function(meals) {
        return imageUtils.hydrateMealImages(Array.isArray(meals) ? meals : []);
      })
      .then(function(meals) {
        page.setData({
          meals: meals,
          loading: false
        });
        page.computeDay();
      })
      .catch(function(err) {
        page.setData({ loading: false });
        wx.showToast({ title: err.message, icon: 'none' });
      });
  },

  computeDay: function() {
    const selectedDate = this.data.selectedDate;
    const profile = this.data.profile || storage.getProfile();
    const dailyTdeeLogs = this.data.dailyTdeeLogs || {};
    const effectiveTdee = dailyTdeeLogs[selectedDate] || profile.tdee || 2100;
    const targetCalories = nutrition.targetIntake(effectiveTdee, profile.deficit);

    const dayMeals = (this.data.meals || [])
      .filter(function(meal) {
        return date.recordDate(meal) === selectedDate;
      })
      .map(function(meal) {
        return Object.assign({}, meal, {
          typeLabel: nutrition.mealTypeLabel(meal.type),
          caloriesText: nutrition.round(meal.calories) + ' kcal',
          macroText: nutrition.round(meal.protein) + 'P / ' + nutrition.round(meal.carbs) + 'C / ' + nutrition.round(meal.fat) + 'F'
        });
      });

    const totals = nutrition.sumMeals(dayMeals);
    const targetPct = Math.min(100, Math.round((totals.calories / Math.max(1, targetCalories)) * 100));
    const remainingCalories = targetCalories - nutrition.round(totals.calories);
    const remainingText = remainingCalories >= 0
      ? '剩余 ' + remainingCalories
      : '超出 ' + Math.abs(remainingCalories);
    const targetProteinGrams = Math.max(1, Math.round((targetCalories * 0.25) / 4));
    const targetCarbsGrams = Math.max(1, Math.round((targetCalories * 0.50) / 4));
    const targetFatGrams = Math.max(1, Math.round((targetCalories * 0.25) / 9));
    const currentDeficit = nutrition.round(effectiveTdee - totals.calories);
    const targetDeficit = nutrition.round(profile.deficit || 500);
    const mealGroupDefs = [
      { key: 'Breakfast', name: '早餐', desc: '建议 300-500 kcal', icon: '早' },
      { key: 'Lunch', name: '午餐', desc: '建议 500-700 kcal', icon: '午' },
      { key: 'Dinner', name: '晚餐', desc: '建议 400-600 kcal', icon: '晚' },
      { key: 'Snack', name: '加餐', desc: '建议 100-200 kcal', icon: '加' }
    ];
    const mealGroups = mealGroupDefs.map(function(group) {
      const list = dayMeals.filter(function(meal) {
        return meal.type === group.key;
      });
      const calories = list.reduce(function(sum, meal) {
        return sum + nutrition.safeNumber(meal.calories, 0);
      }, 0);
      return Object.assign({}, group, {
        meals: list,
        hasMeals: list.length > 0,
        calories: nutrition.round(calories),
        badgeText: nutrition.round(calories) + ' kcal'
      });
    });
    const waterCups = Array.from({ length: 8 }).map(function(_, index) {
      const reached = this.data.water >= (index + 1) * 250;
      return {
        index: index,
        value: reached ? index * 250 : (index + 1) * 250,
        className: reached ? 'water-cup-btn filled' : 'water-cup-btn'
      };
    }, this);
    const ringPct = Math.min(100, Math.max(0, targetPct));

    this.setData({
      dateLabel: date.formatCnDate(selectedDate),
      dayMeals: dayMeals,
      totals: {
        calories: nutrition.round(totals.calories),
        protein: nutrition.round(totals.protein),
        carbs: nutrition.round(totals.carbs),
        fat: nutrition.round(totals.fat)
      },
      effectiveTdee: nutrition.round(effectiveTdee),
      targetCalories: targetCalories,
      targetPct: targetPct,
      ringStyle: 'background: conic-gradient(#f47a38 0% ' + ringPct + '%, rgba(92, 102, 122, 0.10) ' + ringPct + '% 100%);',
      remainingCalories: remainingCalories,
      remainingValue: Math.abs(remainingCalories),
      remainingLabel: remainingCalories >= 0 ? '剩余预算' : '已超预算',
      remainingText: remainingText,
      currentDeficit: currentDeficit,
      targetDeficit: targetDeficit,
      hasDayMeals: dayMeals.length > 0,
      statCards: [
        { key: 'intake', className: 'stat-mini-card glow-orange', iconClass: 'stat-icon-wrapper orange', label: '今日摄入', value: nutrition.round(totals.calories), unit: 'kcal' },
        { key: 'deficit', className: 'stat-mini-card glow-green', iconClass: 'stat-icon-wrapper green', label: '当前缺口', value: currentDeficit, unit: 'kcal' },
        { key: 'targetDeficit', className: 'stat-mini-card glow-purple', iconClass: 'stat-icon-wrapper purple', label: '目标缺口', value: targetDeficit, unit: 'kcal' }
      ],
      macroRows: [
        { key: 'protein', name: '蛋白质', valueText: nutrition.round(totals.protein) + 'g / ' + targetProteinGrams + 'g', pct: Math.min(100, Math.round((totals.protein / targetProteinGrams) * 100)), barClass: 'macro-bar protein-bg' },
        { key: 'carbs', name: '碳水', valueText: nutrition.round(totals.carbs) + 'g / ' + targetCarbsGrams + 'g', pct: Math.min(100, Math.round((totals.carbs / targetCarbsGrams) * 100)), barClass: 'macro-bar carbs-bg' },
        { key: 'fat', name: '脂肪', valueText: nutrition.round(totals.fat) + 'g / ' + targetFatGrams + 'g', pct: Math.min(100, Math.round((totals.fat / targetFatGrams) * 100)), barClass: 'macro-bar fat-bg' }
      ],
      mealGroups: mealGroups,
      waterCups: waterCups,
      stats: [
        { key: 'intake', label: '已摄入', value: nutrition.round(totals.calories), unit: 'kcal' },
        { key: 'target', label: '目标摄入', value: targetCalories, unit: 'kcal' },
        { key: 'protein', label: '蛋白质', value: nutrition.round(totals.protein), unit: 'g' },
        { key: 'water', label: '喝水', value: this.data.water, unit: 'ml' }
      ]
    });
  },

  prevDay: function() {
    this.setData({ selectedDate: date.addDays(this.data.selectedDate, -1) });
    this.loadLocalState();
  },

  nextDay: function() {
    this.setData({ selectedDate: date.addDays(this.data.selectedDate, 1) });
    this.loadLocalState();
  },

  goToday: function() {
    this.setData({ selectedDate: date.formatDate(new Date()) });
    this.loadLocalState();
  },

  logout: function() {
    api.clearAuth();
    wx.showToast({ title: '已退出', icon: 'success' });
    this.loadLocalState();
    this.fetchMeals();
  },

  onDailyTdeeInput: function(e) {
    this.setData({ dailyTdeeDraft: e.detail.value });
  },

  saveDailyTdee: function() {
    const value = Number(this.data.dailyTdeeDraft);
    if (!Number.isFinite(value) || value < 800 || value > 6000) {
      wx.showToast({ title: '请输入 800-6000 之间的热量', icon: 'none' });
      this.setData({ dailyTdeeDraft: String(this.data.effectiveTdee) });
      return;
    }

    const logs = storage.setDailyTdee(this.data.selectedDate, value);
    this.setData({ dailyTdeeLogs: logs });
    this.loadLocalState();
    wx.showToast({ title: '已保存', icon: 'success' });
  },

  resetDailyTdee: function() {
    const logs = storage.setDailyTdee(this.data.selectedDate, null);
    this.setData({ dailyTdeeLogs: logs });
    this.loadLocalState();
  },

  addWater: function(e) {
    const delta = Number(e.currentTarget.dataset.amount || 0);
    const logs = storage.setWater(this.data.selectedDate, this.data.water + delta);
    this.setData({ water: logs[this.data.selectedDate] || 0 });
    this.computeDay();
  },

  resetWater: function() {
    storage.setWater(this.data.selectedDate, 0);
    this.setData({ water: 0 });
    this.computeDay();
  },

  setWaterCup: function(e) {
    const value = Number(e.currentTarget.dataset.value || 0);
    storage.setWater(this.data.selectedDate, value);
    this.setData({ water: value });
    this.computeDay();
  },

  onAiTextInput: function(e) {
    this.setData({ aiText: e.detail.value });
  },

  estimateText: function() {
    const page = this;
    const text = String(this.data.aiText || '').trim();

    if (!text) {
      wx.showToast({ title: '先输入吃了什么', icon: 'none' });
      return;
    }

    this.setData({ aiEstimating: true });

    api.request({
      url: '/api/ai/estimate-text',
      method: 'POST',
      data: { text: text },
      auth: false,
      timeout: 30000
    })
      .then(function(data) {
        const result = nutrition.normalizeMealResult(data.result);
        const type = nutrition.inferMealTypeFromText(text, page.data.quickMeal.type);
        page.fillQuickMeal(result, type);
      })
      .catch(function(err) {
        wx.showToast({ title: err.message, icon: 'none' });
      })
      .finally(function() {
        page.setData({ aiEstimating: false });
      });
  },

  fillQuickMeal: function(result, type) {
    const mealType = type || this.data.quickMeal.type;
    const quickMeal = {
      name: result.name,
      calories: String(result.calories),
      protein: String(result.protein),
      carbs: String(result.carbs),
      fat: String(result.fat),
      type: mealType,
      items: result.items || []
    };
    const typeIndex = nutrition.MEAL_TYPES.findIndex(function(item) {
      return item.value === mealType;
    });

    this.setData({
      quickMeal: quickMeal,
      quickMealTypeIndex: typeIndex >= 0 ? typeIndex : 1,
      quickMealTypeLabel: nutrition.mealTypeLabel(mealType)
    });
  },

  onQuickMealInput: function(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    this.setData({ ['quickMeal.' + field]: value });
  },

  onQuickTypeChange: function(e) {
    const index = Number(e.detail.value);
    const type = nutrition.MEAL_TYPES[index] ? nutrition.MEAL_TYPES[index].value : 'Lunch';
    this.setData({
      quickMealTypeIndex: index,
      quickMealTypeLabel: nutrition.MEAL_TYPES[index] ? nutrition.MEAL_TYPES[index].label : '午餐',
      'quickMeal.type': type
    });
  },

  onCommonFoodChange: function(e) {
    const index = Number(e.detail.value);
    const food = nutrition.COMMON_FOODS[index];
    this.setData({
      commonFoodIndex: index,
      commonFoodName: food ? food.name : ''
    });
    this.applyCommonFood();
  },

  onCommonGramsInput: function(e) {
    this.setData({ commonFoodGrams: e.detail.value });
  },

  applyCommonFood: function() {
    const food = nutrition.COMMON_FOODS[this.data.commonFoodIndex];
    const result = nutrition.estimateFood(food ? food.name : '', this.data.commonFoodGrams);

    if (!result) {
      wx.showToast({ title: '请输入有效克数', icon: 'none' });
      return;
    }

    this.fillQuickMeal(result, this.data.quickMeal.type);
  },

  addMeal: function() {
    const page = this;
    const meal = this.data.quickMeal;

    if (!api.isLoggedIn()) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      wx.switchTab({ url: '/pages/settings/settings' });
      return;
    }

    if (!meal.name || !Number(meal.calories)) {
      wx.showToast({ title: '请填写餐食名称和热量', icon: 'none' });
      return;
    }

    this.setData({ saving: true });

    api.request({
      url: '/api/meals',
      method: 'POST',
      data: {
        name: meal.name,
        calories: Number(meal.calories),
        protein: Number(meal.protein || 0),
        carbs: Number(meal.carbs || 0),
        fat: Number(meal.fat || 0),
        items: meal.items || [],
        image: null,
        type: meal.type || nutrition.mealTypeByTime(),
        timestamp: date.timestampForDate(this.data.selectedDate)
      }
    })
      .then(function() {
        wx.showToast({ title: '记录成功', icon: 'success' });
        page.setData({
          quickMeal: initialQuickMeal(),
          quickMealTypeIndex: 1,
          quickMealTypeLabel: nutrition.MEAL_TYPES[1].label,
          aiText: '',
          saving: false
        });
        page.fetchMeals();
      })
      .catch(function(err) {
        page.setData({ saving: false });
        wx.showToast({ title: err.message, icon: 'none' });
      });
  },

  deleteMeal: function(e) {
    const page = this;
    const id = e.currentTarget.dataset.id;

    wx.showModal({
      title: '删除记录',
      content: '确认删除这条饮食记录吗？',
      success: function(res) {
        if (!res.confirm) return;

        api.request({ url: '/api/meals/' + id, method: 'DELETE' })
          .then(function() {
            page.fetchMeals();
          })
          .catch(function(err) {
            wx.showToast({ title: err.message, icon: 'none' });
          });
      }
    });
  },

  goSettings: function() {
    wx.switchTab({ url: '/pages/settings/settings' });
  }
});
