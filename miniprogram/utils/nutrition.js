const MEAL_TYPES = [
  { value: 'Breakfast', label: '早餐' },
  { value: 'Lunch', label: '午餐' },
  { value: 'Dinner', label: '晚餐' },
  { value: 'Snack', label: '加餐' }
];

const COMMON_FOODS = [
  { name: '白米饭', kcalPer100: 116, proteinPer100: 2.6, carbsPer100: 25.9, fatPer100: 0.3 },
  { name: '水煮蛋', kcalPer100: 143, proteinPer100: 13, carbsPer100: 1, fatPer100: 10 },
  { name: '纯牛奶', kcalPer100: 54, proteinPer100: 3, carbsPer100: 4.8, fatPer100: 3.2 },
  { name: '鸡胸肉', kcalPer100: 133, proteinPer100: 24.6, carbsPer100: 2.5, fatPer100: 3 },
  { name: '苹果', kcalPer100: 52, proteinPer100: 0.2, carbsPer100: 13.5, fatPer100: 0.2 },
  { name: '吐司面包', kcalPer100: 265, proteinPer100: 8, carbsPer100: 50, fatPer100: 3 },
  { name: '红烧肉', kcalPer100: 478, proteinPer100: 10, carbsPer100: 5, fatPer100: 45 }
];

function safeNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : (fallback || 0);
}

function round(value) {
  return Math.round(safeNumber(value, 0));
}

function mealTypeByTime() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 10) return 'Breakfast';
  if (hour >= 10 && hour < 14) return 'Lunch';
  if (hour >= 17 && hour < 22) return 'Dinner';
  return 'Snack';
}

function inferMealTypeFromText(text, fallbackType) {
  const value = String(text || '').toLowerCase();
  if (/(夜宵|宵夜|加餐|零食|点心|下午茶|snack)/.test(value)) return 'Snack';
  if (/(早餐|早饭|早上|早晨|上午|清晨|breakfast)/.test(value)) return 'Breakfast';
  if (/(午餐|午饭|中午|午间|正午|lunch)/.test(value)) return 'Lunch';
  if (/(晚餐|晚饭|晚上|傍晚|晚间|dinner|supper)/.test(value)) return 'Dinner';
  return fallbackType || mealTypeByTime();
}

function mealTypeLabel(type) {
  const found = MEAL_TYPES.find(function(item) {
    return item.value === type;
  });
  return found ? found.label : '餐食';
}

function sumMeals(meals) {
  const list = Array.isArray(meals) ? meals : [];
  return list.reduce(function(total, meal) {
    return {
      calories: total.calories + safeNumber(meal.calories, 0),
      protein: total.protein + safeNumber(meal.protein, 0),
      carbs: total.carbs + safeNumber(meal.carbs, 0),
      fat: total.fat + safeNumber(meal.fat, 0)
    };
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
}

function targetIntake(tdee, deficit) {
  return Math.max(1200, round(safeNumber(tdee, 2200) - safeNumber(deficit, 500)));
}

function estimateFood(name, grams) {
  const food = COMMON_FOODS.find(function(item) {
    return item.name === name;
  });
  const amount = safeNumber(grams, 0);

  if (!food || amount <= 0) {
    return null;
  }

  const ratio = amount / 100;
  return {
    name: food.name,
    calories: round(food.kcalPer100 * ratio),
    protein: round(food.proteinPer100 * ratio),
    carbs: round(food.carbsPer100 * ratio),
    fat: round(food.fatPer100 * ratio),
    items: [
      {
        name: food.name,
        weight: amount + 'g',
        calories: round(food.kcalPer100 * ratio),
        protein: round(food.proteinPer100 * ratio),
        carbs: round(food.carbsPer100 * ratio),
        fat: round(food.fatPer100 * ratio)
      }
    ]
  };
}

function normalizeMealResult(result) {
  const data = result || {};
  return {
    name: data.name || '未命名餐食',
    calories: round(data.calories),
    protein: round(data.protein),
    carbs: round(data.carbs),
    fat: round(data.fat),
    items: Array.isArray(data.items) ? data.items : []
  };
}

module.exports = {
  MEAL_TYPES: MEAL_TYPES,
  COMMON_FOODS: COMMON_FOODS,
  safeNumber: safeNumber,
  round: round,
  mealTypeByTime: mealTypeByTime,
  inferMealTypeFromText: inferMealTypeFromText,
  mealTypeLabel: mealTypeLabel,
  sumMeals: sumMeals,
  targetIntake: targetIntake,
  estimateFood: estimateFood,
  normalizeMealResult: normalizeMealResult
};
