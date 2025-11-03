const express = require('express');
const cors = require('cors');
const fs = require('fs');
const app = express();
app.use(cors());
app.use(express.json());

const PRODUCTS_FILE = './data/products.json';
const ORDERS_FILE   = './data/orders.json';

// 🟢 GET all products
app.get('/api/v2/product/list', (req, res) => {
  const products = JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8'));
  res.json({ error: "", message: "success", response: { items: products } });
});

// 🟢 GET one product
app.get('/api/v2/product/detail', (req, res) => {
  const products = JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8'));
  const id = Number(req.query.item_id);
  const item = products.find(p => p.item_id === id);
  res.json({
    error: item ? "" : "item_not_found",
    message: item ? "success" : "no item found",
    response: item || null
  });
});

// 🟣 GET order list
app.get('/api/v2/order/list', (req, res) => {
  const orders = JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8'));
  res.json({ error: "", message: "success", response: { orders } });
});

// 🟢 GET order detail (?order_id=...)
app.get('/api/v2/order/detail', (req, res) => {
  const orders = JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8'));
  const orderId = req.query.order_id;
  const order = orders.find(o => o.order_id === orderId);
  res.json({
    error: order ? "" : "order_not_found",
    message: order ? "success" : "no order found",
    response: order || null
  });
});

const PORT = 4000;
app.listen(PORT, () =>
  console.log(`✅ TikTok Dummy API running at http://localhost:${PORT}`)
);
