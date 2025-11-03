const express = require('express');
const cors = require('cors');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

const PRODUCTS_FILE = __dirname + '/data/products.json';
const ORDERS_FILE   = __dirname + '/data/orders.json';

// 🟢 GET all products
app.get('/api/v2/product/get_item_list', (req, res) => {
  try {
    const products = JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8'));
    res.json({ error: "", message: "success", response: { items: products } });
  } catch (err) {
    console.error('❌ ERROR:', err);
    res.status(500).json({ error: 'Failed to read or parse products.json' });
  }
});

// 🟣 GET one product detail
app.get('/api/v2/product/get_item_detail', (req, res) => {
  const id = Number(req.query.item_id);
  try {
    const products = JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8'));
    const item = products.find(p => p.item_id === id);
    res.json({
      error: item ? "" : "item_not_found",
      message: item ? "success" : "no item found",
      response: item || null
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to read products file' });
  }
});

// 🟣 GET order list
app.get('/api/v2/order/get_order_list', (req, res) => {
  const orders = JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8'));
  res.json({ error: "", message: "success", response: { orders } });
});

// 🟢 GET order detail (?order_id=...)
app.get('/api/v2/order/get_order_detail', (req, res) => {
  const orders = JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8'));
  const orderId = req.query.order_id;
  const order = orders.find(o => o.order_id === orderId);
  res.json({
    error: order ? "" : "order_not_found",
    message: order ? "success" : "no order found",
    response: order || null
  });
});

const PORT = 3100;
app.listen(PORT, () =>
  console.log(`✅ Shopee Dummy API running at http://localhost:${PORT}`)
);
