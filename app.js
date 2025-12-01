// -----------------
// DOM Elements
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

// Tab elements
const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');

// Search elements
const searchBtn = document.getElementById('search-btn');
const resultsDiv = document.getElementById('results');
const ingredientsInput = document.getElementById('ingredients-input');

// General Comments elements
const generalCommentsContainer = document.getElementById('general-comments-container');
const generalCommentTextarea = document.getElementById('general-comment-textarea');
const generalCommentBtn = document.getElementById('general-comment-btn');

// Weekly Plan elements
const weeklyPlanContainer = document.getElementById('weekly-plan-container');
const planModal = document.getElementById('plan-modal');
const planModalClose = document.getElementById('plan-modal-close');
const planRecipeName = document.getElementById('plan-recipe-name');
const planDaySelect = document.getElementById('plan-day-select');
const planMealSelect = document.getElementById('plan-meal-select');
const planConfirmBtn = document.getElementById('plan-confirm-btn');

// Recipe Comments Modal elements
const recipeCommentModal = document.getElementById('recipe-comment-modal');
const recipeCommentModalClose = document.getElementById('recipe-comment-modal-close');
const commentRecipeName = document.getElementById('comment-recipe-name');
const recipeCommentsList = document.getElementById('recipe-comments-list');
const recipeCommentTextarea = document.getElementById('recipe-comment-textarea');
const recipeCommentBtn = document.getElementById('recipe-comment-btn');

// State Variables
let allRecipes = [];
let currentResults = [];
let currentUser = null;
let selectedRecipeForPlan = null;
let selectedRecipeForComment = null;

// -----------------
// Load Recipes JSON
// -----------------
async function loadRecipes() {
    try {
        const res = await fetch('data/recipes.json');
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        allRecipes = await res.json();
        console.log('Recipes loaded:', allRecipes.length);
    } catch (err) {
        console.error('Failed to load recipes.json:', err);
        document.getElementById('ingredients-container').innerHTML =
            `<div class="no-results">Error loading recipes: ${err.message}</div>`;
    }
}

// -----------------
// LocalStorage Helpers
// -----------------
function getUsers() { return JSON.parse(localStorage.getItem('users') || '{}'); }
function saveUser(username, password) {
    const users = getUsers();
    users[username] = password;
    localStorage.setItem('users', JSON.stringify(users));
}

function getFavorites(username) { return JSON.parse(localStorage.getItem(`favorites_${username}`) || '[]'); }
function saveFavorites(username, favorites) {
    localStorage.setItem(`favorites_${username}`, JSON.stringify(favorites));
}

function getRecipeComments(recipeName) { return JSON.parse(localStorage.getItem(`comments_${recipeName}`) || '[]'); }
function saveRecipeComments(recipeName, comments) {
    localStorage.setItem(`comments_${recipeName}`, JSON.stringify(comments));
}

function getGeneralComments() { return JSON.parse(localStorage.getItem('generalComments') || '[]'); }
function saveGeneralComments(comments) {
    localStorage.setItem('generalComments', JSON.stringify(comments));
}

function getMealPlan(username) {
    const key = `mealPlan_${username}`;
    const defaultPlan = {
        Sunday: {}, Monday: {}, Tuesday: {}, Wednesday: {},
        Thursday: {}, Friday: {}, Saturday: {}
    };

    ['breakfast', 'lunch', 'dinner'].forEach(meal => {
        Object.keys(defaultPlan).forEach(day => defaultPlan[day][meal] = null);
    });

    const storedPlan = JSON.parse(localStorage.getItem(key) || '{}');
    const plan = { ...defaultPlan };

    for (const day in storedPlan) {
        if (plan[day]) {
            plan[day] = { ...plan[day], ...storedPlan[day] };
        }
    }
    return plan;
}

function saveMealPlan(username, mealPlan) {
    localStorage.setItem(`mealPlan_${username}`, JSON.stringify(mealPlan));
}

