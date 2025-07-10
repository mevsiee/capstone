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


app.put("/api/products/:id", async (req, res) => {
  const productId = req.params.id;
  const updatedData = req.body;

  try {
    const productsRef = db.collection("POS_Product");
    const query = productsRef.where("Product_ID", "==", productId);
    const snapshot = await query.get();

    if (snapshot.empty) {
      return res.status(404).json({ error: "Product not found" });
    }

    const docRef = snapshot.docs[0].ref;
    await docRef.update(updatedData);

    res.json({ message: "Product updated successfully" });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
