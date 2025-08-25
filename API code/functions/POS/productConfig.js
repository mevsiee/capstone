const express = require("express");
const db = require("../firebase");
// eslint-disable-next-line new-cap
const router = express.Router();

router.get("/configurations", async (req, res) => {
  try {
    const categoryDoc = await db.collection("Config").doc("category").get();
    const colorDoc = await db.collection("Config").doc("color").get();
    const sizeDoc = await db.collection("Config").doc("size").get();

    const categories = categoryDoc.exists ?
        categoryDoc.data().category || [] : [];
    const colors = colorDoc.exists ? colorDoc.data().color || [] : [];
    const sizes = sizeDoc.exists ? sizeDoc.data().size || [] : [];

    res.json({
      categories,
      colors,
      sizes,
    });
  } catch (error) {
    console.error("Error fetching configurations:", error);
    res.status(500).json({error: "Internal Server Error"});
  }
});

module.exports = router;
