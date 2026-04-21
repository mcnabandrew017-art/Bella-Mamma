const express = require('express');
const router = express.Router();
const { getDb, saveDb } = require('../config/database');

router.get('/', (req, res) => {
  const db = getDb();
  const pizzas = db.all('SELECT * FROM pizzas');
  const sizes = db.all('SELECT * FROM sizes');
  const crusts = db.all('SELECT * FROM crusts');
  const sauces = db.all('SELECT * FROM sauces');
  const cheeses = db.all('SELECT * FROM cheeses');
  const toppings = db.all('SELECT * FROM toppings');

  res.json({ pizzas, options: { sizes, crusts, sauces, cheeses, toppings } });
});

router.get('/pizzas', (req, res) => {
  const db = getDb();
  const pizzas = db.all('SELECT * FROM pizzas');
  res.json(pizzas);
});

router.get('/options', (req, res) => {
  const db = getDb();
  const sizes = db.all('SELECT * FROM sizes');
  const crusts = db.all('SELECT * FROM crusts');
  const sauces = db.all('SELECT * FROM sauces');
  const cheeses = db.all('SELECT * FROM cheeses');
  const toppings = db.all('SELECT * FROM toppings');
  res.json({ sizes, crusts, sauces, cheeses, toppings });
});

router.get('/pizzas/:id', (req, res) => {
  const db = getDb();
  const pizza = db.get('SELECT * FROM pizzas WHERE id = ?', [req.params.id]);
  if (!pizza) return res.status(404).json({ error: 'Pizza not found' });
  res.json(pizza);
});

router.get('/pizzas/:id/options', (req, res) => {
  const db = getDb();
  const pizza = db.get('SELECT * FROM pizzas WHERE id = ?', [req.params.id]);
  if (!pizza) return res.status(404).json({ error: 'Pizza not found' });

  const sizes = db.all('SELECT * FROM sizes');
  const crusts = db.all('SELECT * FROM crusts');
  const sauces = db.all('SELECT * FROM sauces');
  const cheeses = db.all('SELECT * FROM cheeses');
  const toppings = db.all('SELECT * FROM toppings');

  res.json({ pizza, options: { sizes, crusts, sauces, cheeses, toppings } });
});

router.post('/pizzas', (req, res) => {
  const db = getDb();
  const { name, description, base_price } = req.body;
  if (!name || base_price === undefined) return res.status(400).json({ error: 'name and base_price required' });
  try {
    const result = db.run('INSERT INTO pizzas (name, description, base_price) VALUES (?, ?, ?)', [name, description || '', base_price]);
    saveDb();
    res.status(201).json(db.get('SELECT * FROM pizzas WHERE id = ?', [result.lastInsertRowid]));
  } catch (e) {
    res.status(500).json({ error: 'Failed to create pizza' });
  }
});

router.put('/pizzas/:id', (req, res) => {
  const db = getDb();
  const { name, description, base_price } = req.body;
  const result = db.run('UPDATE pizzas SET name = ?, description = ?, base_price = ? WHERE id = ?', [name, description || '', base_price, req.params.id]);
  saveDb();
  if (result.changes === 0) return res.status(404).json({ error: 'Pizza not found' });
  res.json(db.get('SELECT * FROM pizzas WHERE id = ?', [req.params.id]));
});

router.delete('/pizzas/:id', (req, res) => {
  const db = getDb();
  const result = db.run('DELETE FROM pizzas WHERE id = ?', [req.params.id]);
  saveDb();
  if (result.changes === 0) return res.status(404).json({ error: 'Pizza not found' });
  res.json({ success: true });
});

// Options CRUD
const optionTables = { sizes: 'sizes', crusts: 'crusts', sauces: 'sauces', cheeses: 'cheeses', toppings: 'toppings' };

Object.entries(optionTables).forEach(([table, _]) => {
  router.post(`/${table}`, (req, res) => {
    const db = getDb();
    const { name, price_modifier, category } = req.body;
    if (!name || price_modifier === undefined) return res.status(400).json({ error: 'name and price_modifier required' });
    try {
      const cols = table === 'toppings' ? '(name, price_modifier, category)' : '(name, price_modifier)';
      const vals = table === 'toppings' ? [name, price_modifier, category || 'veggie'] : [name, price_modifier];
      const result = db.run(`INSERT INTO ${table} ${cols} VALUES (?, ?)`, vals);
      saveDb();
      res.status(201).json(db.get(`SELECT * FROM ${table} WHERE id = ?`, [result.lastInsertRowid]));
    } catch (e) {
      res.status(500).json({ error: `Failed to create ${table.slice(0, -1)}` });
    }
  });

  router.put(`/${table}/:id`, (req, res) => {
    const db = getDb();
    const { name, price_modifier, category } = req.body;
    let result;
    if (table === 'toppings') {
      result = db.run('UPDATE toppings SET name = ?, price_modifier = ?, category = ? WHERE id = ?', [name, price_modifier, category || 'veggie', req.params.id]);
    } else {
      result = db.run(`UPDATE ${table} SET name = ?, price_modifier = ? WHERE id = ?`, [name, price_modifier, req.params.id]);
    }
    saveDb();
    if (result.changes === 0) return res.status(404).json({ error: 'Item not found' });
    res.json(db.get(`SELECT * FROM ${table} WHERE id = ?`, [req.params.id]));
  });

  router.delete(`/${table}/:id`, (req, res) => {
    const db = getDb();
    const result = db.run(`DELETE FROM ${table} WHERE id = ?`, [req.params.id]);
    saveDb();
    if (result.changes === 0) return res.status(404).json({ error: 'Item not found' });
    res.json({ success: true });
  });
});

module.exports = router;
