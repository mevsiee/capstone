const express = require("express");
const db = require("../firebase");
// eslint-disable-next-line new-cap
const router = express.Router();

router.put("/products/:id", async (req, res) => {
  const productId = parseInt(req.params.id);
  const updatedData = req.body;

  try {
    const snapshot = await db.collection("POS_Product").get();

    const matches = snapshot.docs.filter((doc) => {
      const data = doc.data();
      return data.Product_ID === productId;
    });

    if (matches.length === 0) {
      return res.status(404).json({error: "Product not found"});
    }

    const docRef = matches[0].ref;
    await docRef.update(updatedData);

    res.json({message: "Product updated successfully"});
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({error: "Internal Server Error"});
  }
});

module.exports = router;
