import express from 'express';

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

const parseNumeric = (val, fallback = 0) => {
  if (val === undefined || val === null || val === '') return fallback;
  if (typeof val === 'number') {
    return Number.isFinite(val) ? val : fallback;
  }
  const clean = String(val).replace(/,/g, '').trim();
  const match = clean.match(/[-+]?\d+(?:\.\d+)?/);
  if (match) {
    const num = Number(match[0]);
    return Number.isFinite(num) ? num : fallback;
  }
  return fallback;
};

const sanitizeAiResult = (parsedJson) => {
  if (!parsedJson) return null;
  return {
    name: parsedJson.name || 'AI 估算餐食',
    calories: parseNumeric(parsedJson.calories),
    protein: parseNumeric(parsedJson.protein),
    carbs: parseNumeric(parsedJson.carbs),
    fat: parseNumeric(parsedJson.fat),
    explanation: parsedJson.explanation || '',
    items: Array.isArray(parsedJson.items) 
      ? parsedJson.items.map(item => ({
          name: item.name || '',
          weight: item.weight || '',
          calories: parseNumeric(item.calories),
          protein: parseNumeric(item.protein),
          carbs: parseNumeric(item.carbs),
          fat: parseNumeric(item.fat)
        }))
      : []
  };
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

    const systemPrompt = `You are a professional nutrition expert. Analyze the food image provided and estimate the dish name, estimated weight of each ingredient, calories (kcal), and macronutrients (protein in grams, carbohydrates in grams, fat in grams).

Critical Rules for Nutrition Facts Table (营养成分表) / Packaged Foods:
1. Identify Nutrition Tables: If the image contains a nutrition facts table (营养成分表), you must prioritize its data.
2. Unit Conversion: Check the energy unit. If it is in Kilojoules (kJ), you MUST divide it by 4.184 to convert it to Kilocalories (kcal). Do not confuse kJ and kcal!
3. Portion/Net Weight Scaling: Check the reference portion size (e.g., per 100g or per serving) and estimate/read the total net weight of the package. Scale all nutrient values proportionally: Total value = (Table value) * (Total net weight / Reference weight).
4. Explain the math in the "explanation" field.

Return strictly a valid JSON object in this format:
{
  "name": "Dish/Food name in Chinese",
  "calories": total_calories_number,
  "protein": total_protein_grams_number,
  "carbs": total_carbs_grams_number,
  "fat": total_fat_grams_number,
  "explanation": "A short (1-2 sentences) explanation in Chinese summarizing the food item, calorie/portion calculation, or nutrition tip.",
  "items": [
    { "name": "Ingredient name in Chinese", "weight": "100g", "calories": calories_number, "protein": protein_grams, "carbs": carbs_grams, "fat": fat_grams }
  ]
}
Do not return any markdown formatting outside of JSON, do not include any thoughts. Just clean raw JSON.`;

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
        explanation: '这是一道健康均衡的低卡减脂餐。富含优质三文鱼蛋白质、不饱和脂肪酸以及低 GI 的藜麦。',
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

    const parsedJson = JSON.parse(cleanContent);
    const sanitizedResult = sanitizeAiResult(parsedJson);
    return res.json({ result: sanitizedResult });

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

    const systemPrompt = `You are a professional nutrition expert. Analyze the food description text provided and estimate the summary dish name, estimated weight of each ingredient/food item, total calories (kcal), and macronutrients (protein in grams, carbohydrates in grams, fat in grams).

Critical Rules for Nutrition Facts Table (营养成分表) / Packaged Foods:
1. Unit Conversion: If the text specifies energy in Kilojoules (kJ), you MUST divide it by 4.184 to convert it to Kilocalories (kcal).
2. Portion/Net Weight Scaling: If the text specifies nutrition per 100g or per serving, and specifies a total package/portion net weight, scale all values proportionally to the actual consumed amount.
3. Provide a brief breakdown of the estimation or conversion math in the "explanation" field.

Return strictly a valid JSON object in this format:
{
  "name": "Summary of the meals in Chinese (e.g. 红烧肉配米饭)",
  "calories": total_calories_number,
  "protein": total_protein_grams_number,
  "carbs": total_carbs_grams_number,
  "fat": total_fat_grams_number,
  "explanation": "A short (1-2 sentences) explanation in Chinese summarizing the calculation or nutrition tips.",
  "items": [
    { "name": "Ingredient or food name in Chinese", "weight": "100g", "calories": calories_number, "protein": protein_grams, "carbs": carbs_grams, "fat": fat_grams }
  ]
}
Do not return any markdown formatting outside of JSON, do not include any thoughts. Just clean raw JSON.`;

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
      console.log('⚠️ 服务器未配置 DASHSCOPE_API_KEY 或 AI_API_KEY，使用 Mock 文本估算。');
      
      let name = '智能估算：健康餐组合';
      let calories = 450;
      let protein = 25;
      let carbs = 55;
      let fat = 12;
      let explanation = '根据您的文字描述，我们智能估算了本餐中各项食物原料的重量与营养成分。';
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
        explanation = '包含一碗标准熟白米饭（约 150g），搭配了适量蛋白质与蔬菜，主食碳水比例适中。';
      }
      if (lowerText.includes('肉') || lowerText.includes('猪肉') || lowerText.includes('红烧肉')) {
        name = name.includes('米饭') ? '红烧肉配米饭' : '红烧肉';
        items[1] = { name: '红烧肉', weight: '150g', calories: 717, protein: 15, carbs: 8, fat: 69 };
        calories = (name.includes('米饭') ? 174 : 0) + 717 + 70;
        protein = 15 + (name.includes('米饭') ? 4 : 0) + 2;
        carbs = (name.includes('米饭') ? 39 : 0) + 8 + 14;
        fat = 69 + 1;
        explanation = '红烧肉属于高脂肪高热量食物，酱油和糖的调味也增加了部分碳水，建议控制摄入频次。';
      }
      if (lowerText.includes('苹果') || lowerText.includes('沙拉')) {
        name = '健康水果沙拉';
        calories = 150;
        protein = 2;
        carbs = 30;
        fat = 2;
        explanation = '非常健康的蔬果沙拉，热量较低，富含膳食纤维，微量沙拉酱提供少许脂肪。';
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
        explanation = '烘焙面包属于精致碳水，含有较多奶油或黄油，因而热量与碳水、脂肪偏高。';
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
        explanation = '拿铁咖啡主要热量来源于全脂牛奶（约 250ml），浓缩咖啡本身热量极低。';
        items = [
          { name: '牛奶', weight: '250ml', calories: 150, protein: 8, carbs: 12, fat: 7 },
          { name: '浓缩咖啡', weight: '30ml', calories: 10, protein: 1, carbs: 2, fat: 0 }
        ];
      }

      return res.json({ result: { name, calories, protein, carbs, fat, explanation, items } });
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

    const parsedJson = JSON.parse(cleanContent);
    const sanitizedResult = sanitizeAiResult(parsedJson);
    return res.json({ result: sanitizedResult });

  } catch (err) {
    console.error('AI 文本估算失败:', err);
    return res.status(500).json({ 
      message: 'AI 饮食文本识别接口调用异常。', 
      error: err.message 
    });
  }
});

export default router;
