// -----------------
// Helper Functions
// -----------------
function getIngredientEmoji(ingredient) {
  const emojiMap = {
    'chicken': '🍗',
    'beef': '🥩',
    'pork': '🥓',
    'fish': '🐟',
    'rice': '🍚',
    'pasta': '🍝',
    'tomato': '🍅',
    'lettuce': '🥬',
    'carrot': '🥕',
    'potato': '🥔',
    'onion': '🧅',
    'garlic': '🧄',
    'bread': '🍞',
    'cheese': '🧀',
    'egg': '🥚',
    'milk': '🥛',
    'apple': '🍎',
    'banana': '🍌',
    'lemon': '🍋',
    'orange': '🍊',
  };
  
  const ingLower = ingredient.toLowerCase();
  for (const [key, emoji] of Object.entries(emojiMap)) {
    if (ingLower.includes(key)) return emoji;
  }
  return '';
}

async function loadRecipes() {
  try {
    const res = await fetch("data/recipes.json");
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.error("Error loading recipes:", error);
    alert("Failed to load recipes. Please check that data/recipes.json exists.");
    return [];
  }
}

function getAllIngredients(recipes) {
  const ingredients = new Set();
  recipes.forEach(recipe => {
    recipe.ingredients.forEach(ingredient => ingredients.add(ingredient.toLowerCase()));
  });
  return Array.from(ingredients).sort();
}

function createIngredientBoxes(ingredients) {
  const container = document.getElementById("ingredients-container");
  container.innerHTML = "";
  
  if (ingredients.length === 0) {
    container.innerHTML = '<p style="color: #B8732E;">No ingredients available. Please check your recipes.json file.</p>';
    return;
  }
  // Build categorized sections using the IngredientCategories helper if available
  const categorize = window.IngredientCategories && window.IngredientCategories.categorizeIngredient
    ? window.IngredientCategories.categorizeIngredient
    : (() => 'Other');

  const categoriesMap = new Map();
  ingredients.forEach(ing => {
    const name = (ing || '').toLowerCase();
    const cat = categorize(name) || 'Other';
    if (!categoriesMap.has(cat)) categoriesMap.set(cat, new Set());
    categoriesMap.get(cat).add(name);
  });

  // Keep a global orig index counter so order can be restored even across categories
  let origCounter = 0;

  // Use preferred category order if available
  const categoryOrder = (window.IngredientCategories && window.IngredientCategories.CATEGORIES) || Array.from(categoriesMap.keys());

  categoryOrder.forEach(cat => {
    if (!categoriesMap.has(cat)) return;
    const section = document.createElement('div');
    section.className = 'category-section';

    const header = document.createElement('div');
    header.className = 'category-header';
    header.innerHTML = `<span>${cat}</span>`;
    const btn = document.createElement('button');
    btn.className = 'collapse-btn';
    btn.textContent = '-';
    header.appendChild(btn);
    section.appendChild(header);

    const items = document.createElement('div');
    items.className = 'category-items';

    Array.from(categoriesMap.get(cat)).sort().forEach(name => {
      const label = document.createElement('label');
      label.className = 'ingredient-item ingredient-box';
      label.dataset.name = name;
      label.dataset.origIndex = origCounter++;

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'ingredient-checkbox';
      checkbox.dataset.name = name;

      const span = document.createElement('span');
      span.textContent = name;

      // When checkbox changes, toggle selected styling on label
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) label.classList.add('selected'); else label.classList.remove('selected');
      });

      label.appendChild(checkbox);
      label.appendChild(span);
      items.appendChild(label);
    });

    // collapse/expand behavior
    btn.addEventListener('click', () => {
      const isHidden = items.style.display === 'none';
      items.style.display = isHidden ? '' : 'none';
      btn.textContent = isHidden ? '-' : '+';
    });

    section.appendChild(items);
    container.appendChild(section);
  });
}

function getSelectedIngredients() {
  // Read checked ingredient checkboxes (new categorized UI)
  const checked = Array.from(document.querySelectorAll('.ingredient-checkbox:checked'))
    .map(inp => inp.dataset.name && inp.dataset.name.toLowerCase());
  if (checked.length > 0) return checked;

  // Fallback: support legacy .ingredient-box.selected
  return Array.from(document.querySelectorAll('.ingredient-box.selected'))
    .map(box => (box.dataset.name || box.textContent).toLowerCase());
}