// -----------------
// Emoji Mapping
// -----------------
function getIngredientEmoji(ingredient) {
    const mapping = {
        "bread": "🥖", "pasta": "🍝", "cheese": "🧀", "milk": "🥛",
        "nuts": "🌰", "eggs": "🥚", "butter": "🧈", "avocado": "🥑",
        "tomato": "🍅", "banana": "🍌", "strawberry": "🍓", "lettuce": "🥬",
        "rice": "🍚", "peanut butter": "🥜", "jelly": "🍇", "naan": "🍞",
        "soy sauce": "🧂", "olive oil": "🫒", "salt": "🧂", "tomato sauce": "🍅",
        "chicken": "🍗", "beef": "🥩", "pork": "🥓", "fish": "🐟", "tuna": "🐟"
    };

    for (const key in mapping) {
        if (ingredient.toLowerCase().includes(key)) return mapping[key];
    }
    return "";
}

// -----------------
// Authentication Logic
// -----------------
function showMainContent(username) {
    authDiv.style.display = 'none';
    mainContent.style.display = 'block';
    displayUser.textContent = username;
    currentUser = username;
    localStorage.setItem('currentUser', username);

    renderFavorites();
    renderGeneralComments();
    renderWeeklyPlan();

    switchTab('search');
}

function showAuth() {
    authDiv.style.display = 'flex';
    mainContent.style.display = 'none';
    usernameInput.value = '';
    passwordInput.value = '';
    currentUser = null;
    localStorage.removeItem('currentUser');

    resultsDiv.innerHTML = '';
    document.getElementById('favorites-list').innerHTML = '';
}

// Attach event listeners for auth buttons
signInBtn.addEventListener('click', () => {
    const user = usernameInput.value.trim();
    const pass = passwordInput.value.trim();
    const users = getUsers();

    if (users[user] && users[user] === pass) {
        authMessage.textContent = '';
        showMainContent(user);
    } else {
        authMessage.textContent = 'Invalid username or password.';
    }
});

signUpBtn.addEventListener('click', () => {
    const user = usernameInput.value.trim();
    const pass = passwordInput.value.trim();
    if (!user || !pass) return;

    const users = getUsers();
    if (users[user]) {
        authMessage.textContent = 'Username already exists.';
        return;
    }

    saveUser(user, pass);
    authMessage.textContent = 'Account created! Please sign in.';
});

signOutBtn.addEventListener('click', showAuth);

// --------------------------
// FIXED SEARCH FUNCTIONALITY
// --------------------------
searchBtn.addEventListener('click', () => {
    const query = ingredientsInput.value.trim().toLowerCase();
    resultsDiv.innerHTML = '';

    if (!query) {
        resultsDiv.innerHTML = `<div class="no-results">Enter ingredients to search.</div>`;
        return;
    }

    const queryIngredients = query.split(',').map(i => i.trim());

    currentResults = allRecipes.filter(recipe =>
        queryIngredients.every(q =>
            recipe.ingredients.some(ing => ing.toLowerCase().includes(q))
        )
    );

    if (currentResults.length === 0) {
        resultsDiv.innerHTML = `<div class="no-results">No matching recipes found.</div>`;
        return;
    }

    renderResults(currentResults);
});

// Render results into the DOM
function renderResults(recipes) {
    resultsDiv.innerHTML = recipes.map(recipe => `
        <div class="recipe-card">
            <h3>${recipe.name}</h3>
            <p><strong>Ingredients:</strong> ${recipe.ingredients.join(', ')}</p>
            <button class="add-to-plan-btn" data-name="${recipe.name}">Add to Weekly Plan</button>
            <button class="comment-btn" data-name="${recipe.name}">Comments</button>
            <button class="favorite-btn" data-name="${recipe.name}">Add to Favorites</button>
        </div>
    `).join('');

    attachRecipeButtons();
}

// -----------------
// Favorites, Weekly Plan, Comments, Tabs
// -----------------


// -----------------
// Load on start
// -----------------
window.addEventListener('DOMContentLoaded', async () => {
    await loadRecipes();

    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) showMainContent(savedUser);
});
