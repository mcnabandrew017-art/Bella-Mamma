const express = require('express');
const router = express.Router();
const { getDb, saveDb } = require('../config/database');
const { validateCustomer } = require('../middleware/validation');

router.post('/', validateCustomer, (req, res) => {
  const db = getDb();
  const { first_name, last_name, email, phone, street_address, apt_suite, city, state, zip_code } = req.body;

  const toDb = (v) => v === undefined ? null : v;
  
  try {
    const result = db.run(`
      INSERT INTO customers (first_name, last_name, email, phone, street_address, apt_suite, city, state, zip_code)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [toDb(first_name), toDb(last_name), toDb(email), toDb(phone), toDb(street_address), toDb(apt_suite), toDb(city), toDb(state), toDb(zip_code)]);
    
    saveDb();
    const customer = db.get('SELECT * FROM customers WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json(customer);
  } catch (error) {
    console.error('Customer error:', error);
    res.status(500).json({ error: 'Failed to create customer', details: error.message });
  }
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const customer = db.get('SELECT * FROM customers WHERE id = ?', [req.params.id]);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });
  res.json(customer);
});

router.get('/', (req, res) => {
  const db = getDb();
  const { email, phone } = req.query;
  let query = 'SELECT * FROM customers';
  const params = [];

  if (email || phone) {
    const conditions = [];
    if (email) { conditions.push('email = ?'); params.push(email); }
    if (phone) { conditions.push('phone = ?'); params.push(phone); }
    query += ' WHERE ' + conditions.join(' OR ');
  }

  const customers = db.all(query, params);
  res.json(customers);
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  const result = db.run('DELETE FROM customers WHERE id = ?', [req.params.id]);
  saveDb();
  if (result.changes === 0) return res.status(404).json({ error: 'Customer not found' });
  res.json({ success: true });
});

router.put('/:id', validateCustomer, (req, res) => {
  const db = getDb();
  const { first_name, last_name, email, phone, street_address, apt_suite, city, state, zip_code } = req.body;

  const result = db.run(`
    UPDATE customers 
    SET first_name = ?, last_name = ?, email = ?, phone = ?, street_address = ?, apt_suite = ?, city = ?, state = ?, zip_code = ?
    WHERE id = ?
  `, [first_name, last_name, email, phone, street_address, apt_suite, city, state, zip_code, req.params.id]);
  
  saveDb();
  if (result.changes === 0) return res.status(404).json({ error: 'Customer not found' });

  const customer = db.get('SELECT * FROM customers WHERE id = ?', [req.params.id]);
  res.json(customer);
});

module.exports = router;
