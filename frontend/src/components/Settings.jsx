import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Key, Server, User, UserPlus, LogOut, CheckCircle, Scale } from 'lucide-react';
import { APP_CONFIG } from '../config';

export default function Settings({ 
  userProfile, 
  onSaveProfile, 
  apiSettings, 
  onSaveApiSettings,
  onAddWeightLog
}) {
  // Profile state
  const [profile, setProfile] = useState({
    gender: 'male',
    age: 25,
    height: 175,
    weight: 70,
    activity: 1.375,
    tdee: 2100,
    deficit: 500
  });

  // Weight logger state
  const [todayWeight, setTodayWeight] = useState('');

  // API settings state
  const [api, setApi] = useState({
    mode: APP_CONFIG.mode,
    provider: APP_CONFIG.localAiProvider,
    apiKey: APP_CONFIG.localAiApiKey,
    proxyUrl: APP_CONFIG.localAiProxyUrl,
    serverUrl: APP_CONFIG.serverUrl,
    username: '',
    password: '',
    token: '',
    isLoggedIn: false
  });

  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [authMsg, setAuthMsg] = useState('');
  const [authSuccess, setAuthSuccess] = useState(false);

  useEffect(() => {
    if (userProfile) setProfile(userProfile);
  }, [userProfile]);

  useEffect(() => {
    if (apiSettings) setApi(apiSettings);
  }, [apiSettings]);

  // TDEE calculator (Mifflin-St Jeor Equation)
  const calculateTDEE = (gender, w, h, a, act) => {
    let bmr = 0;
    if (gender === 'male') {
      bmr = 10 * w + 6.25 * h - 5 * a + 5;
    } else {
      bmr = 10 * w + 6.25 * h - 5 * a - 161;
    }
    return Math.round(bmr * act);
  };

  const calculatedTdee = calculateTDEE(
    profile.gender,
    Number(profile.weight),
    Number(profile.height),
    Number(profile.age),
    Number(profile.activity)
  );

  const handleProfileChange = (field, val) => {
    const updated = { ...profile, [field]: val };
    setProfile(updated);
  };

  const handleUseCalculatedTdee = () => {
    setProfile(prev => ({
      ...prev,
      tdee: calculatedTdee
    }));
  };

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    onSaveProfile(profile);
  };

  const handleApiSubmit = (e) => {
    e.preventDefault();
    onSaveApiSettings(api);
  };

  const handleWeightSubmit = (e) => {
    e.preventDefault();
    if (!todayWeight) return;
    onAddWeightLog(Number(todayWeight));
    handleProfileChange('weight', Number(todayWeight));
    setTodayWeight('');
    alert('体重记录已更新！已经为您同步更新个人档案。');
  };

  // Cloud Auth (Register / Login)
  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthMsg('');
    setAuthSuccess(false);
    
    try {
      const endpoint = authMode === 'register' ? '/api/meals/register' : '/api/meals/login';
      const response = await fetch(`${api.serverUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: api.username, password: api.password })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '操作失败');
      }

      const data = await response.json();
      
      const updatedApi = {
        ...api,
        token: data.token,
        isLoggedIn: true
      };
      
      setApi(updatedApi);
      onSaveApiSettings(updatedApi);
      setAuthSuccess(true);
      setAuthMsg(authMode === 'register' ? '注册成功并已登录！' : '登录成功！已成功连接阿里云数据库。');
    } catch (err) {
      setAuthMsg(`错误: ${err.message}`);
    }
  };

  const handleLogout = () => {
    const updatedApi = {
      ...api,
      token: '',
      isLoggedIn: false
    };
    setApi(updatedApi);
    onSaveApiSettings(updatedApi);
    setAuthMsg('已退出登录，切换回 LocalStorage 本地存储。');
  };

  return (
    <div className="settings-root">
      <div className="settings-grid">
        
        {/* Profile Card & TDEE Calculator */}
        <div className="glass-card profile-card">
          <h3 className="card-title flex-items">
            <User size={20} className="text-info" />
            <span>个人档案与代谢计算器 (TDEE)</span>
          </h3>

          <form onSubmit={handleProfileSubmit} className="profile-form">
            <div className="form-row-two-cols">
              <div className="form-group">
                <label>性别</label>
                <select 
                  className="form-input"
                  value={profile.gender}
                  onChange={e => handleProfileChange('gender', e.target.value)}
                >
                  <option value="male">男性 (Male)</option>
                  <option value="female">女性 (Female)</option>
                </select>
              </div>
              <div className="form-group">
                <label>年龄</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={profile.age} 
                  onChange={e => handleProfileChange('age', e.target.value)}
                  min="1" 
                  max="120"
                />
              </div>
            </div>

            <div className="form-row-two-cols">
              <div className="form-group">
                <label>身高 (cm)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={profile.height} 
                  onChange={e => handleProfileChange('height', e.target.value)}
                  min="50" 
                  max="250"
                />
              </div>
              <div className="form-group">
                <label>体重 (kg)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={profile.weight} 
                  onChange={e => handleProfileChange('weight', e.target.value)}
                  min="20" 
                  max="300"
                />
              </div>
            </div>

            <div className="form-group">
              <label>日常身体活动水平</label>
              <select 
                className="form-input"
                value={profile.activity}
                onChange={e => handleProfileChange('activity', e.target.value)}
              >
                <option value="1.2">无运动 (久坐办公室) - BMR x 1.2</option>
                <option value="1.375">轻度活动 (每周轻度运动 1-3 次) - BMR x 1.375</option>
                <option value="1.55">中度活动 (每周中度运动 3-5 次) - BMR x 1.55</option>
                <option value="1.725">重度活动 (每周高强度训练 6-7 次) - BMR x 1.725</option>
                <option value="1.9">极重度活动 (体力劳动者 / 职业运动员) - BMR x 1.9</option>
              </select>
            </div>

            <div className="tdee-calc-output">
              <div className="calc-item">
                <div className="calc-lbl">根据档案估算的 TDEE</div>
                <div className="calc-val text-success">{calculatedTdee} <span className="calc-unit">kcal</span></div>
              </div>
            </div>

            <div className="form-group">
              <label>每日总消耗热量 TDEE (kcal)</label>
              <div className="tdee-manual-row">
                <input
                  type="number"
                  className="form-input"
                  value={profile.tdee}
                  onChange={e => handleProfileChange('tdee', Number(e.target.value))}
                  min="800"
                  max="6000"
                  step="10"
                />
                <button type="button" className="btn btn-secondary" onClick={handleUseCalculatedTdee}>
                  使用估算值
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>设定每日减脂热量缺口 (Deficit): {profile.deficit} kcal</label>
              <input 
                type="range" 
                min="0" 
                max="1000" 
                step="50"
                value={profile.deficit} 
                onChange={e => handleProfileChange('deficit', Number(e.target.value))}
                className="slider-input-range"
              />
              <div className="slider-labels">
                <span>0 (维持体重)</span>
                <span>500 (标准减脂)</span>
                <span>1000 (极速减脂)</span>
              </div>
            </div>

            <div className="target-intake-notice">
              <span>🎯 每日目标摄入卡路里：<b>{Math.max(1200, Number(profile.tdee) - Number(profile.deficit))} kcal</b></span>
              {Number(profile.tdee) - Number(profile.deficit) < 1200 && (
                <div className="alert-warning-text">⚠️ 您的摄入目标低于 1200 kcal，可能会引起基础代谢受损，建议调小热量缺口或配合增加运动量。</div>
              )}
            </div>

            <button type="submit" className="btn btn-primary w-full">
              <Save size={16} />
              <span>保存个人配置</span>
            </button>
          </form>
        </div>

        {/* Cloud database & API configuration */}
        <div className="right-col-settings-flex">
          {/* Quick weight logger */}
          <div className="glass-card weight-log-card">
            <h3 className="card-title flex-items">
              <Scale size={20} className="text-primary" />
              <span>记体重</span>
            </h3>
            <form onSubmit={handleWeightSubmit} className="weight-form">
              <div className="weight-form-row">
                <input 
                  type="number" 
                  step="0.1"
                  placeholder="如: 70.5 (kg)" 
                  className="form-input" 
                  value={todayWeight}
                  onChange={e => setTodayWeight(e.target.value)}
                  required 
                />
                <button type="submit" className="btn btn-primary">
                  <span>记录</span>
                </button>
              </div>
            </form>
          </div>

          {APP_CONFIG.mode === 'cloud' && api.isLoggedIn && (
            <div className="glass-card api-config-card">
              <h3 className="card-title flex-items">
                <Server size={20} className="text-info" />
                <span>云端账号状态</span>
              </h3>

              <div className="api-form">
                <div className="cloud-logged-in-notice">
                  <div className="notice-success flex-items">
                    <CheckCircle size={18} className="text-success" />
                    <span>已成功连接云端服务器</span>
                  </div>
                  <p className="logged-username">当前登录用户：<b>{api.username}</b></p>
                  <button type="button" className="btn btn-danger btn-sm w-full" onClick={handleLogout}>
                    <LogOut size={14} />
                    <span>退出登录</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

      <style>{`
        .settings-grid {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 1.5rem;
          margin-top: 1.5rem;
        }
        @media (max-width: 900px) {
          .settings-grid {
            grid-template-columns: 1fr;
          }
        }
        .right-col-settings-flex {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .profile-form, .api-form {
          margin-top: 1.25rem;
        }
        .form-row-two-cols {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        .w-full {
          width: 100%;
        }
        .margin-top-sm {
          margin-top: 1rem;
        }

        .tdee-calc-output {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-glass);
          border-radius: var(--border-radius-sm);
          padding: 1rem;
          margin-bottom: 1.25rem;
        }
        .calc-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .calc-lbl {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }
        .calc-val {
          font-family: var(--font-heading);
          font-size: 2rem;
          font-weight: 800;
          margin-top: 0.25rem;
        }
        .calc-unit {
          font-size: 0.9rem;
          font-weight: 400;
          color: var(--text-secondary);
        }
        .tdee-manual-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 0.75rem;
          align-items: center;
        }
        .tdee-manual-row .btn {
          white-space: nowrap;
          height: 100%;
          padding-left: 1rem;
          padding-right: 1rem;
        }

        .slider-input-range {
          width: 100%;
          accent-color: var(--color-info);
          background: rgba(255, 255, 255, 0.05);
          height: 6px;
          border-radius: 3px;
          outline: none;
          cursor: pointer;
        }
        .slider-labels {
          display: flex;
          justify-content: space-between;
          font-size: 0.7rem;
          color: var(--text-muted);
          margin-top: 0.35rem;
        }

        .target-intake-notice {
          background: rgba(99, 102, 241, 0.06);
          border: 1px solid rgba(99, 102, 241, 0.15);
          padding: 0.85rem 1rem;
          border-radius: var(--border-radius-sm);
          margin-bottom: 1.25rem;
          font-size: 0.85rem;
          line-height: 1.4;
        }
        .alert-warning-text {
          color: #fbbf24;
          font-size: 0.75rem;
          margin-top: 0.5rem;
        }

        .weight-form-row {
          display: flex;
          gap: 0.75rem;
          margin-top: 1rem;
        }

        .button-group-tabs {
          display: flex;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-glass);
          border-radius: 8px;
          padding: 4px;
        }
        .tab-btn-pill {
          flex: 1;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          padding: 0.5rem 0.25rem;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .tab-btn-pill.active {
          background: rgba(255, 255, 255, 0.08);
          color: var(--text-primary);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .cloud-auth-section {
          margin-top: 1.25rem;
          background: rgba(0, 0, 0, 0.15);
          border: 1px solid var(--border-glass);
          border-radius: 8px;
          padding: 1rem;
        }
        .auth-tab-row {
          display: flex;
          gap: 1rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          padding-bottom: 0.5rem;
          margin-bottom: 1rem;
        }
        .auth-tab {
          font-size: 0.8rem;
          color: var(--text-secondary);
          cursor: pointer;
          font-weight: 500;
          position: relative;
          padding-bottom: 0.25rem;
        }
        .auth-tab.active {
          color: var(--text-primary);
        }
        .auth-tab.active:after {
          content: "";
          position: absolute;
          width: 100%;
          height: 2px;
          background: var(--color-info);
          bottom: -1px;
          left: 0;
        }
        .auth-form-fields {
          display: flex;
          flex-direction: column;
        }
        .input-sm {
          padding: 0.6rem 0.8rem;
          font-size: 0.85rem;
        }

        .cloud-logged-in-notice {
          margin-top: 1.25rem;
          background: rgba(16, 185, 129, 0.05);
          border: 1px solid rgba(16, 185, 129, 0.15);
          border-radius: 8px;
          padding: 1rem;
        }
        .notice-success {
          font-size: 0.85rem;
          font-weight: 600;
        }
        .logged-username {
          font-size: 0.8rem;
          color: var(--text-secondary);
          margin: 0.5rem 0 1rem 0;
        }

        .auth-response-msg {
          margin-top: 0.75rem;
          padding: 0.5rem;
          border-radius: 6px;
          font-size: 0.75rem;
          text-align: center;
        }
        .auth-response-msg.success {
          background: rgba(16, 185, 129, 0.1);
          color: #a7f3d0;
        }
        .auth-response-msg.error {
          background: rgba(239, 68, 68, 0.1);
          color: #fca5a5;
        }

        .local-key-options, .cloud-options {
          margin-top: 1rem;
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        @media (max-width: 768px) {
          .form-row-two-cols,
          .tdee-manual-row {
            grid-template-columns: 1fr;
          }
          .weight-form-row {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
