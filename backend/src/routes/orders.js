const express = require('express');
const router = express.Router();
const { getDb, saveDb } = require('../config/database');
const { validateOrder } = require('../middleware/validation');

const TAX_RATE = 0.09;

const calculatePrice = (item) => {
  const db = getDb();
  let price = 0;

  if (item.price) {
    return item.price;
  }

  if (item.pizza_id) {
    const pizza = db.get('SELECT base_price FROM pizzas WHERE id = ?', [item.pizza_id]);
    price += pizza ? pizza.base_price : 0;
  }

  if (item.size_id) {
    const size = db.get('SELECT price_modifier FROM sizes WHERE id = ?', [item.size_id]);
    price += size ? size.price_modifier : 0;
  }

  if (item.crust_id) {
    const crust = db.get('SELECT price_modifier FROM crusts WHERE id = ?', [item.crust_id]);
    price += crust ? crust.price_modifier : 0;
  }

  if (item.sauce_id) {
    const sauce = db.get('SELECT price_modifier FROM sauces WHERE id = ?', [item.sauce_id]);
    price += sauce ? sauce.price_modifier : 0;
  }

  if (item.cheese_id) {
    const cheese = db.get('SELECT price_modifier FROM cheeses WHERE id = ?', [item.cheese_id]);
    price += cheese ? cheese.price_modifier : 0;
  }

  if (item.topping_ids && item.topping_ids.length > 0) {
    const placeholders = item.topping_ids.map(() => '?').join(',');
    const toppings = db.all(`SELECT price_modifier FROM toppings WHERE id IN (${placeholders})`, item.topping_ids);
    toppings.forEach(t => price += t.price_modifier);
  }

  return price;
};

const buildOrderItemsWithNames = (db, orderId) => {
  const items = db.all('SELECT * FROM order_items WHERE order_id = ?', [orderId]);
  return items.map(item => {
    let itemName = 'Custom Pizza';

    if (item.name) {
      itemName = item.name;
    } else {
      if (item.pizza_id) {
        const pizza = db.get('SELECT name FROM pizzas WHERE id = ?', [item.pizza_id]);
        if (pizza) itemName = pizza.name;
      }

      if (item.size_id) {
        const size = db.get('SELECT name FROM sizes WHERE id = ?', [item.size_id]);
        if (size) itemName += ` (${size.name})`;
      }

      if (item.crust_id) {
        const crust = db.get('SELECT name FROM crusts WHERE id = ?', [item.crust_id]);
        if (crust) itemName += ` ${crust.name} crust`;
      }

      if (item.sauce_id) {
        const sauce = db.get('SELECT name FROM sauces WHERE id = ?', [item.sauce_id]);
        if (sauce) itemName += ` with ${sauce.name} sauce`;
      }

      if (item.cheese_id) {
        const cheese = db.get('SELECT name FROM cheeses WHERE id = ?', [item.cheese_id]);
        if (cheese) itemName += `, ${cheese.name} cheese`;
      }

      if (item.toppings) {
        try {
          const toppingIds = JSON.parse(item.toppings);
          if (toppingIds.length > 0) {
            const placeholders = toppingIds.map(() => '?').join(',');
            const toppingNames = db.all(`SELECT name FROM toppings WHERE id IN (${placeholders})`, toppingIds);
            const names = toppingNames.map(t => t.name).join(', ');
            if (names) itemName += ` + ${names}`;
          }
        } catch (e) {}
      }
    }

    return { ...item, item_name: itemName };
  });
};

