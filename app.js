// -----------------
// DOM Elements
// -----------------
const authDiv = document.getElementById("authDiv");
const mainContent = document.getElementById("mainContent");

const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const signInBtn = document.getElementById("signInBtn");
const signUpBtn = document.getElementById("signUpBtn");
const authMessage = document.getElementById("authMessage");

const signOutDiv = document.getElementById("signOutDiv");
const displayUser = document.getElementById("displayUser");
const signOutBtn = document.getElementById("signOutBtn");

const searchBtn = document.getElementById("search-btn");
const ingredientsContainer = document.getElementById("ingredients-container");
const resultsDiv = document.getElementById("results");
const favoritesDiv = document.getElementById("favorites");

const commentInput = document.getElementById("commentInput");
const postCommentBtn = document.getElementById("postCommentBtn");
const commentList = document.getElementById("commentList");

// -----------------
// App State
// -----------------
let allRecipes = [];
let currentResults = [];
let selectedRecipe = null;

// -----------------
// User Auth Logic
// -----------------
function getUsers() {
  return JSON.parse(localStorage.getItem("users") || "{}");
}

function saveUsers(users) {
  localStorage.setItem("users", JSON.stringify(users));
}

function getCurrentUser() {
  return JSON.parse(localStorage.getItem("currentUser") || "null");
}

function setCurrentUser(user) {
  localStorage.setItem("currentUser", JSON.stringify(user));
}

function clearCurrentUser() {
  localStorage.removeItem("currentUser");
}

function showAuth() {
  authDiv.style.display = "flex";
  mainContent.style.display = "none";
}

function showMain() {
  authDiv.style.display = "none";
  mainContent.style.display = "block";
}

// -----------------
// Sign In / Sign Up
// -----------------
signUpBtn.addEventListener("click", () => {
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  if (!username || !password) {
    authMessage.textContent = "Please enter username and password.";
    return;
  }

  const users = getUsers();
  if (users[username]) {
    authMessage.textContent = "Username already exists.";
    return;
  }

  users[username] = { password };
  saveUsers(users);
  setCurrentUser({ username });
  authMessage.textContent = "";
  usernameInput.value = "";
  passwordInput.value = "";
  showMain();
  renderFavorites();
  renderComments();
});

signInBtn.addEventListener("click", () => {
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  if (!username || !password) {
    authMessage.textContent = "Please enter username and password.";
    return;
  }

  const users = getUsers();
  if (!users[username] || users[username].password !== password) {
    authMessage.textContent = "Invalid username or password.";
    return;
  }

  setCurrentUser({ username });
  authMessage.textContent = "";
  usernameInput.value = "";
  passwordInput.value = "";
  showMain();
  renderFavorites();
  renderComments();
});

signOutBtn.addEventListener("click", () => {
  clearCurrentUser();
  showAuth();
});

// -----------------
// Load Recipes
// -----------------
async function loadRecipes() {
  try {
    const res = await fetch("data/recipes.json");
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error(err);
    alert("Failed to load recipes.json");
    return [];
  }
}

// -----------------
// Ingredients
// -----------------
function getAllIngredients(recipes) {
  const ingredients = new Set();
  recipes.forEach(r => r.ingredients.forEach(i => ingredients.add(i.toLowerCase())));
  return Array.from(ingredients).sort();
}

function createIngredientBoxes(ingredients) {
  ingredientsContainer.innerHTML = "";
  ingredients.forEach(ingredient => {
    const box = document.createElement("div");
    box.className = "ingredient-box";
    box.textContent = ingredient;
    box.addEventListener("click", () => box.classList.toggle("selected"));
    ingredientsContainer.appendChild(box);
  });
}

function getSelectedIngredients() {
  return Array.from(document.querySelectorAll(".ingredient-box.selected")).map(b => b.textContent.toLowerCase());
}

function getSelectedAllergens() {
  return Array.from(document.querySelectorAll(".allergy-filter:checked")).map(c => c.value.toLowerCase());
}

// -----------------
// Recipe Filtering
// -----------------
function findRecipes(userIngredients, recipes, selectedAllergens) {
  if (userIngredients.length === 0) return [];
  return recipes.filter(recipe => {
    const recipeIngredients = recipe.ingredients.map(i => i.toLowerCase());

    // Exclude allergens
    for (const allergen of selectedAllergens) {
      if (recipeIngredients.some(i => {
        if (allergen === "gluten") return i.includes("bread") || i.includes("pasta") || i.includes("naan");
        if (allergen === "nuts") return i.includes("nuts") || i.includes("peanut") || i.includes("almond");
        if (allergen === "dairy") return i.includes("cheese") || i.includes("milk") || i.includes("butter");
        return false;
      })) return false;
    }

    return recipeIngredients.some(i => userIngredients.includes(i));
  });
}

// -----------------
// Render Recipes
// -----------------
function getUserKey(recipeName) {
  const user = getCurrentUser();
  return user ? `${user.username}_${recipeName}` : recipeName;
}

function toggleFavorite(recipe) {
  const key = getUserKey(recipe.name);
  if (localStorage.getItem(key)) localStorage.removeItem(key);
  else localStorage.setItem(key, JSON.stringify(recipe));
  renderRecipes(currentResults);
  renderFavorites();
}

