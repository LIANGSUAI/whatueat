import React, { useState, useRef } from 'react';
import { Upload, Camera, Sparkles, Check, Edit3, Save, RefreshCw, AlertCircle } from 'lucide-react';

const MOCK_MEALS_DATABASE = [
  {
    name: '香煎三文鱼配藜麦沙拉',
    calories: 520,
    protein: 38,
    carbs: 35,
    fat: 24,
    items: [
      { name: '香煎三文鱼', weight: '150g', calories: 310, protein: 32, carbs: 0, fat: 20 },
      { name: '煮藜麦', weight: '100g', calories: 120, protein: 4, carbs: 21, fat: 2 },
      { name: '牛油果与绿叶沙拉', weight: '120g', calories: 90, protein: 2, carbs: 14, fat: 2 }
    ]
  },
  {
    name: '经典牛肉芝士汉堡',
    calories: 680,
    protein: 34,
    carbs: 48,
    fat: 32,
    items: [
      { name: '牛肉饼', weight: '120g', calories: 280, protein: 24, carbs: 0, fat: 20 },
      { name: '汉堡面包', weight: '80g', calories: 220, protein: 6, carbs: 40, fat: 3 },
      { name: '切达芝士 & 酱汁', weight: '30g', calories: 180, protein: 4, carbs: 8, fat: 9 }
    ]
  },
  {
    name: '中式黑椒牛肉木耳盖浇饭',
    calories: 610,
    protein: 28,
    carbs: 82,
    fat: 18,
    items: [
      { name: '白米饭', weight: '200g', calories: 260, protein: 5, carbs: 56, fat: 0.5 },
      { name: '黑椒牛肉片', weight: '120g', calories: 240, protein: 21, carbs: 8, fat: 12 },
      { name: '木耳与青椒', weight: '100g', calories: 110, protein: 2, carbs: 18, fat: 5.5 }
    ]
  },
  {
    name: '地中海烤鸡胸肉能量碗',
    calories: 450,
    protein: 42,
    carbs: 30,
    fat: 12,
    items: [
      { name: '慢烤鸡胸肉', weight: '150g', calories: 225, protein: 35, carbs: 0, fat: 4 },
      { name: '烤南瓜与西兰花', weight: '150g', calories: 115, protein: 4, carbs: 18, fat: 3 },
      { name: '鹰嘴豆泥 & 橄榄油', weight: '50g', calories: 110, protein: 3, carbs: 12, fat: 5 }
    ]
  }
];

