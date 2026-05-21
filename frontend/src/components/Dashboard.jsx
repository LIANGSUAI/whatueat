import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Flame, TrendingDown, Target, Droplet, Coffee, Utensils, Moon, Carrot, X, ChevronLeft, ChevronRight, Calendar, Sparkles } from 'lucide-react';

const COMMON_FOODS = [
  {
    name: '白米饭',
    kcalPer100: 116, proteinPer100: 2.6, carbsPer100: 25.9, fatPer100: 0.3,
    portions: [{ name: '碗 (约150g)', gramVal: 150 }, { name: '克 (g)', gramVal: 1 }]
  },
  {
    name: '馒头',
    kcalPer100: 223, proteinPer100: 7.0, carbsPer100: 47.0, fatPer100: 1.0,
    portions: [{ name: '个 (约100g)', gramVal: 100 }, { name: '克 (g)', gramVal: 1 }]
  },
  {
    name: '水煮蛋',
    kcalPer100: 143, proteinPer100: 13.0, carbsPer100: 1.0, fatPer100: 10.0,
    portions: [{ name: '个 (约50g)', gramVal: 50 }, { name: '克 (g)', gramVal: 1 }]
  },
  {
    name: '纯牛奶',
    kcalPer100: 54, proteinPer100: 3.0, carbsPer100: 4.8, fatPer100: 3.2,
    portions: [{ name: '盒/杯 (约250ml)', gramVal: 250 }, { name: '毫升 (ml)', gramVal: 1 }]
  },
  {
    name: '鸡胸肉',
    kcalPer100: 133, proteinPer100: 24.6, carbsPer100: 2.5, fatPer100: 3.0,
    portions: [{ name: '份 (约150g)', gramVal: 150 }, { name: '克 (g)', gramVal: 1 }]
  },
  {
    name: '苹果',
    kcalPer100: 52, proteinPer100: 0.2, carbsPer100: 13.5, fatPer100: 0.2,
    portions: [{ name: '个 (约150g)', gramVal: 150 }, { name: '克 (g)', gramVal: 1 }]
  },
  {
    name: '吐司面包',
    kcalPer100: 265, proteinPer100: 8.0, carbsPer100: 50.0, fatPer100: 3.0,
    portions: [{ name: '片 (约40g)', gramVal: 40 }, { name: '克 (g)', gramVal: 1 }]
  },
  {
    name: '红烧肉',
    kcalPer100: 478, proteinPer100: 10.0, carbsPer100: 5.0, fatPer100: 45.0,
    portions: [{ name: '碗 (约150g)', gramVal: 150 }, { name: '块 (约20g)', gramVal: 20 }, { name: '克 (g)', gramVal: 1 }]
  },
  {
    name: '美式咖啡',
    kcalPer100: 2, proteinPer100: 0.1, carbsPer100: 0.3, fatPer100: 0,
    portions: [{ name: '杯 (约300ml)', gramVal: 300 }, { name: '毫升 (ml)', gramVal: 1 }]
  },
  {
    name: '拿铁咖啡',
    kcalPer100: 54, proteinPer100: 3.0, carbsPer100: 4.0, fatPer100: 2.8,
    portions: [{ name: '杯 (约300ml)', gramVal: 300 }, { name: '毫升 (ml)', gramVal: 1 }]
  }
];

const estimateTextLocalMock = (text) => {
  let name = '智能估算：健康餐组合';
  let calories = 450;
  let protein = 25;
  let carbs = 55;
  let fat = 12;
  let items = [
    { name: '主食类', weight: '150g', calories: 200, protein: 5, carbs: 40, fat: 1 },
    { name: '蛋白质类', weight: '100g', calories: 180, protein: 18, carbs: 1, fat: 10 },
    { name: '蔬菜类', weight: '150g', calories: 70, protein: 2, carbs: 14, fat: 1 }
  ];

  const lowerText = text.toLowerCase();
  if (lowerText.includes('米饭') || lowerText.includes('饭')) {
    name = '白米饭搭配';
    items[0] = { name: '白米饭', weight: '150g', calories: 174, protein: 4, carbs: 39, fat: 0 };
    calories = 174 + 180 + 70;
    carbs = 39 + 1 + 14;
  }
  if (lowerText.includes('肉') || lowerText.includes('猪肉') || lowerText.includes('红烧肉')) {
    name = name.includes('米饭') ? '红烧肉配米饭' : '红烧肉';
    items[1] = { name: '红烧肉', weight: '150g', calories: 717, protein: 15, carbs: 8, fat: 69 };
    calories = (name.includes('米饭') ? 174 : 0) + 717 + 70;
    protein = 15 + (name.includes('米饭') ? 4 : 0) + 2;
    carbs = (name.includes('米饭') ? 39 : 0) + 8 + 14;
    fat = 69 + 1;
  }
  if (lowerText.includes('苹果') || lowerText.includes('沙拉')) {
    name = '健康水果沙拉';
    calories = 150;
    protein = 2;
    carbs = 30;
    fat = 2;
    items = [
      { name: '苹果', weight: '150g', calories: 78, protein: 0, carbs: 20, fat: 0 },
      { name: '沙拉酱', weight: '20g', calories: 72, protein: 2, carbs: 10, fat: 2 }
    ];
  }
  if (lowerText.includes('面包')) {
    name = '面包甜点';
    calories = 340;
    protein = 6;
    carbs = 50;
    fat = 12;
    items = [
      { name: '奶油小面包', weight: '150g', calories: 340, protein: 6, carbs: 50, fat: 12 }
    ];
  }
  if (lowerText.includes('咖啡') || lowerText.includes('拿铁')) {
    name = '拿铁咖啡';
    calories = 160;
    protein = 9;
    carbs = 14;
    fat = 7;
    items = [
      { name: '牛奶', weight: '250ml', calories: 150, protein: 8, carbs: 12, fat: 7 },
      { name: '浓缩咖啡', weight: '30ml', calories: 10, protein: 1, carbs: 2, fat: 0 }
    ];
  }

  return { name, calories, protein, carbs, fat, items };
};

