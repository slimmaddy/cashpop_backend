/**
 * Script kiểm tra database có dummy data chưa
 */

const { Client } = require('pg');

// Database config (từ .env file)
const dbConfig = {
  host: 'localhost',
  port: 5432,
  database: 'cashpop',
  user: 'postgres',
  password: '123456', // Từ .env file
};

async function checkDatabase() {
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    console.log('✅ Connected to database');
    
    // Check test user
    console.log('\n🔍 Checking test user...');
    const userResult = await client.query(
      "SELECT id, email, username, name FROM users WHERE email = 'testuser@example.com'"
    );
    
    if (userResult.rows.length > 0) {
      console.log('✅ Test user exists:', userResult.rows[0]);
    } else {
      console.log('❌ Test user NOT found');
      return;
    }
    
    // Check friends
    console.log('\n🔍 Checking friends...');
    const friendsResult = await client.query(
      "SELECT id, email, username, name FROM users WHERE id != '550e8400-e29b-41d4-a716-446655440000'"
    );
    
    console.log(`📊 Total users (excluding test user): ${friendsResult.rows.length}`);
    if (friendsResult.rows.length > 0) {
      console.log('👥 Friends:');
      friendsResult.rows.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.name} (${user.email}) [@${user.username || 'null'}]`);
      });
    }
    
    // Check friendships
    console.log('\n🔍 Checking friendships...');
    const friendshipResult = await client.query(
      "SELECT id, user_id, friend_id, status FROM friendships WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'"
    );
    
    console.log(`📊 Total friendships: ${friendshipResult.rows.length}`);
    if (friendshipResult.rows.length > 0) {
      console.log('🤝 Friendships:');
      friendshipResult.rows.forEach((friendship, index) => {
        console.log(`   ${index + 1}. Friend ID: ${friendship.friend_id}, Status: ${friendship.status}`);
      });
    } else {
      console.log('❌ No friendships found for test user');
    }
    
    // Check accepted friendships with friend details
    console.log('\n🔍 Checking accepted friendships with friend details...');
    const detailedResult = await client.query(`
      SELECT f.id, f.status, u.email, u.username, u.name 
      FROM friendships f
      LEFT JOIN users u ON f.friend_id = u.id
      WHERE f.user_id = '550e8400-e29b-41d4-a716-446655440000' 
        AND f.status = 'accepted'
    `);
    
    console.log(`📊 Accepted friendships: ${detailedResult.rows.length}`);
    if (detailedResult.rows.length > 0) {
      console.log('✅ Accepted friends:');
      detailedResult.rows.forEach((friend, index) => {
        console.log(`   ${index + 1}. ${friend.name} (${friend.email}) [@${friend.username || 'null'}]`);
      });
    }
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('1. Check database connection settings');
    console.log('2. Make sure PostgreSQL is running');
    console.log('3. Verify database name and credentials');
    console.log('4. Run: npm install pg');
  } finally {
    await client.end();
  }
}

checkDatabase();