function getSelectedAllergens() {
  // Get all checked allergen checkboxes
  return Array.from(document.querySelectorAll('.allergen-checkbox:checked'))
    .map(checkbox => checkbox.value.toLowerCase());
}

// -----------------
// Favorites
// -----------------
function toggleFavorite(recipe) {
  const key = recipe.name;
  if (localStorage.getItem(key)) {
    localStorage.removeItem(key);
  } else {
    localStorage.setItem(key, JSON.stringify(recipe));
  }
  renderRecipes(currentResults);
  renderFavorites();
}

function renderFavorites() {
  const favoritesDiv = document.getElementById("favorites");
  favoritesDiv.innerHTML = "";

  const favoriteRecipes = Object.keys(localStorage)
    .filter(key => {
      try {
        const item = JSON.parse(localStorage.getItem(key));
        return item && item.name && item.ingredients;
      } catch {
        return false;
      }
    })
    .map(key => JSON.parse(localStorage.getItem(key)));

  if (favoriteRecipes.length === 0) {
    favoritesDiv.innerHTML = '<div class="no-results">No favorite recipes yet. Click the ☆ button to add favorites!</div>';
    return;
  }

  favoriteRecipes.forEach(recipe => {
    const card = document.createElement("div");
    card.className = "recipe-card";
    const emojis = recipe.ingredients.map(getIngredientEmoji).filter(Boolean).join(" ");
    
    const unfavButton = document.createElement("button");
    unfavButton.textContent = "★ Remove";
    unfavButton.className = "fav-btn";
    unfavButton.addEventListener("click", () => {
      localStorage.removeItem(recipe.name);
      renderFavorites();
      if (currentResults.length > 0) renderRecipes(currentResults);
    });
    
    var ingredientsList = recipe.ingredients.join(", ");
    if (recipe.measurements && Array.isArray(recipe.measurements)) {
      // Show measurements next to each ingredient if available
      ingredientsList = recipe.ingredients.map(function(ing, idx) {
        var meas = recipe.measurements[idx];
        return (meas && meas.trim() ? (meas.trim() + " " + ing) : ing);
      }).join(", ");
    }
    card.innerHTML = "<h3>" + emojis + " " + recipe.name + "</h3>" +
      "<p><strong>Ingredients:</strong> " + ingredientsList + "</p>" +
      "<p>" + recipe.instructions + "</p>";
    card.appendChild(unfavButton);
    favoritesDiv.appendChild(card);
  });
}

// Merge remote and local arrays. Local recipes override remote ones with the same name.
function mergeRecipes(remoteArr, localArr) {
  const map = new Map();
  (remoteArr || []).forEach(r => map.set(r.name.toLowerCase(), r));
  (localArr || []).forEach(l => map.set(l.name.toLowerCase(), l));
  return Array.from(map.values());
}

// Filter ingredient boxes based on a query string (hides non-matching boxes)
function filterIngredientBoxes(query) {
  const q = (query || '').trim().toLowerCase();
  const container = document.getElementById('ingredients-container');
  const sections = Array.from(container.querySelectorAll('.category-section'));

  if (!q) {
    // Restore original category order and item order by origIndex
    sections.forEach(section => {
      const items = Array.from(section.querySelectorAll('.ingredient-box'));
      items.sort((a, b) => Number(a.dataset.origIndex) - Number(b.dataset.origIndex));
      items.forEach(it => {
        it.classList.remove('filtered-out');
        section.querySelector('.category-items').appendChild(it);
      });
    });
    // No reordering of categories needed because we preserve original DOM order
    return;
  }

  const sectionsWithMatches = [];
  const sectionsWithoutMatches = [];

  sections.forEach(section => {
    const itemsContainer = section.querySelector('.category-items');
    const items = Array.from(itemsContainer.querySelectorAll('.ingredient-box'));
    const matches = [];
    const nonMatches = [];
    items.forEach(box => {
      const name = (box.dataset.name || box.textContent || '').toLowerCase();
      if (name.includes(q)) {
        box.classList.remove('filtered-out');
        matches.push(box);
      } else {
        box.classList.add('filtered-out');
        nonMatches.push(box);
      }
    });
    // Reorder items within the category: matches first
    matches.forEach(m => itemsContainer.appendChild(m));
    nonMatches.forEach(n => itemsContainer.appendChild(n));

    if (matches.length > 0) sectionsWithMatches.push(section);
    else sectionsWithoutMatches.push(section);
  });

  // Move categories with matches to the top in their original relative order
  sectionsWithMatches.forEach(s => container.appendChild(s));
  sectionsWithoutMatches.forEach(s => container.appendChild(s));
}

