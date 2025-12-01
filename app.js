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
let currentResults = [];
let currentUser = null;
let selectedRecipeForPlan = null;
let selectedRecipeForComment = null;

// -----------------
// LOAD RECIPES JSON
// -----------------
async function loadRecipes() {
    try {
        const res = await fetch("data/recipes.json");
        allRecipes = await res.json();
        console.log("Recipes loaded:", allRecipes.length);
    } catch (err) {
        console.error("Error loading recipes:", err);
    }
}

// -----------------
// LOCALSTORAGE HELPERS
// -----------------
const getUsers = () => JSON.parse(localStorage.getItem("users") || "{}");
const saveUser = (u, p) => {
    const users = getUsers();
    users[u] = p;
    localStorage.setItem("users", JSON.stringify(users));
};

const getFavorites = (u) => JSON.parse(localStorage.getItem(`fav_${u}`) || "[]");
const saveFavorites = (u, favs) => localStorage.setItem(`fav_${u}`, JSON.stringify(favs));

const getGeneralComments = () => JSON.parse(localStorage.getItem("generalComments") || "[]");
const saveGeneralComments = (c) => localStorage.setItem("generalComments", JSON.stringify(c));

const getRecipeComments = (r) => JSON.parse(localStorage.getItem(`comments_${r}`) || "[]");
const saveRecipeComments = (r, c) => localStorage.setItem(`comments_${r}`, JSON.stringify(c));

function getMealPlan(u) {
    const base = { Sunday:{}, Monday:{}, Tuesday:{}, Wednesday:{}, Thursday:{}, Friday:{}, Saturday:{} };
    for (let d in base) base[d] = { breakfast:null, lunch:null, dinner:null };
    return Object.assign(base, JSON.parse(localStorage.getItem(`meal_${u}`) || "{}"));
}
const saveMealPlan = (u, p) => localStorage.setItem(`meal_${u}`, JSON.stringify(p));

// -----------------
// AUTH
// -----------------
function showMainContent(user) {
    authDiv.style.display = "none";
    mainContent.style.display = "block";
    displayUser.textContent = user;
    currentUser = user;
    renderFavorites();
    renderGeneralComments();
    renderWeeklyPlan();
    switchTab("search");
}

function showAuth() {
    mainContent.style.display = "none";
    authDiv.style.display = "block";
    usernameInput.value = "";
    passwordInput.value = "";
    currentUser = null;
}

// SIGN IN
signInBtn.addEventListener("click", () => {
    const u = usernameInput.value.trim();
    const p = passwordInput.value;
    if (!u || !p) {
        authMessage.textContent = "Enter username and password.";
        authMessage.style.color = "red";
        return;
    }
    const users = getUsers();
    if (!users[u] || users[u] !== p) {
        authMessage.textContent = "Incorrect username or password.";
        authMessage.style.color = "red";
        return;
    }
    authMessage.textContent = "";
    showMainContent(u);
});

// SIGN UP
signUpBtn.addEventListener("click", () => {
    const u = usernameInput.value.trim();
    const p = passwordInput.value;
    if (!u || !p) {
        authMessage.textContent = "Enter username and password.";
        authMessage.style.color = "red";
        return;
    }
    const users = getUsers();
    if (users[u]) {
        authMessage.textContent = "Username already exists.";
        authMessage.style.color = "red";
        return;
    }
    saveUser(u, p);
    authMessage.textContent = "Account created!";
    authMessage.style.color = "green";
});

// SIGN OUT
signOutBtn.addEventListener("click", showAuth);

// -----------------
// TABS
// -----------------
function switchTab(tabId) {
    tabContents.forEach(t => t.style.display = "none");
    document.getElementById(tabId).style.display = "block";
    tabButtons.forEach(b => b.classList.remove("active"));
    document.querySelector(`.tab-button[data-tab="${tabId}"]`).classList.add("active");
}

tabButtons.forEach(btn =>
    btn.addEventListener("click", () => switchTab(btn.dataset.tab))
);

// -----------------
// SEARCH
// -----------------
searchBtn.addEventListener("click", () => {
    currentResults = allRecipes;
    renderResults();
});

