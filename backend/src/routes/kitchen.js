const express = require('express');
const router = express.Router();
const { getDb, saveDb } = require('../config/database');

router.get('/orders', (req, res) => {
  const db = getDb();
  const { status } = req.query;
  
  let query = `
    SELECT o.*, c.first_name, c.last_name, c.phone,
      (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
    FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.id
  `;
  const params = [];
  
  if (status) {
    query += ' WHERE o.status = ?';
    params.push(status);
  } else {
    query += " WHERE o.status IN ('pending', 'preparing', 'ready')";
  }
  
  query += ' ORDER BY o.created_at ASC';
  
  const orders = db.all(query, params);
  
  const enrichedOrders = orders.map(order => {
    const items = db.all(`
      SELECT oi.*, p.name as pizza_name
      FROM order_items oi
      LEFT JOIN pizzas p ON oi.pizza_id = p.id
      WHERE oi.order_id = ?
    `, [order.id]);
    
    return { ...order, items };
  });
  
  res.json(enrichedOrders);
});

router.get('/orders/active', (req, res) => {
  const db = getDb();
  
  const orders = db.all(`
    SELECT o.*, c.first_name, c.last_name, c.phone,
      (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
    FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.id
    WHERE o.status IN ('pending', 'preparing')
    ORDER BY 
      CASE o.status 
        WHEN 'pending' THEN 1 
        WHEN 'preparing' THEN 2 
      END,
      o.created_at ASC
  `);
  
  const enrichedOrders = orders.map(order => {
    const items = db.all(`
      SELECT oi.*, p.name as pizza_name
      FROM order_items oi
      LEFT JOIN pizzas p ON oi.pizza_id = p.id
      WHERE oi.order_id = ?
    `, [order.id]);
    
    return { ...order, items };
  });
  
  res.json(enrichedOrders);
});

router.get('/stats', (req, res) => {
  const db = getDb();
  
  const today = new Date().toISOString().split('T')[0];
  
  const pending = db.get("SELECT COUNT(*) as count FROM orders WHERE status = 'pending'");
  const preparing = db.get("SELECT COUNT(*) as count FROM orders WHERE status = 'preparing'");
  const ready = db.get("SELECT COUNT(*) as count FROM orders WHERE status = 'ready'");
  const todayOrders = db.get(`
    SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as revenue 
    FROM orders 
    WHERE DATE(created_at) = DATE(?)
  `, [today]);
  const avgPrepTime = db.get(`
    SELECT AVG(
      (julianday(completed_at) - julianday(created_at)) * 24 * 60
    ) as avg_minutes
    FROM orders 
    WHERE completed_at IS NOT NULL 
    AND DATE(created_at) = DATE(?)
  `, [today]);
  
  res.json({
    pending: pending?.count || 0,
    preparing: preparing?.count || 0,
    ready: ready?.count || 0,
    todayOrders: todayOrders?.count || 0,
    todayRevenue: todayOrders?.revenue || 0,
    avgPrepTime: Math.round(avgPrepTime?.avg_minutes || 0)
  });
});

router.patch('/orders/:id/start', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  
  const order = db.get('SELECT * FROM orders WHERE id = ?', [id]);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  
  if (order.status !== 'pending') {
    return res.status(400).json({ error: 'Order must be pending to start' });
  }
  
  db.run("UPDATE orders SET status = 'preparing', started_at = CURRENT_TIMESTAMP WHERE id = ?", [id]);
  saveDb();
  
  const updated = db.get('SELECT * FROM orders WHERE id = ?', [id]);
  res.json(updated);
});

router.patch('/orders/:id/ready', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  
  const order = db.get('SELECT * FROM orders WHERE id = ?', [id]);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  
  if (order.status !== 'preparing') {
    return res.status(400).json({ error: 'Order must be preparing to mark ready' });
  }
  
  db.run("UPDATE orders SET status = 'ready', ready_at = CURRENT_TIMESTAMP WHERE id = ?", [id]);
  saveDb();
  
  const updated = db.get('SELECT * FROM orders WHERE id = ?', [id]);
  res.json(updated);
});

router.patch('/orders/:id/complete', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  
  const order = db.get('SELECT * FROM orders WHERE id = ?', [id]);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  
  db.run("UPDATE orders SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = ?", [id]);
  saveDb();
  
  const updated = db.get('SELECT * FROM orders WHERE id = ?', [id]);
  res.json(updated);
});

router.patch('/orders/:id/next', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  
  const order = db.get('SELECT * FROM orders WHERE id = ?', [id]);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  
  let newStatus;
  const statusFlow = {
    'pending': 'preparing',
    'preparing': 'ready',
    'ready': 'completed'
  };
  
  newStatus = statusFlow[order.status];
  if (!newStatus) {
    return res.status(400).json({ error: 'Order cannot progress further' });
  }
  
  const timestampField = {
    'preparing': 'started_at',
    'ready': 'ready_at',
    'completed': 'completed_at'
  };
  
  db.run(
    `UPDATE orders SET status = ?, ${timestampField[newStatus]} = CURRENT_TIMESTAMP WHERE id = ?`,
    [newStatus, id]
  );
  saveDb();
  
  const updated = db.get('SELECT * FROM orders WHERE id = ?', [id]);
  res.json(updated);
});

module.exports = router;
