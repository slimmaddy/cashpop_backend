// Configuration
const config = {
    // Replace with your actual Facebook App ID
    fbAppId: '123456789012345',
    // Replace with your actual backend API URL
    apiUrl: 'http://localhost:3000/auth/facebook',
};

// DOM Elements
const elements = {
    loginSection: document.getElementById('login-section'),
    userSection: document.getElementById('user-section'),
    loadingSection: document.getElementById('loading-section'),
    errorSection: document.getElementById('error-section'),
    fbLoginBtn: document.getElementById('fb-login-btn'),
    logoutBtn: document.getElementById('logout-btn'),
    tryAgainBtn: document.getElementById('try-again-btn'),
    userName: document.getElementById('user-name'),
    userEmail: document.getElementById('user-email'),
    userId: document.getElementById('user-id'),
    accessToken: document.getElementById('access-token'),
    refreshToken: document.getElementById('refresh-token'),
    errorMessage: document.getElementById('error-message'),
};

// State
let fbAccessToken = null;
let backendTokens = null;

// Initialize Facebook SDK
window.fbAsyncInit = function() {
    FB.init({
        appId: config.fbAppId,
        cookie: true,
        xfbml: true,
        version: 'v18.0' // Use the latest version
    });
    
    // Check if user is already logged in
    FB.getLoginStatus(function(response) {
        if (response.status === 'connected') {
            fbAccessToken = response.authResponse.accessToken;
            handleFacebookLogin();
        }
    });
};

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    elements.fbLoginBtn.addEventListener('click', initiateFacebookLogin);
    elements.logoutBtn.addEventListener('click', logout);
    elements.tryAgainBtn.addEventListener('click', resetUI);
});

// Functions
function initiateFacebookLogin() {
    showSection('loading');
    
    FB.login(function(response) {
        if (response.status === 'connected') {
            fbAccessToken = response.authResponse.accessToken;
            handleFacebookLogin();
        } else {
            showError('Facebook login was cancelled or failed.');
        }
    }, { scope: 'email' }); // Request email permission
}

function handleFacebookLogin() {
    // First, get user info from Facebook
    FB.api('/me', { fields: 'name,email' }, function(fbUserResponse) {
        if (!fbUserResponse || fbUserResponse.error) {
            showError('Failed to get user information from Facebook.');
            return;
        }
        
        // Now send the token to our backend
        sendTokenToBackend(fbAccessToken, fbUserResponse);
    });
}

function sendTokenToBackend(token, fbUserInfo) {
    fetch(config.apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => {
                throw new Error(err.message || 'Authentication failed');
            });
        }
        return response.json();
    })
    .then(data => {
        backendTokens = {
            accessToken: data.accessToken,
            refreshToken: data.refreshToken
        };
        
        // Update UI with user info
        elements.userName.textContent = fbUserInfo.name || 'User';
        elements.userEmail.textContent = data.user.email || fbUserInfo.email || 'Not provided';
        elements.userId.textContent = fbUserInfo.id || 'Not available';
        elements.accessToken.textContent = data.accessToken || 'Not provided';
        elements.refreshToken.textContent = data.refreshToken || 'Not provided';
        
        // Save tokens to localStorage for persistence
        localStorage.setItem('backendTokens', JSON.stringify(backendTokens));
        
        showSection('user');
    })
    .catch(error => {
        console.error('Backend authentication error:', error);
        showError(error.message || 'Failed to authenticate with the backend.');
    });
}

function logout() {
    showSection('loading');
    
    // Logout from Facebook
    FB.logout(function(response) {
        console.log('Logged out from Facebook');
    });
    
    // Clear local storage
    localStorage.removeItem('backendTokens');
    
    // Reset state
    fbAccessToken = null;
    backendTokens = null;
    
    // Reset UI
    resetUI();
}

function resetUI() {
    // Clear displayed user info
    elements.userName.textContent = 'User';
    elements.userEmail.textContent = '';
    elements.userId.textContent = '';
    elements.accessToken.textContent = '';
    elements.refreshToken.textContent = '';
    
    // Show login section
    showSection('login');
}

function showSection(section) {
    // Hide all sections
    elements.loginSection.classList.add('hidden');
    elements.userSection.classList.add('hidden');
    elements.loadingSection.classList.add('hidden');
    elements.errorSection.classList.add('hidden');
    
    // Show the requested section
    switch (section) {
        case 'login':
            elements.loginSection.classList.remove('hidden');
            break;
        case 'user':
            elements.userSection.classList.remove('hidden');
            break;
        case 'loading':
            elements.loadingSection.classList.remove('hidden');
            break;
        case 'error':
            elements.errorSection.classList.remove('hidden');
            break;
    }
}

function showError(message) {
    elements.errorMessage.textContent = message;
    showSection('error');
}

// Check if we have stored tokens on page load
document.addEventListener('DOMContentLoaded', function() {
    const storedTokens = localStorage.getItem('backendTokens');
    if (storedTokens) {
        try {
            backendTokens = JSON.parse(storedTokens);
            // We would typically validate these tokens with the backend here
            // For simplicity, we'll just check if FB is also logged in
            FB.getLoginStatus(function(response) {
                if (response.status === 'connected') {
                    fbAccessToken = response.authResponse.accessToken;
                    handleFacebookLogin();
                } else {
                    // If not logged in to FB but we have backend tokens, clear them
                    localStorage.removeItem('backendTokens');
                    showSection('login');
                }
            });
        } catch (e) {
            localStorage.removeItem('backendTokens');
            showSection('login');
        }
    } else {
        showSection('login');
    }
});