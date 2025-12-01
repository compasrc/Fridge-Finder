// -----------------
// app.js (complete, robust)
// -----------------

// DOM helpers (safe getElement)
function $id(id) { return document.getElementById(id); }
function $qs(sel) { return document.querySelector(sel); }
function $qsa(sel) { return Array.from(document.querySelectorAll(sel)); }

// -----------------
// DOM Elements (grab after DOMContentLoaded to be safe)
// -----------------
let authDiv, mainContent, signInBtn, signUpBtn, signOutBtn, displayUser, authMessage, usernameInput, passwordInput;
let tabButtons, tabContents;
let searchBtn, resultsDiv, ingredientsContainer;
let generalCommentsContainer, generalCommentTextarea, generalCommentBtn;
let weeklyPlanContainer, planModal, planModalClose, planRecipeName, planDaySelect, planMealSelect, planConfirmBtn;
let recipeCommentModal, recipeCommentModalClose, commentRecipeName, recipeCommentsList, recipeCommentTextarea, recipeCommentBtn;
let allergyCheckboxes;

// State
let allRecipes = [];
let currentResults = [];
let currentUser = null;
let selectedRecipeForPlan = null;
let selectedRecipeForComment = null;

// -----------------
// Utility: safe query/get - used to avoid null errors
// -----------------
function ensureElement(el, id) {
    if (!el) console.warn(`Missing element with id/select: ${id}`);
    return el;
}

// -----------------
// Load recipes from JSON
// -----------------
async function loadRecipes() {
    try {
        const res = await fetch('data/recipes.json');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        allRecipes = await res.json();
        console.log('Recipes loaded:', allRecipes.length);
        populateIngredientList();
    } catch (err) {
        console.error('Failed to load recipes.json:', err);
        if (ingredientsContainer) {
            ingredientsContainer.innerHTML = `<div class="no-results">Error loading recipes: ${err.message}</div>`;
        }
    }
}

// -----------------
// Populate ingredients checkboxes
// -----------------
function getAllIngredients() {
    const s = new Set();
    allRecipes.forEach(r => {
        if (Array.isArray(r.ingredients)) r.ingredients.forEach(i => s.add(String(i).toLowerCase()));
    });
    return [...s].sort();
}

function populateIngredientList() {
    if (!ingredientsContainer) return;
    const ingredients = getAllIngredients();
    if (!ingredients.length) {
        ingredientsContainer.innerHTML = `<div class="no-results">No ingredients found.</div>`;
        return;
    }

    ingredientsContainer.innerHTML = ingredients.map(ing => `
        <label class="ingredient-option" title="Filter by ${ing}">
            <input type="checkbox" class="ingredient-checkbox" value="${ing}">
            ${ing}
        </label>
    `).join('');
    // refresh allergyCheckboxes reference (if needed)
    allergyCheckboxes = $qsa('.allergy-filter');
}

// -----------------
// LocalStorage helpers
// -----------------
function getUsers() { return JSON.parse(localStorage.getItem('users') || '{}'); }
function saveUser(username, password) {
    const users = getUsers();
    users[username] = password;
    localStorage.setItem('users', JSON.stringify(users));
}
function getFavorites(username) { return JSON.parse(localStorage.getItem(`favorites_${username}`) || '[]'); }
function saveFavorites(username, favs) { localStorage.setItem(`favorites_${username}`, JSON.stringify(favs)); }
function getRecipeComments(recipeName) { return JSON.parse(localStorage.getItem(`comments_${recipeName}`) || '[]'); }
function saveRecipeComments(recipeName, comments) { localStorage.setItem(`comments_${recipeName}`, JSON.stringify(comments)); }
function getGeneralComments() { return JSON.parse(localStorage.getItem('generalComments') || '[]'); }
function saveGeneralComments(comments) { localStorage.setItem('generalComments', JSON.stringify(comments)); }

function getMealPlan(username) {
    const key = `mealPlan_${username}`;
    // default structure
    const defaultPlan = {
        Sunday: { breakfast: null, lunch: null, dinner: null },
        Monday: { breakfast: null, lunch: null, dinner: null },
        Tuesday: { breakfast: null, lunch: null, dinner: null },
        Wednesday: { breakfast: null, lunch: null, dinner: null },
        Thursday: { breakfast: null, lunch: null, dinner: null },
        Friday: { breakfast: null, lunch: null, dinner: null },
        Saturday: { breakfast: null, lunch: null, dinner: null }
    };
    const stored = JSON.parse(localStorage.getItem(key) || '{}');
    // merge
    Object.keys(defaultPlan).forEach(day => {
        defaultPlan[day] = { ...defaultPlan[day], ...(stored[day] || {}) };
    });
    return defaultPlan;
}
function saveMealPlan(username, plan) { localStorage.setItem(`mealPlan_${username}`, JSON.stringify(plan)); }

