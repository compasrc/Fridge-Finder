// TheMealDB API integration
// Fetches recipes by ingredient and normalizes the data format

const RemoteRecipes = {
  baseUrl: 'https://www.themealdb.com/api/json/v1/1',
  
  // Common ingredients to fetch a diverse set of recipes
  commonIngredients: [
    'chicken', 'beef', 'pork', 'fish', 'salmon',
    'rice', 'pasta', 'potato', 'tomato', 'onion',
    'garlic', 'cheese', 'egg', 'milk', 'butter',
    'bread', 'carrot', 'mushroom', 'pepper', 'lemon'
  ],

  // Fetch recipes by ingredient
  async fetchByIngredient(ingredient) {
    try {
      const response = await fetch(`${this.baseUrl}/filter.php?i=${encodeURIComponent(ingredient)}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      return data.meals || [];
    } catch (error) {
      console.error(`Error fetching recipes for ${ingredient}:`, error);
      return [];
    }
  },

  // Fetch full recipe details by ID
  async fetchRecipeDetails(mealId) {
    try {
      const response = await fetch(`${this.baseUrl}/lookup.php?i=${mealId}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      return data.meals ? data.meals[0] : null;
    } catch (error) {
      console.error(`Error fetching recipe details for ${mealId}:`, error);
      return null;
    }
  },

  // Normalize TheMealDB recipe to our format
  normalizeRecipe(meal) {
    const ingredients = [];
    const ingredientsWithMeasures = [];
    
    // TheMealDB has ingredients in strIngredient1-20 format
    for (let i = 1; i <= 20; i++) {
      const ingredient = meal[`strIngredient${i}`];
      const measure = meal[`strMeasure${i}`];
      
      if (ingredient && ingredient.trim()) {
        ingredients.push(ingredient.toLowerCase().trim());
        
        // Combine measure and ingredient for display
        const measureText = measure && measure.trim() ? measure.trim() : '';
        ingredientsWithMeasures.push(
          measureText ? `${measureText} ${ingredient.trim()}` : ingredient.trim()
        );
      }
    }

    return {
      id: meal.idMeal,
      name: meal.strMeal,
      ingredients: ingredients,
      ingredientsWithMeasures: ingredientsWithMeasures,
      instructions: meal.strInstructions || 'No instructions available.',
      source: 'themealdb'
    };
  },

  // Load a diverse set of recipes from multiple ingredients
  async loadDiverseRecipes() {
    console.log('Fetching recipes from TheMealDB...');
    const allMeals = new Map(); // Use Map to deduplicate by ID

    // Fetch recipes for each common ingredient
    for (const ingredient of this.commonIngredients) {
      const meals = await this.fetchByIngredient(ingredient);
      
      // Get full details for first few meals from each ingredient
      const mealsToFetch = meals.slice(0, 3);
      
      for (const meal of mealsToFetch) {
        if (!allMeals.has(meal.idMeal)) {
          const details = await this.fetchRecipeDetails(meal.idMeal);
          if (details) {
            allMeals.set(meal.idMeal, this.normalizeRecipe(details));
          }
        }
      }
    }

    const recipes = Array.from(allMeals.values());
    console.log(`Loaded ${recipes.length} recipes from TheMealDB`);
    return recipes;
  }
};
