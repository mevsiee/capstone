const express = require("express");
const db = require("../firebase");
// eslint-disable-next-line new-cap
const router = express.Router();

router.post("/transactions", async (req, res) => {
  try {
    const transactionData = req.body;

    const docId = transactionData.id;

    await db.collection("POS_Transactions").doc(docId).set(transactionData);

    res.status(201).json({message: "Transaction added successfully",
      id: docId});
  } catch (error) {
    console.error("Error adding transaction:", error);
    res.status(500).json({message: "Failed to add transaction", error});
  }
});

module.exports = router;
