import express from "express";
import pkg from "pg";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();
const { Pool } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'docs', 'index.html'));
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
  rejectUnauthorized: false
},
});

pool.connect()
  .then(client => {
    console.log("Connected to Neon successfully!");
    client.release();
  })
  .catch(err => console.error("Connection failed:", err.message));

/* ------------------------------------------------------------------
   API Endpoint: /api/inventory
   Combines E-Commerce + Retail tables into one unified dataset
------------------------------------------------------------------ */
app.get("/api/inventory", async (req, res) => {
  try {
    const query = `
      SELECT 
            p.product_name,
            pv.size,
            pv.variation AS color,
            'E-commerce' AS platform,
            pv.original_price AS price,
            p.cost AS cost,
            pv.stock
        FROM product_variation_dimension pv
        JOIN product_dimension p
            ON p.product_id = pv.product_id
        WHERE p.product_status = 'A'
        ORDER BY p.product_name, pv.size, pv.variation;
    `;

    const result = await pool.query(query);
    res.json(result.rows);

  } catch (err) {
    console.error("Database error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Update product cost API endpoint
app.use(express.json());

app.post("/api/update-cost", async (req, res) => {
  const { product, newCost } = req.body;

  // Basic validation
  if (!product || isNaN(newCost)) {
    return res.status(400).json({ message: "Invalid input data" });
  }

  try {
    // Update ALL products
    if (product === "all") {
      await pool.query(
        `UPDATE product_dimension SET cost = $1 WHERE product_status = 'A'`,
        [newCost]
      );
      return res.json({ message: "All product costs updated successfully!" });
    }

    // Update one product based on product_name
    await pool.query(
      `
      UPDATE product_dimension
      SET cost = $1
      WHERE LOWER(product_name) = LOWER($2)
      `,
      [newCost, product]
    );

    res.json({ message: "Product cost updated successfully!" });

  } catch (err) {
    console.error("❌ Error updating cost:", err);
    res.status(500).json({ message: "Database error while updating cost" });
  }
});


// ========================================
// GET /api/history
// Pulls 2026+ completed sales from denormalized_table
// ========================================
app.get("/api/history", async (req, res) => {
  try {
    const sql = `
           
          `;

    const result = await pool.query(sql);
    res.json(result.rows);

  } catch (err) {
    console.error("Error fetching history:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/forecast", async (req, res) => {
  try {
    const sql = `
      SELECT
        CASE
          WHEN LOWER(platform) LIKE '%tiktok%' THEN 'tiktok'
          WHEN LOWER(platform) LIKE '%retail%' 
            OR LOWER(platform) LIKE '%pos%'
            OR LOWER(platform) LIKE '%store%' THEN 'retail'
          ELSE 'other'
        END AS platform,

        TO_CHAR(DATE_TRUNC('month', ds), 'YYYY-MM-01') AS ds,
        forecast_value AS y,
        mae, rmse, mape, smape
      FROM forecast
      WHERE DATE_PART('year', ds) = 2026
        AND LOWER(platform) NOT LIKE '%shopee%'
        AND LOWER(platform) NOT LIKE '%shop%'
        AND LOWER(platform) NOT LIKE '%ecom%'
      ORDER BY ds ASC, platform ASC;
      `;

    const result = await pool.query(sql);
    res.json(result.rows);

  } catch (err) {
    console.error("Error fetching forecast:", err);
    res.status(500).json({ error: err.message });
  }
});

// ========================================
// GET /api/order-forecast
// Pulls order forecasting values from NEW table
// ========================================
app.get("/api/order-forecast", async (req, res) => {
  try {
    const sql = `
      SELECT
        CASE
          WHEN LOWER(platform_name) LIKE '%tiktok%' THEN 'tiktok'
          WHEN LOWER(platform_name) LIKE '%retail%' THEN 'retail'
          ELSE 'other'
        END AS platform,

        TO_CHAR(DATE_TRUNC('month', forecast_date), 'YYYY-MM-01') AS ds,
        forecast_value AS orders,

        rmse,
        smape
      FROM order_forecast
      WHERE DATE_PART('year', forecast_date) = 2026
      ORDER BY forecast_date ASC, platform_name ASC;
    `;

    const result = await pool.query(sql);
    res.json(result.rows);

  } catch (err) {
    console.error("Error fetching order forecast:", err);
    res.status(500).json({ error: err.message });
  }
});



app.get("/api/sales-breakdown", async (req, res) => {
  try {
    const sql = `
      SELECT 
        LOWER(platform_name) AS platform,
        SUM(order_amount) AS total_sales
      FROM denormalized_table
      WHERE LOWER(order_status) = 'completed'
        AND DATE_PART('year', order_date) = 2026
        AND LOWER(platform_name) NOT LIKE '%shopee%'
        AND LOWER(platform_name) NOT LIKE '%shop%'
        AND LOWER(platform_name) NOT LIKE '%ecom%'
      GROUP BY LOWER(platform_name);
      `;

    const result = await pool.query(sql);

    const total = result.rows.reduce(
      (acc, row) => acc + Number(row.total_sales), 
      0
    );

    const breakdown = result.rows.map(row => ({
      platform: row.platform,
      percent: total > 0 ? (row.total_sales / total) * 100 : 0
    }));

    res.json(breakdown);

  } catch (err) {
    console.error("Error calculating breakdown:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ========================================
// GET /api/top-products
// Top 5 products by sales or orders
// metric=sales|orders  platform=all|tiktok|retail
// ========================================
app.get("/api/top-products", async (req, res) => {
  try {
    let metric = (req.query.metric || "sales").toLowerCase();
    const platform = (req.query.platform || "all").toLowerCase();

    if (!["sales", "orders"].includes(metric)) {
      metric = "sales";
    }

    const sql = `
      WITH filtered AS (
        SELECT *,
          CASE 
            WHEN LOWER(platform_name) LIKE '%retail%'
                 AND LOWER(order_status) = 'completed'
              THEN TRUE
            WHEN LOWER(platform_name) NOT LIKE '%retail%'
                 AND LOWER(order_status) = 'completed'
                 AND delivered_date IS NOT NULL
              THEN TRUE
            ELSE FALSE
          END AS is_completed
        FROM denormalized_table
        WHERE DATE_PART('year', order_date) = 2026
          AND LOWER(platform_name) NOT LIKE '%shopee%'
          AND LOWER(platform_name) NOT LIKE '%shop%'
          AND LOWER(platform_name) NOT LIKE '%ecom%'
      ),
      agg AS (
        SELECT
          product_name,
          SUM(
            CASE WHEN is_completed THEN COALESCE(quantity, 0) ELSE 0 END
          ) AS total_orders,
          SUM(
            CASE WHEN is_completed THEN COALESCE(order_amount, 0) ELSE 0 END
          ) AS total_sales
        FROM filtered
        WHERE product_name <> 'UNKNOWN'
          AND (
            $1 = 'all'
            OR ($1 = 'tiktok' AND LOWER(platform_name) LIKE '%tiktok%')
            OR ($1 = 'retail' AND LOWER(platform_name) LIKE '%retail%')
          )
        GROUP BY product_name
      )
      SELECT 
        product_name,
        total_orders,
        total_sales
      FROM agg
      ORDER BY
        CASE WHEN $2 = 'orders' THEN total_orders END DESC,
        CASE WHEN $2 = 'sales'  THEN total_sales  END DESC
      LIMIT 5;
    `;

    const result = await pool.query(sql, [platform, metric]);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching top products:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ========================================
// GET /api/share-projection
// Computes sales + orders share for TikTok & Retail
// ========================================
app.get("/api/share-projection", async (req, res) => {
  try {
    const sql = `
      SELECT
        CASE
          WHEN LOWER(platform) LIKE '%tiktok%' THEN 'tiktok'
          WHEN LOWER(platform) LIKE '%retail%' 
            OR LOWER(platform) LIKE '%pos%'
            OR LOWER(platform) LIKE '%store%' THEN 'retail'
          ELSE 'other'
        END AS platform,
        TO_CHAR(DATE_TRUNC('month', ds), 'YYYY-MM-01') AS ds,
        forecast_value AS y
      FROM forecast
      WHERE DATE_PART('year', ds) = 2026
        AND LOWER(platform) NOT LIKE '%shopee%'
        AND LOWER(platform) NOT LIKE '%shop%'
        AND LOWER(platform) NOT LIKE '%ecom%'
      ORDER BY ds ASC;
    `;

    const result = await pool.query(sql);
    const rows = result.rows;

    if (rows.length === 0) {
      return res.json({
        sales: {},
        orders: {}
      });
    }

    // ---- Identify next quarter months from latest history-like row ----
    const lastDate = new Date(rows[rows.length - 1].ds);
    const m = lastDate.getMonth() + 1;

    function nextQuarterMonths(m) {
      if (m <= 3) return ["04", "05", "06"];
      if (m <= 6) return ["07", "08", "09"];
      if (m <= 9) return ["10", "11", "12"];
      return ["01", "02", "03"];
    }

    const nextQ = nextQuarterMonths(m);

    // ---- Sum TikTok / Retail forecast for NEXT QUARTER ----
    let tiktokSales = 0;
    let retailSales = 0;

    rows.forEach(r => {
      const [, month] = r.ds.split("-");
      if (nextQ.includes(month)) {
        if (r.platform === "tiktok") tiktokSales += Number(r.y);
        if (r.platform === "retail") retailSales += Number(r.y);
      }
    });

    const totalSales = tiktokSales + retailSales;

    const baseTikTokShare = totalSales > 0 ? (tiktokSales / totalSales) : 0;
    const baseRetailShare = totalSales > 0 ? (retailSales / totalSales) : 0;

    // ---- Optimistic (+10%), Conservative (-10%) ----
    function scenario(value) {
      return {
        base: value,
        optimistic: value * 1.10,
        conservative: value * 0.90
      };
    }

    // ---- Orders (AOV = 500) ----
    const AOV = 500;
    const tiktokOrders = tiktokSales / AOV;
    const retailOrders = retailSales / AOV;
    const totalOrders = tiktokOrders + retailOrders;

    const baseTikTokOrdersShare =
      totalOrders > 0 ? (tiktokOrders / totalOrders) : 0;
    const baseRetailOrdersShare =
      totalOrders > 0 ? (retailOrders / totalOrders) : 0;

    res.json({
      sales: {
        tiktok: scenario(baseTikTokShare),
        retail: scenario(baseRetailShare)
      },
      orders: {
        tiktok: scenario(baseTikTokOrdersShare),
        retail: scenario(baseRetailOrdersShare)
      }
    });

  } catch (err) {
    console.error("Error computing share projection:", err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));