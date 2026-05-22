import React, { useState, useEffect } from 'react';
import { LayoutDashboard as DashboardIcon, Sparkles, LineChart, Settings as SettingsIcon, Sun, Moon, Flame, User, Lock, LogIn, UserPlus } from 'lucide-react';
import Dashboard from './components/Dashboard';
import MealScanner from './components/MealScanner';
import Analytics from './components/Analytics';
import Settings from './components/Settings';
import { APP_CONFIG } from './config';



export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [theme, setTheme] = useState('dark'); // 'dark' | 'light'

  // Helper to format date as YYYY-MM-DD
  const getLocalDateString = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getMergedTimestamp = (dateStr) => {
    const dateObj = new Date(dateStr);
    const now = new Date();
    dateObj.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
    return dateObj.toISOString();
  };

  const readNumeric = (value, fallback = 0) => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const match = String(value ?? '').replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : fallback;
  };

  const normalizeMealForSave = (meal, timestamp) => ({
    ...meal,
    name: String(meal.name || '未命名餐食'),
    calories: Math.max(0, Math.round(readNumeric(meal.calories))),
    protein: Math.max(0, readNumeric(meal.protein)),
    carbs: Math.max(0, readNumeric(meal.carbs)),
    fat: Math.max(0, readNumeric(meal.fat)),
    items: Array.isArray(meal.items) ? meal.items : [],
    timestamp
  });

  const isTemporaryMealId = (id) => String(id || '').startsWith('temp-') || Number(id) > 2147483647;

  // Application States
  const [selectedDate, setSelectedDate] = useState(() => getLocalDateString());
  const [meals, setMeals] = useState([]);
  const [waterLogs, setWaterLogs] = useState({});
  const [dailyTdeeLogs, setDailyTdeeLogs] = useState({});
  const [weightLogs, setWeightLogs] = useState([]);
  const [userProfile, setUserProfile] = useState({
    gender: 'male',
    age: 26,
    height: 175,
    weight: 72,
    activity: 1.375, // light activity
    tdee: 2200,
    deficit: 500
  });

  const [apiSettings, setApiSettings] = useState({
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

  // Cloud Auth Gate States
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authMsg, setAuthMsg] = useState('');
  const [authSuccess, setAuthSuccess] = useState(false);



  // 1. Initial Load from LocalStorage
  useEffect(() => {
    // Load Theme
    const savedTheme = localStorage.getItem('whatueat-theme') || 'light';
    setTheme(savedTheme);
    document.documentElement.className = savedTheme === 'dark' ? 'dark-theme' : '';

    // Load API Settings first to find the logged-in user
    const savedApi = localStorage.getItem('whatueat-api-settings');
    let loadedApi = null;
    if (savedApi) {
      try {
        loadedApi = JSON.parse(savedApi);
        setApiSettings(prev => ({
          ...prev,
          username: loadedApi.username || '',
          password: loadedApi.password || '',
          token: loadedApi.token || '',
          isLoggedIn: !!loadedApi.isLoggedIn
        }));
      } catch (e) {
        console.error('Failed to parse API settings:', e);
      }
    }

    // Determine the namespaced keys
    const username = (loadedApi && loadedApi.isLoggedIn) ? loadedApi.username : '';
    const profileKey = username ? `whatueat-profile-${username}` : 'whatueat-profile';
    const weightKey = username ? `whatueat-weight-logs-${username}` : 'whatueat-weight-logs';
    const waterLogsKey = username ? `whatueat-water-logs-${username}` : 'whatueat-water-logs';
    const dailyTdeeLogsKey = username ? `whatueat-daily-tdee-${username}` : 'whatueat-daily-tdee';

    // Load Profile
    const savedProfile = localStorage.getItem(profileKey);
    if (savedProfile) {
      setUserProfile(JSON.parse(savedProfile));
    } else {
      setUserProfile({
        gender: 'male',
        age: 26,
        height: 175,
        weight: 72,
        activity: 1.375, // light activity
        tdee: 2200,
        deficit: 500
      });
    }

    // Load Weight Logs
    const savedWeight = localStorage.getItem(weightKey);
    if (savedWeight) {
      setWeightLogs(JSON.parse(savedWeight));
    } else {
      setWeightLogs([]);
    }

    // Load Water Logs
    const savedWaterLogs = localStorage.getItem(waterLogsKey);
    if (savedWaterLogs) {
      try {
        setWaterLogs(JSON.parse(savedWaterLogs));
      } catch (e) {
        console.error('Failed to parse water logs:', e);
        setWaterLogs({});
      }
    } else {
      setWaterLogs({});
    }

    const savedDailyTdeeLogs = localStorage.getItem(dailyTdeeLogsKey);
    if (savedDailyTdeeLogs) {
      try {
        setDailyTdeeLogs(JSON.parse(savedDailyTdeeLogs));
      } catch (e) {
        console.error('Failed to parse daily TDEE logs:', e);
        setDailyTdeeLogs({});
      }
    } else {
      setDailyTdeeLogs({});
    }

    // Load Meals (Local vs Cloud)
    const currentMode = APP_CONFIG.mode;
    if (currentMode === 'local') {
      const savedMeals = localStorage.getItem('whatueat-meals');
      if (savedMeals) {
        setMeals(JSON.parse(savedMeals));
      }
    }
  }, []);

  // 2. Fetch Meals from Server if Cloud Mode is enabled
  useEffect(() => {
    if (apiSettings.mode === 'cloud' && apiSettings.isLoggedIn && apiSettings.token) {
      fetchMealsFromServer(apiSettings.serverUrl, apiSettings.token);
    }
  }, [apiSettings.mode, apiSettings.isLoggedIn, apiSettings.token, apiSettings.serverUrl]);

  const fetchMealsFromServer = async (url = apiSettings.serverUrl, token = apiSettings.token) => {
    if (!url || !token) return;
    try {
      const response = await fetch(`${url}/api/meals`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setMeals(data);
      }
    } catch (err) {
      console.error('无法连接云端服务器获取餐食:', err);
    }
  };

  // 3. Theme Handler
  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('whatueat-theme', nextTheme);
    document.documentElement.className = nextTheme === 'dark' ? 'dark-theme' : '';
  };

  // 4. Save User Profile Handler
  const handleSaveProfile = (newProfile) => {
    setUserProfile(newProfile);
    const key = apiSettings.isLoggedIn ? `whatueat-profile-${apiSettings.username}` : 'whatueat-profile';
    localStorage.setItem(key, JSON.stringify(newProfile));
    
    // If in cloud mode, sync profile to server as well
    if (apiSettings.mode === 'cloud' && apiSettings.isLoggedIn) {
      fetch(`${apiSettings.serverUrl}/api/meals/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiSettings.token}`
        },
        body: JSON.stringify(newProfile)
      }).catch(err => console.error('同步个人资料失败:', err));
    }
    
    alert('个人档案保存成功！卡路里目标已重新计算。');
  };

  // 5. Save API settings & Mode switcher (persist auth fields only)
  const handleSaveApiSettings = (newApi, newProfile = null) => {
    setApiSettings(newApi);
    localStorage.setItem('whatueat-api-settings', JSON.stringify({
      username: newApi.username,
      password: newApi.password,
      token: newApi.token,
      isLoggedIn: newApi.isLoggedIn
    }));

    if (newApi.isLoggedIn) {
      const username = newApi.username;
      
      // Load or save Profile
      if (newProfile) {
        setUserProfile(newProfile);
        localStorage.setItem(`whatueat-profile-${username}`, JSON.stringify(newProfile));
      } else {
        const savedProfile = localStorage.getItem(`whatueat-profile-${username}`);
        if (savedProfile) {
          setUserProfile(JSON.parse(savedProfile));
        }
      }

      // Load User Weight Logs
      const savedWeight = localStorage.getItem(`whatueat-weight-logs-${username}`);
      setWeightLogs(savedWeight ? JSON.parse(savedWeight) : []);

      // Load User Water Logs
      const savedWaterLogs = localStorage.getItem(`whatueat-water-logs-${username}`);
      if (savedWaterLogs) {
        try {
          setWaterLogs(JSON.parse(savedWaterLogs));
        } catch (e) {
          setWaterLogs({});
        }
      } else {
        setWaterLogs({});
      }

      const savedDailyTdeeLogs = localStorage.getItem(`whatueat-daily-tdee-${username}`);
      if (savedDailyTdeeLogs) {
        try {
          setDailyTdeeLogs(JSON.parse(savedDailyTdeeLogs));
        } catch (e) {
          setDailyTdeeLogs({});
        }
      } else {
        setDailyTdeeLogs({});
      }

      // Load User Meals from Cloud
      if (newApi.mode === 'cloud' && newApi.token) {
        fetchMealsFromServer(newApi.serverUrl, newApi.token);
      }
    } else {
      // --- LOGGED OUT ---
      // Load Guest Profile
      const savedProfile = localStorage.getItem('whatueat-profile');
      if (savedProfile) {
        setUserProfile(JSON.parse(savedProfile));
      } else {
        setUserProfile({
          gender: 'male',
          age: 26,
          height: 175,
          weight: 72,
          activity: 1.375,
          tdee: 2200,
          deficit: 500
        });
      }

      // Load Guest Weight Logs
      const savedWeight = localStorage.getItem('whatueat-weight-logs');
      setWeightLogs(savedWeight ? JSON.parse(savedWeight) : []);

      // Load Guest Water Logs
      const savedWaterLogs = localStorage.getItem('whatueat-water-logs');
      if (savedWaterLogs) {
        try {
          setWaterLogs(JSON.parse(savedWaterLogs));
        } catch (e) {
          setWaterLogs({});
        }
      } else {
        setWaterLogs({});
      }

      const savedDailyTdeeLogs = localStorage.getItem('whatueat-daily-tdee');
      if (savedDailyTdeeLogs) {
        try {
          setDailyTdeeLogs(JSON.parse(savedDailyTdeeLogs));
        } catch (e) {
          setDailyTdeeLogs({});
        }
      } else {
        setDailyTdeeLogs({});
      }

      // Reload local meals or clear meals
      if (newApi.mode === 'local') {
        const savedMeals = localStorage.getItem('whatueat-meals');
        setMeals(savedMeals ? JSON.parse(savedMeals) : []);
      } else {
        setMeals([]); // Cloud mode logged out has no meals
      }
    }
  };

  // Cloud Auth Gate Submit Handler
  const handleAuthGateSubmit = async (e) => {
    e.preventDefault();
    setAuthMsg('');
    setAuthSuccess(false);

    if (!authUsername.trim() || !authPassword) {
      setAuthMsg('请输入用户名和密码。');
      return;
    }

    try {
      const endpoint = authMode === 'register' ? '/api/meals/register' : '/api/meals/login';
      const response = await fetch(`${apiSettings.serverUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: authUsername.trim(), password: authPassword })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '操作失败');
      }

      const data = await response.json();
      
      const updatedApi = {
        ...apiSettings,
        username: authUsername.trim(),
        password: authPassword,
        token: data.token,
        isLoggedIn: true
      };
      
      // Save settings and load user namespaced profile & logs
      handleSaveApiSettings(updatedApi, data.profile);
      
      setAuthSuccess(true);
      setAuthMsg(authMode === 'register' ? '注册成功！正在进入...' : '登录成功！正在进入...');
      
      setTimeout(() => {
        setAuthUsername('');
        setAuthPassword('');
        setAuthMsg('');
      }, 1000);
    } catch (err) {
      setAuthMsg(`错误: ${err.message}`);
    }
  };

  // 6. Add Meal Log
  const handleAddMeal = async (newMeal) => {
    // Merge timestamp with selectedDate if it's a new meal
    const mealTimestamp = newMeal.timestamp 
      ? (() => {
          // If the timestamp is already on selectedDate, keep it. Otherwise update its date portion.
          const selectedPrefix = selectedDate; // YYYY-MM-DD
          const mealPrefix = newMeal.timestamp.split('T')[0];
          if (selectedPrefix !== mealPrefix) {
            const dateObj = new Date(selectedDate);
            const originalTime = new Date(newMeal.timestamp);
            dateObj.setHours(originalTime.getHours(), originalTime.getMinutes(), originalTime.getSeconds(), originalTime.getMilliseconds());
            return dateObj.toISOString();
          }
          return newMeal.timestamp;
        })()
      : getMergedTimestamp(selectedDate);

    const mealToSave = normalizeMealForSave(newMeal, mealTimestamp);
    const tempId = `temp-${Date.now()}`;
    const mealWithId = {
      ...mealToSave,
      id: tempId
    };

    const updatedMeals = [mealWithId, ...meals];
    setMeals(updatedMeals);

    if (apiSettings.mode === 'local') {
      localStorage.setItem('whatueat-meals', JSON.stringify(updatedMeals));
      alert('餐食记录已成功添加并保存在本地！');
    } else if (apiSettings.mode === 'cloud' && apiSettings.isLoggedIn) {
      try {
        const response = await fetch(`${apiSettings.serverUrl}/api/meals`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiSettings.token}`
          },
          body: JSON.stringify(mealToSave)
        });
        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`云端同步失败: ${errText || response.status}`);
        }

        const saved = await response.json();
        if (saved?.id) {
          setMeals(currentMeals => currentMeals.map(meal => (
            meal.id === tempId ? { ...mealToSave, id: saved.id } : meal
          )));
        }
        fetchMealsFromServer();
        alert('餐食记录已同步至阿里云数据库！');
      } catch (err) {
        console.error(err);
        // Fallback save locally if network failed
        localStorage.setItem('whatueat-meals', JSON.stringify(updatedMeals));
        alert('云端同步失败，已暂存至本地存储。');
      }
    }
  };

  // 7. Delete Meal Log
  const handleDeleteMeal = async (mealId) => {
    const updatedMeals = meals.filter(m => m.id !== mealId);
    setMeals(updatedMeals);

    if (apiSettings.mode === 'local') {
      localStorage.setItem('whatueat-meals', JSON.stringify(updatedMeals));
    } else if (apiSettings.mode === 'cloud' && apiSettings.isLoggedIn) {
      if (isTemporaryMealId(mealId)) {
        localStorage.setItem('whatueat-meals', JSON.stringify(updatedMeals));
        return;
      }

      try {
        const response = await fetch(`${apiSettings.serverUrl}/api/meals/${mealId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${apiSettings.token}`
          }
        });
        if (!response.ok) throw new Error('云端删除失败');
      } catch (err) {
        console.error(err);
        localStorage.setItem('whatueat-meals', JSON.stringify(updatedMeals));
      }
    }
  };

  // 7b. Update Meal Log
  const handleUpdateMeal = async (updatedMeal) => {
    const updatedMeals = meals.map(m => m.id === updatedMeal.id ? updatedMeal : m);
    setMeals(updatedMeals);

    if (apiSettings.mode === 'local') {
      localStorage.setItem('whatueat-meals', JSON.stringify(updatedMeals));
      alert('记录已成功修改！');
    } else if (apiSettings.mode === 'cloud' && apiSettings.isLoggedIn) {
      if (isTemporaryMealId(updatedMeal.id)) {
        localStorage.setItem('whatueat-meals', JSON.stringify(updatedMeals));
        alert('这条记录还没有云端 ID，已暂存在本地。');
        return;
      }

      try {
        const response = await fetch(`${apiSettings.serverUrl}/api/meals/${updatedMeal.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiSettings.token}`
          },
          body: JSON.stringify(updatedMeal)
        });
        if (!response.ok) throw new Error('云端更新失败');
        fetchMealsFromServer();
        alert('记录已成功修改！');
      } catch (err) {
        console.error(err);
        localStorage.setItem('whatueat-meals', JSON.stringify(updatedMeals));
        alert('云端同步失败，已暂存至本地。');
      }
    }
  };

  // 8. Water Intake Logger
  const handleUpdateWater = (amount, dateStr = selectedDate) => {
    const updatedWaterLogs = {
      ...waterLogs,
      [dateStr]: amount
    };
    setWaterLogs(updatedWaterLogs);
    
    const username = apiSettings.isLoggedIn ? apiSettings.username : '';
    const waterLogsKey = username ? `whatueat-water-logs-${username}` : 'whatueat-water-logs';
    localStorage.setItem(waterLogsKey, JSON.stringify(updatedWaterLogs));
  };

  const handleUpdateDailyTdee = (dateStr, value) => {
    const updatedLogs = { ...dailyTdeeLogs };
    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed <= 0) {
      delete updatedLogs[dateStr];
    } else {
      updatedLogs[dateStr] = Math.round(parsed);
    }

    setDailyTdeeLogs(updatedLogs);

    const username = apiSettings.isLoggedIn ? apiSettings.username : '';
    const dailyTdeeLogsKey = username ? `whatueat-daily-tdee-${username}` : 'whatueat-daily-tdee';
    localStorage.setItem(dailyTdeeLogsKey, JSON.stringify(updatedLogs));
  };

  // 9. Weight Logger
  const handleAddWeightLog = (weight) => {
    const newLog = {
      date: new Date().toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }).replace('/', '-'),
      weight: weight,
      timestamp: new Date().toISOString()
    };
    const updatedLogs = [...weightLogs, newLog].slice(-30); // Keep last 30 logs
    setWeightLogs(updatedLogs);
    const key = apiSettings.isLoggedIn ? `whatueat-weight-logs-${apiSettings.username}` : 'whatueat-weight-logs';
    localStorage.setItem(key, JSON.stringify(updatedLogs));
  };

  // Render Auth Gate for cloud mode when not logged in
  if (apiSettings.mode === 'cloud' && !apiSettings.isLoggedIn) {
    return (
      <div className="auth-gate-container">
        <div className="glass-card auth-gate-card glow-purple animate-fadeIn">
          <div className="auth-gate-logo">
            <div className="auth-gate-logo-icon">
              <Flame size={32} />
            </div>
            <h1 className="auth-gate-title">WhatUEat</h1>
            <p className="auth-gate-subtitle">云端饮食与卡路里智能记录</p>
          </div>

          <div className="auth-tab-nav">
            <button 
              className={`auth-tab-btn ${authMode === 'login' ? 'active' : ''}`}
              onClick={() => { setAuthMode('login'); setAuthMsg(''); }}
            >
              登录
            </button>
            <button 
              className={`auth-tab-btn ${authMode === 'register' ? 'active' : ''}`}
              onClick={() => { setAuthMode('register'); setAuthMsg(''); }}
            >
              注册
            </button>
          </div>

          <form onSubmit={handleAuthGateSubmit} className="auth-gate-form">
            <div className="form-group">
              <label>用户名</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ paddingLeft: '36px' }}
                  placeholder="请输入您的用户名" 
                  value={authUsername}
                  onChange={e => setAuthUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>密码</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="password" 
                  className="form-input" 
                  style={{ paddingLeft: '36px' }}
                  placeholder="请输入您的密码" 
                  value={authPassword}
                  onChange={e => setAuthPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {authMsg && (
              <div className={`auth-msg ${authSuccess ? 'success' : 'error'}`}>
                {authMsg}
              </div>
            )}

            <button type="submit" className="btn btn-primary w-full" style={{ marginTop: '0.5rem' }}>
              <span>{authMode === 'login' ? '确认登录' : '立即注册并登录'}</span>
            </button>
          </form>
        </div>
        
        <style>{`
          .auth-gate-container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--bg-gradient);
            padding: 2rem 1.5rem;
          }
          .auth-gate-card {
            width: 100%;
            max-width: 420px;
            padding: 2.5rem 2rem;
            border-radius: var(--border-radius-lg);
            border-color: rgba(255, 255, 255, 0.08);
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3), var(--shadow-glow-purple);
          }
          .auth-gate-logo {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.75rem;
            margin-bottom: 2rem;
            text-align: center;
          }
          .auth-gate-logo-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 60px;
            height: 60px;
            border-radius: 16px;
            background: rgba(249, 115, 22, 0.15);
            margin-bottom: 0.5rem;
          }
          .auth-gate-logo-icon svg {
            color: var(--color-primary);
            filter: drop-shadow(0 0 8px var(--color-primary));
          }
          .auth-gate-title {
            font-size: 1.75rem;
            font-weight: 800;
            line-height: 1.2;
            color: var(--text-primary);
          }
          .auth-gate-subtitle {
            font-size: 0.85rem;
            color: var(--text-secondary);
          }
          .auth-tab-nav {
            display: flex;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid var(--border-glass);
            border-radius: 20px;
            padding: 4px;
            margin-bottom: 1.5rem;
          }
          .auth-tab-btn {
            flex: 1;
            background: transparent;
            border: none;
            color: var(--text-secondary);
            padding: 0.6rem 0.5rem;
            border-radius: 16px;
            font-size: 0.85rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .auth-tab-btn.active {
            color: white;
            background: linear-gradient(135deg, var(--color-info) 0%, #4f46e5 100%);
            box-shadow: 0 4px 10px rgba(99, 102, 241, 0.25);
          }
          .auth-msg {
            padding: 0.75rem 1rem;
            border-radius: 8px;
            font-size: 0.8rem;
            text-align: center;
            margin-bottom: 1.25rem;
            line-height: 1.4;
          }
          .auth-msg.error {
            background: rgba(239, 68, 68, 0.1);
            color: #fca5a5;
            border: 1px solid rgba(239, 68, 68, 0.2);
          }
          .auth-msg.success {
            background: rgba(16, 185, 129, 0.1);
            color: #a7f3d0;
            border: 1px solid rgba(16, 185, 129, 0.2);
          }
          .w-full {
            width: 100%;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="app-root-layout">
      {/* Premium Header Nav Bar */}
      <header className="glass-card header-nav glow-purple">
        <div className="logo-section">
          <div className="logo-icon-box">
            <Flame size={24} className="logo-glow-orange" />
          </div>
          <div>
            <h1 className="logo-title">WhatUEat</h1>
            <p className="logo-subtitle">AI Nutrition & Calorie Tracker</p>
          </div>
        </div>

        {/* Desktop Tab Buttons */}
        <nav className="desktop-nav-tabs">
          <button 
            className={`nav-tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <DashboardIcon size={18} />
            <span>仪表盘</span>
          </button>
          <button 
            className={`nav-tab-btn ${activeTab === 'scanner' ? 'active' : ''}`}
            onClick={() => setActiveTab('scanner')}
          >
            <Sparkles size={18} />
            <span>AI 拍照记录</span>
          </button>
          <button 
            className={`nav-tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            <LineChart size={18} />
            <span>趋势分析</span>
          </button>
          <button 
            className={`nav-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <SettingsIcon size={18} />
            <span>参数设置</span>
          </button>
        </nav>

        {/* Utility theme switcher */}
        <div className="header-utilities">
          {apiSettings.isLoggedIn && (
            <div className="user-nav-badge">
              <span className="user-nav-name">
                <User size={14} />
                <span>{apiSettings.username}</span>
              </span>
              <button 
                className="logout-nav-btn" 
                onClick={() => {
                  const updatedApi = {
                    ...apiSettings,
                    token: '',
                    isLoggedIn: false
                  };
                  handleSaveApiSettings(updatedApi);
                }}
                title="退出登录"
              >
                退出
              </button>
            </div>
          )}
          <button className="theme-toggle-btn" onClick={toggleTheme} title="切换主题">
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </header>

      {/* Main Content Workspace Area */}
      <main className="app-container">
        {activeTab === 'dashboard' && (
          <Dashboard 
            meals={meals}
            onDeleteMeal={handleDeleteMeal}
            onUpdateMeal={handleUpdateMeal}
            onAddManualMeal={handleAddMeal}
            tdee={dailyTdeeLogs[selectedDate] || userProfile.tdee}
            defaultTdee={userProfile.tdee}
            dailyTdeeOverride={dailyTdeeLogs[selectedDate]}
            onUpdateDailyTdee={handleUpdateDailyTdee}
            targetDeficit={userProfile.deficit}
            waterIntake={waterLogs[selectedDate] || 0}
            onUpdateWater={handleUpdateWater}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            apiSettings={apiSettings}
          />
        )}

        {activeTab === 'scanner' && (
          <MealScanner 
            onSaveMeal={handleAddMeal}
            apiSettings={apiSettings}
          />
        )}

        {activeTab === 'analytics' && (
          <Analytics 
            meals={meals}
            weightLogs={weightLogs}
            userProfile={userProfile}
            waterLogs={waterLogs}
            dailyTdeeLogs={dailyTdeeLogs}
          />
        )}

        {activeTab === 'settings' && (
          <Settings 
            userProfile={userProfile}
            onSaveProfile={handleSaveProfile}
            apiSettings={apiSettings}
            onSaveApiSettings={handleSaveApiSettings}
            onAddWeightLog={handleAddWeightLog}
          />
        )}
      </main>

      {/* Mobile Sticky Bottom Tab Bar */}
      <nav className="mobile-nav-bar glass-card">
        <button 
          className={`mobile-nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <DashboardIcon size={20} />
          <span>首页</span>
        </button>
        <button 
          className={`mobile-nav-btn ${activeTab === 'scanner' ? 'active' : ''}`}
          onClick={() => setActiveTab('scanner')}
        >
          <Sparkles size={20} />
          <span>AI 识图</span>
        </button>
        <button 
          className={`mobile-nav-btn ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <LineChart size={20} />
          <span>统计</span>
        </button>
        <button 
          className={`mobile-nav-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <SettingsIcon size={20} />
          <span>设置</span>
        </button>
      </nav>

      <style>{`
        .user-nav-badge {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-glass);
          padding: 0.25rem 0.35rem 0.25rem 0.5rem;
          border-radius: 20px;
          white-space: nowrap;
          flex: 0 1 auto;
          min-width: 0;
          max-width: 150px;
        }
        .user-nav-name {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          min-width: 0;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-primary);
          overflow: hidden;
          white-space: nowrap;
        }
        .user-nav-name svg {
          flex: 0 0 auto;
          color: var(--text-secondary);
        }
        .user-nav-name span {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .logout-nav-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 26px;
          padding: 0 0.45rem;
          border: none;
          border-radius: 8px;
          background: linear-gradient(135deg, var(--color-danger) 0%, #b81730 100%);
          color: white;
          font-size: 0.72rem;
          font-weight: 700;
          white-space: nowrap;
          flex: 0 0 auto;
          cursor: pointer;
        }
        .header-utilities {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 0.45rem;
          flex: 0 1 auto;
          min-width: 0;
          flex-wrap: nowrap;
        }

        .app-root-layout {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        .header-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 2rem;
          margin: 1rem 1.5rem;
          border-radius: var(--border-radius-md);
          z-index: 100;
        }
        
        .logo-section {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .logo-icon-box {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: rgba(249, 115, 22, 0.12);
        }
        .logo-glow-orange {
          color: var(--color-primary);
          filter: drop-shadow(0 0 5px var(--color-primary));
        }
        .logo-title {
          font-family: var(--font-heading);
          font-size: 1.25rem;
          font-weight: 800;
          line-height: 1.1;
        }
        .logo-subtitle {
          font-size: 0.7rem;
          color: var(--text-secondary);
        }

        .desktop-nav-tabs {
          display: flex;
          gap: 0.5rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-glass);
          border-radius: 24px;
          padding: 4px;
        }
        .nav-tab-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 1.25rem;
          border-radius: 20px;
          font-family: var(--font-heading);
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .nav-tab-btn:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.05);
        }
        .nav-tab-btn.active {
          color: white;
          background: linear-gradient(135deg, var(--color-info) 0%, #4f46e5 100%);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.35);
        }

        .theme-toggle-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-glass);
          color: var(--text-primary);
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .theme-toggle-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          transform: rotate(15deg);
        }

        .mobile-nav-bar {
          display: none;
          position: fixed;
          bottom: 1rem;
          left: 1rem;
          right: 1rem;
          height: 64px;
          padding: 0 1rem;
          justify-content: space-around;
          align-items: center;
          border-radius: 30px;
          z-index: 1000;
          border-color: rgba(255, 255, 255, 0.08);
          box-shadow: 0 -8px 30px rgba(0, 0, 0, 0.5);
        }
        .mobile-nav-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.2rem;
          padding: 0.5rem;
          cursor: pointer;
          transition: all 0.2s ease;
          width: 50px;
        }
        .mobile-nav-btn span {
          font-size: 0.65rem;
          font-weight: 500;
        }
        .mobile-nav-btn.active {
          color: var(--color-info);
        }

        @media (max-width: 768px) {
          .header-nav {
            padding: 0.5rem 0.6rem;
            margin: 0.25rem 0.25rem 0.5rem 0.25rem;
            gap: 0.25rem;
          }
          .logo-section {
            gap: 0.4rem;
            flex-shrink: 1;
            min-width: 0;
          }
          .logo-icon-box {
            width: 32px;
            height: 32px;
            flex-shrink: 0;
          }
          .logo-icon-box svg {
            width: 18px;
            height: 18px;
          }
          .logo-title {
            font-size: 1rem;
            white-space: nowrap;
          }
          .logo-subtitle {
            display: none;
          }
          .header-utilities {
            flex: 0 0 auto;
            gap: 0.25rem;
            min-width: 0;
          }
          .user-nav-badge {
            gap: 0.25rem;
            padding: 0.18rem 0.25rem 0.18rem 0.35rem;
            max-width: 112px;
            flex-shrink: 1;
          }
          .user-nav-name {
            font-size: 0.7rem;
          }
          .user-nav-name svg {
            width: 12px;
            height: 12px;
          }
          .logout-nav-btn {
            height: 22px;
            padding: 0 0.32rem;
            font-size: 0.65rem;
            border-radius: 7px;
          }
          .theme-toggle-btn {
            width: 32px;
            height: 32px;
            flex: 0 0 32px;
          }
          .theme-toggle-btn svg {
            width: 17px;
            height: 17px;
          }
          .desktop-nav-tabs {
            display: none;
          }
          .mobile-nav-bar {
            display: flex;
          }
        }
      `}</style>
    </div>
  );
}