// -----------------
// Authentication UI
// -----------------
function showMainContent(username) {
    if (authDiv) authDiv.style.display = 'none';
    if (mainContent) mainContent.style.display = 'block';
    if (displayUser) displayUser.textContent = username;
    currentUser = username;
    localStorage.setItem('currentUser', username);

    renderFavorites();
    renderGeneralComments();
    renderWeeklyPlan();

    switchTab('search');
}

function showAuth() {
    if (authDiv) authDiv.style.display = 'flex';
    if (mainContent) mainContent.style.display = 'none';
    if (usernameInput) usernameInput.value = '';
    if (passwordInput) passwordInput.value = '';
    currentUser = null;
    localStorage.removeItem('currentUser');
    if (resultsDiv) resultsDiv.innerHTML = '';
    const favList = $id('favorites-list');
    if (favList) favList.innerHTML = '';
}

// -----------------
// Tab switching (defensive)
// -----------------
function switchTab(tabId) {
    // hide all tabContents safely
    if (tabContents && tabContents.length) {
        tabContents.forEach(c => {
            if (c && c.style) c.style.display = 'none';
        });
    } else {
        // try fallback by class name
        $qsa('.tab-content').forEach(c => c.style.display = 'none');
    }

    // remove active from buttons
    if (tabButtons && tabButtons.length) {
        tabButtons.forEach(b => b.classList.remove('active'));
    } else {
        $qsa('.tab-button').forEach(b => b.classList.remove('active'));
    }

    // show requested content
    const content = $id(tabId);
    if (content && content.style) {
        content.style.display = 'block';
    } else {
        console.warn(`switchTab: content #${tabId} not found`);
    }

    // set active button
    const btn = document.querySelector(`.tab-button[data-tab="${tabId}"]`);
    if (btn) btn.classList.add('active');

    // call renderers for specific tabs if needed
    if (tabId === 'favorites') renderFavorites();
    if (tabId === 'plan') renderWeeklyPlan();
    if (tabId === 'general-comments') renderGeneralComments();
}

// -----------------
// Search logic
// -----------------
function getSelectedIngredients() {
    return $qsa('.ingredient-checkbox:checked').map(ch => ch.value.toLowerCase());
}
function getSelectedAllergens() {
    return $qsa('.allergy-filter:checked').map(ch => ch.value.toLowerCase());
}

function allergensMatch(recipeIngredients, allergen) {
    if (!Array.isArray(recipeIngredients)) return false;
    if (allergen === 'gluten') return recipeIngredients.some(i => /bread|pasta|naan|flour|oats/i.test(i));
    if (allergen === 'nuts') return recipeIngredients.some(i => /nut|peanut|almond|pecan|walnut/i.test(i));
    if (allergen === 'dairy') return recipeIngredients.some(i => /cheese|milk|butter|cream|yogurt|mayonnaise/i.test(i));
    return false;
}

function findRecipes(selectedIngredients, selectedAllergens) {
    // if no filters, return all
    if ((!selectedIngredients || selectedIngredients.length === 0) && (!selectedAllergens || selectedAllergens.length === 0)) {
        return allRecipes.slice();
    }

    return allRecipes.filter(recipe => {
        const rIngredients = (recipe.ingredients || []).map(i => String(i).toLowerCase());

        // allergen check
        for (const a of selectedAllergens) {
            if (allergensMatch(rIngredients, a)) return false;
        }

        // if ingredients selected: require recipe contains every selected ingredient (subset)
        if (selectedIngredients && selectedIngredients.length > 0) {
            return selectedIngredients.every(si => rIngredients.some(ri => ri.includes(si)));
        }

        // otherwise passed allergen filter
        return true;
    });
}

