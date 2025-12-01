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

let allRecipes = [];
let currentResults = [];
let currentUser = null;
let selectedRecipeForPlan = null;

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
        alert('Error loading recipes.json: ' + err.message);
    }
}

// -----------------
// LocalStorage Helpers
// -----------------
function getUsers() { return JSON.parse(localStorage.getItem('users') || '{}'); }
function saveUser(username, password) { const users = getUsers(); users[username] = password; localStorage.setItem('users', JSON.stringify(users)); }
function getFavorites(username) { return JSON.parse(localStorage.getItem(`favorites_${username}`) || '[]'); }
function saveFavorites(username, favorites) { localStorage.setItem(`favorites_${username}`, JSON.stringify(favorites)); }
function getRecipeComments(recipeName) { return JSON.parse(localStorage.getItem(`comments_${recipeName}`) || '[]'); }
function saveRecipeComments(recipeName, comments) { localStorage.setItem(`comments_${recipeName}`, JSON.stringify(comments)); }
function getGeneralComments() { return JSON.parse(localStorage.getItem('generalComments') || '[]'); }
function saveGeneralComments(comments) { localStorage.setItem('generalComments', JSON.stringify(comments)); }
function getMealPlan(username) {
    const key = `mealPlan_${username}`;
    const defaultPlan = { Saturday: {}, Sunday: {}, Monday: {}, Tuesday: {}, Wednesday: {}, Thursday: {}, Friday: {} };
    ['breakfast','lunch','dinner'].forEach(meal => {
        Object.keys(defaultPlan).forEach(day => defaultPlan[day][meal] = null);
    });
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(defaultPlan));
}
function saveMealPlan(username, mealPlan) { localStorage.setItem(`mealPlan_${username}`, JSON.stringify(mealPlan)); }

// -----------------
// Emoji mapping
// -----------------
function getIngredientEmoji(ingredient) {
    const mapping = { "bread":"🥖","pasta":"🍝","cheese":"🧀","milk":"🥛","nuts":"🌰","eggs":"🥚","butter":"🧈","avocado":"🥑","tomato":"🍅","banana":"🍌","strawberry":"🍓","lettuce":"🥬","rice":"🍚","peanut butter":"🥜","jelly":"🍇","naan":"🍞","soy sauce":"🧂","olive oil":"🫒","salt":"🧂","tomato sauce":"🍅"};
    for(const key in mapping){ if(ingredient.toLowerCase().includes(key)) return mapping[key]; }
    return "";
}

// -----------------
// Authentication Logic
// -----------------
function showMainContent(username){
    authDiv.style.display='none';
    mainContent.style.display='block';
    displayUser.textContent=username;
    currentUser=username;
    localStorage.setItem('currentUser',username);
    renderFavorites(); renderGeneralComments(); renderWeeklyPlan();
}
function showAuth(){
    authDiv.style.display='flex';
    mainContent.style.display='none';
    usernameInput.value=''; passwordInput.value=''; currentUser=null;
    localStorage.removeItem('currentUser');
}

signInBtn.addEventListener('click', ()=>{
    const user=usernameInput.value.trim(), pass=passwordInput.value;
    if(!user||!pass){ authMessage.textContent='Enter username and password'; return; }
    const users=getUsers();
    if(users[user]&&users[user]===pass){ showMainContent(user); authMessage.textContent=''; }
    else authMessage.textContent='Invalid username or password';
});
signUpBtn.addEventListener('click', ()=>{
    const user=usernameInput.value.trim(), pass=passwordInput.value;
    if(!user||!pass){ authMessage.textContent='Enter username and password'; return; }
    const users=getUsers();
    if(users[user]){ authMessage.textContent='Username already exists'; return; }
    saveUser(user,pass); showMainContent(user); authMessage.textContent='';
});
signOutBtn.addEventListener('click', ()=>{ showAuth(); renderFavorites(); });