router.post('/', validateOrder, (req, res) => {
  const db = getDb();
  const { customer_id, order_type, items, delivery_fee = 3.99, customer_info } = req.orderData;

  let finalCustomerId = customer_id || null;

  if (customer_info && !customer_id) {
    const { first_name, last_name, email, phone, street_address, apt_suite, city, state, zip_code } = customer_info;

    if (email) {
      const existing = db.get('SELECT id FROM customers WHERE email = ?', [email]);
      if (existing) {
        finalCustomerId = existing.id;
      }
    }

    if (!finalCustomerId) {
      try {
        const result = db.run(`
          INSERT INTO customers (first_name, last_name, email, phone, street_address, apt_suite, city, state, zip_code)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [first_name, last_name, email || null, phone || null, street_address || null, apt_suite || null, city || null, state || null, zip_code || null]);
        finalCustomerId = result.lastInsertRowid;
      } catch (e) {
        console.error('Failed to create customer:', e);
      }
    }
  }

  let subtotal = 0;
  const orderItems = [];

  items.forEach(item => {
    const unitPrice = calculatePrice(item);
    const itemTotal = unitPrice * item.quantity;
    subtotal += itemTotal;
    orderItems.push({ ...item, unit_price: unitPrice, item_total: itemTotal });
  });

  const deliveryFee = order_type === 'delivery' ? delivery_fee : 0;
  const tax = subtotal * TAX_RATE;
  const total = subtotal + deliveryFee + tax;

  try {
    const orderResult = db.run(`
      INSERT INTO orders (customer_id, order_type, status, subtotal, delivery_fee, tax, total)
      VALUES (?, ?, 'pending', ?, ?, ?, ?)
    `, [finalCustomerId, order_type, subtotal, deliveryFee, tax, total]);

    const orderId = orderResult.lastInsertRowid;

    orderItems.forEach(item => {
      const toppings = item.topping_ids ? JSON.stringify(item.topping_ids) : item.toppings || null;
      db.run(`
        INSERT INTO order_items (order_id, pizza_id, size_id, crust_id, sauce_id, cheese_id, toppings, quantity, unit_price, item_total, name)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [orderId, item.pizza_id || null, item.size_id || null, item.crust_id || null,
        item.sauce_id || null, item.cheese_id || null, toppings, item.quantity, item.unit_price || item.price, item.item_total || (item.price * item.quantity), item.name || null]);
    });

    saveDb();

    const order = db.get('SELECT * FROM orders WHERE id = ?', [orderId]);
    const fullItems = buildOrderItemsWithNames(db, orderId);
    const customer = finalCustomerId ? db.get('SELECT * FROM customers WHERE id = ?', [finalCustomerId]) : null;

    res.status(201).json({ ...order, items: fullItems, customer });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

router.get('/', (req, res) => {
  const db = getDb();
  const { status, customer_id, limit = 50 } = req.query;
  let query = 'SELECT * FROM orders';
  const params = [];

  if (status || customer_id) {
    const conditions = [];
    if (status) { conditions.push('status = ?'); params.push(status); }
    if (customer_id) { conditions.push('customer_id = ?'); params.push(customer_id); }
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(parseInt(limit));

  const orders = db.all(query, params);
  res.json(orders);
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const order = db.get('SELECT * FROM orders WHERE id = ?', [req.params.id]);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const items = buildOrderItemsWithNames(db, req.params.id);
  const customer = order.customer_id ? db.get('SELECT * FROM customers WHERE id = ?', [order.customer_id]) : null;
  res.json({ ...order, items, customer });
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  db.run('DELETE FROM order_items WHERE order_id = ?', [req.params.id]);
  const result = db.run('DELETE FROM orders WHERE id = ?', [req.params.id]);
  saveDb();
  if (result.changes === 0) return res.status(404).json({ error: 'Order not found' });
  res.json({ success: true });
});

router.get('/history', (req, res) => {
  const db = getDb();
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ error: 'email query parameter is required' });
  }

  const customer = db.get('SELECT * FROM customers WHERE email = ?', [email]);
  if (!customer) {
    return res.json({ customer: null, orders: [] });
  }

  const orders = db.all('SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC', [customer.id]);

  const enrichedOrders = orders.map(order => {
    const items = buildOrderItemsWithNames(db, order.id);
    return { ...order, items };
  });

  res.json({ customer, orders: enrichedOrders });
});

router.patch('/:id/status', (req, res) => {
  const db = getDb();
  const { status } = req.body;
  const validStatuses = ['pending', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'completed', 'cancelled'];

  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const result = db.run('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);
  saveDb();
  if (result.changes === 0) return res.status(404).json({ error: 'Order not found' });

  const order = db.get('SELECT * FROM orders WHERE id = ?', [req.params.id]);
  res.json(order);
});

module.exports = router;