// -----------------
// Rendering
// -----------------
function renderResults(recipes) {
    if (!resultsDiv) return;
    if (!recipes || recipes.length === 0) {
        resultsDiv.innerHTML = `<div class="no-results">No recipes found. Try different ingredients.</div>`;
        return;
    }

    resultsDiv.innerHTML = recipes.map(r => `
        <div class="recipe-card" data-recipe="${escapeHtml(r.name)}">
            <h3>${escapeHtml(r.name)}</h3>
            <p><strong>Ingredients:</strong> ${r.ingredients.join(', ')}</p>
            <p><strong>Time:</strong> ${r.prep_time_min ?? 'N/A'} min prep, ${r.cook_time_min ?? 'N/A'} min cook</p>
            <div class="recipe-actions">
                <button class="fav-action btn" data-name="${escapeAttr(r.name)}">❤ Favorite</button>
                <button class="plan-action btn" data-name="${escapeAttr(r.name)}">📅 Add to Plan</button>
                <button class="comment-open btn" data-name="${escapeAttr(r.name)}">💬 Comments</button>
            </div>
        </div>
    `).join('');

    // attach listeners
    $qsa('.fav-action').forEach(b => b.addEventListener('click', (e) => {
        const name = e.currentTarget.dataset.name;
        toggleFavorite(name);
    }));
    $qsa('.plan-action').forEach(b => b.addEventListener('click', (e) => {
        const name = e.currentTarget.dataset.name;
        openPlanModal(name);
    }));
    $qsa('.comment-open').forEach(b => b.addEventListener('click', (e) => {
        const name = e.currentTarget.dataset.name;
        openCommentModal(name);
    }));
}

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[s]));
}
function escapeAttr(str){ return String(str).replace(/"/g, '&quot;'); }

// -----------------
// Favorites
// -----------------
function toggleFavorite(recipeName) {
    if (!currentUser) return alert('Sign in to save favorites.');
    const favs = getFavorites(currentUser);
    const idx = favs.indexOf(recipeName);
    if (idx === -1) favs.push(recipeName);
    else favs.splice(idx, 1);
    saveFavorites(currentUser, favs);
    renderFavorites();
}

function renderFavorites() {
    const container = $id('favorites-list');
    if (!container) return;
    if (!currentUser) {
        container.innerHTML = '<div class="no-results">Sign in to view favorites.</div>';
        return;
    }
    const favs = getFavorites(currentUser);
    if (!favs.length) {
        container.innerHTML = '<div class="no-results">No favorites yet.</div>';
        return;
    }
    container.innerHTML = favs.map(f => `<div class="favorite-item">${escapeHtml(f)}</div>`).join('');
}

// -----------------
// Comments (recipe-specific)
// -----------------
function openCommentModal(recipeName) {
    selectedRecipeForComment = recipeName;
    if (commentRecipeName) commentRecipeName.textContent = recipeName;
    const comments = getRecipeComments(recipeName);
    if (recipeCommentsList) {
        recipeCommentsList.innerHTML = comments.length ? comments.map(c => `<div class="comment">${escapeHtml(c)}</div>`).join('') : '<div class="no-results">No comments yet.</div>';
    }
    if (recipeCommentModal) recipeCommentModal.style.display = 'block';
}

function postRecipeComment() {
    if (!currentUser) return alert('Sign in to post a comment.');
    if (!selectedRecipeForComment) return;
    const text = (recipeCommentTextarea && recipeCommentTextarea.value || '').trim();
    if (!text) return;
    const comments = getRecipeComments(selectedRecipeForComment);
    comments.push(`${currentUser}: ${text}`);
    saveRecipeComments(selectedRecipeForComment, comments);
    openCommentModal(selectedRecipeForComment);
    if (recipeCommentTextarea) recipeCommentTextarea.value = '';
}

// -----------------
// General comments
// -----------------
function renderGeneralComments() {
    if (!generalCommentsContainer) return;
    const comments = getGeneralComments();
    generalCommentsContainer.innerHTML = comments.length ? comments.map(c => `<div class="comment">${escapeHtml(c)}</div>`).join('') : '<div class="no-results">No general posts yet.</div>';
}
function postGeneralComment() {
    if (!currentUser) return alert('Sign in to post.');
    const text = (generalCommentTextarea && generalCommentTextarea.value || '').trim();
    if (!text) return;
    const comments = getGeneralComments();
    comments.push(`${currentUser}: ${text}`);
    saveGeneralComments(comments);
    renderGeneralComments();
    if (generalCommentTextarea) generalCommentTextarea.value = '';
}

// -----------------
// Weekly plan
// -----------------
function openPlanModal(recipeName) {
    if (!currentUser) return alert('Sign in to create a meal plan.');
    selectedRecipeForPlan = recipeName;
    if (planRecipeName) planRecipeName.textContent = recipeName;
    if (planModal) planModal.style.display = 'block';
}
function confirmAddToPlan() {
    if (!currentUser) return alert('Sign in to save a meal plan.');
    const day = planDaySelect ? planDaySelect.value : null;
    const meal = planMealSelect ? planMealSelect.value : null;
    if (!day || !meal || !selectedRecipeForPlan) return alert('Select day, meal and a recipe.');
    const plan = getMealPlan(currentUser);
    plan[day][meal] = selectedRecipeForPlan;
    saveMealPlan(currentUser, plan);
    renderWeeklyPlan();
    if (planModal) planModal.style.display = 'none';
}
function renderWeeklyPlan() {
    if (!weeklyPlanContainer) return;
    if (!currentUser) {
        weeklyPlanContainer.innerHTML = '<div class="no-results">Sign in to create a meal plan.</div>';
        return;
    }
    const plan = getMealPlan(currentUser);
    weeklyPlanContainer.innerHTML = Object.