export default function MealScanner({ 
  onSaveMeal, 
  apiSettings 
}) {
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editedResult, setEditedResult] = useState(null);
  const getMealTypeByTime = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 10) return 'Breakfast';
    if (hour >= 10 && hour < 14) return 'Lunch';
    if (hour >= 17 && hour < 22) return 'Dinner';
    return 'Snack';
  };

  const [mealType, setMealType] = useState(getMealTypeByTime);
  const [error, setError] = useState(null);

  const fileInputRef = useRef(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
        setScanResult(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current.click();
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
        setScanResult(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  // Perform the AI Scanning logic
  const handleScan = async () => {
    if (!imagePreview) return;
    setScanning(true);
    setError(null);

    // Dynamic prompt logic based on setting mode
    const isMockMode = apiSettings.mode === 'local' && !apiSettings.apiKey;

    if (isMockMode) {
      // Simulate network request to AI
      setTimeout(() => {
        // Select a mock result based on image filename keyword
        let selectedMock = MOCK_MEALS_DATABASE[0];
        const filename = image ? image.name.toLowerCase() : '';
        
        if (filename.includes('burger') || filename.includes('汉堡') || filename.includes('cheeseburger')) {
          selectedMock = MOCK_MEALS_DATABASE[1];
        } else if (filename.includes('rice') || filename.includes('饭') || filename.includes('beef')) {
          selectedMock = MOCK_MEALS_DATABASE[2];
        } else if (filename.includes('chicken') || filename.includes('鸡') || filename.includes('bowl')) {
          selectedMock = MOCK_MEALS_DATABASE[3];
        } else {
          // Choose randomly
          const idx = Math.floor(Math.random() * MOCK_MEALS_DATABASE.length);
          selectedMock = MOCK_MEALS_DATABASE[idx];
        }

        setScanResult(selectedMock);
        setEditedResult(JSON.parse(JSON.stringify(selectedMock))); // deep copy
        setScanning(false);
      }, 2500);
      return;
    }

    // Call Cloud Backend API or direct API Proxy
    try {
      let response;
      const base64Data = imagePreview.split(',')[1];

      if (apiSettings.mode === 'cloud') {
        // Cloud API endpoint
        const serverUrl = apiSettings.serverUrl || 'http://localhost:3000';
        response = await fetch(`${serverUrl}/api/ai/scan`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiSettings.token || ''}`
          },
          body: JSON.stringify({ image: base64Data })
        });
      } else {
        // Direct local client-side fetch (either Qwen-VL or OpenAI proxy)
        const isQwen = apiSettings.provider === 'qwen';
        const url = isQwen 
          ? 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions' 
          : (apiSettings.proxyUrl || 'https://api.openai.com/v1/chat/completions');

        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiSettings.apiKey}`
        };

        const systemPrompt = `You are a professional nutrition expert. Analyze the food image provided and estimate the dish name, estimated weight of each ingredient, calories (kcal), and macronutrients (protein in grams, carbohydrates in grams, fat in grams).
Return strictly a valid JSON object in this format:
{
  "name": "Dish name in Chinese",
  "calories": total_calories_number,
  "protein": total_protein_grams_number,
  "carbs": total_carbs_grams_number,
  "fat": total_fat_grams_number,
  "items": [
    { "name": "Ingredient name in Chinese", "weight": "100g", "calories": calories_number, "protein": protein_grams, "carbs": carbs_grams, "fat": fat_grams }
  ]
}
Do not return any markdown formatting outside of JSON, do not include any thoughts. Just clean raw JSON.`;

        const requestBody = {
          model: isQwen ? 'qwen-vl-plus' : 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Estimate the nutrition facts for this meal.' },
                { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Data}` } }
              ]
            }
          ],
          response_format: { type: 'json_object' }
        };

        response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(requestBody)
        });
      }

      if (!response.ok) {
        throw new Error(`请求失败，状态码: ${response.status}`);
      }

      const data = await response.json();
      
      let parsedJson;
      if (apiSettings.mode === 'cloud') {
        parsedJson = data.result;
      } else {
        const text = data.choices[0].message.content;
        parsedJson = JSON.parse(text);
      }

      setScanResult(parsedJson);
      setEditedResult(JSON.parse(JSON.stringify(parsedJson)));
    } catch (err) {
      console.error(err);
      setError(`识别出错：${err.message || '网络异常，请确认后端服务或API Key设置是否正确。'}`);
    } finally {
      setScanning(false);
    }
  };

  const handleEditChange = (field, val, index = null) => {
    const updated = { ...editedResult };
    if (index === null) {
      updated[field] = val;
    } else {
      updated.items[index][field] = val;
      // Recalculate totals
      updated.calories = updated.items.reduce((s, i) => s + Number(i.calories || 0), 0);
      updated.protein = updated.items.reduce((s, i) => s + Number(i.protein || 0), 0);
      updated.carbs = updated.items.reduce((s, i) => s + Number(i.carbs || 0), 0);
      updated.fat = updated.items.reduce((s, i) => s + Number(i.fat || 0), 0);
    }
    setEditedResult(updated);
  };

  const handleSave = () => {
    if (!editedResult) return;
    onSaveMeal({
      ...editedResult,
      image: imagePreview,
      type: mealType,
      timestamp: new Date().toISOString()
    });
    // Reset scanner state
    setImage(null);
    setImagePreview(null);
    setScanResult(null);
    setEditedResult(null);
  };

  const triggerReset = () => {
    setImage(null);
    setImagePreview(null);
    setScanResult(null);
    setEditedResult(null);
    setError(null);
  };

  return (
    <div className="scanner-container glass-card">
      <div className="scanner-header">
        <h3 className="card-title flex-items">
          <Sparkles size={20} className="glow-icon-purple" />
          <span>AI 饮食拍照记账</span>
        </h3>
        <p className="scanner-subtitle">上传每餐照片，AI 自动帮您估算卡路里和三大营养素，免去繁琐记录</p>
      </div>

      {error && (
        <div className="alert-error flex-items">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="scanner-workspace">
        {/* Left Side: Upload & Camera View */}
        <div className="workspace-upload-col">
          {!imagePreview ? (
            <div 
              className="dropzone-area"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={triggerFileSelect}
            >
              <div className="dropzone-content">
                <div className="upload-icon-circle">
                  <Upload size={32} />
                </div>
                <h4 className="upload-prompt">拖拽餐食图片到这里，或点击上传</h4>
                <p className="upload-subtext">支持 JPG, PNG，最大支持 10MB</p>
                <div className="camera-option-tag">
                  <Camera size={14} />
                  <span>支持手机相机直接拍照</span>
                </div>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageChange} 
                accept="image/*" 
                style={{ display: 'none' }} 
              />
            </div>
          ) : (
            <div className="image-preview-wrapper scan-container">
              {scanning && <div className="scan-line"></div>}
              <img src={imagePreview} alt="餐食预览" className="preview-image-img" />
              
              {!scanning && !scanResult && (
                <div className="preview-actions-overlay">
                  <button className="btn btn-secondary btn-sm" onClick={triggerReset}>
                    <RefreshCw size={14} />
                    <span>重选</span>
                  </button>
                  <button className="btn btn-primary btn-sm btn-glow-purple" onClick={handleScan}>
                    <Sparkles size={14} />
                    <span>开始 AI 识别</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side: AI Nutrition Parse Results */}
        <div className="workspace-results-col">
          {scanning && (
            <div className="scanning-loader">
              <div className="radar-scanner-circle radar-pulse">
                <Sparkles size={36} className="loader-sparkles" />
              </div>
              <h4>AI 正在智能分析您的食物组成...</h4>
              <p>估算重量、卡路里以及宏量营养素</p>
            </div>
          )}

          {!scanning && !scanResult && (
            <div className="results-empty-state">
              <div className="empty-book-art">🍔 🥗 🍎</div>
              <h4>待分析的盘中美味</h4>
              <p>在左侧上传美食图片，点击“开始 AI 识别”为您进行营养学精算。</p>
              {apiSettings.mode === 'local' && !apiSettings.apiKey && (
                <div className="demo-notice-tag">
                  <span>💡 当前运行于<b>本地模拟演示模式</b>（无需 API Key，自动推荐健康食谱进行模拟记账）。您可以在“系统设置”中配置您的通义千问 API 密钥以激活真实的 AI 识图能力。</span>
                </div>
              )}
            </div>
          )}

          {!scanning && scanResult && editedResult && (
            <div className="scan-results-card">
              <div className="results-header-info">
                <div className="type-selector-wrapper">
                  <label className="type-label-tag">餐食分类:</label>
                  <select 
                    value={mealType} 
                    onChange={e => setMealType(e.target.value)}
                    className="meal-type-selector-input"
                  >
                    <option value="Breakfast">早餐 ☕</option>
                    <option value="Lunch">午餐 🍛</option>
                    <option value="Dinner">晚餐 🥗</option>
                    <option value="Snack">加餐 🍎</option>
                  </select>
                </div>

                <div className="edit-btn-wrapper">
                  <button 
                    className="btn btn-secondary btn-sm" 
                    onClick={() => setEditMode(!editMode)}
                  >
                    {editMode ? <Save size={14} /> : <Edit3 size={14} />}
                    <span>{editMode ? '完成修改' : '手动调整'}</span>
                  </button>
                </div>
              </div>

              {/* Meal Name Input / Display */}
              <div className="meal-title-display-group">
                {editMode ? (
                  <div className="form-group margin-none">
                    <label>食物识别名称</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={editedResult.name}
                      onChange={e => handleEditChange('name', e.target.value)}
                    />
                  </div>
                ) : (
                  <h2 className="scanned-meal-title">{editedResult.name}</h2>
                )}
              </div>

              {/* Big Stats Row */}
              <div className="scanned-stats-row">
                <div className="scanned-stat-box orange">
                  <div className="scanned-stat-val">{editedResult.calories}</div>
                  <div className="scanned-stat-lbl">热量 (kcal)</div>
                </div>
                <div className="scanned-stat-box purple">
                  <div className="scanned-stat-val">{editedResult.protein}g</div>
                  <div className="scanned-stat-lbl">蛋白质</div>
                </div>
                <div className="scanned-stat-box yellow">
                  <div className="scanned-stat-val">{editedResult.carbs}g</div>
                  <div className="scanned-stat-lbl">碳水</div>
                </div>
                <div className="scanned-stat-box danger">
                  <div className="scanned-stat-val">{editedResult.fat}g</div>
                  <div className="scanned-stat-lbl">脂肪</div>
                </div>
              </div>

              {/* Ingredients breakdown list */}
              <div className="ingredients-breakdown-section">
                <h4 className="ingredients-section-title">食物原料拆解</h4>
                <div className="ingredients-list">
                  {editedResult.items && editedResult.items.map((item, idx) => (
                    <div key={idx} className="ingredient-item-card">
                      {editMode ? (
                        <div className="ingredient-edit-fields">
                          <input 
                            type="text" 
                            className="form-input inline-input-name" 
                            value={item.name} 
                            placeholder="原料"
                            onChange={e => handleEditChange('name', e.target.value, idx)}
                          />
                          <input 
                            type="text" 
                            className="form-input inline-input-wt" 
                            value={item.weight} 
                            placeholder="重量"
                            onChange={e => handleEditChange('weight', e.target.value, idx)}
                          />
                          <div className="nutrients-edit-grid">
                            <input 
                              type="number" 
                              className="form-input inline-input-num" 
                              value={item.calories} 
                              placeholder="Kcal"
                              onChange={e => handleEditChange('calories', e.target.value, idx)}
                              title="卡路里"
                            />
                            <input 
                              type="number" 
                              className="form-input inline-input-num" 
                              value={item.protein} 
                              placeholder="蛋"
                              onChange={e => handleEditChange('protein', e.target.value, idx)}
                              title="蛋白质"
                            />
                            <input 
                              type="number" 
                              className="form-input inline-input-num" 
                              value={item.carbs} 
                              placeholder="碳"
                              onChange={e => handleEditChange('carbs', e.target.value, idx)}
                              title="碳水"
                            />
                            <input 
                              type="number" 
                              className="form-input inline-input-num" 
                              value={item.fat} 
                              placeholder="脂"
                              onChange={e => handleEditChange('fat', e.target.value, idx)}
                              title="脂肪"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="ingredient-display-row">
                          <div className="ing-info">
                            <span className="ing-dot"></span>
                            <span className="ing-name">{item.name}</span>
                            <span className="ing-weight">({item.weight})</span>
                          </div>
                          <div className="ing-nutrients">
                            <span>{item.calories} kcal</span>
                            <span className="macro-dots">
                              P:{item.protein}g · C:{item.carbs}g · F:{item.fat}g
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="scanned-actions-row">
                <button className="btn btn-secondary" onClick={triggerReset}>
                  重新拍摄 / 取消
                </button>
                <button className="btn btn-primary btn-glow-green" onClick={handleSave}>
                  <Check size={16} />
                  <span>保存并打卡</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .scanner-container {
          margin-top: 1.5rem;
          min-height: 500px;
        }
        .scanner-header {
          margin-bottom: 1.5rem;
          border-bottom: 1px solid var(--border-glass);
          padding-bottom: 1rem;
        }
        .scanner-subtitle {
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin-top: 0.25rem;
        }
        .flex-items {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .glow-icon-purple {
          color: var(--color-info);
          filter: drop-shadow(0 0 5px var(--color-info));
        }

        .alert-error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #f87171;
          padding: 0.75rem 1rem;
          border-radius: var(--border-radius-sm);
          margin-bottom: 1rem;
          font-size: 0.9rem;
        }

        .scanner-workspace {
          display: grid;
          grid-template-columns: 1fr 1.2fr;
          gap: 1.5rem;
        }

        @media (max-width: 900px) {
          .scanner-workspace {
            grid-template-columns: 1fr;
          }
        }

        .workspace-upload-col {
          display: flex;
          flex-direction: column;
        }
        .dropzone-area {
          flex: 1;
          border: 2px dashed rgba(255, 255, 255, 0.1);
          border-radius: var(--border-radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 320px;
          cursor: pointer;
          transition: all 0.3s ease;
          background: rgba(255, 255, 255, 0.01);
        }
        .dropzone-area:hover {
          border-color: var(--color-info);
          background: rgba(99, 102, 241, 0.03);
        }
        .dropzone-content {
          text-align: center;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .upload-icon-circle {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.05);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
          margin-bottom: 1.25rem;
        }
        .upload-prompt {
          font-size: 1.05rem;
          margin-bottom: 0.5rem;
        }
        .upload-subtext {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin-bottom: 1rem;
        }
        .camera-option-tag {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.35rem 0.75rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-glass);
          border-radius: 20px;
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .image-preview-wrapper {
          width: 100%;
          border-radius: var(--border-radius-md);
          overflow: hidden;
          background: #0f172a;
          position: relative;
          aspect-ratio: 4/3;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--border-glass);
        }
        .preview-image-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .preview-actions-overlay {
          position: absolute;
          bottom: 1rem;
          left: 0;
          right: 0;
          display: flex;
          justify-content: center;
          gap: 1rem;
          z-index: 15;
          padding: 0 1rem;
        }
        .btn-sm {
          padding: 0.5rem 1rem;
          font-size: 0.85rem;
          border-radius: 6px;
        }
        .btn-glow-purple {
          box-shadow: 0 0 15px rgba(99, 102, 241, 0.5);
        }

        .workspace-results-col {
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .scanning-loader {
          text-align: center;
          padding: 3rem 1rem;
        }
        .radar-scanner-circle {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: rgba(99, 102, 241, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-info);
          margin: 0 auto 1.5rem auto;
          border: 1px solid rgba(99, 102, 241, 0.3);
        }
        .loader-sparkles {
          animation: spin 3s infinite linear;
        }
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
        .scanning-loader h4 {
          margin-bottom: 0.5rem;
        }
        .scanning-loader p {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }

        .results-empty-state {
          text-align: center;
          padding: 4rem 2rem;
          color: var(--text-muted);
          border: 1px dashed rgba(255, 255, 255, 0.05);
          border-radius: var(--border-radius-md);
        }
        .empty-book-art {
          font-size: 2.5rem;
          margin-bottom: 1.25rem;
          opacity: 0.7;
        }
        .results-empty-state h4 {
          color: var(--text-secondary);
          margin-bottom: 0.5rem;
        }
        .results-empty-state p {
          font-size: 0.8rem;
          margin-bottom: 1rem;
        }
        .demo-notice-tag {
          font-size: 0.75rem;
          color: var(--text-secondary);
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-glass);
          padding: 0.6rem 0.8rem;
          border-radius: 8px;
          display: block;
          max-width: 400px;
          margin: 0 auto;
          line-height: 1.4;
          text-align: left;
        }

        .scan-results-card {
          display: flex;
          flex-direction: column;
          height: 100%;
          justify-content: flex-start;
          animation: fadeIn 0.4s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .results-header-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        .type-selector-wrapper {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .type-label-tag {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }
        .meal-type-selector-input {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-glass);
          color: var(--text-primary);
          padding: 0.35rem 0.6rem;
          border-radius: 6px;
          font-size: 0.85rem;
          outline: none;
        }
        .scanned-meal-title {
          font-family: var(--font-heading);
          font-size: 1.4rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 1rem;
        }
        .meal-title-display-group {
          margin-bottom: 0.75rem;
        }
        .margin-none {
          margin: 0 !important;
        }

        .scanned-stats-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.75rem;
          margin-bottom: 1.25rem;
        }
        .scanned-stat-box {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-glass);
          border-radius: 10px;
          padding: 0.75rem 0.5rem;
          text-align: center;
        }
        .scanned-stat-box.orange { border-color: rgba(249, 115, 22, 0.15); }
        .scanned-stat-box.purple { border-color: rgba(99, 102, 241, 0.15); }
        .scanned-stat-box.yellow { border-color: rgba(245, 158, 11, 0.15); }
        .scanned-stat-box.danger { border-color: rgba(236, 72, 153, 0.15); }

        .scanned-stat-val {
          font-family: var(--font-heading);
          font-size: 1.2rem;
          font-weight: 700;
        }
        .scanned-stat-lbl {
          font-size: 0.65rem;
          color: var(--text-secondary);
          margin-top: 0.15rem;
        }

        .ingredients-breakdown-section {
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid var(--border-glass);
          border-radius: 12px;
          padding: 1rem;
          margin-bottom: 1.25rem;
        }
        .ingredients-section-title {
          font-size: 0.9rem;
          margin-bottom: 0.75rem;
          color: var(--text-secondary);
        }
        .ingredients-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          max-height: 180px;
          overflow-y: auto;
          padding-right: 4px;
        }
        .ingredient-item-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 6px;
          padding: 0.5rem 0.75rem;
        }
        .ingredient-display-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.8rem;
        }
        .ing-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          min-width: 0;
        }
        .ing-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--color-info);
          flex-shrink: 0;
        }
        .ing-name {
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .ing-weight {
          color: var(--text-muted);
          font-size: 0.75rem;
          flex-shrink: 0;
        }
        .ing-nutrients {
          text-align: right;
          flex-shrink: 0;
        }
        .macro-dots {
          display: block;
          font-size: 0.65rem;
          color: var(--text-secondary);
        }

        .ingredient-edit-fields {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          align-items: center;
        }
        .inline-input-name {
          flex: 2;
          padding: 0.25rem 0.5rem;
          font-size: 0.8rem;
        }
        .inline-input-wt {
          flex: 1;
          padding: 0.25rem 0.5rem;
          font-size: 0.8rem;
        }
        .nutrients-edit-grid {
          display: flex;
          gap: 0.25rem;
          flex: 3;
        }
        .inline-input-num {
          flex: 1;
          padding: 0.25rem 0.25rem;
          font-size: 0.75rem;
          text-align: center;
        }

        .scanned-actions-row {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          margin-top: auto;
        }
        .btn-glow-green {
          box-shadow: 0 0 15px rgba(16, 185, 129, 0.4);
        }
      `}</style>
    </div>
  );
}