// -----------------
// Chalk button effect
// -----------------
function applyChalkButtonEffect(button) {
    button.classList.add('chalk-btn');
    button.addEventListener('mouseover',()=>button.classList.add('wiggle'));
    button.addEventListener('mouseout',()=>button.classList.remove('wiggle'));
}

// -----------------
// Ingredient Boxes
// -----------------
function getAllIngredients(){ const s=new Set(); allRecipes.forEach(r=>r.ingredients.forEach(i=>s.add(i.toLowerCase()))); return Array.from(s).sort(); }
function createIngredientBoxes(){
    const container=document.getElementById('ingredients-container');
    container.innerHTML='';
    if(allRecipes.length===0){ container.innerHTML='<div class="no-results">Loading recipes...</div>'; return; }
    const ingredients=getAllIngredients();
    if(ingredients.length===0){ container.innerHTML='<div class="no-results">No ingredients found.</div>'; return; }
    ingredients.forEach(ing=>{
        const box=document.createElement('div'); box.className='ingredient-box';
        const emoji=getIngredientEmoji(ing); box.textContent=`${emoji} ${ing}`;
        box.addEventListener('click',()=>box.classList.toggle('selected'));
        container.appendChild(box);
    });
}
function getSelectedIngredients(){ return Array.from(document.querySelectorAll('.ingredient-box.selected')).map(b=>b.textContent.replace(/[^\w\s]/g,'').trim().toLowerCase()); }
function getSelectedAllergens(){ return Array.from(document.querySelectorAll('.allergy-filter:checked')).map(b=>b.value.toLowerCase()); }

// -----------------
// Find Recipes
// -----------------
function findRecipes(selectedIngredients,selectedAllergens){
    return allRecipes.filter(recipe=>{
        const ing=recipe.ingredients.map(i=>i.toLowerCase());
        for(const allergen of selectedAllergens){ if(allergensMatch(ing,allergen)) return false; }
        return selectedIngredients.every(i=> ing.includes(i));
    });
}
function allergensMatch(recipeIngredients,allergen){
    if(allergen==='gluten') return recipeIngredients.some(i=>i.includes('bread')||i.includes('pasta')||i.includes('naan'));
    if(allergen==='nuts') return recipeIngredients.some(i=>i.includes('nuts')||i.includes('peanut')||i.includes('almond'));
    if(allergen==='dairy') return recipeIngredients.some(i=>i.includes('cheese')||i.includes('milk')||i.includes('butter'));
    return false;
}

// -----------------
// Render Recipes
// -----------------
function renderRecipes(recipes){
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '';
    if(!recipes.length){ resultsDiv.innerHTML='<div class="no-results">No matches found!</div>'; return; }
    recipes.forEach(recipe => {
        const card = document.createElement('div'); card.className='recipe-card';
        const emojis = recipe.ingredients.map(getIngredientEmoji).filter(Boolean).join(' ');
        const favorites = getFavorites(currentUser);
        const isFavorited = favorites.some(f => f.name === recipe.name);
        card.innerHTML=`
            <h3>${emojis} ${recipe.name}</h3>
            <p><strong>Ingredients:</strong> ${recipe.ingredients.join(', ')}</p>
            <p><strong>Instructions:</strong> ${recipe.instructions}</p>
            <p><strong>Prep:</strong> ${recipe.prep_time_min} min, <strong>Cook:</strong> ${recipe.cook_time_min} min at ${recipe.heat}</p>
            <p><strong>Nutrition:</strong> ${recipe.nutrition.calories} kcal, ${recipe.nutrition.protein_g}g protein, ${recipe.nutrition.fat_g}g fat, ${recipe.nutrition.carbs_g}g carbs</p>
        `;
        const buttonsDiv = document.createElement('div');
        const favButton = document.createElement('button'); favButton.textContent = isFavorited ? '★ Favorited':'☆ Favorite'; favButton.addEventListener('click',()=>toggleFavorite(recipe)); applyChalkButtonEffect(favButton);
        const commentButton = document.createElement('button'); commentButton.textContent='💬 Comments'; commentButton.addEventListener('click',()=>toggleRecipeComments(recipe,card)); applyChalkButtonEffect(commentButton);
        const addToPlanButton = document.createElement('button'); addToPlanButton.textContent='📅 Add to Plan'; addToPlanButton.addEventListener('click',()=>openDaySelector(recipe)); applyChalkButtonEffect(addToPlanButton);
        buttonsDiv.appendChild(favButton); buttonsDiv.appendChild(commentButton); buttonsDiv.appendChild(addToPlanButton);
        card.appendChild(buttonsDiv); resultsDiv.appendChild(card);
    });
}

