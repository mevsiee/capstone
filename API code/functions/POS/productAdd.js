const express = require("express");
const db = require("../firebase");
// eslint-disable-next-line new-cap
const router = express.Router();


router.post("/products", async (req, res) => {
  try {
    const {Name, Category, Price, Size, Color} = req.body;

    // Get max Product_ID
    const snapshot = await db.collection("POS_Product").get();
    let maxId = 0;
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.Product_ID && typeof data.Product_ID === "number") {
        if (data.Product_ID > maxId) maxId = data.Product_ID;
      }
    });

    const newId = maxId + 1;

    const newProduct = {
      Product_ID: newId,
      Name,
      Category,
      Price,
      Size,
      Color,
    };

    await db.collection("POS_Product").add(newProduct);

    res.status(200).json({message: "Product added successfully",
      Product_ID: newId});
  } catch (error) {
    console.error("Error adding product:", error);
    res.status(500).json({error: "Internal Server Error"});
  }
});

module.exports = router;
