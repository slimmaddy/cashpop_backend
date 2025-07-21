# CashPop Facebook Login Client

This is a simple client-side web application that demonstrates how to implement Facebook OAuth2 authentication and integrate it with the CashPop backend API.

## Features

- Facebook OAuth2 authentication
- Sending the Facebook token to the backend API
- Displaying user information and authentication tokens
- Token persistence using localStorage
- Error handling and loading states

## Setup Instructions

### Prerequisites

- A Facebook Developer account
- A registered Facebook App with the Facebook Login product added
- The CashPop backend API running locally or deployed

### Configuration

1. Open the `app.js` file and update the configuration:

```javascript
const config = {
    // Replace with your actual Facebook App ID
    fbAppId: 'YOUR_FACEBOOK_APP_ID',
    // Replace with your actual backend API URL
    apiUrl: 'http://localhost:3000/auth/facebook',
};
```

- `fbAppId`: Your Facebook App ID from the Facebook Developer Console
- `apiUrl`: The URL of the CashPop backend API endpoint for Facebook authentication

### Facebook App Configuration

1. Go to [Facebook Developer Console](https://developers.facebook.com/)
2. Create a new app or use an existing one
3. Add the Facebook Login product to your app
4. Configure the OAuth redirect URI to match your client app's URL
5. Add the following to your app's Valid OAuth Redirect URIs:
   - `http://localhost:8080/` (for local development)
   - Your production URL if deployed

### Running the Client

You can use any simple HTTP server to serve the client files. Here are a few options:

#### Using Python

```bash
# Python 3
python -m http.server 8080

# Python 2
python -m SimpleHTTPServer 8080
```

#### Using Node.js

First, install the `http-server` package:

```bash
npm install -g http-server
```

Then run:

```bash
http-server -p 8080
```

#### Using PHP

```bash
php -S localhost:8080
```

After starting the server, open your browser and navigate to:

```
http://localhost:8080
```

## Usage

1. Click the "Login with Facebook" button
2. Authorize the application in the Facebook login popup
3. The app will send the Facebook token to the backend API
4. If successful, the user information and authentication tokens will be displayed
5. Click the "Logout" button to log out

## Flow Diagram

```
+----------------+     +-----------------+     +----------------+
|                |     |                 |     |                |
|  Client App    |     |  Facebook API   |     |  Backend API   |
|                |     |                 |     |                |
+-------+--------+     +--------+--------+     +-------+--------+
        |                       |                      |
        |  Initiate Login       |                      |
        +---------------------->|                      |
        |                       |                      |
        |  Auth Popup           |                      |
        |<----------------------+                      |
        |                       |                      |
        |  User Authorizes      |                      |
        +---------------------->|                      |
        |                       |                      |
        |  Return Access Token  |                      |
        |<----------------------+                      |
        |                       |                      |
        |  Send Token to Backend|                      |
        +---------------------------------------------------->+
        |                       |                      |
        |                       |  Validate Token      |
        |                       |<---------------------+
        |                       |                      |
        |                       |  Token Valid/Invalid |
        |                       +--------------------->+
        |                       |                      |
        |  Return Auth Tokens   |                      |
        |<----------------------------------------------------+
        |                       |                      |
```

## Security Considerations

- The client stores authentication tokens in localStorage, which is not secure against XSS attacks
- In a production environment, consider using more secure storage methods like HTTP-only cookies
- Always validate tokens on the server side
- Use HTTPS in production to protect token transmission

## Troubleshooting

### Common Issues

1. **Facebook Login Popup Blocked**: Make sure your browser allows popups for your site
2. **Invalid App ID**: Verify your Facebook App ID in the configuration
3. **CORS Errors**: Ensure your backend API allows requests from your client's origin
4. **API Connection Failed**: Check that your backend API is running and accessible

### Debug Mode

To enable Facebook SDK debug mode, add the following before initializing the SDK:

```javascript
window.fbAsyncInit = function() {
    // Enable debug mode
    FB.init({
        appId: config.fbAppId,
        cookie: true,
        xfbml: true,
        version: 'v18.0',
        debug: true // Add this line
    });
    // ...
};
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.