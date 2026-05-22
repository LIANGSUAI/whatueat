const ENERGY_UNIT_PATTERN = '(?:kcal|KCAL|千卡|大卡|卡路里|kj|kJ|KJ|千焦)';
const NUMBER_PATTERN = '(\\d[\\d,]*(?:\\.\\d+)?)';

export const TEXT_ESTIMATION_SYSTEM_PROMPT = `You are a professional nutrition expert. Analyze the food description text provided and estimate the summary dish name, estimated weight of each ingredient/food item, total calories (kcal), and macronutrients (protein in grams, carbohydrates in grams, fat in grams).

Important nutrition-label rules:
1. If the user provides a nutrition label, use it before generic food estimates.
2. Convert energy units correctly: 1 kcal = 4.184 kJ. For example, 1883 kJ per 100g is about 450 kcal per 100g.
3. "per 100g" or "每100克/每一百克" is not the same as "per package". Total calories must be energy_per_100g_kcal * eaten_grams / 100.
4. Look for net weight/package weight and eaten amount, such as 净含量60g, 一包60g, 吃半包, 吃一整包, 吃30g.
5. If the label gives per-package/per-serving values, multiply by the eaten package/serving count.
6. If the food label is present but eaten grams/package weight is missing, do not pretend that a per-100g value is the whole package; estimate cautiously and mention the missing amount in estimationNote.

Return strictly a valid JSON object in this format:
{
  "name": "Summary of the meals in Chinese (e.g. 红烧肉配米饭)",
  "calories": total_calories_number,
  "protein": total_protein_grams_number,
  "carbs": total_carbs_grams_number,
  "fat": total_fat_grams_number,
  "estimationNote": "Short Chinese note explaining nutrition-label calculation or uncertainty",
  "items": [
    { "name": "Ingredient or food name in Chinese", "weight": "100g", "calories": calories_number, "protein": protein_grams, "carbs": carbs_grams, "fat": fat_grams }
  ]
}
Do not return any markdown formatting outside of JSON, do not include any thoughts. Just clean raw JSON.`;

export const IMAGE_ESTIMATION_SYSTEM_PROMPT = `You are a professional nutrition expert and food-label OCR assistant. Analyze the food image and estimate the food name, actual eaten weight, total calories (kcal), and macronutrients (protein, carbohydrates, fat in grams).

Decision process for every image:
1. First decide whether this is ordinary cooked food, unpackaged snacks, or packaged food with a visible nutrition label.
2. If a nutrition facts label or package label is visible and readable, prioritize the label over generic visual estimates.
3. OCR the key label evidence: energy value, energy unit, serving basis, net/package weight, serving count, and any visible eaten portion.
4. Convert units before calculating: 1 kcal = 4.184 kJ. "千焦/kJ" is not "千卡/kcal".
5. Distinguish basis carefully:
   - "每100g", "每100克", "每一百克", "per 100g" means per 100 grams, not per bag.
   - "每份", "每 serving" means per serving.
   - "每包", "每袋", "整包" means per package.
6. Calculate with the correct formula:
   - per 100g label: total_kcal = label_energy_kcal_per_100g * eaten_grams / 100.
   - per serving label: total_kcal = kcal_per_serving * eaten_servings.
   - per package label: total_kcal = kcal_per_package * eaten_packages.
7. For packaged snacks, look for 净含量/净重/规格 such as "净含量60g", "60g/包", "80克". If the image shows one package and the package weight is visible, calculate one package unless the image clearly shows only part was eaten.
8. If only part of a package is visible/eaten, estimate the eaten fraction conservatively and mention it in estimationNote.
9. If a per-100g label is visible but package/eaten grams are not visible, do not treat the per-100g value as the whole package. Use the per-100g reference value and explain that the package weight is missing.
10. Example: label says "1883 kJ/100g" and "净含量60g", one package eaten -> 1883 / 4.184 * 60 / 100 ≈ 270 kcal. It is not 1883 kcal and not 1883 kJ as kcal.
11. Example: label says "450 kcal/100g", package 80g, half package eaten -> 450 * 40 / 100 = 180 kcal.
12. Include the OCR label evidence and your calculation basis in "nutritionLabelText" and "estimationNote" so the result can be checked.

Return strictly a valid JSON object in this format:
{
  "name": "Food or dish name in Chinese",
  "calories": total_calories_number,
  "protein": total_protein_grams_number,
  "carbs": total_carbs_grams_number,
  "fat": total_fat_grams_number,
  "nutritionLabelText": "OCR text from visible nutrition label, net weight, serving basis, and eaten amount; empty string if no label is visible",
  "estimationNote": "Short Chinese note explaining label calculation or visual-estimate uncertainty",
  "items": [
    { "name": "Ingredient or food item name in Chinese", "weight": "100g", "calories": calories_number, "protein": protein_grams, "carbs": carbs_grams, "fat": fat_grams }
  ]
}
Do not return any markdown formatting outside of JSON, do not include any thoughts. Just clean raw JSON.`;

