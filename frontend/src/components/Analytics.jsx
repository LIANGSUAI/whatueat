import React, { useState } from 'react';
import { Calendar, TrendingUp, Award, Activity, Circle, ChevronDown } from 'lucide-react';

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function Analytics({ meals: initialMeals = [], weightLogs: initialWeightLogs = [], userProfile: initialUserProfile = {}, waterLogs: initialWaterLogs = {} }) {
  const [timeframe, setTimeframe] = useState('7days');
  const [expandedDay, setExpandedDay] = useState(null);

  const handleToggleDay = (dateStr) => {
    setExpandedDay(expandedDay === dateStr ? null : dateStr);
  };

  const meals = Array.isArray(initialMeals) ? initialMeals : [];
  const weightLogs = Array.isArray(initialWeightLogs) ? initialWeightLogs : [];
  const userProfile = initialUserProfile || {};
  const waterLogs = initialWaterLogs || {};

  // If there is no meals and no weight logs, display empty state
  if (meals.length === 0 && weightLogs.length === 0) {
    return (
      <div className="analytics-empty-state glass-card animate-fadeIn">
        <div className="empty-state-icon">📊</div>
        <h3 className="empty-state-title">暂无趋势分析数据</h3>
        <p className="empty-state-desc">记录您的第一餐饮食或体重后，趋势分析功能将自动开启，为您展示卡路里与体重趋势曲线！</p>
        <style>{`
          .analytics-empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 4rem 2rem;
            margin: 1.5rem auto;
            max-width: 600px;
            min-height: 350px;
            border-radius: var(--border-radius-lg);
            border: 1px solid var(--border-glass);
            background: rgba(255, 255, 255, 0.03);
            backdrop-filter: blur(10px);
          }
          .empty-state-icon {
            font-size: 3.5rem;
            margin-bottom: 1.5rem;
            animation: float-empty 3s ease-in-out infinite;
          }
          .empty-state-title {
            font-size: 1.4rem;
            font-weight: 700;
            margin-bottom: 0.75rem;
            color: var(--text-primary);
          }
          .empty-state-desc {
            font-size: 0.85rem;
            color: var(--text-secondary);
            max-width: 400px;
            line-height: 1.6;
          }
          @keyframes float-empty {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-8px); }
            100% { transform: translateY(0px); }
          }
        `}</style>
      </div>
    );
  }

  // Generate real 7 days list dynamically
  const getPast7Days = () => {
    const list = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const fullDateStr = getLocalDateString(d);
      const dateStr = d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }).replace('/', '-'); // e.g. "05-21"
      
      let dayName = '';
      if (i === 0) dayName = '今天';
      else if (i === 1) dayName = '昨天';
      else {
        dayName = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
      }

      list.push({
        fullDate: fullDateStr,
        date: dateStr,
        dayName: dayName,
        intake: 0,
        tdee: Number(userProfile?.tdee || 2200),
        deficit: Number(userProfile?.tdee || 2200), // default to tdee
        weight: Number(userProfile?.weight || 70.0),
        water: 0
      });
    }
    return list;
  };

  const activeData = getPast7Days();

  // Calculate current totals and merge today's current meals for calculations
  const todayCalories = meals.reduce((sum, m) => sum + Number(m.calories || 0), 0);
  const todayProtein = meals.reduce((sum, m) => sum + Number(m.protein || 0), 0);
  const todayCarbs = meals.reduce((sum, m) => sum + Number(m.carbs || 0), 0);
  const todayFat = meals.reduce((sum, m) => sum + Number(m.fat || 0), 0);

  // Populate active data with meals
  meals.forEach(m => {
    if (!m || typeof m.timestamp !== 'string') return;
    const mDateStr = m.timestamp.split('T')[0];
    const dayData = activeData.find(d => d.fullDate === mDateStr);
    if (dayData) {
      dayData.intake += Number(m.calories || 0);
    }
  });

  // Recalculate deficit
  activeData.forEach(d => {
    d.deficit = d.tdee - d.intake;
  });

  // Populate active data with water logs
  activeData.forEach(d => {
    if (waterLogs && waterLogs[d.fullDate]) {
      d.water = Number(waterLogs[d.fullDate]);
    }
  });

  // Populate active data with weight logs
  activeData.forEach(d => {
    // Find log for this day
    const wLog = weightLogs.find(w => {
      if (w && typeof w.timestamp === 'string') {
        return w.timestamp.split('T')[0] === d.fullDate;
      }
      return w && w.date === d.date;
    });
    if (wLog) {
      d.weight = Number(wLog.weight);
    } else {
      // Find the closest weight log in the past, or fall back to userProfile.weight
      const earlierLogs = weightLogs.filter(w => {
        return w && w.timestamp && new Date(w.timestamp) <= new Date(d.fullDate + 'T23:59:59');
      });
      if (earlierLogs.length > 0) {
        earlierLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        d.weight = Number(earlierLogs[0].weight);
      } else {
        d.weight = Number(userProfile?.weight || 70.0);
      }
    }
  });

  // Only calculate deficit for days that have actual logged meals
  const daysWithMeals = activeData.filter(d => d.intake > 0);
  const hasMeals = meals.length > 0 && daysWithMeals.length > 0;

  const avgDeficitVal = hasMeals
    ? Math.round(daysWithMeals.reduce((sum, d) => sum + d.deficit, 0) / daysWithMeals.length)
    : null;

  const totalActualDeficit = daysWithMeals.reduce((sum, d) => sum + d.deficit, 0);
  const projectedLossVal = hasMeals
    ? ((totalActualDeficit / 7700) * 1000).toFixed(1)
    : null;

  // Calculate historical macro averages using only actual meals
  const mealsInPast7Days = meals.filter(m => {
    if (!m || !m.timestamp) return false;
    const mDate = new Date(m.timestamp);
    const timeDiff = new Date() - mDate;
    return timeDiff >= 0 && timeDiff <= 7 * 24 * 60 * 60 * 1000;
  });

  const uniqueMealDays = new Set(mealsInPast7Days.map(m => {
    if (!m || !m.timestamp) return '';
    return new Date(m.timestamp).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }).replace('/', '-');
  }));

  const activeDaysCount = Math.max(1, uniqueMealDays.size);

  const avgProtein = hasMeals ? Math.round(mealsInPast7Days.reduce((sum, m) => sum + Number(m.protein || 0), 0) / activeDaysCount) : 0;
  const avgCarbs = hasMeals ? Math.round(mealsInPast7Days.reduce((sum, m) => sum + Number(m.carbs || 0), 0) / activeDaysCount) : 0;
  const avgFat = hasMeals ? Math.round(mealsInPast7Days.reduce((sum, m) => sum + Number(m.fat || 0), 0) / activeDaysCount) : 0;

  const macroTotalKcal = (avgProtein * 4) + (avgCarbs * 4) + (avgFat * 9);
  
  const proteinPct = macroTotalKcal > 0 ? Math.round(((avgProtein * 4) / macroTotalKcal) * 100) : 0;
  const carbsPct = macroTotalKcal > 0 ? Math.round(((avgCarbs * 4) / macroTotalKcal) * 100) : 0;
  const fatPct = macroTotalKcal > 0 ? Math.round(((avgFat * 9) / macroTotalKcal) * 100) : 0;

  // Calculate weekly weight rate dynamically
  let weeklyRateStr = null;
  if (weightLogs.length >= 2) {
    const sortedLogs = [...weightLogs]
      .filter(w => w && w.timestamp)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    if (sortedLogs.length >= 2) {
      const firstLog = sortedLogs[0];
      const lastLog = sortedLogs[sortedLogs.length - 1];
      const weightDiff = lastLog.weight - firstLog.weight;
      const timeDiffMs = new Date(lastLog.timestamp) - new Date(firstLog.timestamp);
      const timeDiffDays = timeDiffMs / (1000 * 60 * 60 * 24);
      if (timeDiffDays > 0.01) {
        const rate = (weightDiff / timeDiffDays) * 7;
        weeklyRateStr = (rate > 0 ? '+' : '') + rate.toFixed(1);
      } else {
        weeklyRateStr = (weightDiff > 0 ? '+' : '') + weightDiff.toFixed(1);
      }
    }
  }

  // SVG Chart Dimensions
  const width = 500;
  const height = 200;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Max value in chart
  const maxCal = Math.max(...activeData.map(d => Math.max(d.intake, d.tdee))) * 1.15;

  // Coordinates calculation
  const getX = (index) => paddingLeft + (index * (chartWidth / (activeData.length - 1)));
  const getY = (val) => height - paddingBottom - ((val / maxCal) * chartHeight);

  // Path generators
  const intakePoints = activeData.map((d, i) => `${getX(i)},${getY(d.intake)}`).join(' ');
  const tdeePoints = activeData.map((d, i) => `${getX(i)},${getY(d.tdee)}`).join(' ');

  // Weight chart calculations
  const weights = activeData.map(d => d.weight);
  const minW = Math.min(...weights) - 0.5;
  const maxW = Math.max(...weights) + 0.5;
  const getWeightY = (w) => height - paddingBottom - (((w - minW) / (maxW - minW)) * chartHeight);
  const weightPoints = activeData.map((d, i) => `${getX(i)},${getWeightY(d.weight)}`).join(' ');

  return (
    <div className="analytics-root">
      {/* Top Banner Summaries */}
      <div className="analytics-summary-grid">
        <div className="glass-card glow-green summary-stat-card">
          <div className="card-top-icon-row">
            <TrendingUp size={18} className="text-success" />
            <span className="summary-card-badge green">{avgDeficitVal !== null ? '极佳' : '无数据'}</span>
          </div>
          <div className="summary-card-title">日均热量缺口</div>
          <div className="summary-card-value text-success">
            {avgDeficitVal !== null ? `${avgDeficitVal} ` : '-- '} 
            {avgDeficitVal !== null && <span className="small-unit">kcal</span>}
          </div>
          <div className="summary-card-subtext">
            {avgDeficitVal !== null ? '基于您过去一周实际记录的餐食热量缺口均值' : '记录饮食后自动计算日均缺口'}
          </div>
        </div>

        <div className="glass-card glow-purple summary-stat-card">
          <div className="card-top-icon-row">
            <Award size={18} className="text-info" />
            <span className="summary-card-badge purple">{projectedLossVal !== null ? '目标' : '无数据'}</span>
          </div>
          <div className="summary-card-title">本周预计减重</div>
          <div className="summary-card-value">
            {projectedLossVal !== null ? `${projectedLossVal} ` : '-- '}
            {projectedLossVal !== null && <span className="small-unit">g</span>}
          </div>
          <div className="summary-card-subtext">
            {projectedLossVal !== null ? '基于热量赤字理论估算的真实脂肪流失量' : '需要有饮食记录以估算减重量'}
          </div>
        </div>

        <div className="glass-card glow-orange summary-stat-card">
          <div className="card-top-icon-row">
            <Activity size={18} className="text-primary" />
            <span className="summary-card-badge orange">{weeklyRateStr !== null ? '真实' : '无数据'}</span>
          </div>
          <div className="summary-card-title">体重下降速率</div>
          <div className="summary-card-value">
            {weeklyRateStr !== null ? `${weeklyRateStr} ` : '-- '}
            {weeklyRateStr !== null && <span className="small-unit">kg / 周</span>}
          </div>
          <div className="summary-card-subtext">
            {weeklyRateStr !== null ? '基于您的体重变化趋势计算的周变化速度' : '在设置中记录至少2次体重后显示速度'}
          </div>
        </div>
      </div>

      <div className="analytics-charts-grid">
        {/* Calorie Trend Chart */}
        <div className="glass-card chart-container-card" style={{ position: 'relative' }}>
          <div className="chart-header-row">
            <h3 className="chart-title">卡路里平衡趋势 (7天)</h3>
            {hasMeals && (
              <div className="chart-legend">
                <span className="legend-item"><Circle size={8} fill="var(--color-primary)" stroke="none" /> 摄入卡路里</span>
                <span className="legend-item"><Circle size={8} fill="var(--color-success)" stroke="none" /> TDEE 代谢</span>
              </div>
            )}
          </div>

          {!hasMeals ? (
            <div className="chart-placeholder-overlay">
              <div className="placeholder-icon">🥗</div>
              <p className="placeholder-text">暂无饮食记录，请在首页或AI拍照记录后再来查看趋势分析</p>
            </div>
          ) : (
            <div className="svg-wrapper">
              <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%">
                {/* Horizontal Grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => {
                  const val = Math.round(maxCal * p);
                  const y = getY(val);
                  return (
                    <g key={idx}>
                      <line 
                        x1={paddingLeft} 
                        y1={y} 
                        x2={width - paddingRight} 
                        y2={y} 
                        stroke="rgba(255, 255, 255, 0.05)" 
                        strokeDasharray="4 4" 
                      />
                      <text 
                        x={paddingLeft - 8} 
                        y={y + 4} 
                        fill="var(--text-muted)" 
                        fontSize="9" 
                        textAnchor="end"
                      >
                        {val}
                      </text>
                    </g>
                  );
                })}

                {/* Vertical grids & Dates */}
                {activeData.map((d, i) => {
                  const x = getX(i);
                  return (
                    <g key={i}>
                      <line 
                        x1={x} 
                        y1={paddingTop} 
                        x2={x} 
                        y2={height - paddingBottom} 
                        stroke="rgba(255, 255, 255, 0.03)" 
                      />
                      <text 
                        x={x} 
                        y={height - paddingBottom + 16} 
                        fill="var(--text-secondary)" 
                        fontSize="9" 
                        textAnchor="middle"
                      >
                        {d.date}
                      </text>
                    </g>
                  );
                })}

                {/* Deficit shaded area */}
                <polygon
                  points={`
                    ${getX(0)},${getY(activeData[0].tdee)}
                    ${activeData.map((d, i) => `${getX(i)},${getY(d.intake)}`).join(' ')}
                    ${getX(activeData.length - 1)},${getY(activeData[activeData.length - 1].tdee)}
                    ${[...activeData].reverse().map((d, i) => `${getX(activeData.length - 1 - i)},${getY(d.tdee)}`).join(' ')}
                  `}
                  fill="rgba(16, 185, 129, 0.08)"
                />

                {/* Line Intake */}
                <polyline
                  fill="none"
                  stroke="var(--color-primary)"
                  strokeWidth="3"
                  points={intakePoints}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Line TDEE */}
                <polyline
                  fill="none"
                  stroke="var(--color-success)"
                  strokeWidth="2.5"
                  points={tdeePoints}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="3 3"
                />

                {/* Dots for Intake */}
                {activeData.map((d, i) => (
                  <circle
                    key={i}
                    cx={getX(i)}
                    cy={getY(d.intake)}
                    r="4"
                    fill="#090d16"
                    stroke="var(--color-primary)"
                    strokeWidth="2"
                  />
                ))}
              </svg>
            </div>
          )}
        </div>

        {/* Weight Trend Chart */}
        <div className="glass-card chart-container-card" style={{ position: 'relative' }}>
          <div className="chart-header-row">
            <h3 className="chart-title">体重变化曲线 (7天)</h3>
            {weightLogs.length >= 2 && (
              <div className="chart-legend">
                <span className="legend-item"><Circle size={8} fill="var(--color-info)" stroke="none" /> 体重 (kg)</span>
              </div>
            )}
          </div>

          {weightLogs.length < 2 ? (
            <div className="chart-placeholder-overlay">
              <div className="placeholder-icon">⚖️</div>
              <p className="placeholder-text">至少记录2次体重后显示变化曲线（请在设置中记录体重）</p>
            </div>
          ) : (
            <div className="svg-wrapper">
              <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%">
                {/* Horizontal Grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => {
                  const val = (minW + (maxW - minW) * p).toFixed(1);
                  const y = height - paddingBottom - (p * chartHeight);
                  return (
                    <g key={idx}>
                      <line 
                        x1={paddingLeft} 
                        y1={y} 
                        x2={width - paddingRight} 
                        y2={y} 
                        stroke="rgba(255, 255, 255, 0.05)" 
                        strokeDasharray="4 4" 
                      />
                      <text 
                        x={paddingLeft - 8} 
                        y={y + 4} 
                        fill="var(--text-muted)" 
                        fontSize="9" 
                        textAnchor="end"
                      >
                        {val}
                      </text>
                    </g>
                  );
                })}

                {/* Dates */}
                {activeData.map((d, i) => {
                  const x = getX(i);
                  return (
                    <g key={i}>
                      <text 
                        x={x} 
                        y={height - paddingBottom + 16} 
                        fill="var(--text-secondary)" 
                        fontSize="9" 
                        textAnchor="middle"
                      >
                        {d.date}
                      </text>
                    </g>
                  );
                })}

                {/* Shaded area under weight */}
                <polygon
                  points={`
                    ${getX(0)},${height - paddingBottom}
                    ${weightPoints}
                    ${getX(activeData.length - 1)},${height - paddingBottom}
                  `}
                  fill="rgba(99, 102, 241, 0.04)"
                />

                {/* Line weight */}
                <polyline
                  fill="none"
                  stroke="var(--color-info)"
                  strokeWidth="3"
                  points={weightPoints}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Dots for weight */}
                {activeData.map((d, i) => (
                  <circle
                    key={i}
                    cx={getX(i)}
                    cy={getWeightY(d.weight)}
                    r="4"
                    fill="#090d16"
                    stroke="var(--color-info)"
                    strokeWidth="2"
                  />
                ))}
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Macro Ratio Chart */}
      <div className="glass-card macro-ratio-card" style={{ position: 'relative' }}>
        <h3 className="chart-title">膳食宏量营养素比例分析 (近7天均值)</h3>
        
        {!hasMeals ? (
          <div className="chart-placeholder-overlay" style={{ minHeight: '180px' }}>
            <div className="placeholder-icon">🍎</div>
            <p className="placeholder-text">暂无饮食记录，无法生成三大营养素比例分析</p>
          </div>
        ) : (
          <div className="macro-ratio-layout">
            {/* Left Pie details */}
            <div className="macro-pie-left">
              <div className="pie-visual-container">
                {/* Circular Bar Chart using SVG */}
                <svg width="150" height="150" viewBox="0 0 36 36" className="circular-donut">
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="3" />
                  
                  {/* Carbs Arc (Yellow) */}
                  <circle 
                    cx="18" 
                    cy="18" 
                    r="15.915" 
                    fill="none" 
                    stroke="var(--color-warning)" 
                    strokeWidth="3.5" 
                    strokeDasharray={`${carbsPct} ${100 - carbsPct}`} 
                    strokeDashoffset="25" 
                  />
                  
                  {/* Protein Arc (Purple) */}
                  <circle 
                    cx="18" 
                    cy="18" 
                    r="15.915" 
                    fill="none" 
                    stroke="var(--color-info)" 
                    strokeWidth="3.5" 
                    strokeDasharray={`${proteinPct} ${100 - proteinPct}`} 
                    strokeDashoffset={`${125 - carbsPct}`} 
                  />

                  {/* Fat Arc (Pink) */}
                  <circle 
                    cx="18" 
                    cy="18" 
                    r="15.915" 
                    fill="none" 
                    stroke="var(--color-danger)" 
                    strokeWidth="3.5" 
                    strokeDasharray={`${fatPct} ${100 - fatPct}`} 
                    strokeDashoffset={`${125 - carbsPct - proteinPct}`} 
                  />
                </svg>
                <div className="donut-center-text">
                  <div className="donut-kcal-num">{macroTotalKcal}</div>
                  <div className="donut-kcal-lbl">日均 Kcal</div>
                </div>
              </div>
            </div>

            {/* Right Macro bars */}
            <div className="macro-pie-right">
              <div className="analytics-macro-stat-row">
                <span className="color-indicator yellow-bg"></span>
                <div className="macro-stat-details">
                  <div className="lbl-row">
                    <span className="lbl-title">碳水化合物 (Carbs)</span>
                    <span className="lbl-pct">{carbsPct}%</span>
                  </div>
                  <div className="val-desc">日均摄入 {avgCarbs}g · 提供 {avgCarbs * 4} kcal</div>
                </div>
              </div>

              <div className="analytics-macro-stat-row">
                <span className="color-indicator purple-bg"></span>
                <div className="macro-stat-details">
                  <div className="lbl-row">
                    <span className="lbl-title">蛋白质 (Protein)</span>
                    <span className="lbl-pct">{proteinPct}%</span>
                  </div>
                  <div className="val-desc">日均摄入 {avgProtein}g · 提供 {avgProtein * 4} kcal</div>
                </div>
              </div>

              <div className="analytics-macro-stat-row">
                <span className="color-indicator danger-bg"></span>
                <div className="macro-stat-details">
                  <div className="lbl-row">
                    <span className="lbl-title">脂肪 (Fat)</span>
                    <span className="lbl-pct">{fatPct}%</span>
                  </div>
                  <div className="val-desc">日均摄入 {avgFat}g · 提供 {avgFat * 9} kcal</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Daily History Detail Accordion */}
      <div className="glass-card daily-history-section">
        <div className="section-title-row">
          <Calendar size={18} className="text-primary" />
          <h3>每日历史明细 (近7天)</h3>
        </div>
        
        <div className="daily-history-list">
          {activeData.map((d, index) => {
            const dayMeals = meals.filter(m => m && typeof m.timestamp === 'string' && m.timestamp.split('T')[0] === d.fullDate);
            const isExpanded = expandedDay === d.fullDate;
            const isToday = d.fullDate === getLocalDateString(new Date());
            const calorieDiff = d.intake - d.tdee;
            const hasDeficit = calorieDiff <= 0;

            return (
              <div 
                key={d.fullDate} 
                className={`daily-history-item ${isExpanded ? 'expanded' : ''}`}
              >
                <div 
                  className="daily-history-header"
                  onClick={() => handleToggleDay(d.fullDate)}
                >
                  <div className="day-info">
                    <span className="day-date">{d.date}</span>
                    <span className={`day-name ${isToday ? 'today' : ''}`}>
                      {d.dayName}
                    </span>
                  </div>
                  
                  <div className="day-stats-summary">
                    <div className="day-stat-calories">
                      摄入 <span>{d.intake}</span> / {d.tdee} kcal
                    </div>
                    
                    <span className={`day-deficit-badge ${hasDeficit ? 'deficit' : 'surplus'}`}>
                      {hasDeficit 
                        ? `赤字 ${Math.abs(Math.round(calorieDiff))} kcal` 
                        : `超出 ${Math.round(calorieDiff)} kcal`}
                    </span>
                    
                    <div className="day-stat-water">
                      💧 {d.water} ml
                    </div>
                  </div>
                  
                  <ChevronDown size={16} className="day-chevron" />
                </div>
                
                {isExpanded && (
                  <div className="daily-history-content">
                    {dayMeals.length === 0 ? (
                      <div className="empty-day-meals">
                        📭 该日暂无餐食记录
                      </div>
                    ) : (
                      <div className="expanded-meals-list">
                        {dayMeals.map((m, mIdx) => (
                          <div key={m.id || m._id || mIdx} className="expanded-meal-row">
                            <div className="meal-left">
                              {m.image && (
                                <div className="meal-thumb-container">
                                  <img 
                                    src={m.image} 
                                    alt={m.name} 
                                    className="meal-thumb-img" 
                                  />
                                </div>
                              )}
                              <div className="meal-details">
                                <div className="meal-name-row">
                                  <span className="meal-badge-container">
                                    <span className={`meal-badge ${
                                      m.type === 'Breakfast' ? 'meal-badge-breakfast' :
                                      m.type === 'Lunch' ? 'meal-badge-lunch' :
                                      m.type === 'Dinner' ? 'meal-badge-dinner' : 'meal-badge-snack'
                                    }`}>
                                      {m.type === 'Breakfast' ? '早餐' :
                                       m.type === 'Lunch' ? '午餐' :
                                       m.type === 'Dinner' ? '晚餐' : '加餐'}
                                    </span>
                                  </span>
                                  <span className="meal-name">{m.name}</span>
                                </div>
                                <div className="meal-macros">
                                  蛋白质: {m.protein || 0}g | 碳水: {m.carbs || 0}g | 脂肪: {m.fat || 0}g
                                </div>
                              </div>
                            </div>
                            <div className="meal-right">
                              <div className="meal-calories">
                                {m.calories} <span>kcal</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        .analytics-summary-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 1.25rem;
          margin-bottom: 1.5rem;
        }
        .summary-stat-card {
          padding: 1.25rem;
        }
        .card-top-icon-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }
        .summary-card-badge {
          padding: 0.15rem 0.45rem;
          border-radius: 4px;
          font-size: 0.65rem;
          font-weight: 600;
        }
        .summary-card-badge.green { background: rgba(16, 185, 129, 0.12); color: var(--color-success); }
        .summary-card-badge.purple { background: rgba(99, 102, 241, 0.12); color: var(--color-info); }
        .summary-card-badge.orange { background: rgba(249, 115, 22, 0.12); color: var(--color-primary); }

        .summary-card-title {
          font-size: 0.8rem;
          color: var(--text-secondary);
          margin-bottom: 0.25rem;
        }
        .summary-card-value {
          font-family: var(--font-heading);
          font-size: 1.65rem;
          font-weight: 800;
          line-height: 1.2;
          margin-bottom: 0.35rem;
        }
        .small-unit {
          font-size: 0.85rem;
          font-weight: 400;
          color: var(--text-secondary);
        }
        .summary-card-subtext {
          font-size: 0.7rem;
          color: var(--text-muted);
          line-height: 1.4;
        }

        .analytics-charts-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }
        @media (max-width: 900px) {
          .analytics-charts-grid {
            grid-template-columns: 1fr;
          }
          .analytics-summary-grid {
            grid-template-columns: 1fr;
            gap: 0.75rem;
          }
        }

        .chart-container-card {
          padding: 1.25rem;
        }
        .chart-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        .chart-legend {
          display: flex;
          gap: 0.75rem;
          font-size: 0.75rem;
          color: var(--text-secondary);
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }
        .svg-wrapper {
          width: 100%;
          height: 200px;
        }

        .macro-ratio-card {
          padding: 1.5rem;
        }
        .macro-ratio-layout {
          display: grid;
          grid-template-columns: 1.2fr 2fr;
          gap: 2rem;
          margin-top: 1rem;
        }
        @media (max-width: 768px) {
          .macro-ratio-layout {
            grid-template-columns: 1fr;
            gap: 1rem;
          }
          .chart-header-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }
        }

        .macro-pie-left {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .pie-visual-container {
          position: relative;
          width: 150px;
          height: 150px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .circular-donut {
          transform: rotate(-90deg);
        }
        .donut-center-text {
          position: absolute;
          text-align: center;
        }
        .donut-kcal-num {
          font-family: var(--font-heading);
          font-size: 1.5rem;
          font-weight: 800;
          line-height: 1;
        }
        .donut-kcal-lbl {
          font-size: 0.7rem;
          color: var(--text-secondary);
          margin-top: 0.15rem;
        }

        .macro-pie-right {
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 1rem;
        }
        .analytics-macro-stat-row {
          display: flex;
          gap: 0.75rem;
          align-items: flex-start;
        }
        .color-indicator {
          width: 12px;
          height: 12px;
          border-radius: 4px;
          margin-top: 4px;
          flex-shrink: 0;
        }
        .yellow-bg { background-color: var(--color-warning); }
        .purple-bg { background-color: var(--color-info); }
        .danger-bg { background-color: var(--color-danger); }

        .macro-stat-details {
          flex: 1;
        }
        .lbl-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          font-size: 0.85rem;
          font-weight: 600;
        }
        .lbl-pct {
          font-family: var(--font-heading);
          font-size: 0.95rem;
        }
        .val-desc {
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin-top: 0.15rem;
        }
        .chart-placeholder-overlay {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem 1rem;
          min-height: 200px;
          background: rgba(255, 255, 255, 0.02);
          border-radius: var(--border-radius-md);
          text-align: center;
          border: 1px dashed rgba(255, 255, 255, 0.05);
          width: 100%;
        }
        .placeholder-icon {
          font-size: 2.2rem;
          margin-bottom: 0.75rem;
          animation: pulse-placeholder 2s infinite ease-in-out;
        }
        .placeholder-text {
          font-size: 0.8rem;
          color: var(--text-secondary);
          max-width: 320px;
          line-height: 1.5;
        }
        @keyframes pulse-placeholder {
          0% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); opacity: 0.8; }
        }

        /* Daily history accordion styles */
        .daily-history-section {
          margin-top: 1.5rem;
          padding: 1.5rem;
        }
        .section-title-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1.25rem;
        }
        .section-title-row h3 {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0;
        }
        .daily-history-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .daily-history-item {
          border-radius: var(--border-radius-md);
          border: 1px solid var(--border-glass);
          background: rgba(255, 255, 255, 0.02);
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .daily-history-item:hover {
          border-color: rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.04);
        }
        .daily-history-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.25rem;
          cursor: pointer;
          user-select: none;
        }
        .day-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          min-width: 140px;
        }
        .day-date {
          font-family: var(--font-heading);
          font-size: 1rem;
          font-weight: 700;
          color: var(--text-primary);
        }
        .day-name {
          font-size: 0.75rem;
          padding: 0.15rem 0.45rem;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.06);
          color: var(--text-secondary);
        }
        .day-name.today {
          background: rgba(16, 185, 129, 0.15);
          color: var(--color-success);
          font-weight: 600;
        }
        .day-stats-summary {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          flex: 1;
          justify-content: flex-end;
          padding-right: 1.5rem;
        }
        .day-stat-calories {
          font-size: 0.85rem;
          color: var(--text-secondary);
        }
        .day-stat-calories span {
          font-weight: 600;
          color: var(--text-primary);
        }
        .day-deficit-badge {
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.2rem 0.5rem;
          border-radius: var(--border-radius-sm);
        }
        .day-deficit-badge.deficit {
          background: rgba(16, 185, 129, 0.12);
          color: var(--color-success);
          border: 1px solid rgba(16, 185, 129, 0.2);
        }
        .day-deficit-badge.surplus {
          background: rgba(239, 68, 68, 0.12);
          color: var(--color-danger);
          border: 1px solid rgba(239, 68, 68, 0.2);
        }
        .day-stat-water {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.85rem;
          color: var(--text-secondary);
        }
        .day-chevron {
          transition: transform 0.3s ease;
          color: var(--text-muted);
        }
        .daily-history-item.expanded .day-chevron {
          transform: rotate(180deg);
          color: var(--text-primary);
        }
        .daily-history-content {
          border-top: 1px solid rgba(255, 255, 255, 0.04);
          padding: 1.25rem;
          background: rgba(0, 0, 0, 0.1);
        }
        .expanded-meals-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .expanded-meal-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          border-radius: var(--border-radius-sm);
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid rgba(255, 255, 255, 0.03);
          transition: all 0.2s ease;
        }
        .expanded-meal-row:hover {
          background: rgba(255, 255, 255, 0.02);
          border-color: rgba(255, 255, 255, 0.05);
        }
        .meal-left {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .meal-thumb-container {
          width: 42px;
          height: 42px;
          border-radius: var(--border-radius-sm);
          overflow: hidden;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .meal-thumb-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.2s ease;
        }
        .meal-thumb-img:hover {
          transform: scale(1.15);
        }
        .meal-details {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .meal-name-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .meal-name {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text-primary);
        }
        .meal-badge {
          font-size: 0.65rem;
          padding: 0.1rem 0.35rem;
          border-radius: 4px;
          font-weight: 600;
        }
        .meal-badge-breakfast { background: rgba(249, 115, 22, 0.12); color: var(--color-primary); }
        .meal-badge-lunch { background: rgba(16, 185, 129, 0.12); color: var(--color-success); }
        .meal-badge-dinner { background: rgba(99, 102, 241, 0.12); color: var(--color-info); }
        .meal-badge-snack { background: rgba(168, 85, 247, 0.12); color: #a855f7; }

        .meal-macros {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .meal-right {
          text-align: right;
        }
        .meal-calories {
          font-family: var(--font-heading);
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--text-primary);
        }
        .meal-calories span {
          font-size: 0.75rem;
          font-weight: 400;
          color: var(--text-secondary);
        }
        .empty-day-meals {
          text-align: center;
          padding: 1.5rem 0;
          color: var(--text-muted);
          font-size: 0.8rem;
        }

        /* Mobile adaptation for daily history */
        @media (max-width: 768px) {
          .day-stats-summary {
            flex-wrap: wrap;
            gap: 0.5rem;
            padding-right: 0.5rem;
            justify-content: flex-start;
          }
          .daily-history-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
            position: relative;
          }
          .day-chevron {
            position: absolute;
            right: 1.25rem;
            top: 1.25rem;
          }
          .expanded-meal-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
          }
          .meal-right {
            text-align: left;
            width: 100%;
            border-top: 1px dashed rgba(255,255,255,0.03);
            padding-top: 0.5rem;
          }
        }
      `}</style>
    </div>
  );
}
