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
        'E-Commerce' AS platform,
        p.product_name,
        pv.size,
        pv.variation AS color,
        COALESCE(pv.original_price, 0) AS price,
        COALESCE(p.cost, 0) AS cost,
        COALESCE(pv.stock, 0) AS stock_count
      FROM product_dimension p
      JOIN product_variation_dimension pv 
          ON p.product_id = pv.product_id
      WHERE p.product_status = 'A'
      ORDER BY p.product_name ASC;
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

const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));