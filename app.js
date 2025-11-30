// -----------------
// Sign In / Sign Out with Password
// -----------------
const signInForm = document.getElementById('signInForm');
const signOutDiv = document.getElementById('signOutDiv');
const displayUser = document.getElementById('displayUser');
const signInBtn = document.getElementById('signInBtn');
const signOutBtn = document.getElementById('signOutBtn');

const usersKey = 'users'; // store users in localStorage

function getUsers() {
  return JSON.parse(localStorage.getItem(usersKey) || '{}');
}

function saveUsers(users) {
  localStorage.setItem(usersKey, JSON.stringify(users));
}

// Check if user is signed in
let currentUser = JSON.parse(localStorage.getItem('currentUser'));
if (currentUser) {
  showSignedIn(currentUser.username);
}

// Sign in / create account logic
signInBtn.addEventListener('click', () => {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();
  if (!username || !password) {
    alert('Please enter both username and password');
    return;
  }

  const users = getUsers();
  if (users[username]) {
    if (users[username].password === password) {
      currentUser = { username };
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      showSignedIn(username);
      renderFavorites();
    } else {
      alert('Incorrect password');
    }
  } else {
    // create account
    users[username] = { password };
    saveUsers(users);
    currentUser = { username };
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    showSignedIn(username);
    renderFavorites();
  }
});

// Sign out
signOutBtn.addEventListener('click', () => {
  localStorage.removeItem('currentUser');
  currentUser = null;
  showSignedOut();
  renderFavorites();
});

function showSignedIn(username) {
  signInForm.style.display = 'none';
  signOutDiv.style.display = 'block';
  displayUser.textContent = username;
}

function showSignedOut() {
  signInForm.style.display = 'flex';
  signOutDiv.style.display = 'none';
  document.getElementById('username').value = '';
  document.getElementById('password').value = '';
}

// -----------------
// Helper Functions
// -----------------
async function loadRecipes() {
  try {
    const res = await fetch("data/recipes.json");
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error("Error loading recipes:", error);
    alert("Failed to load recipes. Please check that data/recipes.json exists.");
    return [];
  }
}

function getAllIngredients(recipes) {
  const ingredients = new Set();
  recipes.forEach(recipe => recipe.ingredients.forEach(i => ingredients.add(i.toLowerCase())));
  return Array.from(ingredients).sort();
}

function createIngredientBoxes(ingredients) {
  const container = document.getElementById("ingredients-container");
  container.innerHTML = "";
  if (!ingredients.length) {
    container.innerHTML = '<p style="color:#B8732E;">No ingredients available</p>';
    return;
  }
  ingredients.forEach(ingredient => {
    const box = document.createElement("div");
    box.className = "ingredient-box";
    box.textContent = ingredient;
    box.addEventListener("click", () => box.classList.toggle("selected"));
    container.appendChild(box);
  });
}

function getSelectedIngredients() {
  return Array.from(document.querySelectorAll(".ingredient-box.selected")).map(b => b.textContent.toLowerCase());
}

function getSelectedAllergens() {
  return Array.from(document.querySelectorAll(".allergy-filter:checked")).map(b => b.value.toLowerCase());
}

function getIngredientEmoji(ingredient) {
  const mapping = {
    "bread":"🥖","pasta":"🍝","cheese":"🧀","milk":"🥛",
    "nuts":"🌰","eggs":"🥚","butter":"🧈","avocado":"🥑",
    "tomato":"🍅","banana":"🍌","strawberry":"🍓","lettuce":"🥬",
    "rice":"🍚","peanut butter":"🥜","jelly":"🍇","naan":"🍞",
    "soy sauce":"🧂","olive oil":"🫒","salt":"🧂","tomato sauce":"🍅"
  };
  for(const key in mapping) if(ingredient.includes(key)) return mapping[key];
  return "";
}

// -----------------
// Recipe Filtering
// -----------------
function findRecipes(userIngredients, recipes, selectedAllergens) {
  if(!userIngredients.length) return [];
  return recipes.filter(recipe => {
    const recipeIngredients = recipe.ingredients.map(i => i.toLowerCase());
    for(const allergen of selectedAllergens) {
      if(recipeIngredients.some(i=>{
        if(allergen==="gluten") return i.includes("bread")||i.includes("pasta")||i.includes("naan");
        if(allergen==="nuts") return i.includes("nuts")||i.includes("peanut")||i.includes("almond");
        if(allergen==="dairy") return i.includes("cheese")||i.includes("milk")||i.includes("butter");
        return false;
      })) return false;
    }
    return recipeIngredients.some(i=>userIngredients.includes(i));
  });
}

// -----------------
// Render Recipes & Favorites
// -----------------
let currentResults = [];
let allRecipes = [];

function getUserKey(recipeName) {
  return currentUser ? `${currentUser.username}_${recipeName}` : recipeName;
}

function toggleFavorite(recipe) {
  const key = getUserKey(recipe.name);
  if(localStorage.getItem(key)) localStorage.removeItem(key);
  else localStorage.setItem(key, JSON.stringify(recipe));
  renderRecipes(currentResults);
  renderFavorites();
}

