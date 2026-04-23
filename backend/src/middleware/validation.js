const validateOrder = (req, res, next) => {
  const { customer_id, order_type, items, delivery_fee = 3.99, customer_info } = req.body;

  if (!order_type || !['delivery', 'pickup'].includes(order_type)) {
    return res.status(400).json({ error: 'order_type must be "delivery" or "pickup"' });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items must be a non-empty array' });
  }

  for (const item of items) {
    if (!item.quantity || item.quantity < 1) {
      return res.status(400).json({ error: 'Each item must have quantity >= 1' });
    }
  }

  req.orderData = { customer_id, order_type, items, delivery_fee, customer_info };
  next();
};

const validateCustomer = (req, res, next) => {
  const { first_name, last_name, email, phone } = req.body;

  if (!first_name || !last_name) {
    return res.status(400).json({ error: 'first_name and last_name are required' });
  }

  if (email && !email.includes('@')) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  next();
};

module.exports = { validateOrder, validateCustomer };
