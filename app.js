
/* ---------------------------
   Auth and session handling
--------------------------- */
const authDiv = document.getElementById("authDiv");
const mainContent = document.getElementById("mainContent");
const signInBtn = document.getElementById("signInBtn");
const signUpBtn = document.getElementById("signUpBtn");
const signOutBtn = document.getElementById("signOutBtn");
const authMessage = document.getElementById("authMessage");
const displayUser = document.getElementById("displayUser");

let currentUser = null;

function showAuth() {
    authDiv.style.display = "block";
    mainContent.style.display = "none";
}

function showApp(username) {
    authDiv.style.display = "none";
    mainContent.style.display = "block";
    displayUser.textContent = username;
}

signInBtn.addEventListener("click", () => {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    // Simple client-side validation
    if (!username || !password) {
        authMessage.textContent = "Please enter username and password.";
        return;
    }

    authMessage.textContent = "";
    currentUser = username;
    showApp(username);

    initTabs();         // ensure tabs behavior is set
    ensureIngredientsUI();
    renderWeeklyPlan(); // render weekly plan structure
});

signUpBtn.addEventListener("click", () => {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!username || !password) {
        authMessage.textContent = "Please enter a username and password to create an account.";
        return;
    }

    // In a real app, you'd send this to a backend.
    authMessage.textContent = "Account created. You can sign in now.";
});

signOutBtn.addEventListener("click", () => {
    currentUser = null;
    showAuth();
});

/* ---------------------------
   Tabs
--------------------------- */
const tabButtons = document.querySelectorAll(".tab-button");
const tabContents = document.querySelectorAll(".tab-content");

function initTabs() {
    // Default to Search tab on login
    tabButtons.forEach(b => b.classList.remove("active"));
    tabContents.forEach(c => (c.style.display = "none"));

    const defaultTab = document.querySelector('.tab-button[data-tab="search"]');
    const defaultContent = document.getElementById("search");
    if (defaultTab && defaultContent) {
        defaultTab.classList.add("active");
        defaultContent.style.display = "block";
    }

    tabButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const target = btn.dataset.tab;

            tabButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            tabContents.forEach(c => {
                c.style.display = c.id === target ? "block" : "none";
            });
        });
    });
}

/* ---------------------------
   Ingredients UI and logic
--------------------------- */
// If the ingredients container is missing in HTML, we’ll insert it into "search" tab.
const INGREDIENTS = [
    "Tomato", "Potato", "Carrot", "Onion", "Garlic",
    "Chicken", "Beef", "Pork", "Fish", "Eggs",
    "Rice", "Pasta", "Bread", "Cheese", "Spinach",
    "Bell Pepper", "Broccoli", "Mushroom", "Milk", "Yogurt"
];

function ensureIngredientsUI() {
    const searchTab = document.getElementById("search");
    if (!searchTab) return;

    // Create container if missing
    let container = document.getElementById("ingredients-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "ingredients-container";
        // Insert above the Search button
        const searchBtn = document.getElementById("search-btn");
        searchTab.insertBefore(container, searchBtn);
    }

    // Populate ingredient boxes
    container.innerHTML = "";
    INGREDIENTS.forEach(name => {
        const box = document.createElement("div");
        box.className = "ingredient-box";
        box.textContent = name;
        box.title = "Click to select";
        box.addEventListener("click", () => {
            box.classList.toggle("selected");
        });
        container.appendChild(box);
    });
}

/* ---------------------------
   Recipe search and rendering
--------------------------- */
const resultsDiv = document.getElementById("results");
const searchBtn = document.getElementById("search-btn");

// Mock recipe generator based on selected ingredients
function generateRecipesFromIngredients(selectedIngredients) {
    // A simple mock: create one recipe per ingredient
    return selectedIngredients.map(ing => ({
        id: `recipe-${ing.toLowerCase().replace(/\s+/g, "-")}`,
        name: `${ing} Delight`,
        description: `A tasty recipe featuring ${ing}.`,
        ingredients: [ing],
    }));
}

function renderRecipeCard(recipe) {
    const card = document.createElement("div");
    card.className = "recipe-card";
    card.dataset.recipeId = recipe.id;

    card.innerHTML = `
        <h3>${recipe.name}</h3>
        <p>${recipe.description}</p>
        <div class="recipe-actions">
            <button class="fav-btn" data-action="favorite">⭐ Favorite</button>
            <button class="add-to-plan-btn" data-action="plan">📅 Add to Plan</button>
            <button class="comment-btn" data-action="comment">💬 Comment</button>
        </div>
    `;

    return card;
}

searchBtn.addEventListener("click", () => {
    const selected = Array.from(document.querySelectorAll(".ingredient-box.selected"))
        .map(el => el.textContent);

    resultsDiv.innerHTML = "";

    if (selected.length === 0) {
        resultsDiv.innerHTML = `<p class="no-results">No ingredients selected. Please choose some!</p>`;
        return;
    }

    const recipes = generateRecipesFromIngredients(selected);
    recipes.forEach(r => resultsDiv.appendChild(renderRecipeCard(r)));
});