function renderRecipes(recipes) {
  const resultsDiv = document.getElementById("results");
  resultsDiv.innerHTML = "";

  if(!recipes.length){
    resultsDiv.innerHTML = '<div class="no-results">No matches found.</div>';
    return;
  }

  recipes.forEach(recipe => {
    const card = document.createElement("div");
    card.className = "recipe-card";
    card.dataset.name = recipe.name;

    const emojis = recipe.ingredients.map(getIngredientEmoji).filter(Boolean).join(" ");

    const favButton = document.createElement("button");
    favButton.textContent = localStorage.getItem(getUserKey(recipe.name))?"★ Favorited":"☆ Favorite";
    favButton.className = "fav-btn";
    favButton.addEventListener("click",()=>toggleFavorite(recipe));

    // Comment Section
    const commentDiv = document.createElement("div");
    commentDiv.className = "comment-section";
    commentDiv.innerHTML = `
      <input type="text" placeholder="Write a comment..." class="comment-input">
      <button type="button" class="comment-btn">Post</button>
    `;
    commentDiv.querySelector(".comment-btn").addEventListener("click", ()=>{
      postComment(recipe.name, commentDiv.querySelector(".comment-input").value);
      commentDiv.querySelector(".comment-input").value="";
      renderComments();
    });

    card.innerHTML = `
      <h3>${emojis} ${recipe.name}</h3>
      <p><strong>Ingredients:</strong> ${recipe.ingredients.join(", ")}</p>
      <p>${recipe.instructions}</p>
    `;
    card.appendChild(favButton);
    card.appendChild(commentDiv);
    resultsDiv.appendChild(card);
  });

  renderComments();
}

function renderFavorites(){
  const favoritesDiv = document.getElementById("favorites");
  favoritesDiv.innerHTML = "";

  if(!currentUser){
    favoritesDiv.innerHTML = '<div class="no-results">Sign in to save favorites!</div>';
    return;
  }

  const favoriteRecipes = Object.keys(localStorage)
    .filter(k=>k.startsWith(`${currentUser.username}_`))
    .map(k=>JSON.parse(localStorage.getItem(k)));

  if(!favoriteRecipes.length){
    favoritesDiv.innerHTML = '<div class="no-results">No favorite recipes yet.</div>';
    return;
  }

  favoriteRecipes.forEach(recipe=>{
    const card = document.createElement("div");
    card.className = "recipe-card";
    card.dataset.name = recipe.name;

    const emojis = recipe.ingredients.map(getIngredientEmoji).filter(Boolean).join(" ");

    const unfavBtn = document.createElement("button");
    unfavBtn.textContent="★ Remove";
    unfavBtn.className="fav-btn";
    unfavBtn.addEventListener("click",()=>{
      localStorage.removeItem(getUserKey(recipe.name));
      renderFavorites();
      if(currentResults.length>0) renderRecipes(currentResults);
    });

    card.innerHTML = `
      <h3>${emojis} ${recipe.name}</h3>
      <p><strong>Ingredients:</strong> ${recipe.ingredients.join(", ")}</p>
      <p>${recipe.instructions}</p>
    `;
    card.appendChild(unfavBtn);
    favoritesDiv.appendChild(card);
  });
}

// -----------------
// Comments
// -----------------
function postComment(recipeName, text){
  if(!currentUser){
    alert("Sign in to post comments!");
    return;
  }
  if(!text.trim()) return;

  const key = `comments_${recipeName}`;
  const comments = JSON.parse(localStorage.getItem(key) || "[]");
  comments.push({username: currentUser.username, text: text.trim(), timestamp: Date.now()});
  localStorage.setItem(key, JSON.stringify(comments));
  renderComments();
}

function renderComments(){
  document.querySelectorAll(".recipe-card").forEach(card=>{
    const recipeName = card.dataset.name;
    const key = `comments_${recipeName}`;
    const comments = JSON.parse(localStorage.getItem(key) || "[]");

    let prevList = card.querySelector(".comment-list");
    if(prevList) prevList.remove();

    const listDiv = document.createElement("div");
    listDiv.className="comment-list";

    comments.forEach(c=>{
      const cDiv = document.createElement("div");
      cDiv.className="comment";
      const time = new Date(c.timestamp).toLocaleString();
      cDiv.textContent = `${c.username}: ${c.text} (${time})`;
      listDiv.appendChild(cDiv);
    });

    card.querySelector(".comment-section").appendChild(listDiv);
  });
}

// -----------------
// Initialize & Search
// -----------------
async function initializeApp(){
  allRecipes = await loadRecipes();
  createIngredientBoxes(getAllIngredients(allRecipes));
  renderFavorites();
}

async function performSearch(){
  const userIngredients = getSelectedIngredients();
  const selectedAllergens = getSelectedAllergens();
  if(!userIngredients.length){ alert("Select at least one ingredient!"); return; }
  currentResults = findRecipes(userIngredients, allRecipes, selectedAllergens);
  renderRecipes(currentResults);
}

// Event Listeners
document.getElementById("search-btn").addEventListener("click", performSearch);
window.addEventListener("load", initializeApp);
