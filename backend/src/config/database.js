const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', '..', 'database.sqlite');

let db;

const dbWrapper = {
  run: (sql, params = []) => { 
    db.run(sql, params);
    const result = db.exec("SELECT last_insert_rowid()");
    return { lastInsertRowid: result[0]?.values[0]?.[0] || 0, changes: db.getRowsModified() }; 
  },
  get: (sql, params = []) => { 
    const stmt = db.prepare(sql); 
    if (params.length > 0) stmt.bind(params);
    if (stmt.step()) { const row = stmt.getAsObject(); stmt.free(); return row; } 
    stmt.free(); 
    return null; 
  },
  all: (sql, params = []) => { 
    const stmt = db.prepare(sql); 
    if (params.length > 0) stmt.bind(params);
    const rows = []; 
    while (stmt.step()) rows.push(stmt.getAsObject()); 
    stmt.free(); 
    return rows; 
  },
  exec: (sql) => { db.run(sql); }
};

const initDb = async () => {
  const SQL = await initSqlJs();
  
  let data = null;
  if (fs.existsSync(dbPath)) {
    data = fs.readFileSync(dbPath);
  }
  
  db = new SQL.Database(data);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS pizzas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      base_price REAL NOT NULL,
      image_url TEXT,
      category TEXT DEFAULT 'signature'
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS sizes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price_modifier REAL NOT NULL
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS crusts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price_modifier REAL NOT NULL
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS sauces (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price_modifier REAL NOT NULL
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS cheeses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price_modifier REAL NOT NULL
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS toppings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price_modifier REAL NOT NULL
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      street_address TEXT,
      apt_suite TEXT,
      city TEXT,
      state TEXT,
      zip_code TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER,
      order_type TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      subtotal REAL NOT NULL,
      delivery_fee REAL NOT NULL,
      tax REAL NOT NULL,
      total REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      started_at DATETIME,
      ready_at DATETIME,
      completed_at DATETIME,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    )
  `);
  
  try {
    db.run("ALTER TABLE orders ADD COLUMN started_at DATETIME");
  } catch (e) {}
  try {
    db.run("ALTER TABLE orders ADD COLUMN ready_at DATETIME");
  } catch (e) {}
  try {
    db.run("ALTER TABLE orders ADD COLUMN completed_at DATETIME");
  } catch (e) {}
  
  db.run(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      pizza_id INTEGER,
      size_id INTEGER,
      crust_id INTEGER,
      sauce_id INTEGER,
      cheese_id INTEGER,
      toppings TEXT,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      item_total REAL NOT NULL,
      name TEXT,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (pizza_id) REFERENCES pizzas(id),
      FOREIGN KEY (size_id) REFERENCES sizes(id),
      FOREIGN KEY (crust_id) REFERENCES crusts(id),
      FOREIGN KEY (sauce_id) REFERENCES sauces(id),
      FOREIGN KEY (cheese_id) REFERENCES cheeses(id)
    )
  `);

  try {
    db.run("ALTER TABLE order_items ADD COLUMN name TEXT");
  } catch (e) {}

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'admin' CHECK(role IN ('admin')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  return dbWrapper;
};

const saveDb = () => {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
};

const getDb = () => dbWrapper;

module.exports = { initDb, getDb, saveDb };
