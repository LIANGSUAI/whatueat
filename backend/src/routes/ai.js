import express from 'express';

const router = express.Router();

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

router.post('/scan', async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ message: '缺少图片 Base64 编码数据。' });
    }

    const dashscopeKey = process.env.DASHSCOPE_API_KEY;
    const aiApiKey = process.env.AI_API_KEY;
    const aiBaseUrl = process.env.AI_BASE_URL || 'https://api.openai.com/v1';

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

    let response;
    let requestBody;
    let url;
    let headers = {
      'Content-Type': 'application/json'
    };

    if (dashscopeKey) {
      // 1. Prioritize Alibaba Cloud Qwen-VL (Domestic direct)
      url = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
      headers['Authorization'] = `Bearer ${dashscopeKey}`;
      
      requestBody = {
        model: 'qwen-vl-plus',
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
    const apiResponse = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      throw new Error(`AI 接口返回异常: ${apiResponse.status} - ${errorText}`);
    }

    const data = await apiResponse.json();
    const rawContent = data.choices[0].message.content;
    const cleanContent = cleanJsonResponse(rawContent);

    const parsedJson = JSON.parse(cleanContent);
    return res.json({ result: parsedJson });

  } catch (err) {
    console.error('AI 识图失败:', err);
    return res.status(500).json({ 
      message: 'AI 饮食识别接口调用异常。', 
      error: err.message 
    });
  }
});

export default router;