const normalizeText = (text) => String(text || '')
  .replace(/[，。；、]/g, ' ')
  .replace(/：/g, ':')
  .replace(/／/g, '/')
  .replace(/（/g, '(')
  .replace(/）/g, ')')
  .replace(/\s+/g, ' ')
  .trim();

const roundTo = (value, digits = 0) => {
  const factor = 10 ** digits;
  return Math.round((Number(value) || 0) * factor) / factor;
};

const readNumber = (value, fallback = 0) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const match = String(value ?? '').replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : fallback;
};

const energyToKcal = (value, unit) => {
  const normalizedUnit = String(unit || '').toLowerCase();
  const numericValue = Number(String(value).replace(/,/g, ''));
  if (normalizedUnit === 'kj' || unit === '千焦') {
    return numericValue / 4.184;
  }
  return numericValue;
};

const convertAmountToGrams = (value, unit) => {
  const numeric = Number(String(value).replace(/,/g, ''));
  if (!Number.isFinite(numeric)) return null;
  const normalizedUnit = String(unit || '').toLowerCase();
  if (normalizedUnit === 'kg' || unit === '千克' || unit === '公斤') return numeric * 1000;
  if (unit === '斤') return numeric * 500;
  return numeric;
};

const parseEnergyBasis = (inputText) => {
  const text = normalizeText(inputText);
  const unit = ENERGY_UNIT_PATTERN;
  const number = NUMBER_PATTERN;

  const patterns = [
    { basis: 'per100g', regex: new RegExp(`${number}\\s*(${unit})\\s*(?:/|每)?\\s*(?:100|一百)\\s*(?:g|克|公克)`, 'i') },
    { basis: 'per100g', regex: new RegExp(`(?:每\\s*)?(?:100|一百)\\s*(?:g|克|公克)[^\\d]{0,18}${number}\\s*(${unit})`, 'i') },
    { basis: 'perPackage', regex: new RegExp(`${number}\\s*(${unit})\\s*(?:/|每)\\s*(?:包|袋|盒|整包|每包)`, 'i') },
    { basis: 'perPackage', regex: new RegExp(`(?:每\\s*)?(?:包|袋|盒|整包|每包)[^\\d]{0,18}${number}\\s*(${unit})`, 'i') },
    { basis: 'perServing', regex: new RegExp(`${number}\\s*(${unit})\\s*(?:/|每)\\s*(?:份| serving)`, 'i') },
    { basis: 'perServing', regex: new RegExp(`(?:每\\s*)?(?:份|serving)[^\\d]{0,18}${number}\\s*(${unit})`, 'i') }
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern.regex);
    if (match) {
      return {
        basis: pattern.basis,
        rawValue: Number(String(match[1]).replace(/,/g, '')),
        unit: match[2],
        kcal: energyToKcal(match[1], match[2])
      };
    }
  }

  return null;
};

const parsePackageWeight = (inputText) => {
  const text = normalizeText(inputText);
  const patterns = [
    /(?:净含量|净重|规格|一包|每包|整包|一袋|每袋|整袋)[^\d]{0,14}(\d+(?:\.\d+)?)\s*(kg|千克|公斤|g|克|斤|ml|毫升)/i,
    /(\d+(?:\.\d+)?)\s*(kg|千克|公斤|g|克|斤|ml|毫升)\s*(?:\/?\s*(?:包|袋|盒)|装)/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const grams = convertAmountToGrams(match[1], match[2]);
      if (grams) {
        return { grams, label: `${roundTo(grams, 1)}g` };
      }
    }
  }

  return null;
};

const parsePackageMultiplier = (inputText) => {
  const text = normalizeText(inputText);
  if (/(半包|半袋|半盒|1\/2\s*(?:包|袋|盒)|0\.5\s*(?:包|袋|盒))/.test(text)) return 0.5;
  if (/(两包|两袋|两盒|二包|二袋|二盒)/.test(text)) return 2;

  const numeric = text.match(/(?:吃了|吃掉|食用|摄入|喝了|用了)?\s*(\d+(?:\.\d+)?)\s*(?:包|袋|盒|份)/);
  if (numeric) return Number(numeric[1]);

  if (/(一整包|一整袋|一整盒|整包|整袋|整盒|全包|全袋|全盒|一包|一袋|一盒|1\s*(?:包|袋|盒))/.test(text)) return 1;

  return null;
};

