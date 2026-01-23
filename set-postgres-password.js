const { Client } = require('pg');

async function setPassword() {
  // Try multiple passwords that might have been set during installation
  const passwords = ['', 'postgres', 'admin', 'password', '123456', 'postgrad'];
  
  for (const pwd of passwords) {
    try {
      const client = new Client({
        host: '127.0.0.1',
        port: 5432,
        database: 'postgres',
        user: 'postgres',
        password: pwd || undefined
      });
      
      await client.connect();
      console.log(`✓ Connected to PostgreSQL with password: "${pwd || 'NO PASSWORD'}"`);
      
      await client.query("ALTER USER postgres WITH PASSWORD 'PostgreSQL2024!';");
      console.log('✓ Password set to: PostgreSQL2024!');
      
      await client.end();
      return;
    } catch (err) {
      // Continue to next password
    }
  }
  
  console.error('✗ Could not connect with any password');
  process.exit(1);
}

setPassword();
