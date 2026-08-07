// Vercel serverless function, /api/nutrition. CommonJS, same pattern as chat.js.
// Tries Nutritionix first (better natural-language matching, needs manual approval),
// then falls back to USDA FoodData Central (instant key, US-government, weaker on
// regional Indian dishes but works immediately). Both are free tiers, no card, ever.
// Configure whichever you have — the function uses what's available and skips the rest.

async function tryNutritionix(dish, appId, appKey) {
  const upstream = await fetch("https://trackapi.nutritionix.com/v2/natural/nutrients", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-app-id": appId,
      "x-app-key": appKey,
    },
    body: JSON.stringify({ query: dish }),
  });
  if (!upstream.ok) return null;
  const data = await upstream.json();
  if (!data.foods || data.foods.length === 0) return null;

  const totals = data.foods.reduce((acc, f) => ({
    calories: acc.calories + (f.nf_calories || 0),
    protein: acc.protein + (f.nf_protein || 0),
    fat: acc.fat + (f.nf_total_fat || 0),
    carbs: acc.carbs + (f.nf_total_carbohydrate || 0),
    sugar: acc.sugar + (f.nf_sugars || 0),
    fiber: acc.fiber + (f.nf_dietary_fiber || 0),
  }), { calories: 0, protein: 0, fat: 0, carbs: 0, sugar: 0, fiber: 0 });

  const servingDesc = data.foods.map((f) => `${f.serving_qty || ""} ${f.serving_unit || ""} ${f.food_name || ""}`.trim()).join(", ");
  return { ...totals, servingDesc };
}

async function tryUSDA(dish, apiKey) {
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(apiKey)}&query=${encodeURIComponent(dish)}&pageSize=1&dataType=Foundation,SR%20Legacy,Branded`;
  const upstream = await fetch(url);
  if (!upstream.ok) return null;
  const data = await upstream.json();
  if (!data.foods || data.foods.length === 0) return null;

  const food = data.foods[0];
  const nutrients = food.foodNutrients || [];
  const val = (names) => {
    const n = nutrients.find((fn) => names.includes(fn.nutrientName));
    return n ? n.value : null;
  };
  const calories = val(["Energy"]);
  if (calories == null) return null;

  const protein = val(["Protein"]);
  const fat = val(["Total lipid (fat)"]);
  const carbs = val(["Carbohydrate, by difference"]);
  const sugar = val(["Sugars, total including NLEA", "Sugars, total"]);
  const fiber = val(["Fiber, total dietary"]);

  const servingDesc = food.servingSize
    ? `${food.servingSize}${food.servingSizeUnit || ""} ${food.description}`
    : `100g ${food.description} (USDA per-100g reference)`;

  return { calories, protein: protein || 0, fat: fat || 0, carbs: carbs || 0, sugar: sugar || 0, fiber: fiber || 0, servingDesc };
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }
  if (req.method !== "POST") { res.status(405).json({ error: "Use POST" }); return; }

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const { dish } = body || {};
  if (!dish) { res.status(400).json({ error: "Missing 'dish' in request body." }); return; }

  const nixId = process.env.NUTRITIONIX_APP_ID;
  const nixKey = process.env.NUTRITIONIX_APP_KEY;
  const usdaKey = process.env.USDA_API_KEY;

  if (nixId && nixKey) {
    try {
      const result = await tryNutritionix(dish, nixId, nixKey);
      if (result) { res.status(200).json({ ...result, source: "Nutritionix" }); return; }
    } catch (e) { /* fall through to USDA */ }
  }

  if (usdaKey) {
    try {
      const result = await tryUSDA(dish, usdaKey);
      if (result) { res.status(200).json({ ...result, source: "USDA" }); return; }
    } catch (e) { /* fall through to not-found */ }
  }

  if (!nixId && !nixKey && !usdaKey) {
    res.status(500).json({ error: "No nutrition provider configured — set NUTRITIONIX_APP_ID/KEY and/or USDA_API_KEY in Vercel." });
    return;
  }

  res.status(404).json({ error: "No nutrition match found for that dish in any configured provider." });
};
