const express = require("express");
const db = require("../firebase");
// eslint-disable-next-line new-cap
const router = express.Router();

router.delete("/products/:id", async (req, res) => {
  const productId = parseInt(req.params.id);

  try {
    const snapshot = await db.collection("POS_Product").get();

    const matches = snapshot.docs.filter((doc) => {
      const data = doc.data();
      console.log(`Checking doc with Product_ID:`, data.Product_ID);
      return data.Product_ID === productId;
    });

    if (matches.length === 0) {
      return res.status(404).json({error: "Product not found"});
    }

    const docRef = matches[0].ref;
    await docRef.delete();

    res.json({message: "Product deleted successfully"});
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({error: "Internal Server Error"});
  }
});

module.exports = router;
