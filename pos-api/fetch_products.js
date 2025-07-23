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
        Product_ID: data.Product_ID,
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
  const productId = parseInt(req.params.id); // 🔥 ensure it's a number
  const updatedData = req.body;

  try {
    const snapshot = await db.collection("POS_Product").get();

    const matches = snapshot.docs.filter(doc => {
      const data = doc.data();
      console.log(`Checking doc with Product_ID:`, data.Product_ID);
      return data.Product_ID === productId;
    });

    if (matches.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    const docRef = matches[0].ref;
    await docRef.update(updatedData);

    res.json({ message: "Product updated successfully" });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


app.delete("/api/products/:id", async (req, res) => {
  const productId = parseInt(req.params.id); // Ensure it's a number

  try {
    const snapshot = await db.collection("POS_Product").get();

    const matches = snapshot.docs.filter(doc => {
      const data = doc.data();
      console.log(`Checking doc with Product_ID:`, data.Product_ID);
      return data.Product_ID === productId;
    });

    if (matches.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    const docRef = matches[0].ref;
    await docRef.delete();

    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});




app.get("/api/configurations", async (req, res) => {
  try {
    const categoryDoc = await db.collection("Config").doc("category").get();
    const colorDoc = await db.collection("Config").doc("color").get();
    const sizeDoc = await db.collection("Config").doc("size").get();

    const categories = categoryDoc.exists ? categoryDoc.data().category || [] : [];
    const colors = colorDoc.exists ? colorDoc.data().color || [] : [];
    const sizes = sizeDoc.exists ? sizeDoc.data().size || [] : [];

    res.json({
      categories,
      colors,
      sizes
    });
  } catch (error) {
    console.error("Error fetching configurations:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});



app.post("/api/products", async (req, res) => {
  try {
    const { Name, Category, Price, Size, Color } = req.body;

    // Get max Product_ID
    const snapshot = await db.collection("POS_Product").get();
    let maxId = 0;
    snapshot.docs.forEach(doc => {
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

    res.status(200).json({ message: "Product added successfully", Product_ID: newId });
  } catch (error) {
    console.error("Error adding product:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post('/api/transactions', async (req, res) => {
  try {
    const transactionData = req.body;

    // Use the custom transaction ID as the Firestore document ID
    const docId = transactionData.id;

    await db.collection('POS_Transactions').doc(docId).set(transactionData);

    res.status(201).json({ message: 'Transaction added successfully', id: docId });
  } catch (error) {
    console.error('Error adding transaction:', error);
    res.status(500).json({ message: 'Failed to add transaction', error });
  }
});


app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
