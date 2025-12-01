// -----------------
// DOM ELEMENTS
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

const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');

const searchBtn = document.getElementById('search-btn');
const resultsDiv = document.getElementById('results');

const generalCommentsContainer = document.getElementById('general-comments-container');
const generalCommentTextarea = document.getElementById('general-comment-textarea');
const generalCommentBtn = document.getElementById('general-comment-btn');

const weeklyPlanContainer = document.getElementById('weekly-plan-container');

const planModal = document.getElementById('plan-modal');
const planModalClose = document.getElementById('plan-modal-close');
const planRecipeName = document.getElementById('plan-recipe-name');
const planDaySelect = document.getElementById('plan-day-select');
const planMealSelect = document.getElementById('plan-meal-select');
const planConfirmBtn = document.getElementById('plan-confirm-btn');

const recipeCommentModal = document.getElementById('recipe-comment-modal');
const recipeCommentModalClose = document.getElementById('recipe-comment-modal-close');
const commentRecipeName = document.getElementById('comment-recipe-name');
const recipeCommentsList = document.getElementById('recipe-comments-list');
const recipeCommentTextarea = document.getElementById('recipe-comment-textarea');
const recipeCommentBtn = document.getElementById('recipe-comment-btn');

// -----------------
// STATE
// -----------------
let allRecipes = [];
let currentUser = null;
let selectedRecipeForPlan = null;
let selectedRecipeForComment = null;

// -----------------
// LOAD RECIPES
// -----------------
async function loadRecipes() {
    try {
        const res = await fetch("data/recipes.json");
        allRecipes = await res.json();
    } catch (err) {
        console.error("Failed to load recipes.json:", err);
    }
}
loadRecipes();

// -----------------
// LOCALSTORAGE HELPERS
// -----------------
function getUsers() { return JSON.parse(localStorage.getItem('users') || '{}'); }
function saveUser(username, password) {
    const users = getUsers();
    users[username] = password;
    localStorage.setItem('users', JSON.stringify(users));
}

function getFavorites(username) { return JSON.parse(localStorage.getItem(`favorites_${username}`) || '[]'); }
function saveFavorites(username, data) { localStorage.setItem(`favorites_${username}`, JSON.stringify(data)); }

function getGeneralComments() { return JSON.parse(localStorage.getItem('generalComments') || '[]'); }
function saveGeneralComments(c) { localStorage.setItem('generalComments', JSON.stringify(c)); }

function getRecipeComments(name) { return JSON.parse(localStorage.getItem(`comments_${name}`) || '[]'); }
function saveRecipeComments(name, data) { localStorage.setItem(`comments_${name}`, JSON.stringify(data)); }

function getMealPlan(username) {
    const key = `mealPlan_${username}`;
    const base = {
        Sunday: {}, Monday: {}, Tuesday: {}, Wednesday: {},
        Thursday: {}, Friday: {}, Saturday: {}
    };
    ['breakfast','lunch','dinner'].forEach(meal => {
        for (const day in base) base[day][meal] = null;
    });
    const existing = JSON.parse(localStorage.getItem(key) || '{}');
    return Object.assign(base, existing);
}
function saveMealPlan(username, plan) {
    localStorage.setItem(`mealPlan_${username}`, JSON.stringify(plan));
}

// -----------------
// AUTHENTICATION
// -----------------
function showMainContent(username) {
    authDiv.style.display = "none";
    mainContent.style.display = "block";
    displayUser.textContent = username;
    currentUser = username;
    localStorage.setItem("currentUser", username);

    renderFavorites();
    renderGeneralComments();
    renderWeeklyPlan();

    switchTab("search");
}

function showAuth() {
    authDiv.style.display = "flex";
    mainContent.style.display = "none";
    usernameInput.value = "";
    passwordInput.value = "";
    currentUser = null;
    localStorage.removeItem("currentUser");
}

signInBtn.addEventListener("click", () => {
    const user = usernameInput.value.trim();
    const pass = passwordInput.value;

    if (!user || !pass) {
        authMessage.textContent = "Please enter both fields.";
        authMessage.style.color = "red";
        return;
    }

    const users = getUsers();
    if (!users[user] || users[user] !== pass) {
        authMessage.textContent = "Incorrect username or password.";
        authMessage.style.color = "red";
        return;
    }

    authMessage.textContent = "";
    showMainContent(user);
});

signUpBtn.addEventListener("click", () => {
    const user = usernameInput.value.trim();
    const pass = passwordInput.value;

    if (!user || !pass) {
        authMessage.textContent = "Please enter both fields.";
        authMessage.style.color = "red";
        return;
    }

    const users = getUsers();
    if (users[user]) {
        authMessage.textContent = "Username already taken.";
        authMessage.style.color = "red";
        return;
    }

    saveUser(user, pass);
    authMessage.textContent = "Account created! You can sign in.";
    authMessage.style.color = "green";
});

signOutBtn.addEventListener("click", showAuth);