// Recipe search logic
function findRecipes(userIngredients, recipes, allergens = []) {
  // Convert ingredients to lowercase for case-insensitive matching
  const searchIngredients = userIngredients.map(ing => ing.toLowerCase());
  const searchAllergens = allergens.map(al => al.toLowerCase());

  return recipes.filter(recipe => {
    // Skip recipes with allergens if specified
    if (searchAllergens.length > 0) {
      const recipeIngredients = recipe.ingredients.map(ing => ing.toLowerCase());
      if (recipeIngredients.some(ing => searchAllergens.includes(ing))) {
        return false;
      }
    }

    // Check if recipe contains any of the selected ingredients
    const recipeIngredients = recipe.ingredients.map(ing => ing.toLowerCase());
    return searchIngredients.some(ingredient => recipeIngredients.includes(ingredient));
  });
}

// Select/check all available ingredients (works with categorized checkbox UI and legacy boxes)
function selectAllIngredients() {
  // Try categorized checkbox UI first
  const checkboxes = Array.from(document.querySelectorAll('.ingredient-checkbox'));
  if (checkboxes.length > 0) {
    checkboxes.forEach(cb => {
      cb.checked = true;
      const label = cb.closest('.ingredient-item') || cb.parentElement;
      if (label) label.classList.add('selected');
    });
    return;
  }

  // Fallback to legacy .ingredient-box elements
  const boxes = Array.from(document.querySelectorAll('.ingredient-box'));
  boxes.forEach(b => b.classList.add('selected'));
}

// -----------------
// Initialize & Search
// -----------------
async function initializeApp() {
  console.log("Initializing app...");

  const useRemoteEl = document.getElementById('use-remote');
  const refreshBtn = document.getElementById('refresh-remote');
  const statusSpan = document.getElementById('remote-status');

  // Wire up toggle to re-initialize when changed
  if (useRemoteEl && !useRemoteEl._initialized) {
    useRemoteEl.addEventListener('change', () => initializeApp());
    useRemoteEl._initialized = true;
  }

  // Wire up refresh button
  if (refreshBtn && !refreshBtn._initialized) {
    refreshBtn.addEventListener('click', async () => {
      if (!useRemoteEl || !useRemoteEl.checked) {
        alert('Enable "Use TheMealDB" first to refresh remote data.');
        return;
      }
      refreshBtn.disabled = true;
      if (statusSpan) statusSpan.textContent = 'Refreshing remote data...';
      try {
        const remote = await window.RemoteRecipes.getRemoteRecipes(true);
        const local = await loadRecipes();
        allRecipes = mergeRecipes(remote, local);
        const allIngredients = getAllIngredients(allRecipes);
        createIngredientBoxes(allIngredients);
  if (statusSpan) statusSpan.textContent = 'Remote recipes loaded (' + remote.length + ').';
      } catch (err) {
        console.error('Failed to refresh remote recipes', err);
        if (statusSpan) statusSpan.textContent = 'Failed to refresh remote data.';
      } finally {
        refreshBtn.disabled = false;
      }
    });
    refreshBtn._initialized = true;
  }

  try {
    if (useRemoteEl && useRemoteEl.checked && window.RemoteRecipes) {
      if (statusSpan) statusSpan.textContent = 'Loading remote recipes...';
      try {
        const remote = await window.RemoteRecipes.getRemoteRecipes(false);
        const local = await loadRecipes();
        allRecipes = mergeRecipes(remote, local);
  if (statusSpan) statusSpan.textContent = 'Using remote recipes (cached ' + (window.RemoteRecipes.cacheInfo() || 'unknown') + ')';
      } catch (err) {
        console.error('Remote load failed, falling back to local', err);
        if (statusSpan) statusSpan.textContent = 'Remote load failed — using local recipes.';
        allRecipes = await loadRecipes();
      }
    } else {
      allRecipes = await loadRecipes();
      if (statusSpan) statusSpan.textContent = 'Using local recipes.';
    }
  } catch (err) {
    console.error('Error initializing recipes', err);
    allRecipes = await loadRecipes();
    if (statusSpan) statusSpan.textContent = 'Using local recipes.';
  }

  console.log('Loaded recipes:', allRecipes);
  const allIngredients = getAllIngredients(allRecipes);
  console.log('All ingredients:', allIngredients);
  createIngredientBoxes(allIngredients);

  // Wire up ingredient search box (only once) and apply any current filter
  const searchInput = document.getElementById('ingredient-search');
  if (searchInput && !searchInput._initialized) {
    searchInput.addEventListener('input', (e) => filterIngredientBoxes(e.target.value));
    searchInput._initialized = true;
  }
  if (searchInput) filterIngredientBoxes(searchInput.value || '');

  // Wire up select-all button for testing
  const selectAllBtn = document.getElementById('select-all-ingredients');
  if (selectAllBtn && !selectAllBtn._initialized) {
    selectAllBtn.addEventListener('click', (e) => {
      e.preventDefault();
      selectAllIngredients();
    });
    selectAllBtn._initialized = true;
  }

  renderFavorites();
  console.log('App initialized successfully!');
}

