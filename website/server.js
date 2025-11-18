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

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

pool.connect()
  .then(client => {
    console.log("✅ Connected to Neon successfully!");
    client.release();
  })
  .catch(err => console.error("❌ Connection failed:", err.message));

/* ------------------------------------------------------------------
   🧠 API Endpoint: /api/inventory
   Combines E-Commerce + Retail tables into one unified dataset
------------------------------------------------------------------ */
app.get("/api/inventory", async (req, res) => {
  try {
    const query = `
      SELECT
        p.product_name,
        pv.size,
        pv.variation AS color,
        'Retail' AS platform,
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
    console.error("❌ Database error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// 🟨 Update product cost API endpoint
app.use(express.json());

app.post("/api/update-cost", express.json(), async (req, res) => {
  const { product, newCost } = req.body;

  if (!product || isNaN(newCost)) {
    return res.status(400).json({ message: "Invalid input data" });
  }

  try {
    let query, params;

    if (product === "all") {
      // Update ALL products in both tables
      query = `
        UPDATE product_dimension SET product_cost = $1;
        UPDATE retail_product_dimension SET product_cost = $1;
      `;
      params = [newCost];
    } else {
      // Update cost for specific product name across both tables
      query = `
        UPDATE product_dimension
        SET product_cost = $1
        WHERE product_id IN (
          SELECT p.product_id
          FROM product_dimension p
          JOIN product_variation_dimension v ON p.product_id = v.product_id
          WHERE LOWER(p.product_name) = LOWER($2)
        );

        UPDATE retail_product_dimension
        SET product_cost = $1
        WHERE product_id IN (
          SELECT r.product_id
          FROM retail_product_dimension r
          JOIN retail_product_variation_dimension rv ON r.product_id = rv.product_id
          WHERE LOWER(r.product_name) = LOWER($2)
        );
      `;
      params = [newCost, product];
    }

    await pool.query(query, params);
    res.json({ message: `✅ Product cost${product === "all" ? "s" : ""} updated successfully!` });
  } catch (err) {
    console.error("❌ Error updating cost:", err);
    res.status(500).json({ message: "Database error while updating cost" });
  }
});


// ========================================
// GET /api/history
// Pulls 2025+ completed sales from denormalized_table
// ========================================
app.get("/api/history", async (req, res) => {
  try {
    const sql = `
          SELECT 
          LOWER(platform_name) AS platform,
          TO_CHAR(DATE_TRUNC('month', order_date), 'YYYY-MM-01') AS ds,
          SUM(order_amount) AS y
        FROM denormalized_table
        WHERE LOWER(order_status) = 'completed'
          AND EXTRACT(YEAR FROM order_date) = 2025
        GROUP BY 
          LOWER(platform_name),
          DATE_TRUNC('month', order_date)
        ORDER BY 
          platform ASC,
          ds ASC;
    `;

    const result = await pool.query(sql);
    res.json(result.rows);

  } catch (err) {
    console.error("❌ Error fetching history:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/forecast", async (req, res) => {
  try {
    const sql = `
      SELECT
        CASE
          WHEN LOWER(platform) LIKE '%shopee%'
            OR LOWER(platform) LIKE '%shop%'
            OR LOWER(platform) LIKE '%ecom%'
              THEN 'shopee'
          WHEN LOWER(platform) LIKE '%tiktok%'
            OR LOWER(platform) LIKE '%tiktoc%'
              THEN 'tiktok'
          WHEN LOWER(platform) LIKE '%retail%'
            OR LOWER(platform) LIKE '%pos%'
            OR LOWER(platform) LIKE '%store%'
              THEN 'retail'
          ELSE 'retail'
        END AS platform,

        TO_CHAR(DATE_TRUNC('month', ds), 'YYYY-MM-01') AS ds,
        forecast_value AS y,
        mae, rmse, mape, smape
      FROM forecast
      WHERE DATE_PART('year', ds) = 2025
      ORDER BY ds ASC, platform ASC;
    `;

    const result = await pool.query(sql);
    res.json(result.rows);

  } catch (err) {
    console.error("❌ Error fetching forecast:", err);
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
        AND DATE_PART('year', order_date) = 2025
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
    console.error("❌ Error calculating breakdown:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// =============================================================
// GET /api/prescriptive-products
// Returns products from NeonDB prescriptive_stock_allocation table
// =============================================================
app.get("/api/prescriptive-products", async (req, res) => {
  try {
    const sql = `
      SELECT 
        id,
        product_id,
        product_name,
        current_stock,
        demand,
        allocated,
        shortage,
        excess_stock,
        weight
      FROM prescriptive_stock_allocation
      ORDER BY weight DESC;
    `;

    const result = await pool.query(sql);

    res.json(result.rows);

  } catch (err) {
    console.error("❌ Error fetching prescriptive products:", err.message);
    res.status(500).json({ error: err.message });
  }
});


const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));