const parseExplicitConsumedGrams = (inputText) => {
  const text = normalizeText(inputText);
  const matches = [...text.matchAll(/(\d+(?:\.\d+)?)\s*(kg|千克|公斤|g|克|斤|ml|毫升)/gi)];

  for (const match of matches) {
    const index = match.index || 0;
    const context = text.slice(Math.max(0, index - 12), Math.min(text.length, index + match[0].length + 12));
    if (/(每\s*(?:100|一百)|\/\s*100|净含量|净重|规格|每包|每袋|每盒)/.test(context)) continue;

    const grams = convertAmountToGrams(match[1], match[2]);
    if (grams) {
      return { grams, label: `${roundTo(grams, 1)}g` };
    }
  }

  return null;
};

const parseConsumedAmount = (text) => {
  const explicitAmount = parseExplicitConsumedGrams(text);
  if (explicitAmount) return explicitAmount;

  const packageWeight = parsePackageWeight(text);
  const packageMultiplier = parsePackageMultiplier(text);
  if (packageWeight && packageMultiplier) {
    const grams = packageWeight.grams * packageMultiplier;
    return { grams, label: `${roundTo(grams, 1)}g`, packageWeight: packageWeight.grams, packageMultiplier };
  }

  return null;
};

const parseMacroValue = (inputText, label) => {
  const text = normalizeText(inputText);
  const match = text.match(new RegExp(`${label}\\s*:?\\s*(\\d[\\d,]*(?:\\.\\d+)?)\\s*(?:g|克)`, 'i'));
  return match ? Number(match[1].replace(/,/g, '')) : null;
};

const pickValue = (source, keys, fallback = undefined) => {
  for (const key of keys) {
    if (source?.[key] !== undefined && source[key] !== null && source[key] !== '') {
      return source[key];
    }
  }
  return fallback;
};

const unwrapEstimateResult = (rawResult = {}) => {
  if (typeof rawResult === 'string') {
    try {
      return JSON.parse(rawResult);
    } catch {
      return {};
    }
  }

  return rawResult?.result || rawResult?.data?.result || rawResult?.nutrition || rawResult?.estimate || rawResult || {};
};

const normalizeEstimateResult = (rawResult = {}) => {
  const result = unwrapEstimateResult(rawResult);
  const items = pickValue(result, ['items', 'ingredients', 'foods', 'foodItems'], []);
  const normalizedItems = Array.isArray(items) ? items : [];

  return {
    name: String(pickValue(result, ['name', 'dishName', 'mealName', 'title', 'foodName'], '智能估算餐食')),
    calories: Math.max(0, Math.round(readNumber(pickValue(result, ['calories', 'kcal', 'energyKcal', 'totalCalories', 'total_calories'])))),
    protein: Math.max(0, roundTo(readNumber(pickValue(result, ['protein', 'proteins', 'totalProtein', 'total_protein'])), 1)),
    carbs: Math.max(0, roundTo(readNumber(pickValue(result, ['carbs', 'carbohydrates', 'carbohydrate', 'totalCarbs', 'total_carbs'])), 1)),
    fat: Math.max(0, roundTo(readNumber(pickValue(result, ['fat', 'fats', 'totalFat', 'total_fat'])), 1)),
    estimationNote: pickValue(result, ['estimationNote', 'note', 'explanation'], '') ? String(pickValue(result, ['estimationNote', 'note', 'explanation'], '')) : '',
    items: normalizedItems.map((item) => ({
      name: String(pickValue(item, ['name', 'foodName', 'ingredient', 'title'], '食物项')),
      weight: String(pickValue(item, ['weight', 'amount', 'portion', 'quantity'], '')),
      calories: Math.max(0, Math.round(readNumber(pickValue(item, ['calories', 'kcal', 'energyKcal', 'totalCalories', 'total_calories'])))),
      protein: Math.max(0, roundTo(readNumber(pickValue(item, ['protein', 'proteins', 'totalProtein', 'total_protein'])), 1)),
      carbs: Math.max(0, roundTo(readNumber(pickValue(item, ['carbs', 'carbohydrates', 'carbohydrate', 'totalCarbs', 'total_carbs'])), 1)),
      fat: Math.max(0, roundTo(readNumber(pickValue(item, ['fat', 'fats', 'totalFat', 'total_fat'])), 1))
    }))
  };
};

