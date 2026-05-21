import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Flame, TrendingDown, Target, Droplet, Coffee, Utensils, Moon, Carrot, X } from 'lucide-react';

export default function Dashboard({ 
  meals, 
  onDeleteMeal, 
  onUpdateMeal,
  onAddManualMeal,
  tdee = 2200, 
  targetDeficit = 500, 
  waterIntake = 0,
  onUpdateWater
}) {
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [editingMeal, setEditingMeal] = useState(null);
  const [quickMeal, setQuickMeal] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '', type: 'Lunch' });

  // Calculate targets
  const targetIntake = Math.max(1200, tdee - targetDeficit);
  
  // Calculate current totals
  const totalCalories = meals.reduce((sum, m) => sum + Number(m.calories || 0), 0);
  const totalProtein = meals.reduce((sum, m) => sum + Number(m.protein || 0), 0);
  const totalCarbs = meals.reduce((sum, m) => sum + Number(m.carbs || 0), 0);
  const totalFat = meals.reduce((sum, m) => sum + Number(m.fat || 0), 0);

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
    setQuickMeal({ name: '', calories: '', protein: '', carbs: '', fat: '', type: 'Lunch' });
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
          <h2 className="section-title">今日饮食打卡</h2>
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
            const loggedMeals = meals.filter(m => m.type === type.key);
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
                            onClick={() => setEditingMeal(meal)}
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