export default function Dashboard({ 
  meals, 
  onDeleteMeal, 
  onUpdateMeal,
  onAddManualMeal,
  tdee = 2200, 
  targetDeficit = 500, 
  waterIntake = 0,
  onUpdateWater,
  selectedDate,
  setSelectedDate,
  apiSettings
}) {
  const getMealTypeByTime = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 10) return 'Breakfast';
    if (hour >= 10 && hour < 14) return 'Lunch';
    if (hour >= 17 && hour < 22) return 'Dinner';
    return 'Snack';
  };

  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [editingMeal, setEditingMeal] = useState(null);
  const [quickMeal, setQuickMeal] = useState({ 
    name: '', 
    calories: '', 
    protein: '', 
    carbs: '', 
    fat: '', 
    type: getMealTypeByTime(),
    selectedFood: '',
    quantity: '1',
    portionIndex: '0'
  });

  const [aiText, setAiText] = useState('');
  const [aiEstimating, setAiEstimating] = useState(false);
  const [aiError, setAiError] = useState('');

  // Calculate targets
  const targetIntake = Math.max(1200, tdee - targetDeficit);
  
  const getLocalDateString = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(getLocalDateString(d));
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(getLocalDateString(d));
  };

  const handleGoToday = () => {
    setSelectedDate(getLocalDateString());
  };

  const formatSelectedDate = (dateStr) => {
    const d = new Date(dateStr);
    const options = { month: 'long', day: 'numeric', weekday: 'long' };
    const dateFormatted = d.toLocaleDateString('zh-CN', options);
    
    const today = getLocalDateString();
    const yesterday = getLocalDateString(new Date(Date.now() - 86400000));
    
    if (dateStr === today) {
      return `今天 (${dateFormatted})`;
    } else if (dateStr === yesterday) {
      return `昨天 (${dateFormatted})`;
    }
    return dateFormatted;
  };

  // Food selector handlers
  const handleFoodChange = (e) => {
    const foodName = e.target.value;
    if (foodName === '') {
      setQuickMeal(prev => ({
        ...prev,
        selectedFood: '',
        name: ''
      }));
      return;
    }
    const food = COMMON_FOODS.find(f => f.name === foodName);
    if (food) {
      const defaultPortion = food.portions[0];
      const quantity = 1;
      const totalGrams = defaultPortion.gramVal * quantity;
      
      const calories = Math.round((totalGrams * food.kcalPer100) / 100);
      const protein = Number(((totalGrams * food.proteinPer100) / 100).toFixed(1));
      const carbs = Number(((totalGrams * food.carbsPer100) / 100).toFixed(1));
      const fat = Number(((totalGrams * food.fatPer100) / 100).toFixed(1));

      setQuickMeal(prev => ({
        ...prev,
        selectedFood: foodName,
        name: foodName,
        portionIndex: '0',
        quantity: '1',
        calories: calories.toString(),
        protein: protein.toString(),
        carbs: carbs.toString(),
        fat: fat.toString()
      }));
    }
  };

  const handlePortionOrQtyChange = (newQty, newPortionIdx) => {
    const food = COMMON_FOODS.find(f => f.name === quickMeal.selectedFood);
    if (!food) return;

    const portion = food.portions[Number(newPortionIdx)];
    const qty = Number(newQty || 0);
    const totalGrams = portion.gramVal * qty;

    const calories = Math.round((totalGrams * food.kcalPer100) / 100);
    const protein = Number(((totalGrams * food.proteinPer100) / 100).toFixed(1));
    const carbs = Number(((totalGrams * food.carbsPer100) / 100).toFixed(1));
    const fat = Number(((totalGrams * food.fatPer100) / 100).toFixed(1));

    setQuickMeal(prev => ({
      ...prev,
      quantity: newQty,
      portionIndex: newPortionIdx,
      calories: calories.toString(),
      protein: protein.toString(),
      carbs: carbs.toString(),
      fat: fat.toString()
    }));
  };

  // Edit Modal Food selector handlers
  const handleEditFoodChange = (e) => {
    const foodName = e.target.value;
    if (foodName === '') {
      setEditingMeal(prev => ({
        ...prev,
        selectedFood: '',
        name: ''
      }));
      return;
    }
    const food = COMMON_FOODS.find(f => f.name === foodName);
    if (food) {
      const defaultPortion = food.portions[0];
      const quantity = 1;
      const totalGrams = defaultPortion.gramVal * quantity;
      
      const calories = Math.round((totalGrams * food.kcalPer100) / 100);
      const protein = Number(((totalGrams * food.proteinPer100) / 100).toFixed(1));
      const carbs = Number(((totalGrams * food.carbsPer100) / 100).toFixed(1));
      const fat = Number(((totalGrams * food.fatPer100) / 100).toFixed(1));

      setEditingMeal(prev => ({
        ...prev,
        selectedFood: foodName,
        name: foodName,
        portionIndex: '0',
        quantity: '1',
        calories: calories,
        protein: protein,
        carbs: carbs,
        fat: fat
      }));
    }
  };

  const handleEditPortionOrQtyChange = (newQty, newPortionIdx) => {
    const food = COMMON_FOODS.find(f => f.name === editingMeal.selectedFood);
    if (!food) return;

    const portion = food.portions[Number(newPortionIdx)];
    const qty = Number(newQty || 0);
    const totalGrams = portion.gramVal * qty;

    const calories = Math.round((totalGrams * food.kcalPer100) / 100);
    const protein = Number(((totalGrams * food.proteinPer100) / 100).toFixed(1));
    const carbs = Number(((totalGrams * food.carbsPer100) / 100).toFixed(1));
    const fat = Number(((totalGrams * food.fatPer100) / 100).toFixed(1));

    setEditingMeal(prev => ({
      ...prev,
      quantity: newQty,
      portionIndex: newPortionIdx,
      calories: calories,
      protein: protein,
      carbs: carbs,
      fat: fat
    }));
  };

  const handleEditClick = (meal) => {
    setEditingMeal({
      ...meal,
      selectedFood: '',
      quantity: '1',
      portionIndex: '0'
    });
  };

  // AI text estimation API handler
  const handleAiTextEstimate = async () => {
    if (!aiText.trim()) return;
    setAiEstimating(true);
    setAiError('');

    const isMockMode = apiSettings?.mode === 'local' && !apiSettings?.apiKey;

    if (isMockMode) {
      setTimeout(() => {
        try {
          const result = estimateTextLocalMock(aiText);
          setQuickMeal(prev => ({
            ...prev,
            name: result.name,
            calories: result.calories.toString(),
            protein: result.protein.toString(),
            carbs: result.carbs.toString(),
            fat: result.fat.toString(),
            selectedFood: ''
          }));
          setAiText('');
        } catch (err) {
          setAiError('本地估算出错');
        } finally {
          setAiEstimating(false);
        }
      }, 1500);
      return;
    }

    try {
      let result;
      if (apiSettings?.mode === 'cloud') {
        const serverUrl = apiSettings.serverUrl || 'http://localhost:3000';
        const response = await fetch(`${serverUrl}/api/ai/estimate-text`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiSettings.token || ''}`
          },
          body: JSON.stringify({ text: aiText })
        });
        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`分析失败: ${response.status} - ${errText}`);
        }
        const data = await response.json();
        result = data.result;
      } else {
        const isQwen = apiSettings?.provider === 'qwen';
        const url = isQwen 
          ? 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions' 
          : (apiSettings?.proxyUrl || 'https://api.openai.com/v1/chat/completions');

        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiSettings?.apiKey}`
        };

        const systemPrompt = `You are a professional nutrition expert. Analyze the food description text provided and estimate the summary dish name, estimated weight of each ingredient/food item, total calories (kcal), and macronutrients (protein in grams, carbohydrates in grams, fat in grams).
Return strictly a valid JSON object in this format:
{
  "name": "Summary of the meals in Chinese (e.g. 红烧肉配米饭)",
  "calories": total_calories_number,
  "protein": total_protein_grams_number,
  "carbs": total_carbs_grams_number,
  "fat": total_fat_grams_number,
  "items": [
    { "name": "Ingredient or food name in Chinese", "weight": "100g", "calories": calories_number, "protein": protein_grams, "carbs": carbs_grams, "fat": fat_grams }
  ]
}
Do not return any markdown formatting outside of JSON, do not include any thoughts. Just clean raw JSON.`;

        const requestBody = {
          model: isQwen ? 'qwen-plus' : 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: aiText }
          ]
        };

        if (!isQwen) {
          requestBody.response_format = { type: 'json_object' };
        }

        const apiResponse = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(requestBody)
        });

        if (!apiResponse.ok) {
          throw new Error(`AI 接口返回异常: ${apiResponse.status}`);
        }

        const data = await apiResponse.json();
        const rawContent = data.choices[0].message.content;
        
        let cleaned = rawContent.trim();
        if (cleaned.startsWith('```json')) cleaned = cleaned.substring(7);
        else if (cleaned.startsWith('```')) cleaned = cleaned.substring(3);
        if (cleaned.endsWith('```')) cleaned = cleaned.substring(0, cleaned.length - 3);
        
        result = JSON.parse(cleaned.trim());
      }

      if (result) {
        setQuickMeal(prev => ({
          ...prev,
          name: result.name,
          calories: result.calories.toString(),
          protein: result.protein.toString(),
          carbs: result.carbs.toString(),
          fat: result.fat.toString(),
          selectedFood: ''
        }));
        setAiText('');
      }
    } catch (err) {
      console.error(err);
      setAiError(err.message || 'AI 估算请求失败，请稍后重试或使用手动记录。');
    } finally {
      setAiEstimating(false);
    }
  };

  // Filter meals for the selected date
  const filteredMeals = meals.filter(m => m.timestamp && m.timestamp.split('T')[0] === selectedDate);

  // Calculate current totals
  const totalCalories = filteredMeals.reduce((sum, m) => sum + Number(m.calories || 0), 0);
  const totalProtein = filteredMeals.reduce((sum, m) => sum + Number(m.protein || 0), 0);
  const totalCarbs = filteredMeals.reduce((sum, m) => sum + Number(m.carbs || 0), 0);
  const totalFat = filteredMeals.reduce((sum, m) => sum + Number(m.fat || 0), 0);

  // Macro targets (Carb 50%, Protein 25%, Fat 25% of targetIntake)
  const targetProteinGrams = Math.round((targetIntake * 0.25) / 4);
  const targetCarbsGrams = Math.round((targetIntake * 0.50) / 4);
  const targetFatGrams = Math.round((targetIntake * 0.25) / 9);

  const remainingCalories = targetIntake - totalCalories;
  const currentDeficit = tdee - totalCalories;

  // Progress Ring configurations
  const radius = 80;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min(100, (totalCalories / targetIntake) * 100);
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const handleQuickAddSubmit = (e) => {
    e.preventDefault();
    if (!quickMeal.name || !quickMeal.calories) return;
    onAddManualMeal({
      ...quickMeal,
      calories: Number(quickMeal.calories),
      protein: Number(quickMeal.protein || 0),
      carbs: Number(quickMeal.carbs || 0),
      fat: Number(quickMeal.fat || 0),
      timestamp: new Date().toISOString()
    });
    setQuickMeal({ 
      name: '', 
      calories: '', 
      protein: '', 
      carbs: '', 
      fat: '', 
      type: getMealTypeByTime(),
      selectedFood: '',
      quantity: '1',
      portionIndex: '0'
    });
    setShowQuickAdd(false);
  };

  const mealTypes = [
    { name: '早餐', key: 'Breakfast', icon: Coffee, desc: '建议 300-500 kcal' },
    { name: '午餐', key: 'Lunch', icon: Utensils, desc: '建议 500-700 kcal' },
    { name: '晚餐', key: 'Dinner', icon: Moon, desc: '建议 400-600 kcal' },
    { name: '加餐', key: 'Snack', icon: Carrot, desc: '建议 100-200 kcal' }
  ];

  return (
    <div className="dashboard-root">
      {/* Date Navigator Card */}
      <div className="glass-card date-navigator-card animate-fadeIn">
        <button className="date-nav-arrow-btn" onClick={handlePrevDay} title="前一天">
          <ChevronLeft size={20} />
        </button>
        <div className="date-display-box">
          <Calendar size={18} className="calendar-decor-icon" />
          <span className="date-display-text">{formatSelectedDate(selectedDate)}</span>
        </div>
        <div className="date-nav-controls">
          {selectedDate !== getLocalDateString() && (
            <button className="btn btn-secondary btn-sm date-today-btn" onClick={handleGoToday}>
              回到今天
            </button>
          )}
          <button className="date-nav-arrow-btn" onClick={handleNextDay} title="后一天">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Top Banner Stats */}
      <div className="stats-banner-grid">
        <div className="glass-card glow-orange stat-mini-card">
          <div className="stat-icon-wrapper orange">
            <Flame size={20} />
          </div>
          <div>
            <div className="stat-label">今日摄入</div>
            <div className="stat-val">{totalCalories} <span className="stat-unit">kcal</span></div>
          </div>
        </div>

        <div className="glass-card glow-green stat-mini-card">
          <div className="stat-icon-wrapper green">
            <TrendingDown size={20} />
          </div>
          <div>
            <div className="stat-label">当前缺口</div>
            <div className={`stat-val ${currentDeficit >= targetDeficit ? 'text-success' : ''}`}>
              {currentDeficit} <span className="stat-unit">kcal</span>
            </div>
          </div>
        </div>

        <div className="glass-card glow-purple stat-mini-card">
          <div className="stat-icon-wrapper purple">
            <Target size={20} />
          </div>
          <div>
            <div className="stat-label">目标缺口</div>
            <div className="stat-val">{targetDeficit} <span className="stat-unit">kcal</span></div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Main Calorie Circular Progress Card */}
        <div className="glass-card circular-progress-card">
          <h3 className="card-title">卡路里平衡盘</h3>
          <div className="circle-chart-container">
            <svg viewBox="0 0 200 200" className="progress-ring" style={{ width: '100%', height: '100%' }}>
              <circle
                stroke="rgba(255, 255, 255, 0.05)"
                fill="transparent"
                strokeWidth={strokeWidth}
                r={radius}
                cx="100"
                cy="100"
              />
              <circle
                stroke="url(#orangeGradient)"
                fill="transparent"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                r={radius}
                cx="100"
                cy="100"
                className="progress-ring-circle"
              />
              <defs>
                <linearGradient id="orangeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--color-primary)" />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.8" />
                </linearGradient>
              </defs>
            </svg>
            <div className="circle-inner-text">
              <div className="circle-calories-num">{remainingCalories >= 0 ? remainingCalories : Math.abs(remainingCalories)}</div>
              <div className="circle-calories-label">{remainingCalories >= 0 ? '剩余预算' : '已超预算'}</div>
              <div className="circle-calories-target">目标: {targetIntake} kcal</div>
            </div>
          </div>

          <div className="calorie-summary-footer">
            <div className="summary-col">
              <div className="sub-val">{tdee}</div>
              <div className="sub-label">TDEE</div>
            </div>
            <div className="summary-divider"></div>
            <div className="summary-col">
              <div className="sub-val">{totalCalories}</div>
              <div className="sub-label">已摄入</div>
            </div>
            <div className="summary-divider"></div>
            <div className="summary-col">
              <div className="sub-val">{Math.max(0, remainingCalories)}</div>
              <div className="sub-label">剩余预算</div>
            </div>
          </div>
        </div>

        {/* Macros Breakdown & Utilities */}
        <div className="glass-card macros-card">
          <h3 className="card-title">三大营养素分析</h3>
          
          <div className="macros-progress-list">
            {/* Protein */}
            <div className="macro-row">
              <div className="macro-header">
                <span className="macro-name">蛋白质</span>
                <span className="macro-value">{totalProtein}g / {targetProteinGrams}g</span>
              </div>
              <div className="macro-bar-container">
                <div 
                  className="macro-bar protein-bg" 
                  style={{ width: `${Math.min(100, (totalProtein / targetProteinGrams) * 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Carbs */}
            <div className="macro-row">
              <div className="macro-header">
                <span className="macro-name">碳水</span>
                <span className="macro-value">{totalCarbs}g / {targetCarbsGrams}g</span>
              </div>
              <div className="macro-bar-container">
                <div 
                  className="macro-bar carbs-bg" 
                  style={{ width: `${Math.min(100, (totalCarbs / targetCarbsGrams) * 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Fat */}
            <div className="macro-row">
              <div className="macro-header">
                <span className="macro-name">脂肪</span>
                <span className="macro-value">{totalFat}g / {targetFatGrams}g</span>
              </div>
              <div className="macro-bar-container">
                <div 
                  className="macro-bar fat-bg" 
                  style={{ width: `${Math.min(100, (totalFat / targetFatGrams) * 100)}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Quick Water Log Utility */}
          <div className="water-tracker-container">
            <div className="water-header">
              <div className="water-title">
                <Droplet size={18} className="water-icon" />
                <span>饮水记录</span>
              </div>
              <span className="water-amount">{waterIntake} / 2000 ml</span>
            </div>
            <div className="water-cups-row">
              {[250, 250, 250, 250, 250, 250, 250, 250].map((amount, idx) => {
                const reached = waterIntake >= (idx + 1) * amount;
                return (
                  <button 
                    key={idx}
                    onClick={() => onUpdateWater(reached ? (idx * amount) : ((idx + 1) * amount))}
                    className={`water-cup-btn ${reached ? 'filled' : ''}`}
                    title={`第 ${idx+1} 杯 (${amount}ml)`}
                  >
                    <Droplet size={14} fill={reached ? "#38bdf8" : "none"} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Daily Meals Timeline */}
      <div className="meal-timeline-section">
        <div className="section-header">
          <h2 className="section-title">{selectedDate === getLocalDateString() ? '今日饮食打卡' : '当日饮食打卡'}</h2>
          <button 
            className="btn btn-secondary" 
            onClick={() => setShowQuickAdd(!showQuickAdd)}
          >
            <Plus size={16} />
            <span>手动快速记账</span>
          </button>
        </div>

        {/* Quick Add Form Modal/Accordion */}
        {showQuickAdd && (
          <div className="glass-card quick-add-form-card">
            <h4 className="quick-add-title">快速记录餐食</h4>
            <form onSubmit={handleQuickAddSubmit} className="quick-add-form">
              
              {/* AI Text Estimator Block */}
              <div className="form-group ai-text-estimator-block">
                <label className="input-label-with-badge">
                  <span className="label-text">AI 智能文本估算 (不知道卡路里？描述一下即可)</span>
                  <span className="badge-purple">✨ AI 估算</span>
                </label>
                <div className="ai-textarea-wrapper">
                  <textarea
                    className="form-input ai-textarea"
                    placeholder="例如：中午吃了一小碗红烧肉，一碗米饭，一盘青菜，喝了一杯拿铁"
                    value={aiText}
                    onChange={e => setAiText(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn-info btn-sm ai-estimate-button"
                    onClick={handleAiTextEstimate}
                    disabled={aiEstimating || !aiText.trim()}
                  >
                    {aiEstimating ? 'AI 分析估算中...' : '开始智能估算'}
                  </button>
                </div>
                {aiError && <span className="ai-error-msg">{aiError}</span>}
              </div>

              {/* Portion Calculator Block */}
              <div className="food-converter-block">
                <div className="form-row-grid" style={{ gridTemplateColumns: quickMeal.selectedFood ? '1.5fr 1fr 1fr' : '1fr' }}>
                  <div className="form-group">
                    <label>选择常见食物估算</label>
                    <select
                      className="form-input"
                      value={quickMeal.selectedFood}
                      onChange={handleFoodChange}
                    >
                      <option value="">-- 手动录入或自定义 --</option>
                      {COMMON_FOODS.map(f => (
                        <option key={f.name} value={f.name}>{f.name}</option>
                      ))}
                    </select>
                  </div>
                  {quickMeal.selectedFood && (
                    <>
                      <div className="form-group">
                        <label>数量</label>
                        <input
                          type="number"
                          step="0.1"
                          className="form-input"
                          value={quickMeal.quantity}
                          onChange={e => handlePortionOrQtyChange(e.target.value, quickMeal.portionIndex)}
                          placeholder="1"
                        />
                      </div>
                      <div className="form-group">
                        <label>单位</label>
                        <select
                          className="form-input"
                          value={quickMeal.portionIndex}
                          onChange={e => handlePortionOrQtyChange(quickMeal.quantity, e.target.value)}
                        >
                          {COMMON_FOODS.find(f => f.name === quickMeal.selectedFood)?.portions.map((p, idx) => (
                            <option key={idx} value={idx}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="form-row-grid">
                <div className="form-group">
                  <label>餐食名称</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="如：煎饼果子、美式咖啡" 
                    value={quickMeal.name}
                    onChange={e => setQuickMeal({...quickMeal, name: e.target.value})}
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>用餐分类</label>
                  <select 
                    className="form-input"
                    value={quickMeal.type}
                    onChange={e => setQuickMeal({...quickMeal, type: e.target.value})}
                  >
                    <option value="Breakfast">早餐</option>
                    <option value="Lunch">午餐</option>
                    <option value="Dinner">晚餐</option>
                    <option value="Snack">加餐</option>
                  </select>
                </div>
              </div>
              <div className="form-row-four-cols">
                <div className="form-group">
                  <label>卡路里 (kcal)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    placeholder="0"
                    value={quickMeal.calories}
                    onChange={e => setQuickMeal({...quickMeal, calories: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>蛋白质 (g)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    placeholder="0"
                    value={quickMeal.protein}
                    onChange={e => setQuickMeal({...quickMeal, protein: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>碳水 (g)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    placeholder="0"
                    value={quickMeal.carbs}
                    onChange={e => setQuickMeal({...quickMeal, carbs: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>脂肪 (g)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    placeholder="0"
                    value={quickMeal.fat}
                    onChange={e => setQuickMeal({...quickMeal, fat: e.target.value})}
                  />
                </div>
              </div>
              <div className="quick-add-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowQuickAdd(false)}>取消</button>
                <button type="submit" className="btn btn-primary">添加餐食</button>
              </div>
            </form>
          </div>
        )}

        <div className="timeline-grid">
          {mealTypes.map(type => {
            const loggedMeals = filteredMeals.filter(m => m.type === type.key);
            const totalTypeCalories = loggedMeals.reduce((s, m) => s + Number(m.calories || 0), 0);
            const Icon = type.icon;

            return (
              <div key={type.key} className="glass-card timeline-card">
                <div className="timeline-card-header">
                  <div className="type-info">
                    <div className="type-icon-box">
                      <Icon size={18} />
                    </div>
                    <div>
                      <h4 className="type-name">{type.name}</h4>
                      <p className="type-desc">{type.desc}</p>
                    </div>
                  </div>
                  {totalTypeCalories > 0 && (
                    <span className="type-calorie-badge">{totalTypeCalories} kcal</span>
                  )}
                </div>

                <div className="logged-meals-list">
                  {loggedMeals.length === 0 ? (
                    <div className="empty-meal-slot">
                      <span>尚未记录</span>
                    </div>
                  ) : (
                    loggedMeals.map(meal => (
                      <div key={meal.id} className="meal-item-row">
                        {meal.image ? (
                          <div className="meal-thumbnail-wrapper">
                            <img src={meal.image} alt={meal.name} className="meal-thumbnail-img" />
                          </div>
                        ) : (
                          <div className="meal-thumbnail-placeholder">🥑</div>
                        )}
                        <div className="meal-details">
                          <div className="meal-title-row">
                            <span className="meal-name-text">{meal.name}</span>
                            <span className="meal-kcal-text">{meal.calories} kcal</span>
                          </div>
                          <div className="meal-macros-text">
                            蛋白质 {meal.protein}g · 碳水 {meal.carbs}g · 脂肪 {meal.fat}g
                          </div>
                        </div>
                        <div className="meal-item-actions">
                          <button 
                            className="edit-meal-btn" 
                            onClick={() => handleEditClick(meal)}
                            title="修改记录"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button 
                            className="delete-meal-btn" 
                            onClick={() => onDeleteMeal(meal.id)}
                            title="删除记录"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        .stats-banner-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 1.25rem;
          margin-bottom: 1.5rem;
        }
        .stat-mini-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.25rem;
        }
        .stat-icon-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: 12px;
        }
        .stat-icon-wrapper.orange {
          background: rgba(249, 115, 22, 0.12);
          color: var(--color-primary);
        }
        .stat-icon-wrapper.green {
          background: rgba(16, 185, 129, 0.12);
          color: var(--color-success);
        }
        .stat-icon-wrapper.purple {
          background: rgba(99, 102, 241, 0.12);
          color: var(--color-info);
        }
        .stat-label {
          font-size: 0.8rem;
          color: var(--text-secondary);
          margin-bottom: 0.15rem;
        }
        .stat-val {
          font-family: var(--font-heading);
          font-size: 1.35rem;
          font-weight: 700;
        }
        .stat-unit {
          font-size: 0.8rem;
          font-weight: 400;
          color: var(--text-secondary);
        }
        .text-success {
          color: var(--color-success) !important;
        }

        .circular-progress-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
        }
        .card-title {
          font-family: var(--font-heading);
          font-size: 1.1rem;
          width: 100%;
          text-align: left;
          margin-bottom: 1rem;
          color: var(--text-primary);
        }
        .circle-chart-container {
          position: relative;
          width: 200px;
          height: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 1rem 0;
        }
        .circle-inner-text {
          position: absolute;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .circle-calories-num {
          font-family: var(--font-heading);
          font-size: 2.25rem;
          font-weight: 800;
          line-height: 1;
        }
        .circle-calories-label {
          font-size: 0.8rem;
          color: var(--text-secondary);
          margin: 0.25rem 0;
        }
        .circle-calories-target {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .calorie-summary-footer {
          display: flex;
          width: 100%;
          justify-content: space-between;
          border-top: 1px solid var(--border-glass);
          padding-top: 1rem;
          margin-top: 1rem;
        }
        .summary-col {
          text-align: center;
          flex: 1;
        }
        .sub-val {
          font-family: var(--font-heading);
          font-weight: 600;
          font-size: 1rem;
        }
        .sub-label {
          font-size: 0.7rem;
          color: var(--text-secondary);
          margin-top: 0.15rem;
        }
        .summary-divider {
          width: 1px;
          background: var(--border-glass);
          align-self: stretch;
        }

        .macros-progress-list {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          margin-bottom: 1.5rem;
        }
        .macro-row {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }
        .macro-header {
          display: flex;
          justify-content: space-between;
          font-size: 0.85rem;
        }
        .macro-name {
          color: var(--text-secondary);
        }
        .macro-value {
          font-weight: 600;
          font-family: var(--font-heading);
        }
        .macro-bar-container {
          height: 8px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
          overflow: hidden;
        }
        .macro-bar {
          height: 100%;
          border-radius: 4px;
          transition: width 0.5s ease-out;
        }
        .protein-bg { background: linear-gradient(90deg, #818cf8, var(--color-info)); }
        .carbs-bg { background: linear-gradient(90deg, #fbbf24, var(--color-warning)); }
        .fat-bg { background: linear-gradient(90deg, #f472b6, var(--color-danger)); }

        .water-tracker-container {
          border-top: 1px solid var(--border-glass);
          padding-top: 1.25rem;
        }
        .water-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }
        .water-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
          font-weight: 600;
        }
        .water-icon {
          color: #38bdf8;
        }
        .water-amount {
          font-size: 0.85rem;
          color: var(--text-secondary);
          font-family: var(--font-heading);
        }
        .water-cups-row {
          display: flex;
          justify-content: space-between;
          gap: 0.25rem;
        }
        .water-cup-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 36px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-glass);
          cursor: pointer;
          color: var(--text-muted);
          transition: all 0.2s ease;
        }
        .water-cup-btn:hover {
          background: rgba(56, 189, 248, 0.08);
          border-color: rgba(56, 189, 248, 0.3);
          color: #38bdf8;
        }
        .water-cup-btn.filled {
          background: rgba(56, 189, 248, 0.15);
          border-color: rgba(56, 189, 248, 0.4);
          color: #38bdf8;
        }

        .meal-timeline-section {
          margin-top: 2rem;
        }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.25rem;
        }
        .section-title {
          font-size: 1.25rem;
        }
        .quick-add-form-card {
          margin-bottom: 1.5rem;
          animation: slideDown 0.3s ease-out;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .quick-add-title {
          font-size: 1rem;
          margin-bottom: 1rem;
        }
        .quick-add-form .form-row-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 1rem;
        }
        .quick-add-form .form-row-four-cols {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr 1fr;
          gap: 1rem;
        }
        .quick-add-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          margin-top: 0.5rem;
        }

        .timeline-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 1.25rem;
        }
        .timeline-card {
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          min-height: 200px;
        }
        .timeline-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 1px solid var(--border-glass);
          padding-bottom: 0.75rem;
          margin-bottom: 0.75rem;
        }
        .type-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .type-icon-box {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-secondary);
        }
        .type-name {
          font-size: 0.95rem;
          font-weight: 600;
        }
        .type-desc {
          font-size: 0.7rem;
          color: var(--text-muted);
        }
        .type-calorie-badge {
          background: rgba(249, 115, 22, 0.1);
          color: var(--color-primary);
          padding: 0.2rem 0.5rem;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          font-family: var(--font-heading);
        }
        .logged-meals-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          flex: 1;
        }
        .empty-meal-slot {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
          color: var(--text-muted);
          border: 1px dashed rgba(255, 255, 255, 0.04);
          border-radius: 8px;
          min-height: 80px;
        }
        .meal-item-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.6rem;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.04);
          position: relative;
          group-hover: show-delete;
        }
        .meal-thumbnail-wrapper {
          width: 40px;
          height: 40px;
          border-radius: 6px;
          overflow: hidden;
          background: #1e293b;
        }
        .meal-thumbnail-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .meal-thumbnail-placeholder {
          width: 40px;
          height: 40px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.05);
          font-size: 1.2rem;
        }
        .meal-details {
          flex: 1;
          min-width: 0;
        }
        .meal-title-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 0.15rem;
        }
        .meal-name-text {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .meal-kcal-text {
          font-family: var(--font-heading);
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-primary);
          flex-shrink: 0;
        }
        .meal-macros-text {
          font-size: 0.7rem;
          color: var(--text-secondary);
        }
        .delete-meal-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          opacity: 0.4;
          transition: all 0.2s ease;
        }
        .meal-item-row:hover .delete-meal-btn {
          opacity: 1;
        }
        .meal-item-actions {
          display: flex;
          gap: 0.25rem;
          align-items: center;
        }
        .edit-meal-btn, .delete-meal-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 6px;
          border-radius: 6px;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        @media (min-width: 769px) {
          .edit-meal-btn, .delete-meal-btn {
            opacity: 0.3;
          }
          .meal-item-row:hover .edit-meal-btn,
          .meal-item-row:hover .delete-meal-btn {
            opacity: 1;
          }
        }
        @media (max-width: 768px) {
          .edit-meal-btn, .delete-meal-btn {
            opacity: 0.8;
          }
        }
        .edit-meal-btn:hover {
          color: var(--color-info);
          background: rgba(99, 102, 241, 0.08);
        }
        .delete-meal-btn:hover {
          color: var(--color-danger);
          background: rgba(239, 68, 68, 0.08);
        }

        /* Modal Overlay & Card styling */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.65);
          backdrop-filter: blur(5px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          padding: 1rem;
        }
        .modal-card {
          width: 100%;
          max-width: 440px;
          padding: 1.5rem;
          border-radius: var(--border-radius-md);
          box-shadow: 0 20px 45px rgba(0, 0, 0, 0.4);
          background: rgba(26, 26, 36, 0.85);
          border: 1px solid var(--border-glass);
          backdrop-filter: blur(20px);
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.25rem;
          border-bottom: 1px solid var(--border-glass);
          padding-bottom: 0.75rem;
        }
        .modal-header h4 {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--text-primary);
        }
        .close-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
        }
        .modal-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .modal-form .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        .modal-form .form-row-three {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 0.75rem;
        }
        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          margin-top: 0.5rem;
        }

        @media (max-width: 768px) {
          .glass-card {
            padding: 0.85rem;
          }
          .circular-progress-card {
            flex-direction: row !important;
            flex-wrap: wrap;
            align-items: center;
            justify-content: space-around;
            padding: 0.85rem;
            gap: 0.5rem;
          }
          .circular-progress-card .card-title {
            width: 100%;
            margin-bottom: 0.5rem;
          }
          .circle-chart-container {
            width: 110px;
            height: 110px;
            margin: 0.25rem 0;
            flex-shrink: 0;
          }
          .circle-calories-num {
            font-size: 1.4rem;
          }
          .circle-calories-label {
            font-size: 0.65rem;
            margin: 0.1rem 0;
          }
          .circle-calories-target {
            font-size: 0.55rem;
          }
          .calorie-summary-footer {
            flex-direction: column;
            border-top: none;
            padding-top: 0;
            margin-top: 0;
            width: auto;
            flex: 1;
            align-items: flex-start;
            padding-left: 0.75rem;
            gap: 0.4rem;
          }
          .summary-col {
            text-align: left;
            display: flex;
            align-items: baseline;
            gap: 0.35rem;
          }
          .sub-val {
            font-size: 0.95rem;
          }
          .sub-label {
            font-size: 0.65rem;
            margin-top: 0;
            color: var(--text-muted);
          }
          .summary-divider {
            display: none;
          }
          .edit-meal-btn, .delete-meal-btn {
            padding: 8px;
            opacity: 0.85;
          }
          .stats-banner-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 0.4rem;
            margin-bottom: 1rem;
          }
          .stat-mini-card {
            padding: 0.5rem 0.25rem;
            flex-direction: column;
            gap: 0.2rem;
            text-align: center;
            align-items: center;
          }
          .stat-icon-wrapper {
            width: 30px;
            height: 30px;
            border-radius: 8px;
          }
          .stat-icon-wrapper svg {
            width: 14px;
            height: 14px;
          }
          .stat-label {
            font-size: 0.6rem;
            white-space: nowrap;
          }
          .stat-val {
            font-size: 0.9rem;
            font-weight: 700;
          }
          .stat-unit {
            display: none;
          }
          .type-desc {
            display: none;
          }
          .type-info {
            gap: 0.4rem;
          }
          .empty-meal-slot {
            min-height: 45px;
            font-size: 0.7rem;
          }
          .quick-add-form .form-row-grid,
          .quick-add-form .form-row-four-cols {
            grid-template-columns: 1fr;
            gap: 0.5rem;
          }
        }

        .date-navigator-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1.25rem;
          margin-bottom: 1.25rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-glass);
          border-radius: var(--border-radius-md);
        }
        .date-display-box {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
        }
        .calendar-decor-icon {
          color: var(--color-info);
        }
        .date-display-text {
          font-family: var(--font-heading);
          font-weight: 700;
          font-size: 1rem;
          color: var(--text-primary);
        }
        .date-nav-arrow-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-glass);
          color: var(--text-primary);
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .date-nav-arrow-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: var(--color-info);
          transform: scale(1.05);
        }
        .date-nav-controls {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .date-today-btn {
          font-size: 0.75rem;
          padding: 0.35rem 0.75rem;
        }

        .ai-text-estimator-block {
          background: rgba(99, 102, 241, 0.04);
          border: 1px dashed rgba(99, 102, 241, 0.2);
          border-radius: 12px;
          padding: 1rem;
          margin-bottom: 1rem;
        }
        .input-label-with-badge {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.5rem;
        }
        .label-text {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-primary);
        }
        .badge-purple {
          background: linear-gradient(135deg, #818cf8 0%, #4f46e5 100%);
          color: white;
          font-size: 0.65rem;
          padding: 0.15rem 0.45rem;
          border-radius: 6px;
          font-weight: 600;
          box-shadow: 0 2px 6px rgba(99, 102, 241, 0.25);
        }
        .ai-textarea-wrapper {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          position: relative;
        }
        .ai-textarea {
          min-height: 60px;
          font-size: 0.8rem;
          padding: 0.6rem;
          resize: vertical;
        }
        .ai-estimate-button {
          align-self: flex-end;
          padding: 0.4rem 1rem !important;
          font-size: 0.78rem;
        }
        .ai-error-msg {
          font-size: 0.72rem;
          color: var(--color-danger);
          margin-top: 0.25rem;
          display: block;
        }
        .food-converter-block {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-glass);
          border-radius: 12px;
          padding: 1rem;
          margin-bottom: 1rem;
        }
        .form-row-grid2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
        }

        @media (max-width: 768px) {
          .date-navigator-card {
            padding: 0.5rem 0.75rem;
            margin-bottom: 0.75rem;
            border-radius: 12px;
          }
          .date-display-text {
            font-size: 0.85rem;
          }
          .date-nav-arrow-btn {
            width: 30px;
            height: 30px;
          }
          .date-nav-arrow-btn svg {
            width: 16px;
            height: 16px;
          }
        }
      `}</style>

      {/* Edit Meal Modal */}
      {editingMeal && (
        <div className="modal-overlay">
          <div className="glass-card modal-card animate-fadeIn">
            <div className="modal-header">
              <h4>修改饮食记录</h4>
              <button className="close-btn" onClick={() => setEditingMeal(null)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              onUpdateMeal(editingMeal);
              setEditingMeal(null);
            }} className="modal-form">
              
              {/* Edit Portion Calculator Block */}
              <div className="food-converter-block" style={{ padding: '0.75rem', marginBottom: '0.5rem' }}>
                <div className="form-row-grid" style={{ gridTemplateColumns: editingMeal.selectedFood ? '1.5fr 1fr 1fr' : '1fr', gap: '0.5rem' }}>
                  <div className="form-group">
                    <label>常见食物微调</label>
                    <select
                      className="form-input"
                      value={editingMeal.selectedFood || ''}
                      onChange={handleEditFoodChange}
                    >
                      <option value="">-- 手动修改或自定义 --</option>
                      {COMMON_FOODS.map(f => (
                        <option key={f.name} value={f.name}>{f.name}</option>
                      ))}
                    </select>
                  </div>
                  {editingMeal.selectedFood && (
                    <>
                      <div className="form-group">
                        <label>数量</label>
                        <input
                          type="number"
                          step="0.1"
                          className="form-input"
                          value={editingMeal.quantity || '1'}
                          onChange={e => handleEditPortionOrQtyChange(e.target.value, editingMeal.portionIndex || '0')}
                          placeholder="1"
                        />
                      </div>
                      <div className="form-group">
                        <label>单位</label>
                        <select
                          className="form-input"
                          value={editingMeal.portionIndex || '0'}
                          onChange={e => handleEditPortionOrQtyChange(editingMeal.quantity || '1', e.target.value)}
                        >
                          {COMMON_FOODS.find(f => f.name === editingMeal.selectedFood)?.portions.map((p, idx) => (
                            <option key={idx} value={idx}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>餐食名称</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={editingMeal.name}
                  onChange={e => setEditingMeal({ ...editingMeal, name: e.target.value })}
                  required 
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>分类</label>
                  <select 
                    className="form-input"
                    value={editingMeal.type}
                    onChange={e => setEditingMeal({ ...editingMeal, type: e.target.value })}
                  >
                    <option value="Breakfast">早餐</option>
                    <option value="Lunch">午餐</option>
                    <option value="Dinner">晚餐</option>
                    <option value="Snack">加餐</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>卡路里 (kcal)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={editingMeal.calories}
                    onChange={e => setEditingMeal({ ...editingMeal, calories: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>
              <div className="form-row-three">
                <div className="form-group">
                  <label>蛋白质 (g)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={editingMeal.protein || 0}
                    onChange={e => setEditingMeal({ ...editingMeal, protein: Number(e.target.value) })}
                  />
                </div>
                <div className="form-group">
                  <label>碳水 (g)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={editingMeal.carbs || 0}
                    onChange={e => setEditingMeal({ ...editingMeal, carbs: Number(e.target.value) })}
                  />
                </div>
                <div className="form-group">
                  <label>脂肪 (g)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={editingMeal.fat || 0}
                    onChange={e => setEditingMeal({ ...editingMeal, fat: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingMeal(null)}>取消</button>
                <button type="submit" className="btn btn-primary">保存修改</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
