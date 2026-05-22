import express from 'express';
import {
  IMAGE_ESTIMATION_SYSTEM_PROMPT,
  TEXT_ESTIMATION_SYSTEM_PROMPT,
  applyImageNutritionLabelRules,
  applyNutritionLabelRules
} from '../utils/nutritionEstimate.js';

const router = express.Router();

const DEFAULT_DASHSCOPE_OMNI_MODEL = 'qwen3.5-omni-flash';

// Helper function to clean markdown formatting from LLM JSON responses
const cleanJsonResponse = (text) => {
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  return cleaned.trim();
};

const fetchWithTimeout = async (url, options = {}, timeoutMs = 30000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`AI 请求超时 (${timeoutMs / 1000} 秒)，请检查您的网络连接或 API 额度。`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
};

router.post('/scan', async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ message: '缺少图片 Base64 编码数据。' });
    }

    const dashscopeKey = process.env.DASHSCOPE_API_KEY;
    const dashscopeVisionModel = process.env.DASHSCOPE_VISION_MODEL || DEFAULT_DASHSCOPE_OMNI_MODEL;
    const aiApiKey = process.env.AI_API_KEY;
    const aiBaseUrl = process.env.AI_BASE_URL || 'https://api.openai.com/v1';

    const systemPrompt = IMAGE_ESTIMATION_SYSTEM_PROMPT;

    let response;
    let requestBody;
    let url;
    let headers = {
      'Content-Type': 'application/json'
    };

    if (dashscopeKey) {
      // 1. Prioritize Alibaba Cloud Qwen Omni (Domestic direct)
      url = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
      headers['Authorization'] = `Bearer ${dashscopeKey}`;
      
      requestBody = {
        model: dashscopeVisionModel,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: systemPrompt },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${image}` } }
            ]
          }
        ]
      };
    } else if (aiApiKey) {
      // 2. Use Custom Gemini/OpenAI Proxy
      url = `${aiBaseUrl}/chat/completions`;
      headers['Authorization'] = `Bearer ${aiApiKey}`;
      
      requestBody = {
        model: 'gpt-4o-mini', // or custom model configured in agent proxy
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: systemPrompt },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${image}` } }
            ]
          }
        ],
        response_format: { type: 'json_object' }
      };
    } else {
      // 3. Mock Fallback Mode (If no key is configured on server yet, for demo purposes)
      console.log('⚠️ 服务器未配置 DASHSCOPE_API_KEY 或 AI_API_KEY，使用 Mock 模拟识图返回。');
      const mockResult = {
        name: '服务器模拟：香煎三文鱼配藜麦沙拉',
        calories: 520,
        protein: 38,
        carbs: 35,
        fat: 24,
        items: [
          { name: '香煎三文鱼', weight: '150g', calories: 310, protein: 32, carbs: 0, fat: 20 },
          { name: '煮藜麦', weight: '100g', calories: 120, protein: 4, carbs: 21, fat: 2 },
          { name: '牛油果与绿叶沙拉', weight: '120g', calories: 90, protein: 2, carbs: 14, fat: 2 }
        ]
      };
      return res.json({ result: mockResult });
    }

    // Call external AI API
    const apiResponse = await fetchWithTimeout(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    }, 30000);

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      throw new Error(`AI 接口返回异常: ${apiResponse.status} - ${errorText}`);
    }

    const data = await apiResponse.json();
    const rawContent = data.choices[0].message.content;
    const cleanContent = cleanJsonResponse(rawContent);

    const parsedJson = applyImageNutritionLabelRules(JSON.parse(cleanContent));
    return res.json({ result: parsedJson });

  } catch (err) {
    console.error('AI 识图失败:', err);
    return res.status(500).json({ 
      message: 'AI 饮食识别接口调用异常。', 
      error: err.message 
    });
  }
});

// POST /api/ai/estimate-text - AI Text nutrition estimation
router.post('/estimate-text', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ message: '缺少饮食文本描述。' });
    }

    const dashscopeKey = process.env.DASHSCOPE_API_KEY;
    const dashscopeTextModel = process.env.DASHSCOPE_TEXT_MODEL || DEFAULT_DASHSCOPE_OMNI_MODEL;
    const aiApiKey = process.env.AI_API_KEY;
    const aiBaseUrl = process.env.AI_BASE_URL || 'https://api.openai.com/v1';

    const systemPrompt = TEXT_ESTIMATION_SYSTEM_PROMPT;

    let response;
    let requestBody;
    let url;
    let headers = {
      'Content-Type': 'application/json'
    };

    if (dashscopeKey) {
      // Use Qwen Omni text compatibility API
      url = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
      headers['Authorization'] = `Bearer ${dashscopeKey}`;
      
      requestBody = {
        model: dashscopeTextModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ]
      };
    } else if (aiApiKey) {
      // Use Custom OpenAI API
      url = `${aiBaseUrl}/chat/completions`;
      headers['Authorization'] = `Bearer ${aiApiKey}`;
      
      requestBody = {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ],
        response_format: { type: 'json_object' }
      };
    } else {
      // Mock Fallback Mode based on simple keyword search
      console.log('⚠️ 服务器未配置 DASHSCOPE_API_KEY 或 AI_API_KEY，使用 Mock 文本估算。');
      
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

      // Simple keyword matching to make the Mock look smart
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

      return res.json({ result: applyNutritionLabelRules(text, { name, calories, protein, carbs, fat, items }) });
    }

    const apiResponse = await fetchWithTimeout(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    }, 15000);

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      throw new Error(`AI 接口返回异常: ${apiResponse.status} - ${errorText}`);
    }

    const data = await apiResponse.json();
    const rawContent = data.choices[0].message.content;
    const cleanContent = cleanJsonResponse(rawContent);

    const parsedJson = applyNutritionLabelRules(text, JSON.parse(cleanContent));
    return res.json({ result: parsedJson });

  } catch (err) {
    console.error('AI 文本估算失败:', err);
    return res.status(500).json({ 
      message: 'AI 饮食文本识别接口调用异常。', 
      error: err.message 
    });
  }
});

export default router;
