const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb } = require('./config/database');
const seed = require('./seed/menuSeed');
const seedAdmin = require('./seed/adminSeed');

const menuRoutes = require('./routes/menu');
const ordersRoutes = require('./routes/orders');
const customersRoutes = require('./routes/customers');
const authRoutes = require('./routes/auth');
const kitchenRoutes = require('./routes/kitchen');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const startServer = async () => {
  await initDb();
  seed();
  await seedAdmin();

  app.use(express.static(path.join(__dirname, '..')));
  app.use(express.static(path.join(__dirname, '..', '..', 'website')));
  app.get('/bella', (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'bella-mamma.html'));
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/menu', menuRoutes);
  app.use('/api/orders', ordersRoutes);
  app.use('/api/customers', customersRoutes);
  app.use('/api/kitchen', kitchenRoutes);

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'website', 'index.html'));
  });

  app.listen(PORT, () => {
    console.log(`Bella Mamma: http://localhost:${PORT}`);
    console.log(`API: http://localhost:${PORT}/api/*`);
  });
};

startServer().catch(console.error);

module.exports = app;