function renderRecipes(recipes) {
  resultsDiv.innerHTML = "";
  if (recipes.length === 0) {
    resultsDiv.innerHTML = '<div class="no-results">No matches found.</div>';
    return;
  }

  recipes.forEach(recipe => {
    const card = document.createElement("div");
    card.className = "recipe-card";

    const favButton = document.createElement("button");
    favButton.textContent = localStorage.getItem(getUserKey(recipe.name)) ? "★ Favorited" : "☆ Favorite";
    favButton.className = "fav-btn";
    favButton.addEventListener("click", () => toggleFavorite(recipe));

    card.innerHTML = `
      <h3>${recipe.name}</h3>
      <p><strong>Ingredients:</strong> ${recipe.ingredients.join(", ")}</p>
      <p><strong>Instructions:</strong> ${recipe.instructions}</p>
      <p><strong>Prep Time:</strong> ${recipe.prep_time_min} min | <strong>Cook Time:</strong> ${recipe.cook_time_min} min | <strong>Heat:</strong> ${recipe.heat}</p>
      <p><strong>Nutrition:</strong> ${recipe.nutrition.calories} kcal, ${recipe.nutrition.protein_g}g protein, ${recipe.nutrition.fat_g}g fat, ${recipe.nutrition.carbs_g}g carbs</p>
    `;
    card.appendChild(favButton);

    // Clicking card selects for comments
    card.addEventListener("click", () => {
      selectedRecipe = recipe;
      renderComments();
    });

    resultsDiv.appendChild(card);
  });
}

// -----------------
// Favorites
// -----------------
function renderFavorites() {
  favoritesDiv.innerHTML = "";
  const user = getCurrentUser();
  if (!user) {
    favoritesDiv.innerHTML = '<div class="no-results">Sign in to save favorites!</div>';
    return;
  }

  const favoriteRecipes = Object.keys(localStorage)
    .filter(k => k.startsWith(user.username + "_"))
    .map(k => JSON.parse(localStorage.getItem(k)));

  if (favoriteRecipes.length === 0) {
    favoritesDiv.innerHTML = '<div class="no-results">No favorite recipes yet!</div>';
    return;
  }

  favoriteRecipes.forEach(recipe => {
    const card = document.createElement("div");
    card.className = "recipe-card";

    const unfavButton = document.createElement("button");
    unfavButton.textContent = "★ Remove";
    unfavButton.className = "fav-btn";
    unfavButton.addEventListener("click", () => {
      localStorage.removeItem(getUserKey(recipe.name));
      renderFavorites();
      if (currentResults.length > 0) renderRecipes(currentResults);
    });

    card.innerHTML = `
      <h3>${recipe.name}</h3>
      <p><strong>Ingredients:</strong> ${recipe.ingredients.join(", ")}</p>
      <p><strong>Instructions:</strong> ${recipe.instructions}</p>
    `;
    card.appendChild(unfavButton);
    favoritesDiv.appendChild(card);
  });
}

// -----------------
// Comments / Community
// -----------------
function getCommentKey(recipeName) {
  return `comments_${recipeName}`;
}

function postComment() {
  if (!selectedRecipe) {
    alert("Select a recipe to comment on!");
    return;
  }
  const user = getCurrentUser();
  if (!user) return;
  const text = commentInput.value.trim();
  if (!text) return;

  const key = getCommentKey(selectedRecipe.name);
  const comments = JSON.parse(localStorage.getItem(key) || "[]");
  comments.push({ user: user.username, text, timestamp: new Date().toISOString() });
  localStorage.setItem(key, JSON.stringify(comments));
  commentInput.value = "";
  renderComments();
}

function renderComments() {
  commentList.innerHTML = "";
  if (!selectedRecipe) {
    commentList.innerHTML = "<p>Select a recipe to view/post comments.</p>";
    return;
  }

  const comments = JSON.parse(localStorage.getItem(getCommentKey(selectedRecipe.name)) || "[]");
  if (comments.length === 0) {
    commentList.innerHTML = "<p>No comments yet. Be the first to comment!</p>";
    return;
  }

  comments.forEach(c => {
    const div = document.createElement("div");
    div.className = "comment";
    div.innerHTML = `<strong>${c.user}</strong>: ${c.text}`;
    commentList.appendChild(div);
  });
}

postCommentBtn.addEventListener("click", postComment);

// -----------------
// Search
// -----------------
searchBtn.addEventListener("click", () => {
  const selectedIngredients = getSelectedIngredients();
  const selectedAllergens = getSelectedAllergens();
  if (selectedIngredients.length === 0) {
    alert("Select at least one ingredient!");
    return;
  }
  currentResults = findRecipes(selectedIngredients, allRecipes, selectedAllergens);
  renderRecipes(currentResults);
});

// -----------------
// Initialize
// -----------------
window.addEventListener("load", async () => {
  allRecipes = await loadRecipes();
  const ingredients = getAllIngredients(allRecipes);
  createIngredientBoxes(ingredients);

  const user = getCurrentUser();
  if (user) showMain();
  else showAuth();
});