// -----------------
// TAB SWITCHING
// -----------------
function switchTab(tabId) {
    tabContents.forEach(tab => tab.style.display = "none");
    tabButtons.forEach(btn => btn.classList.remove("active"));
    document.getElementById(tabId).style.display = "block";
    document.querySelector(`.tab-button[data-tab="${tabId}"]`).classList.add("active");
}
tabButtons.forEach(btn =>
    btn.addEventListener("click", () => switchTab(btn.dataset.tab))
);

// -----------------
// SEARCH
// -----------------
searchBtn.addEventListener("click", () => {
    resultsDiv.innerHTML = "";
    allRecipes.forEach(recipe => {
        const card = document.createElement("div");
        card.className = "recipe-card";
        card.innerHTML = `
            <h3>${recipe.name}</h3>
            <button class="btn small" data-fav="${recipe.name}">⭐ Favorite</button>
            <button class="btn small" data-plan="${recipe.name}">📅 Plan</button>
            <button class="btn small" data-comment="${recipe.name}">💬 Comments</button>
        `;
        resultsDiv.appendChild(card);
    });

    // Favorite button
    document.querySelectorAll("[data-fav]").forEach(btn =>
        btn.addEventListener("click", () => addFavorite(btn.dataset.fav))
    );

    // Plan modal
    document.querySelectorAll("[data-plan]").forEach(btn =>
        btn.addEventListener("click", () => openPlanModal(btn.dataset.plan))
    );

    // Comment modal
    document.querySelectorAll("[data-comment]").forEach(btn =>
        btn.addEventListener("click", () => openCommentModal(btn.dataset.comment))
    );
});

// -----------------
// FAVORITES
// -----------------
function addFavorite(name) {
    const favs = getFavorites(currentUser);
    if (!favs.includes(name)) favs.push(name);
    saveFavorites(currentUser, favs);
    renderFavorites();
}

function renderFavorites() {
    const list = document.getElementById("favorites-list");
    list.innerHTML = "";
    const favs = getFavorites(currentUser);
    if (favs.length === 0) {
        list.innerHTML = "<p>No favorites yet.</p>";
        return;
    }

    favs.forEach(name => {
        const div = document.createElement("div");
        div.className = "favorite-item";
        div.textContent = "⭐ " + name;
        list.appendChild(div);
    });
}

// -----------------
// GENERAL COMMENTS
// -----------------
generalCommentBtn.addEventListener("click", () => {
    const text = generalCommentTextarea.value.trim();
    if (!text) return;

    const comments = getGeneralComments();
    comments.push({ user: currentUser, text });
    saveGeneralComments(comments);

    generalCommentTextarea.value = "";
    renderGeneralComments();
});

function renderGeneralComments() {
    const comments = getGeneralComments();
    generalCommentsContainer.innerHTML = "";
    comments.forEach(c => {
        const div = document.createElement("div");
        div.className = "comment-box";
        div.innerHTML = `<strong>${c.user}:</strong> ${c.text}`;
        generalCommentsContainer.appendChild(div);
    });
}

// -----------------
// WEEKLY PLAN
// -----------------
function openPlanModal(recipeName) {
    selectedRecipeForPlan = recipeName;
    planRecipeName.textContent = recipeName;
    planModal.style.display = "block";
}

planModalClose.onclick = () => (planModal.style.display = "none");

planConfirmBtn.addEventListener("click", () => {
    const day = planDaySelect.value;
    const meal = planMealSelect.value;

    const plan = getMealPlan(currentUser);
    plan[day][meal] = selectedRecipeForPlan;

    saveMealPlan(currentUser, plan);
    renderWeeklyPlan();

    planModal.style.display = "none";
});

function renderWeeklyPlan() {
    const plan = getMealPlan(currentUser);
    weeklyPlanContainer.innerHTML = "";

    Object.keys(plan).forEach(day => {
        const div = document.createElement("div");
        div.className = "day-box";
        div.innerHTML = `<h3>${day}</h3>
            <p>Breakfast: ${plan[day].breakfast || "-"}</p>
            <p>Lunch: ${plan[day].lunch || "-"}</p>
            <p>Dinner: ${plan[day].dinner || "-"}</p>`;
        weeklyPlanContainer.appendChild(div);
    });
}

// -----------------
// RECIPE COMMENT MODAL
// -----------------
function openCommentModal(recipeName) {
    selectedRecipeForComment = recipeName;
    commentRecipeName.textContent = recipeName;
    renderRecipeComments();
    recipeCommentModal.style.display = "block";
}

recipeCommentModalClose.onclick = () => (recipeCommentModal.style.display = "none");

recipeCommentBtn.addEventListener("click", () => {
    const text = recipeCommentTextarea.value.trim();
    if (!text) return;

    const comments = getRecipeComments(selectedRecipeForComment);
    comments.push({ user: currentUser, text });
    saveRecipeComments(selectedRecipeForComment, comments);

    recipeCommentTextarea.value = "";
    renderRecipeComments();
});

function renderRecipeComments() {
    const comments = getRecipeComments(selectedRecipeForComment);
    recipeCommentsList.innerHTML = "";

    comments.forEach(c => {
        const div = document.createElement("div");
        div.className = "comment-box";
        div.innerHTML = `<strong>${c.user}:</strong> ${c.text}`;
        recipeCommentsList.appendChild(div);
    });
}
