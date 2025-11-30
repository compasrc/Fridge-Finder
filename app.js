// -----------------
// Sign In / Sign Out
// -----------------
const authDiv = document.getElementById('authDiv');
const mainContent = document.getElementById('mainContent');
const signInBtn = document.getElementById('signInBtn');
const signUpBtn = document.getElementById('signUpBtn');
const signOutBtn = document.getElementById('signOutBtn');
const displayUser = document.getElementById('displayUser');
const authMessage = document.getElementById('authMessage');

const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');

let allRecipes = [];
let currentResults = [];

// -----------------
// Load Recipes JSON
// -----------------
async function loadRecipes() {
  try {
    const res = await fetch('data/recipes.json');
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    allRecipes = await res.json();
  } catch (err) {
    console.error('Failed to load recipes.json:', err);
    alert('Error loading recipes.json. Make sure the file exists.');
  }
}

// -----------------
// Emoji mapping
// -----------------
function getIngredientEmoji(ingredient) {
  const mapping = {
    "bread": "🥖", "pasta": "🍝", "cheese": "🧀", "milk": "🥛",
    "nuts": "🌰", "eggs": "🥚", "butter": "🧈", "avocado": "🥑",
    "tomato": "🍅", "banana": "🍌", "strawberry": "🍓",
    "lettuce": "🥬", "rice": "🍚", "peanut butter": "🥜",
    "jelly": "🍇", "naan": "🍞", "soy sauce": "🧂", "olive oil": "🫒",
    "salt": "🧂", "tomato sauce": "🍅"
  };
  for (const key in mapping) if (ingredient.includes(key)) return mapping[key];
  return "";
}

// -----------------
// Authentication Logic
// -----------------
function showMainContent(username) {
  authDiv.style.display = 'none';
  mainContent.style.display = 'block';
  displayUser.textContent = username;
  renderFavorites();
}

function showAuth() {
  authDiv.style.display = 'flex';
  mainContent.style.display = 'none';
  usernameInput.value = '';
  passwordInput.value = '';
}

signInBtn.addEventListener('click', () => {
  const user = usernameInput.value.trim();
  const pass = passwordInput.value;
  if (!user || !pass) {
    authMessage.textContent = 'Enter username and password';
    return;
  }
  const storedPass = localStorage.getItem('user_' + user);
  if (storedPass && storedPass === pass) {
    localStorage.setItem('currentUser', user);
    showMainContent(user);
    authMessage.textContent = '';
  } else {
    authMessage.textContent = 'Invalid username or password';
  }
});

signUpBtn.addEventListener('click', () => {
  const user = usernameInput.value.trim();
  const pass = passwordInput.value;
  if (!user || !pass) {
    authMessage.textContent = 'Enter username and password';
    return;
  }
  if (localStorage.getItem('user_' + user)) {
    authMessage.textContent = 'Username already exists';
    return;
  }
  localStorage.setItem('user_' + user, pass);
  localStorage.setItem('currentUser', user);
  showMainContent(user);
  authMessage.textContent = '';
});

signOutBtn.addEventListener('click', () => {
  localStorage.removeItem('currentUser');
  showAuth();
  renderFavorites();
});

// -----------------
// Ingredient Boxes
// -----------------
function getAllIngredients() {
  const ingredients = new Set();
  allRecipes.forEach(r => r.ingredients.forEach(i => ingredients.add(i.toLowerCase())));
  return Array.from(ingredients).sort();
}

function createIngredientBoxes() {
  const container = document.getElementById('ingredients-container');
  container.innerHTML = '';
  const ingredients = getAllIngredients();
  ingredients.forEach(ing => {
    const box = document.createElement('div');
    box.className = 'ingredient-box';
    box.textContent = ing;
    box.addEventListener('click', () => box.classList.toggle('selected'));
    container.appendChild(box);
  });
}

function getSelectedIngredients() {
  return Array.from(document.querySelectorAll('.ingredient-box.selected')).map(b => b.textContent.toLowerCase());
}

function getSelectedAllergens() {
  return Array.from(document.querySelectorAll('.allergy-filter:checked')).map(b => b.value.toLowerCase());
}

// -----------------
// Find Recipes
// -----------------
function findRecipes(selectedIngredients, selectedAllergens) {
  return allRecipes.filter(recipe => {
    const ing = recipe.ingredients.map(i => i.toLowerCase());

    for (const allergen of selectedAllergens) {
      if (allergensMatch(ing, allergen)) return false;
    }

    return ing.some(i => selectedIngredients.includes(i));
  });
}