/* ---------------------------
   Favorites management
--------------------------- */
const favoritesList = document.getElementById("favorites-list");
const favoriteIds = new Set();

function addToFavorites(card) {
    const id = card.dataset.recipeId;
    if (!id || favoriteIds.has(id)) return;

    favoriteIds.add(id);

    const clone = card.cloneNode(true);
    // Disable "Add to Plan" and "Comment" in favorites? Keep them functional via delegation.
    favoritesList.appendChild(clone);

    // Visual "favorited" state on original card button
    const favBtn = card.querySelector(".fav-btn");
    if (favBtn) favBtn.classList.add("favorited");
}

function removeFromFavoritesById(recipeId) {
    favoriteIds.delete(recipeId);
    // Remove the first matching card in favorites-list
    const nodes = Array.from(favoritesList.querySelectorAll(".recipe-card"));
    const target = nodes.find(n => n.dataset.recipeId === recipeId);
    if (target) target.remove();

    // Also remove favorited state on any original card
    const originBtn = resultsDiv.querySelector(`.recipe-card[data-recipe-id="${recipeId}"] .fav-btn`);
    if (originBtn) originBtn.classList.remove("favorited");
}

// Delegate clicks for recipe cards (results and favorites)
function handleRecipeActionClick(e) {
    const btn = e.target.closest("button");
    if (!btn) return;

    const card = e.target.closest(".recipe-card");
    if (!card) return;

    const recipeId = card.dataset.recipeId;
    const action = btn.dataset.action;

    // Find name if needed
    const nameEl = card.querySelector("h3");
    const recipeName = nameEl ? nameEl.textContent : recipeId;

    switch (action) {
        case "favorite":
            // Toggle favorites: add if in results, remove if clicked inside favorites
            if (card.parentElement === favoritesList) {
                removeFromFavoritesById(recipeId);
            } else {
                addToFavorites(card);
            }
            break;
        case "plan":
            openPlanModal(recipeName, recipeId);
            break;
        case "comment":
            openCommentModal(recipeName, recipeId);
            break;
    }
}

resultsDiv.addEventListener("click", handleRecipeActionClick);
favoritesList.addEventListener("click", handleRecipeActionClick);

/* ---------------------------
   Weekly plan
--------------------------- */
const weeklyPlanContainer = document.getElementById("weekly-plan-container");

// Structure to hold assignments: { Day: { meal: [ {id, name} ] } }
const WEEK_DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const MEALS = ["breakfast","lunch","dinner"];
const weeklyPlan = {}; // filled on render

function renderWeeklyPlan() {
    weeklyPlanContainer.innerHTML = "";
    WEEK_DAYS.forEach(day => {
        if (!weeklyPlan[day]) weeklyPlan[day] = { breakfast: [], lunch: [], dinner: [] };

        const dayCard = document.createElement("div");
        dayCard.className = "day-card";
        dayCard.dataset.day = day;

        const title = document.createElement("h4");
        title.textContent = day;
        dayCard.appendChild(title);

        MEALS.forEach(meal => {
            const slot = document.createElement("div");
            slot.className = "meal-slot";
            slot.dataset.meal = meal;
            slot.innerHTML = `
                <strong>${meal.charAt(0).toUpperCase() + meal.slice(1)}</strong>
                <div class="meal-content">
                    <div class="meal-items"></div>
                </div>
            `;

            dayCard.appendChild(slot);
        });

        weeklyPlanContainer.appendChild(dayCard);
    });

    // Populate any existing plan entries
    updateWeeklyPlanUI();
}

function updateWeeklyPlanUI() {
    WEEK_DAYS.forEach(day => {
        MEALS.forEach(meal => {
            const items = weeklyPlan[day]?.[meal] || [];
            const slot = weeklyPlanContainer.querySelector(`.day-card[data-day="${day}"] .meal-slot[data-meal="${meal}"] .meal-items`);
            if (!slot) return;
            slot.innerHTML = "";

            items.forEach(item => {
                const entry = document.createElement("div");
                entry.className = "meal-item";
                entry.style.display = "flex";
                entry.style.justifyContent = "space-between";
                entry.style.alignItems = "center";
                entry.style.gap = "8px";

                entry.innerHTML = `
                    <span>${item.name}</span>
                    <button class="remove-btn" data-remove="${item.id}" title="Remove">Remove</button>
                `;
                slot.appendChild(entry);
            });
        });
    });
}

weeklyPlanContainer.addEventListener("click", (e) => {
    const removeBtn = e.target.closest(".remove-btn");
    if (!removeBtn) return;

    const id = removeBtn.dataset.remove;

    // Find day/meal context
    const slot = removeBtn.closest(".meal-slot");
    const dayCard = removeBtn.closest(".day-card");
    if (!slot || !dayCard) return;

    const day = dayCard.dataset.day;
    const meal = slot.dataset.meal;

    if (!weeklyPlan[day] || !weeklyPlan[day][meal]) return;
    weeklyPlan[day][meal] = weeklyPlan[day][meal].filter(item => item.id !== id);
    updateWeeklyPlanUI();
});

