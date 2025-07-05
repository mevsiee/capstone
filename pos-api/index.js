const express = require("express");
const cors = require("cors");
const db = require("./firebase");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.get("/api/products", async (req, res) => {
  try {
    const snapshot = await db.collection("POS_Product").get();
    const products = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        Product_ID: data.Product_ID || doc.id,
        Category: data.Category,
        Name: data.Name || "",
        Price: data.Price || 0,
        Size: data.Size || [],
        Color: data.Color || [],
      };
    });

    res.json({ products });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
