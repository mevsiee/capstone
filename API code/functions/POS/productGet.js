const express = require("express");
const db = require("../firebase");
// eslint-disable-next-line new-cap
const router = express.Router();

router.get("/products", async (req, res) => {
  try {
    const snapshot = await db.collection("POS_Product").get();
    const products = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        Product_ID: data.Product_ID,
        Category: data.Category,
        Name: data.Name || "",
        Price: data.Price || 0,
        Size: data.Size || [],
        Color: data.Color || [],
      };
    });

    res.json({products});
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({error: "Internal Server Error"});
  }
});

module.exports = router;
