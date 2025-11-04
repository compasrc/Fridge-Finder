/* Simple heuristic-based ingredient categorizer
   Exposes window.IngredientCategories.categorizeIngredient(name)
   and window.IngredientCategories.CATEGORIES (array of category names)

   This is intentionally lightweight: it matches keywords to categories.
   You can extend the `KEYWORDS` map or provide a manual JSON override later.
*/
(function(){
  const CATEGORIES = [
    'Produce', 'Dairy', 'Meat', 'Seafood', 'Bakery', 'Pantry', 'Condiments', 'Spices', 'Drinks', 'Other'
  ];

  // Keywords map to categories (lowercased keys)
  const KEYWORDS = {
    produce: ['apple','banana','avocado','lettuce','tomato','onion','garlic','spinach','potato','carrot','cucumber','pepper','lemon','lime','strawberry','mango','pineapple','berry','orange'],
    dairy: ['milk','cheese','butter','cream','yogurt','parmesan','mozzarella'],
    meat: ['chicken','beef','pork','bacon','ham','turkey','sausage','lamb'],
    seafood: ['salmon','tuna','shrimp','prawn','crab','lobster','fish','anchovy'],
    bakery: ['bread','bagel','naan','brioche','bun','tortilla'],
    pantry: ['rice','pasta','flour','sugar','salt','oil','olive oil','soy sauce','vinegar','beans','lentil','peanut','peanut butter','jelly','jam','tomato sauce'],
    condiments: ['ketchup','mustard','mayonnaise','bbq','sauce','honey'],
    spices: ['salt','pepper','cumin','coriander','turmeric','paprika','cilantro','oregano','basil','parsley'],
    drinks: ['water','tea','coffee','juice','milk','wine','beer']
  };

  function categorizeIngredient(name) {
    if (!name || typeof name !== 'string') return 'Other';
    const s = name.toLowerCase();
    // check keywords map
    for (const [catKey, words] of Object.entries(KEYWORDS)) {
      for (const w of words) {
        if (s.includes(w)) return capitalizeCategory(catKey);
      }
    }
    return 'Other';
  }

  function capitalizeCategory(key) {
    switch (key) {
      case 'produce': return 'Produce';
      case 'dairy': return 'Dairy';
      case 'meat': return 'Meat';
      case 'seafood': return 'Seafood';
      case 'bakery': return 'Bakery';
      case 'pantry': return 'Pantry';
      case 'condiments': return 'Condiments';
      case 'spices': return 'Spices';
      case 'drinks': return 'Drinks';
      default: return 'Other';
    }
  }

  window.IngredientCategories = {
    categorizeIngredient,
    CATEGORIES
  };
})();