export const applyNutritionLabelRules = (text, rawResult = {}) => {
  const result = normalizeEstimateResult(rawResult);
  const energy = parseEnergyBasis(text);
  if (!energy) return result;

  const packageMultiplier = parsePackageMultiplier(text);
  const consumedAmount = parseConsumedAmount(text);
  let amountFactor = null;
  let weightLabel = '';
  let basisLabel = '';

  if (energy.basis === 'per100g') {
    basisLabel = `${roundTo(energy.rawValue, 1)} ${energy.unit}/100g = ${roundTo(energy.kcal, 1)} kcal/100g`;
    if (!consumedAmount?.grams) {
      const referenceCalories = Math.max(1, Math.round(energy.kcal));
      const proteinPer100 = parseMacroValue(text, '蛋白质');
      const carbsPer100 = parseMacroValue(text, '碳水(?:化合物)?');
      const fatPer100 = parseMacroValue(text, '脂肪');
      const protein = proteinPer100 === null ? result.protein : roundTo(proteinPer100, 1);
      const carbs = carbsPer100 === null ? result.carbs : roundTo(carbsPer100, 1);
      const fat = fatPer100 === null ? result.fat : roundTo(fatPer100, 1);
      const itemName = result.name && result.name !== '智能估算餐食' ? result.name : '按营养表计算的零食';

      return {
        ...result,
        calories: referenceCalories,
        protein,
        carbs,
        fat,
        estimationNote: `检测到营养表 ${basisLabel}，但缺少净含量或实际食用克数；暂按100g参考值填写，没有把每100g热量当作整包热量。`,
        items: [
          {
            name: itemName,
            weight: '100g参考值',
            calories: referenceCalories,
            protein,
            carbs,
            fat
          }
        ]
      };
    }
    amountFactor = consumedAmount.grams / 100;
    weightLabel = consumedAmount.label;
  } else {
    basisLabel = energy.basis === 'perPackage'
      ? `${roundTo(energy.rawValue, 1)} ${energy.unit}/包 = ${roundTo(energy.kcal, 1)} kcal/包`
      : `${roundTo(energy.rawValue, 1)} ${energy.unit}/份 = ${roundTo(energy.kcal, 1)} kcal/份`;
    amountFactor = packageMultiplier || 1;
    weightLabel = energy.basis === 'perPackage' ? `${amountFactor}包` : `${amountFactor}份`;
  }

  const calories = Math.max(1, Math.round(energy.kcal * amountFactor));
  const proteinPerBasis = parseMacroValue(text, '蛋白质');
  const carbsPerBasis = parseMacroValue(text, '碳水(?:化合物)?');
  const fatPerBasis = parseMacroValue(text, '脂肪');

  const protein = proteinPerBasis === null ? result.protein : roundTo(proteinPerBasis * amountFactor, 1);
  const carbs = carbsPerBasis === null ? result.carbs : roundTo(carbsPerBasis * amountFactor, 1);
  const fat = fatPerBasis === null ? result.fat : roundTo(fatPerBasis * amountFactor, 1);
  const itemName = result.name && result.name !== '智能估算餐食' ? result.name : '按营养表计算的零食';

  return {
    ...result,
    calories,
    protein,
    carbs,
    fat,
    estimationNote: `已按营养表计算：${basisLabel}，食用 ${weightLabel}，约 ${calories} kcal。`,
    items: [
      {
        name: itemName,
        weight: weightLabel,
        calories,
        protein,
        carbs,
        fat
      }
    ]
  };
};

export const applyImageNutritionLabelRules = (rawResult = {}) => {
  const result = unwrapEstimateResult(rawResult);
  const labelText = [
    pickValue(result, ['nutritionLabelText', 'labelText', 'ocrText', 'detectedText'], ''),
    pickValue(result, ['servingBasis', 'basis', 'energyBasis'], ''),
    pickValue(result, ['packageWeight', 'netWeight', 'weightText'], ''),
    pickValue(result, ['consumedAmount', 'eatenAmount', 'portionText'], ''),
    pickValue(result, ['estimationNote', 'note', 'explanation'], '')
  ]
    .filter(Boolean)
    .join(' ');

  const imageLabelText = parsePackageWeight(labelText) && !parsePackageMultiplier(labelText)
    ? `${labelText} 食用一包`
    : labelText;

  return applyNutritionLabelRules(imageLabelText, result);
};