async function performSearch() {
  const userIngredients = getSelectedIngredients();
  const selectedAllergens = getSelectedAllergens();

  if (userIngredients.length === 0) {
    alert("Please select at least one ingredient!");
    return;
  }

  currentResults = findRecipes(userIngredients, allRecipes, selectedAllergens);
  console.log("Search results:", currentResults);
  renderRecipes(currentResults);
}

// -----------------
// Recipe Rendering
// -----------------
function renderRecipes(recipes) {
  const resultsDiv = document.getElementById("results");
  resultsDiv.innerHTML = "";

  if (!recipes || recipes.length === 0) {
    resultsDiv.innerHTML = '<div class="no-results">No matching recipes found. Try selecting different ingredients!</div>';
    return;
  }

  recipes.forEach(recipe => {
    const card = document.createElement("div");
    card.className = "recipe-card";

    // Show all used ingredients from user's selection
    const emojis = recipe.ingredients
      .map(ing => getIngredientEmoji(ing))
      .filter(Boolean)
      .join(" ");

    // Create favorite button
    const favButton = document.createElement("button");
    favButton.textContent = localStorage.getItem(recipe.name) ? "★ Favorite" : "☆ Add to Favorites";
    favButton.className = "fav-btn";
    favButton.addEventListener("click", () => toggleFavorite(recipe));

    // Build ingredient list with measurements if available
    let ingredientsList = '<ul class="recipe-ingredients">';
    if (recipe.measurements && recipe.measurements.length > 0) {
      recipe.ingredients.forEach((ing, idx) => {
        const meas = recipe.measurements[idx];
        const displayMeas = meas && meas.trim() ? `<span class="measurement">${meas.trim()}</span> ` : '';
        const displayIng = ing.charAt(0).toUpperCase() + ing.slice(1); // Capitalize first letter
        ingredientsList += `<li>${displayMeas}${displayIng}</li>`;
      });
    } else {
      recipe.ingredients.forEach(ing => {
        const displayIng = ing.charAt(0).toUpperCase() + ing.slice(1); // Capitalize first letter
        ingredientsList += `<li>${displayIng}</li>`;
      });
    }
    ingredientsList += '</ul>';

    card.innerHTML = `
      <h3>${emojis} ${recipe.name}</h3>
      <div class="recipe-ingredients-section">
        <h4>Ingredients:</h4>
        ${ingredientsList}
      </div>
      <div class="recipe-instructions">
        <h4>Instructions:</h4>
        <p>${recipe.instructions}</p>
      </div>
    `;
    
    card.appendChild(favButton);
    resultsDiv.appendChild(card);
  });
}

// -----------------
// Event Listeners
// -----------------
document.getElementById("search-btn").addEventListener("click", performSearch);
window.addEventListener("load", initializeApp);