/* ---------------------------
   Plan modal
--------------------------- */
const planModal = document.getElementById("plan-modal");
const planModalClose = document.getElementById("plan-modal-close");
const planRecipeName = document.getElementById("plan-recipe-name");
const planDaySelect = document.getElementById("plan-day-select");
const planMealSelect = document.getElementById("plan-meal-select");
const planConfirmBtn = document.getElementById("plan-confirm-btn");

let pendingPlanRecipe = { id: null, name: "" };

function openPlanModal(recipeName, recipeId) {
    pendingPlanRecipe = { id: recipeId, name: recipeName };
    planRecipeName.textContent = recipeName;
    planModal.style.display = "flex";
}

function closePlanModal() {
    planModal.style.display = "none";
    pendingPlanRecipe = { id: null, name: "" };
}

planModalClose.addEventListener("click", closePlanModal);
planConfirmBtn.addEventListener("click", () => {
    const day = planDaySelect.value;
    const meal = planMealSelect.value;

    if (!pendingPlanRecipe.id) {
        closePlanModal();
        return;
    }

    if (!weeklyPlan[day]) weeklyPlan[day] = { breakfast: [], lunch: [], dinner: [] };
    weeklyPlan[day][meal].push({ id: pendingPlanRecipe.id, name: pendingPlanRecipe.name });

    updateWeeklyPlanUI();
    closePlanModal();
});

/* ---------------------------
   Recipe comments modal
--------------------------- */
const recipeCommentModal = document.getElementById("recipe-comment-modal");
const recipeCommentModalClose = document.getElementById("recipe-comment-modal-close");
const commentRecipeName = document.getElementById("comment-recipe-name");
const recipeCommentTextarea = document.getElementById("recipe-comment-textarea");
const recipeCommentBtn = document.getElementById("recipe-comment-btn");
const recipeCommentsList = document.getElementById("recipe-comments-list");

// Map of recipeId -> comments[]
const recipeComments = {};

let currentCommentRecipe = { id: null, name: "" };

function openCommentModal(recipeName, recipeId) {
    currentCommentRecipe = { id: recipeId, name: recipeName };
    commentRecipeName.textContent = recipeName;
    recipeCommentTextarea.value = "";
    renderRecipeComments(recipeId);
    recipeCommentModal.style.display = "flex";
}

function closeCommentModal() {
    recipeCommentModal.style.display = "none";
    currentCommentRecipe = { id: null, name: "" };
}

recipeCommentModalClose.addEventListener("click", closeCommentModal);

function renderRecipeComments(recipeId) {
    recipeCommentsList.innerHTML = "";
    const comments = recipeComments[recipeId] || [];
    comments.forEach(c => {
        const div = document.createElement("div");
        div.className = "recipe-comment";
        div.textContent = c.text;
        recipeCommentsList.appendChild(div);
    });
}

recipeCommentBtn.addEventListener("click", () => {
    const text = recipeCommentTextarea.value.trim();
    if (!text || !currentCommentRecipe.id) return;

    if (!recipeComments[currentCommentRecipe.id]) {
        recipeComments[currentCommentRecipe.id] = [];
    }
    recipeComments[currentCommentRecipe.id].push({
        text,
        user: currentUser,
        ts: Date.now()
    });

    recipeCommentTextarea.value = "";
    renderRecipeComments(currentCommentRecipe.id);
});

/* ---------------------------
   General comments
--------------------------- */
const generalCommentTextarea = document.getElementById("general-comment-textarea");
const generalCommentBtn = document.getElementById("general-comment-btn");
const generalCommentsContainer = document.getElementById("general-comments-container");

const generalComments = []; // { user, text, ts }

generalCommentBtn.addEventListener("click", () => {
    const text = generalCommentTextarea.value.trim();
    if (!text) return;

    generalComments.push({
        user: currentUser || "Anonymous",
        text,
        ts: Date.now()
    });

    generalCommentTextarea.value = "";
    renderGeneralComments();
});

function renderGeneralComments() {
    generalCommentsContainer.innerHTML = "";
    generalComments
        .slice() // copy
        .sort((a, b) => b.ts - a.ts) // newest first
        .forEach(c => {
            const div = document.createElement("div");
            div.className = "comment";
            div.innerHTML = `
                <span class="comment-author">${c.user}</span>
                <span>${c.text}</span>
            `;
            generalCommentsContainer.appendChild(div);
        });
}

/* ---------------------------
   Modal initial visibility
--------------------------- */
(function ensureModalsHidden() {
    // If CSS didn't hide modals by default, do it here.
    if (planModal) planModal.style.display = "none";
    if (recipeCommentModal) recipeCommentModal.style.display = "none";
})();

/* ---------------------------
   Utility: initial UI setup
--------------------------- */
(function initialSetup() {
    // Start at auth
    showAuth();

    // Pre-render weekly plan structure so the tab looks ready after login
    // It will be called again on login to reset state.
    // Avoid rendering before login to prevent content visible on auth screen
    // (we only call renderWeeklyPlan after login).

    // Tabs will be initialized on sign-in.
})();
