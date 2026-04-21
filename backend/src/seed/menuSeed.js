const { getDb, saveDb } = require('../config/database');

const randomPrice = (min, max) => Math.round((Math.random() * (max - min) + min) * 100) / 100;

const seed = () => {
  const db = getDb();
  if (!db) { console.log('Database not initialized'); return; }

  const countResult = db.get('SELECT COUNT(*) as count FROM pizzas');

  if (countResult && countResult.count > 0) {
    console.log('Clearing existing data for new random prices...');
    db.exec('DELETE FROM toppings');
    db.exec('DELETE FROM cheeses');
    db.exec('DELETE FROM sauces');
    db.exec('DELETE FROM crusts');
    db.exec('DELETE FROM sizes');
    db.exec('DELETE FROM pizzas');
  }

  const pizzas = [
    ['Artisan', 'Hand-crafted with premium mozzarella and our secret herb blend. Baked in a wood-fired oven for that char.', 220, 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=80', 'signature'],
    ['Classic', 'Traditional pizza with fresh ingredients and house-made sauce.', 180, 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=400&q=80', 'signature'],
    ['Pepperoni', 'Zesty pepperoni with premium mozzarella cheese.', 200, 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400&q=80', 'signature']
  ];

  pizzas.forEach(p => {
    db.run('INSERT INTO pizzas (name, description, base_price, image_url, category) VALUES (?, ?, ?, ?, ?)', p);
  });

  const sizes = [['Personal 8"', 80], ['Medium 12"', 120], ['Large 14"', 180], ['Family 18"', 280]];
  sizes.forEach(s => db.run('INSERT INTO sizes (name, price_modifier) VALUES (?, ?)', s));

  const crusts = [['Thin', 0], ['Thick', 20], ['Stuffed', 40], ['Gluten-Free', 30]];
  crusts.forEach(c => db.run('INSERT INTO crusts (name, price_modifier) VALUES (?, ?)', c));

  const sauces = [['Classic Tomato', 0], ['White Garlic', 15], ['Pesto', 25]];
  sauces.forEach(s => db.run('INSERT INTO sauces (name, price_modifier) VALUES (?, ?)', s));

  const cheeses = [['Mozzarella', 0], ['Extra Mozzarella', 25], ['Parmesan', 25], ['Vegan', 40]];
  cheeses.forEach(c => db.run('INSERT INTO cheeses (name, price_modifier) VALUES (?, ?)', c));

  const toppings = [
    ['Pepperoni', 'meat', 25], ['Italian Sausage', 'meat', 30], ['Bacon', 'meat', 35],
    ['Ham', 'meat', 25], ['Chicken', 'meat', 35], ['Mushrooms', 'veggie', 18],
    ['Bell Peppers', 'veggie', 18], ['Olives', 'veggie', 18], ['Onions', 'veggie', 15],
    ['Jalapenos', 'veggie', 15], ['Pineapple', 'veggie', 25]
  ];
  toppings.forEach(t => db.run('INSERT INTO toppings (name, category, price_modifier) VALUES (?, ?, ?)', t));

  saveDb();
  console.log('Database seeded with random prices!');
  console.log('Generated prices:');
  console.log('- Pizzas:', pizzas.map(p => `R${p[2]}`).join(', '));
  console.log('- Sizes:', sizes.map(s => `${s[0]}: R${s[1]}`).join(', '));
  console.log('- Crusts:', crusts.map(c => `${c[0]}: R${c[1]}`).join(', '));
  console.log('- Sauces:', sauces.map(s => `${s[0]}: R${s[1]}`).join(', '));
  console.log('- Cheeses:', cheeses.map(c => `${c[0]}: R${c[1]}`).join(', '));
};

module.exports = seed;
