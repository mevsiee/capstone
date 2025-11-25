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
            'E-commerce' AS platform,   -- 🔥 HARD CODED PLATFORM
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
            AND LOWER(platform_name) NOT LIKE '%shopee%'
            AND LOWER(platform_name) NOT LIKE '%shop%'
            AND LOWER(platform_name) NOT LIKE '%ecom%'
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
      WHERE DATE_PART('year', ds) = 2025
        AND LOWER(platform) NOT LIKE '%shopee%'
        AND LOWER(platform) NOT LIKE '%shop%'
        AND LOWER(platform) NOT LIKE '%ecom%'
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
    console.error("❌ Error calculating breakdown:", err.message);
    res.status(500).json({ error: err.message });
  }
});


const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));