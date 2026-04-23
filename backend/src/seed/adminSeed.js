const bcrypt = require('bcryptjs');
const { getDb, saveDb } = require('../config/database');

const seedAdmin = async () => {
  const db = getDb();
  if (!db) { console.log('Database not initialized'); return; }

  const username = 'admin';
  const email = 'admin@bellamamma.com';
  const password = 'admin123';
  const role = 'admin';

  try {
    db.run("DELETE FROM users WHERE username = 'admin'");
    const password_hash = await bcrypt.hash(password, 10);
    db.run(
      'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [username, email, password_hash, role]
    );
    saveDb();
    console.log('Admin user reset:');
    console.log('  Username: admin');
    console.log('  Password: admin123');
  } catch (error) {
    console.error('Failed to seed admin:', error);
  }
};

module.exports = seedAdmin;