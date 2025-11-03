📦 ESHOP INVENTORYIQ - DUMMY APIs
---------------------------------
Contains mock API servers for Shopee and TikTok Shop.

-------------------------------------------------------
1️⃣ SETUP
-------------------------------------------------------
1. Open terminal in each folder:

cd mock-apis/mock-shopee-api
npm install
npm start

cd mock-apis/mock-tiktok-api
npm install
npm start

2. Output:
✅ Shopee Dummy API running at http://localhost:3000
✅ TikTok Dummy API running at http://localhost:4000

-------------------------------------------------------
2️⃣ ENDPOINTS
-------------------------------------------------------
🛍 SHOPEE
GET    /api/v2/product/get_item_list
GET    /api/v2/product/get_item_base_info?item_id=1001
POST   /api/v2/product/update_stock
GET    /api/v2/order/get_order_list

🎵 TIKTOK
GET    /api/v2/product/list
GET    /api/v2/product/detail?item_id=2001
POST   /api/v2/product/update_stock
GET    /api/v2/order/list

-------------------------------------------------------
3️⃣ NOTES
-------------------------------------------------------
- All data stored in /data/products.json and /data/orders.json.
- Stock changes are permanent (written to file).
- No auto updates.
- Works perfectly with fetch() calls from your website backend.
