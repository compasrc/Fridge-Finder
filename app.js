// -----------------
// Sign In / Sign Out with password
// -----------------
const signInForm = document.getElementById('signInForm');
const signOutDiv = document.getElementById('signOutDiv');
const displayUser = document.getElementById('displayUser');
const signInBtn = document.getElementById('signInBtn');
const signOutBtn = document.getElementById('signOutBtn');

const mainContent = document.getElementById('mainContent');

function getUserData() {
  const data = localStorage.getItem('users');
  return data ? JSON.parse(data) : {};
}

function saveUserData(users) {
  localStorage.setItem('users', JSON.stringify(users));
}

// Check if user is already signed in
const currentUser = localStorage.getItem('currentUser');
if (currentUser) {
  showSignedIn(currentUser);
}

// Sign in / create account
signInBtn.addEventListener('click', () => {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();

  if (!username || !password) {
    alert('Please enter a username and password');
    return;
  }

  const users = getUserData();

  if (!users[username]) {
    // create account
    users[username] = { password };
    saveUserData(users);
    alert('Account created!');
  } else if (users[username].password !== password) {
    alert('Incorrect password!');
    return;
  }

  localStorage.setItem('currentUser', username);
  showSignedIn(username);
  renderFavorites();
});

signOutBtn.addEventListener('click', () => {
  localStorage.removeItem('currentUser');
  showSignedOut();
  renderFavorites();
});

function showSignedIn(username) {
  signInForm.style.display = 'none';
  signOutDiv.style.display = 'block';
  mainContent.style.display = 'block';
  displayUser.textContent = username;
}

function showSignedOut() {
  signInForm.style.display = 'block';
  signOutDiv.style.display = 'none';
  mainContent.style.display = 'none';
  document.getElementById('username').value = '';
  document.getElementById('password').value = '';
}

// -----------------
// Recipe logic (unchanged from previous version)
// -----------------
// ... insert your previous functions here for:
// loadRecipes, getAllIngredients, createIngredientBoxes,
// getSelectedIngredients, getSelectedAllergens, getIngredientEmoji,
// findRecipes, renderRecipes, getUserKey, toggleFavorite, renderFavorites,
// initializeApp, performSearch, event listeners