function allergensMatch(recipeIngredients, allergen) {
  if (allergen === 'gluten') return recipeIngredients.some(i => i.includes('bread') || i.includes('pasta') || i.includes('naan'));
  if (allergen === 'nuts') return recipeIngredients.some(i => i.includes('nuts') || i.includes('peanut') || i.includes('almond'));
  if (allergen === 'dairy') return recipeIngredients.some(i => i.includes('cheese') || i.includes('milk') || i.includes('butter'));
  return false;
}

// -----------------
// Render Recipes
// -----------------
function renderRecipes(recipes) {
  const resultsDiv = document.getElementById('results');
  resultsDiv.innerHTML = '';

  if (!recipes.length) {
    resultsDiv.innerHTML = '<div class="no-results">No matches found!</div>';
    return;
  }

  recipes.forEach(recipe => {
    const card = document.createElement('div');
    card.className = 'recipe-card';

    const emojis = recipe.ingredients.map(getIngredientEmoji).filter(Boolean).join(' ');

    const favButton = document.createElement('button');
    favButton.className = 'fav-btn';
    favButton.textContent = localStorage.getItem(getUserKey(recipe.name)) ? '★ Favorited' : '☆ Favorite';
    favButton.addEventListener('click', () => toggleFavorite(recipe));

    card.innerHTML = `
      <h3>${emojis} ${recipe.name}</h3>
      <p><strong>Ingredients:</strong> ${recipe.ingredients.join(', ')}</p>
      <p><strong>Instructions:</strong> ${recipe.instructions}</p>
      <p><strong>Prep:</strong> ${recipe.prep_time_min} min, <strong>Cook:</strong> ${recipe.cook_time_min} min at ${recipe.heat}</p>
      <p><strong>Nutrition:</strong> ${recipe.nutrition.calories} kcal, ${recipe.nutrition.protein_g}g protein, ${recipe.nutrition.fat_g}g fat, ${recipe.nutrition.carbs_g}g carbs</p>
    `;
    card.appendChild(favButton);
    resultsDiv.appendChild(card);
  });
}

// -----------------
// Favorites
// -----------------
function getUserKey(recipeName) {
  const user = localStorage.getItem('currentUser');
  return user ? `${user}_${recipeName}` : recipeName;
}

function toggleFavorite(recipe) {
  const key = getUserKey(recipe.name);
  if (localStorage.getItem(key)) localStorage.removeItem(key);
  else localStorage.setItem(key, JSON.stringify(recipe));
  renderRecipes(currentResults);
  renderFavorites();
}

function renderFavorites() {
  const favoritesDiv = document.getElementById('favorites');
  favoritesDiv.innerHTML = '';

  const user = localStorage.getItem('currentUser');
  if (!user) {
    favoritesDiv.innerHTML = '<div class="no-results">Sign in to save favorites!</div>';
    return;
  }

  const favs = Object.keys(localStorage)
    .filter(k => k.startsWith(user + '_'))
    .map(k => JSON.parse(localStorage.getItem(k)));

  if (!favs.length) {
    favoritesDiv.innerHTML = '<div class="no-results">No favorites yet!</div>';
    return;
  }

  favs.forEach(recipe => {
    const card = document.createElement('div');
    card.className = 'recipe-card';

    const emojis = recipe.ingredients.map(getIngredientEmoji).filter(Boolean).join(' ');

    const removeBtn = document.createElement('button');
    removeBtn.textContent = '★ Remove';
    removeBtn.className = 'fav-btn';
    removeBtn.addEventListener('click', () => {
      localStorage.removeItem(getUserKey(recipe.name));
      renderFavorites();
      if (currentResults.length) renderRecipes(currentResults);
    });

    card.innerHTML = `
      <h3>${emojis} ${recipe.name}</h3>
      <p><strong>Ingredients:</strong> ${recipe.ingredients.join(', ')}</p>
      <p><strong>Instructions:</strong> ${recipe.instructions}</p>
    `;
    card.appendChild(removeBtn);
    favoritesDiv.appendChild(card);
  });
}

// -----------------
// Search Button
// -----------------
document.getElementById('search-btn').addEventListener('click', () => {
  const selectedIngredients = getSelectedIngredients();
  const selectedAllergens = getSelectedAllergens();

  if (!selectedIngredients.length) {
    alert('Select at least one ingredient!');
    return;
  }

  currentResults = findRecipes(selectedIngredients, selectedAllergens);
  renderRecipes(currentResults);
});

// -----------------
// Initialize
// -----------------
window.addEventListener('load', async () => {
  await loadRecipes();
  createIngredientBoxes();

  const currentUser = localStorage.getItem('currentUser');
  if (currentUser) showMainContent(currentUser);
  else showAuth();
});
