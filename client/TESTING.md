# Testing the CashPop Facebook Login Client

This document provides instructions for testing the Facebook login implementation.

## Prerequisites for Testing

1. Make sure the CashPop backend API is running
2. Configure your Facebook App ID in `app.js`
3. Start a local web server to serve the client files

## Test Cases

### 1. Basic Facebook Login Flow

**Steps:**
1. Open the client app in your browser
2. Click the "Login with Facebook" button
3. Complete the Facebook authentication in the popup
4. Verify that the user information and tokens are displayed

**Expected Result:**
- User information (name, email, Facebook ID) is displayed
- Backend access token and refresh token are displayed
- UI switches to the user section

### 2. Token Persistence

**Steps:**
1. Complete a successful login
2. Refresh the page

**Expected Result:**
- The app should attempt to restore the session
- If Facebook session is still valid, user should remain logged in
- User information and tokens should be displayed without requiring re-authentication

### 3. Logout Functionality

**Steps:**
1. Complete a successful login
2. Click the "Logout" button

**Expected Result:**
- User is logged out from Facebook
- Tokens are cleared from localStorage
- UI switches back to the login section

### 4. Error Handling

#### 4.1 Cancelled Facebook Login

**Steps:**
1. Click the "Login with Facebook" button
2. Close the Facebook login popup without completing authentication

**Expected Result:**
- Error message is displayed: "Facebook login was cancelled or failed."
- UI switches to the error section

#### 4.2 Backend API Unavailable

**Steps:**
1. Stop the backend API server
2. Complete Facebook authentication

**Expected Result:**
- Error message is displayed indicating failure to authenticate with the backend
- UI switches to the error section

## Debugging Tips

### Checking Facebook Login Status

You can check the current Facebook login status in the browser console:

```javascript
FB.getLoginStatus(function(response) {
  console.log(response);
});
```

### Inspecting Tokens

You can inspect the stored tokens in the browser console:

```javascript
console.log(JSON.parse(localStorage.getItem('backendTokens')));
```

### Testing API Calls

You can test the backend API directly using curl:

```bash
curl -X POST http://localhost:3000/auth/facebook \
  -H "Content-Type: application/json" \
  -d '{"token":"YOUR_FACEBOOK_TOKEN"}'
```

## Common Issues and Solutions

### CORS Errors

If you see CORS errors in the console, make sure your backend API allows requests from your client's origin. You may need to add CORS middleware to your backend.

### Facebook App Domain Issues

If Facebook authentication fails with domain-related errors, make sure your app's domain settings in the Facebook Developer Console include the domain you're testing from.

### Invalid Token Errors

If you receive "Invalid Facebook token" errors from the backend, the token might be expired or the Facebook App ID/Secret in your backend configuration might be incorrect.

## Next Steps After Testing

Once you've verified that the Facebook login flow works correctly, you can:

1. Enhance the UI with more features
2. Implement additional security measures
3. Add more authentication methods
4. Deploy the client to a production environment