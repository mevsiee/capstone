const functions = require("firebase-functions/v2/https");
const express = require("express");
const cors = require("cors");

// Import Routers
const productGetRoutes = require("./POS/productGet");
const productUpdateRoutes = require("./POS/productUpdate");
const productDeleteRoutes = require("./POS/productDelete");
const productConfigRoutes = require("./POS/productConfig");
const productAddRoutes = require("./POS/productAdd");

const transactionPostRoutes = require("./POS/transanctionPost");
const employeeGetRoutes = require("./POS/employeeGet");
const forecastRoutes = require("./POS/forecastRoutes");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/", productGetRoutes);
app.use("/", productUpdateRoutes);
app.use("/", productDeleteRoutes);
app.use("/", productConfigRoutes);
app.use("/", productAddRoutes);

app.use("/", transactionPostRoutes);
app.use("/", employeeGetRoutes);
app.use("/", forecastRoutes);

exports.api = functions.onRequest(
    {region: "asia-southeast1"}, // ✅ Your preferred region
    app,
);