// -----------------
// Weekly Plan: horizontal boxes
// -----------------
function renderWeeklyPlan(){
    const weeklyPlanDiv=document.getElementById('weeklyPlan');
    weeklyPlanDiv.innerHTML=''; weeklyPlanDiv.style.display='flex'; weeklyPlanDiv.style.gap='10px'; weeklyPlanDiv.style.flexWrap='wrap';
    const days=['Saturday','Sunday','Monday','Tuesday','Wednesday','Thursday','Friday'];
    const mealTypes=['breakfast','lunch','dinner'];
    const mealPlan=getMealPlan(currentUser);

    days.forEach(day=>{
        const dayCard=document.createElement('div'); dayCard.className='day-card';
        dayCard.style.border='2px solid #FFA347'; dayCard.style.borderRadius='8px'; dayCard.style.padding='8px';
        dayCard.style.flex='1'; dayCard.style.minWidth='120px'; dayCard.style.background='#3D2B1F'; dayCard.style.color='#FFD699';
        dayCard.innerHTML=`<h3 style="text-align:center">${day}</h3>`;
        mealTypes.forEach(mealType=>{
            const meal=mealPlan[day][mealType];
            const mealSlot=document.createElement('div'); mealSlot.style.margin='4px 0'; mealSlot.style.padding='4px'; mealSlot.style.borderTop='1px dashed #FFD699';
            if(meal){ mealSlot.innerHTML=`<strong>${mealType.charAt(0).toUpperCase()+mealType.slice(1)}:</strong> ${getIngredientEmoji(meal.ingredients[0])} ${meal.name}`; mealSlot.style.background='#5C3A21'; mealSlot.style.padding='4px'; mealSlot.style.borderRadius='4px'; }
            else mealSlot.innerHTML=`<strong>${mealType.charAt(0).toUpperCase()+mealType.slice(1)}:</strong> Not planned`;
            dayCard.appendChild(mealSlot);
        });
        weeklyPlanDiv.appendChild(dayCard);
    });
}

// -----------------
// Search Button
// -----------------
document.getElementById('search-btn').addEventListener('click',()=>{
    const selectedIngredients=getSelectedIngredients();
    const selectedAllergens=getSelectedAllergens();
    if(!selectedIngredients.length){ alert('Select at least one ingredient!'); return; }
    currentResults=findRecipes(selectedIngredients,selectedAllergens);
    renderRecipes(currentResults);
});

// -----------------
// Tabs
// -----------------
function setupTabs(){
    const tabButtons=document.querySelectorAll('.tab-button');
    const tabContents=document.querySelectorAll('.tab-content');
    tabButtons.forEach(button=>{
        button.addEventListener('click',()=>{
            const target=button.dataset.tab;
            tabButtons.forEach(b=>b.classList.remove('active'));
            tabContents.forEach(c=>c.classList.remove('active'));
            button.classList.add('active'); document.getElementById(target).classList.add('active');
            if(target==='favorites') renderFavorites();
            if(target==='comments') renderGeneralComments();
            if(target==='plan') renderWeeklyPlan();
        });
    });
}

// -----------------
// Initialize
// -----------------
window.addEventListener('load',async()=>{
    await loadRecipes(); createIngredientBoxes(); setupTabs();
    [signInBtn, signUpBtn, signOutBtn].forEach(btn => applyChalkButtonEffect(btn));
    const savedUser=localStorage.getItem('currentUser');
    if(savedUser && getUsers()[savedUser]) showMainContent(savedUser);
    else showAuth();
});
