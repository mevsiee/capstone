const express = require("express");
const db = require("../firebase");
// eslint-disable-next-line new-cap
const router = express.Router();

router.get("/employees", async (req, res) => {
  try {
    const snapshot = await db.collection("Employees").get();
    const employees = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json(employees);
  } catch (error) {
    console.error("Error fetching employees:", error);
    res.status(500).json({error: "Failed to fetch employees"});
  }
});

module.exports = router;
