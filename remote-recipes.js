/* Remote TheMealDB helper
   Exposes window.RemoteRecipes with methods:
     - getRemoteRecipes(force=false): returns normalized recipes (cached)
     - clearCache(): clears cached remote data
     - cacheInfo(): returns ISO timestamp string or null

   This module is intentionally non-ESM so it can be included before `app.js` as a normal script.
*/
(function(){
  const API_BASE = 'https://www.themealdb.com/api/json/v1/1';
  const CACHE_KEY = 'remoteMeals_v1';
  const CACHE_TS_KEY = 'remoteMealsTS_v1';
  const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

  function normalizeMeal(meal) {
    const ingredients = [];
    const measurements = [];
    
    for (let i = 1; i <= 20; i++) {
      const ing = meal[`strIngredient${i}`];
      const measure = meal[`strMeasure${i}`];
      
      if (ing && typeof ing === 'string' && ing.trim()) {
        const ingText = ing.trim().toLowerCase();
        const measureText = measure ? measure.trim() : '';
        ingredients.push(ingText);
        measurements.push(measureText);
      }
    }

    return {
      name: (meal.strMeal || 'Unknown').trim(),
      ingredients: ingredients,
      measurements: measurements,
      instructions: meal.strInstructions || '',
      image: meal.strMealThumb || ''
    };
  }

  async function fetchByLetter(letter) {
    const url = `${API_BASE}/search.php?f=${encodeURIComponent(letter)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} when fetching ${url}`);
    const data = await res.json();
    return data.meals || [];
  }

  async function loadRemoteRecipes() {
    // Fetch meals by first letter (a..z). This will build a reasonably sized dataset.
    const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
    const promises = letters.map(l => fetchByLetter(l).catch(err => {
      // Return empty array on single-letter failure to keep overall load resilient
      console.warn('fetchByLetter failed for', l, err);
      return [];
    }));

    const results = await Promise.all(promises);
    const meals = results.flat();

    const normalized = meals.map(normalizeMeal);

    // Deduplicate by name (case-insensitive)
    const map = new Map();
    for (const r of normalized) {
      const key = r.name.toLowerCase();
      if (!map.has(key)) map.set(key, r);
    }
    return Array.from(map.values());
  }

  function saveCache(arr) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(arr));
      localStorage.setItem(CACHE_TS_KEY, Date.now().toString());
    } catch (e) {
      console.warn('Failed to save remote cache', e);
    }
  }

  function loadCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      const ts = parseInt(localStorage.getItem(CACHE_TS_KEY) || '0', 10);
      if (!raw) return null;
      if (Date.now() - ts > TTL_MS) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.warn('Failed to load remote cache', e);
      return null;
    }
  }

  window.RemoteRecipes = {
    getRemoteRecipes: async function(force = false) {
      if (!force) {
        const cached = loadCache();
        if (cached) return cached;
      }
      const data = await loadRemoteRecipes();
      saveCache(data);
      return data;
    },
    clearCache: function() {
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_TS_KEY);
    },
    cacheInfo: function() {
      const ts = localStorage.getItem(CACHE_TS_KEY);
      return ts ? new Date(parseInt(ts, 10)).toISOString() : null;
    }
  };
})();