function renderResults() {
    resultsDiv.innerHTML = "";
    currentResults.forEach(r => {
        const div = document.createElement("div");
        div.className = "recipe-card";
        div.innerHTML = `
            <h3>${r.name}</h3>
            <button class="btn fav-btn">⭐</button>
            <button class="btn plan-btn">📅 Plan</button>
            <button class="btn comment-btn">💬 Comments</button>
        `;
        div.querySelector(".fav-btn").onclick = () => toggleFavorite(r.name);
        div.querySelector(".plan-btn").onclick = () => openPlanModal(r.name);
        div.querySelector(".comment-btn").onclick = () => openRecipeComments(r.name);
        resultsDiv.appendChild(div);
    });
}

// -----------------
// FAVORITES
// -----------------
function toggleFavorite(name) {
    let favs = getFavorites(currentUser);
    if (favs.includes(name)) favs = favs.filter(f => f !== name);
    else favs.push(name);
    saveFavorites(currentUser, favs);
    renderFavorites();
}

function renderFavorites() {
    const favDiv = document.getElementById("favorites-list");
    favDiv.innerHTML = "";
    getFavorites(currentUser).forEach(f => {
        const div = document.createElement("div");
        div.className = "favorite";
        div.innerHTML = `<p>${f}</p>`;
        favDiv.appendChild(div);
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
    generalCommentsContainer.innerHTML = "";
    getGeneralComments().forEach(c => {
        const div = document.createElement("div");
        div.className = "comment";
        div.innerHTML = `<strong>${c.user}:</strong> ${c.text}`;
        generalCommentsContainer.appendChild(div);
    });
}

// -----------------
// WEEKLY PLAN
// -----------------
function openPlanModal(recipe) {
    selectedRecipeForPlan = recipe;
    planRecipeName.textContent = recipe;
    planModal.style.display = "block";
}

planModalClose.onclick = () => planModal.style.display = "none";

planConfirmBtn.onclick = () => {
    if (!currentUser) return;
    const plan = getMealPlan(currentUser);
    const day = planDaySelect.value;
    const meal = planMealSelect.value;
    plan[day][meal] = selectedRecipeForPlan;
    saveMealPlan(currentUser, plan);
    planModal.style.display = "none";
    renderWeeklyPlan();
};

function renderWeeklyPlan() {
    const plan = getMealPlan(currentUser);
    weeklyPlanContainer.innerHTML = "";
    for (let day in plan) {
        const div = document.createElement("div");
        div.className = "day-plan";
        div.innerHTML = `
            <h3>${day}</h3>
            <p>Breakfast: ${plan[day].breakfast || "-"}</p>
            <p>Lunch: ${plan[day].lunch || "-"}</p>
            <p>Dinner: ${plan[day].dinner || "-"}</p>
        `;
        weeklyPlanContainer.appendChild(div);
    }
}

// -----------------
// RECIPE COMMENTS
// -----------------
function openRecipeComments(recipe) {
    selectedRecipeForComment = recipe;
    commentRecipeName.textContent = recipe;
    recipeCommentModal.style.display = "block";
    renderRecipeComments();
}

recipeCommentModalClose.onclick = () =>
    recipeCommentModal.style.display = "none";

recipeCommentBtn.onclick = () => {
    const text = recipeCommentTextarea.value.trim();
    if (!text) return;
    const comments = getRecipeComments(selectedRecipeForComment);
    comments.push({ user: currentUser, text });
    saveRecipeComments(selectedRecipeForComment, comments);
    recipeCommentTextarea.value = "";
    renderRecipeComments();
};

function renderRecipeComments() {
    recipeCommentsList.innerHTML = "";
    const comments = getRecipeComments(selectedRecipeForComment);
    comments.forEach(c => {
        const div = document.createElement("div");
        div.className = "comment";
        div.innerHTML = `<strong>${c.user}:</strong> ${c.text}`;
        recipeCommentsList.appendChild(div);
    });
}

// -----------------
// INITIALIZE
// -----------------
loadRecipes();
