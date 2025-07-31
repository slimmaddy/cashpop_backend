/**
 * Test script for the updated profile update API with avatar upload
 * 
 * This script demonstrates how to use the updated profile update API
 * to update a user's profile with or without an avatar.
 * 
 * To run this script:
 * 1. Make sure the server is running
 * 2. Replace <your_token> with a valid JWT token
 * 3. Run the script with Node.js: node test-profile-update.js
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

const API_URL = 'http://localhost:3000';
const TOKEN = '<your_token>'; // Replace with a valid JWT token

// Test updating profile with avatar
async function testUpdateProfileWithAvatar() {
  try {
    console.log('Testing profile update with avatar...');
    
    // Create a form data object
    const formData = new FormData();
    
    // Add profile data
    formData.append('name', 'John Doe');
    formData.append('height', 175.5);
    formData.append('weight', 70.5);
    
    // Add avatar file if it exists
    // Replace 'avatar.jpg' with the path to your test image
    const avatarPath = path.join(__dirname, 'avatar.jpg');
    if (fs.existsSync(avatarPath)) {
      formData.append('file', fs.createReadStream(avatarPath));
      console.log('Added avatar file to request');
    } else {
      console.log('Avatar file not found at:', avatarPath);
      console.log('Continuing without avatar file');
    }
    
    // Send the request
    const response = await axios.patch(`${API_URL}/users/profile`, formData, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        ...formData.getHeaders()
      }
    });
    
    console.log('Profile updated successfully with status:', response.status);
    console.log('Updated profile:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error updating profile with avatar:', error.response?.data || error.message);
    throw error;
  }
}

// Test updating profile without avatar
async function testUpdateProfileWithoutAvatar() {
  try {
    console.log('\nTesting profile update without avatar...');
    
    // Profile data
    const profileData = {
      name: 'John Doe',
      height: 175.5,
      weight: 70.5
    };
    
    // Send the request
    const response = await axios.patch(`${API_URL}/users/profile`, profileData, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Profile updated successfully with status:', response.status);
    console.log('Updated profile:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error updating profile without avatar:', error.response?.data || error.message);
    throw error;
  }
}

// Run the tests
async function runTests() {
  try {
    await testUpdateProfileWithAvatar();
    await testUpdateProfileWithoutAvatar();
    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('\nTests failed:', error.message);
  }
}

runTests();