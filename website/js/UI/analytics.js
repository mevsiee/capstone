/* ============================================================
   Global State, Helpers, Auth, Metrics, Chart Prep
   ============================================================ */


/* ---------- GLOBAL STATE ---------- */
let baselineSalesCurrent = 0;
let baselineSalesNext = 0;
let baselineOrdersCurrent = 0;
let baselineOrdersNext = 0;

let platformNextSales = {
  retail: 0,
  tiktok: 0,
};

let salesChartInstance = null;
let ordersChartInstance = null;
let lastMetrics = null; // store metrics object for allocation recalculation

let prescriptiveProducts = []; // holds products from /api/prescriptive-products


/* ---------- HELPERS ---------- */
function formatPeso(value) {
  return "₱ " + Math.round(value).toLocaleString();
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function setHTML(id, value) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = value;
}

function parseDate(ds) {
  if (!ds) return new Date(NaN);
  if (typeof ds === "string") {
    const s = ds.trim();
    if (s.includes("-")) {
      const parts = s.split("-");
      const y = Number(parts[0]);
      const m = Number(parts[1]);
      const d = parts[2] ? Number(parts[2]) : 1;
      return new Date(y, m - 1, d);
    } else if (s.includes("/")) {
      const [m, d, y] = s.split("/").map(Number);
      return new Date(y, m - 1, d || 1);
    }
  }
  return new Date(ds);
}

function formatMonthKey(dateObj) {
  const y = dateObj.getFullYear();
  const m = dateObj.getMonth() + 1;
  return `${y}-${String(m).padStart(2, "0")}-01`;
}

function normalizePlatformName(raw) {
  const p = (raw || "").toLowerCase();
  if (p.includes("tiktok")) return "tiktok";
  return "retail";
}


/* ---------- AUTH ---------- */
function setupFirebaseAuth() {
  if (typeof firebase === "undefined") return;

  firebase.auth().onAuthStateChanged((user) => {
    if (!user) {
      window.location.href = "../../index.html";
      return;
    }

    firebase.firestore().collection("users").doc(user.uid).get().then((doc) => {
      const role = doc.exists ? doc.data().role : "user";
      const userManagementLink = document.getElementById("userManagementLink");
      if (role === "Administrator" && userManagementLink) {
        userManagementLink.style.display = "block";
      }
    });

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        firebase.auth().signOut().then(() => {
          window.location.href = "../../index.html";
        });
      });
    }
  });
}

/* ---------- CHART SERIES PREP ---------- */
function computeChartSeries(history, forecast) {

  const allRows = [
    ...history.retail,
    ...history.ecommerce,
    ...forecast.retail,
    ...forecast.ecommerce,
  ].sort((a, b) => parseDate(a.ds) - parseDate(b.ds));

  const labels = [...new Set(allRows.map(r => r.ds))];

  const currentEcom = labels.map(() => null);
  const currentRetail = labels.map(() => null);
  const forecastEcomSeries = labels.map(() => null);
  const forecastRetailSeries = labels.map(() => null);

  labels.forEach((date, index) => {
    history.ecommerce.forEach(r => { if (r.ds === date) currentEcom[index] = Number(r.y); });
    history.retail.forEach(r => { if (r.ds === date) currentRetail[index] = Number(r.y); });

    forecast.ecommerce.forEach(r => { if (r.ds === date) forecastEcomSeries[index] = Number(r.y); });
    forecast.retail.forEach(r => { if (r.ds === date) forecastRetailSeries[index] = Number(r.y); });
  });

  return { labels, currentEcom, currentRetail, forecastEcomSeries, forecastRetailSeries };
}

/* ============================================================
   Budget Allocation, Channel Cards, Sales & Orders Tabs
   ============================================================ */

/* ---------- QUARTER HELPERS ---------- */
function getQuarterMonths(dateObj) {
  const m = dateObj.getMonth() + 1;
  if (m <= 3) return ["01", "02", "03"];  // Q1
  if (m <= 6) return ["04", "05", "06"];  // Q2
  if (m <= 9) return ["07", "08", "09"];  // Q3
  return ["10", "11", "12"];              // Q4
}

function getNextQuarterMonths(dateObj) {
  const m = dateObj.getMonth() + 1;
  if (m <= 3) return ["04", "05", "06"];  // next: Q2
  if (m <= 6) return ["07", "08", "09"];  // next: Q3
  if (m <= 9) return ["10", "11", "12"];  // next: Q4
  return ["01", "02", "03"];              // next: Q1
}

function computeQuarterTotal(rows, months, year) {
  return rows
    .filter(r => {
      const [y, m] = r.ds.split("-");
      return Number(y) === year && months.includes(m);
    })
    .reduce((sum, r) => sum + Number(r.y || 0), 0);
}

/* ---------- METRICS FROM ROWS (MAIN ENGINE) ---------- */
function computeMetricsFromRows({ historyByPlatform, forecastByPlatform }) {

  // ---- A) Combine rows ----
  const allHistory = [...historyByPlatform.retail, ...historyByPlatform.ecommerce];
  const allForecast = [...forecastByPlatform.retail, ...forecastByPlatform.ecommerce];

  // Sort to detect latest date
  allHistory.sort((a, b) => new Date(a.ds) - new Date(b.ds));
  allForecast.sort((a, b) => new Date(a.ds) - new Date(b.ds));

  // ---- B) Determine current + next quarter ----
  const lastHistoryDate = new Date(allHistory[allHistory.length - 1].ds);
  const currentYear = lastHistoryDate.getFullYear();

  const currentQMonths = getQuarterMonths(lastHistoryDate);
  const nextQMonths = getNextQuarterMonths(lastHistoryDate);

  const nextYear =
    nextQMonths[0] === "01" ? currentYear + 1 : currentYear;

  // ---- C) Compute quarter totals ----
  const totalCurrent = computeQuarterTotal(allHistory, currentQMonths, currentYear);
  const totalNext = computeQuarterTotal(allForecast, nextQMonths, nextYear);

  // ---- D) Growth ----
  const growthRate =
    totalCurrent > 0 ? ((totalNext - totalCurrent) / totalCurrent) * 100 : 0;

  // ---- E) Update platform sales (for allocation engine) ----
  platformNextSales.retail =
    forecastByPlatform.retail
      .filter(r => nextQMonths.includes(r.ds.split("-")[1]))
      .reduce((a, r) => a + Number(r.y || 0), 0);

  platformNextSales.tiktok =
    forecastByPlatform.ecommerce
      .filter(r => r.platform === "tiktok" && nextQMonths.includes(r.ds.split("-")[1]))
      .reduce((a, r) => a + Number(r.y || 0), 0);

  // ---- F) ORDERS QUARTER FIX (AOV = 500) ----
  baselineOrdersCurrent = totalCurrent / 500;
  baselineOrdersNext = totalNext / 500;

  // ---- G) Chart Data ----
  const chartData = computeChartSeries(historyByPlatform, forecastByPlatform);

  return {
    totalCurrent,
    totalNext,
    growthRate,
    chartData,
  };
}

/* ---------- WATCH USER OVERRIDES ---------- */
function attachOverrideWatcher(inputId) {
  const el = document.getElementById(inputId);
  if (!el) return;

  el.addEventListener("input", () => {
    if (el.value.trim() !== "") {
      el.classList.add("manual-override");
    } else {
      el.classList.remove("manual-override");
    }
  });
}

/* ============================================================
   BUDGET ALLOCATION ENGINE
   ============================================================ */
function updateBudgetAllocation(m) {
  if (!m) return;

  /* ---------- A) Grab Inputs ---------- */
  const retailMarginEl = document.getElementById("retailMarginInput");
  const tiktokMarginEl = document.getElementById("tiktokMarginInput");

  const retailBudgetEl = document.getElementById("retailBudgetInput");
  const tiktokBudgetEl = document.getElementById("tiktokBudgetInput");

  /* ---------- B) Read Inputs ---------- */
  const retailMarginInput = Number(retailMarginEl?.value) / 100;
  const tiktokMarginInput = Number(tiktokMarginEl?.value) / 100;

  const retailBudgetInput = Number(retailBudgetEl?.value);
  const tiktokBudgetInput = Number(tiktokBudgetEl?.value);

  /* ---------- C) Detect Per-Field Overrides ---------- */
  const retailMarginOverride = retailMarginEl?.value.trim() !== "";
  const tiktokMarginOverride = tiktokMarginEl?.value.trim() !== "";

  const retailBudgetOverride = retailBudgetEl?.value.trim() !== "";
  const tiktokBudgetOverride = tiktokBudgetEl?.value.trim() !== "";

  /* ---------- D) Compute Profit Margins ---------- */
  const profitMargins = {
    retail: retailMarginOverride ? retailMarginInput : 0.30,
    tiktok: tiktokMarginOverride ? tiktokMarginInput : 0.25,
  };

  /* ---------- E) Total Marketing Budget ---------- */
  let totalNext = baselineSalesNext || 0;
  let totalBudget = totalNext * 0.2; // default 20%

  const anyBudgetOverride =
    retailBudgetOverride || tiktokBudgetOverride;

  if (anyBudgetOverride) {
    totalBudget =
      (retailBudgetOverride ? retailBudgetInput : 0) +
      0 +
      (tiktokBudgetOverride ? tiktokBudgetInput : 0);
  }

  /* ---------- F) Compute Allocation Scores ---------- */
  const platforms = ["retail", "tiktok"];
  const scores = {};
  let totalScore = 0;

  platforms.forEach((p) => {
    const sales = platformNextSales[p] || 0;
    const margin = profitMargins[p] || 0;
    const score = Math.max(sales, 0) * margin;
    scores[p] = score;
    totalScore += score;
  });

  /* ---------- G) Allocate Budgets ---------- */
  const budgets = {};
  const allocPercents = {};

  platforms.forEach((p) => {
    let bud = totalScore > 0 ? (totalBudget * scores[p]) / totalScore : 0;

    if (p === "retail" && retailBudgetOverride) bud = retailBudgetInput;
    if (p === "tiktok" && tiktokBudgetOverride) bud = tiktokBudgetInput;

    budgets[p] = bud;
    allocPercents[p] = totalBudget > 0 ? (bud / totalBudget) * 100 : 0;
  });

  /* ---------- H) Update Placeholders (Margins) ---------- */
  if (!retailMarginOverride)
    retailMarginEl.placeholder = `(${Math.round(profitMargins.retail * 100)}%)`;
  if (!tiktokMarginOverride)
    tiktokMarginEl.placeholder = `(${Math.round(profitMargins.tiktok * 100)}%)`;

  /* ---------- I) Update Placeholders (Budgets) ---------- */
  if (!retailBudgetOverride)
    retailBudgetEl.placeholder = `(${formatPeso(budgets.retail)})`;
  if (!tiktokBudgetOverride)
    tiktokBudgetEl.placeholder = `(${formatPeso(budgets.tiktok)})`;

  /* ---------- J) Update TOTAL Budget ---------- */
  setText("totalBudget", formatPeso(totalBudget));

  /* ---------- K) Update UI Cards ---------- */
  setText("allocationRetail", formatPeso(budgets.retail));
  setText("allocationTiktok", formatPeso(budgets.tiktok));

  setText("allocationRetailPct", allocPercents.retail.toFixed(1) + "%");
  setText("allocationTiktokPct", allocPercents.tiktok.toFixed(1) + "%");

  /* ============================================================
     CHANNEL-LEVEL FORECAST AFTER BUDGETS
     ============================================================ */
  function updateChannelCards(m, budgets, margins) {
    const retailBase = platformNextSales.retail || 0;

    const tiktokBase = platformNextSales.tiktok || 0;

    const efficiency = {
      retail: 1.3,
      tiktok: 1.8,
    };

    const marginFactor = {
      retail: 1 + (margins.retail || 0),
      tiktok: 1 + (margins.tiktok || 0),
    };

    const retailAfter =
      retailBase + budgets.retail * efficiency.retail * marginFactor.retail;
    const tiktokAfter =
      tiktokBase + budgets.tiktok * efficiency.tiktok * marginFactor.tiktok;

    setText("retailBaseForecast", formatPeso(retailBase));
    setText("retailAfterAllocation", formatPeso(retailAfter));

    setText("tiktokBaseForecast", formatPeso(tiktokBase));
    setText("tiktokAfterAllocation", formatPeso(tiktokAfter));
  }

  updateChannelCards(m, budgets, profitMargins);
}

/* ============================================================
   SALES TAB RENDERING
   ============================================================ */
function populateSalesTab(m) {
  setText("salesCurrent", formatPeso(m.totalCurrent));
  setText("salesNext", formatPeso(m.totalNext));

  const arrow =
    m.growthRate > 0 ? "▲" : m.growthRate < 0 ? "▼" : "";
  const color =
    m.growthRate > 0 ? "#3fd965" : m.growthRate < 0 ? "#ff4e4e" : "#b5b5b5";

  setHTML(
    "salesGrowth",
    `<span style="color:${color}; font-weight:700;">${arrow} ${Math.abs(
      m.growthRate
    ).toFixed(1)}%</span>`
  );

  renderSalesChart(m.chartData);
}

/* ============================================================
   ORDERS TAB RENDERING
   ============================================================ */
function populateOrdersTab(m) {
  const ordersCurrent = Math.round(baselineOrdersCurrent);
  const ordersNext = Math.round(baselineOrdersNext);

  const growth =
    ordersCurrent > 0
      ? ((ordersNext - ordersCurrent) / ordersCurrent) * 100
      : 0;

  setText("ordersCurrent", ordersCurrent.toLocaleString());
  setText("ordersNext", ordersNext.toLocaleString());

  const arrow = growth > 0 ? "▲" : growth < 0 ? "▼" : "";
  const color =
    growth > 0 ? "#3fd965" : growth < 0 ? "#ff4e4e" : "#b5b5b5";

  setHTML(
    "ordersGrowth",
    `<span style="color:${color}; font-weight:700;">${arrow} ${Math.abs(
      growth
    ).toFixed(1)}%</span>`
  );

  const AOV = 500;
  setText(
    "ordersRetail",
    Math.round((platformNextSales.retail || 0) / AOV).toLocaleString()
  );
  setText(
    "ordersTiktok",
    Math.round((platformNextSales.tiktok || 0) / AOV).toLocaleString()
  );

  renderOrdersChart(m.chartData, AOV);
}
/* ============================================================
   Charts, Sliders, Tabs, NeonDB Fetch, Initialization
   ============================================================ */

console.log("📊 analytics.js PART 3 loaded");

/* ============================================================
   SALES CHART
   ============================================================ */
function renderSalesChart(chartData) {
  const ctx = document.getElementById("salesChart");
  if (!ctx) return;

  if (salesChartInstance) {
    salesChartInstance.destroy();
  }

  salesChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: chartData.labels,
      datasets: [
                {
          label: "TikTok (Current)",
          data: chartData.currentEcom,
          borderColor: "#00c2ff",
          borderWidth: 2,
          tension: 0.3,
        },
        {
          label: "TikTok (Projected)",
          data: chartData.forecastEcomSeries,
          borderColor: "#00c2ff",
          borderDash: [6, 6],
          borderWidth: 2,
          tension: 0.3,
        },
        {
          label: "Retail (Current)",
          data: chartData.currentRetail,
          borderColor: "#f5b400",
          borderWidth: 2,
          tension: 0.3,
        },
        {
          label: "Retail (Projected)",
          data: chartData.forecastRetailSeries,
          borderColor: "#f5b400",
          borderDash: [6, 6],
          borderWidth: 2,
          tension: 0.3,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          labels: { color: "#fff" },
        },
      },
      scales: {
        x: {
          ticks: { color: "#fff" },
          grid: { color: "#333" },
        },
        y: {
          ticks: { color: "#fff" },
          grid: { color: "#333" },
          beginAtZero: true,

          min: 0,
          max: 2000000, 
        },
      },
    },
  });
}

/* ============================================================
   ORDERS CHART
   ============================================================ */
function renderOrdersChart(chartData, aov) {
  const ctx = document.getElementById("ordersChart");
  if (!ctx) return;

  if (ordersChartInstance) {
    ordersChartInstance.destroy();
  }

  // Convert sales series → orders series per platform
  const currentEcomOrders = chartData.currentEcom.map(v =>
    v == null ? null : v / aov
  );
  const forecastEcomOrders = chartData.forecastEcomSeries.map(v =>
    v == null ? null : v / aov
  );

  const currentRetailOrders = chartData.currentRetail.map(v =>
    v == null ? null : v / aov
  );
  const forecastRetailOrders = chartData.forecastRetailSeries.map(v =>
    v == null ? null : v / aov
  );

  // Compute max for y-axis
  const allValues = [
    ...currentEcomOrders,
    ...forecastEcomOrders,
    ...currentRetailOrders,
    ...forecastRetailOrders,
  ].filter(v => v != null && !isNaN(v));

  const maxOrders = allValues.length
    ? Math.max(...allValues, 10)
    : 10;

  ordersChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: chartData.labels,
      datasets: [
                {
          label: "TikTok (Current Orders)",
          data: currentEcomOrders,    
          borderColor: "#00c2ff",
          borderWidth: 2,
          tension: 0.3,
        },
        {
          label: "TikTok (Projected Orders)",
          data: forecastEcomOrders,  
          borderColor: "#00c2ff",
          borderDash: [6, 6],
          borderWidth: 2,
          tension: 0.3,
        },
        {
          label: "Retail (Current Orders)",
          data: currentRetailOrders,
          borderColor: "#f5b400",
          borderWidth: 2,
          tension: 0.3,
        },
        {
          label: "Retail (Projected Orders)",
          data: forecastRetailOrders,
          borderColor: "#f5b400",
          borderDash: [6, 6],
          borderWidth: 2,
          tension: 0.3,
        },
      ],
    },

    options: {
      responsive: true,
      plugins: {
        legend: {
          labels: { color: "#fff" },
        },
      },
      scales: {
        x: {
          ticks: { color: "#fff" },
          grid: { color: "#333" },
        },
        y: {
          ticks: { color: "#fff" },
          grid: { color: "#333" },
          beginAtZero: true,
          min: 0,
          max: 5000,
        },
      },
    },
  });
}

/* ============================================================
   SLIDERS (DEMAND + INVENTORY)
   ============================================================ */
function initSliders() {
  const bindings = [
    { id: "demandSlider", valueId: "demandValue", type: "orders" },
    { id: "inventorySlider", valueId: "inventoryValue", type: "orders" },
  ];

  bindings.forEach(({ id, valueId, type }) => {
    const slider = document.getElementById(id);
    const valueEl = document.getElementById(valueId);
    if (!slider || !valueEl) return;

    valueEl.textContent = `${slider.value}%`;

    slider.addEventListener("input", () => {
      valueEl.textContent = `${slider.value}%`;

      if (type === "orders") {
        const demand = Number(document.getElementById("demandSlider").value);
        const inventory = Number(document.getElementById("inventorySlider").value);

        const factor = 1 + (demand + inventory) / 200;

        const adjusted = baselineOrdersNext * factor;
        const pct =
          baselineOrdersNext > 0
            ? ((adjusted - baselineOrdersNext) / baselineOrdersNext) * 100
            : 0;

        setText("ordersImpact", Math.round(adjusted).toLocaleString());
        setText("ordersImpactPct", `${pct.toFixed(1)}% vs baseline forecast`);
      }
    });
  });

  setText("ordersImpact", Math.round(baselineOrdersNext).toLocaleString());
  setText("ordersImpactPct", "0.0% vs baseline forecast");
}

/* ============================================================
   TABS
   ============================================================ */
function setupTabs() {
  document.querySelectorAll(".tab-button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".tab-button")
        .forEach((b) => b.classList.remove("active"));

      btn.classList.add("active");

      const tab = btn.getAttribute("data-tab");

      document
        .querySelectorAll(".tab-content")
        .forEach((tc) => tc.classList.remove("active"));

      const activeSection = document.getElementById(`${tab}-tab`);
      if (activeSection) activeSection.classList.add("active");
    });
  });
}

/* ============================================================
   LOAD DATA FROM NEON DATABASE
   ============================================================ */
async function loadNeonData() {
  try {
    const histResp = await fetch("http://localhost:5000/api/history");
    const history = await histResp.json();

    const foreResp = await fetch("http://localhost:5000/api/forecast");
    const forecast = await foreResp.json();

    console.log("🔥 RAW HISTORY ROWS:", history);
    console.log("🔥 RAW FORECAST ROWS:", forecast);

    history.forEach(r => r.isHistory = true);
    forecast.forEach(r => r.isHistory = false);

    /* ---------- MODEL INFORMATION POPULATION ---------- */
    if (forecast.length > 0) {
      const stats = forecast[0]; // every row includes model metrics

      setText("modelUsed", "XGBoost (JS Native)");
      setText("trainingWindow", "Jan 2023 – Dec 2024");

      setText("modelRMSE", (stats.rmse ?? 0).toFixed(2));
      setText("modelMAPE", (stats.mape ?? 0).toFixed(2) + "%");
      setText("modelSMAPE", (stats.smape ?? 0).toFixed(2) + "%");
    }

    /* ---------- PLATFORM GROUPING (OPTION A) ---------- */
    const historyByPlatform = {
      retail: history.filter(r => r.platform === "retail"),
      ecommerce: history.filter(r => r.platform === "tiktok"),  // 👈 FIXED
    };

    const forecastByPlatform = {
      retail: forecast.filter(r => r.platform === "retail"),
      ecommerce: forecast.filter(r => r.platform === "tiktok"), // 👈 FIXED
    };

    /* ---------- METRICS ---------- */
    const metrics = computeMetricsFromRows({
      historyByPlatform,
      forecastByPlatform,
    });

    lastMetrics = metrics;

    baselineSalesCurrent = metrics.totalCurrent;
    baselineSalesNext = metrics.totalNext;

    populateSalesTab(metrics);
    populateOrdersTab(metrics);
    initSliders();

  } catch (err) {
    console.error("❌ Failed to load NeonDB analytics:", err);
    alert("Failed to load analytics data. Check console for details.");
  }
}

 /* ============================================================
   LOAD PRESCRIPTIVE ALLOCATION PRODUCTS (from NeonDB)
   ============================================================ */
  async function loadPrescriptiveProducts() {
    try {
      const resp = await fetch("http://localhost:5000/api/prescriptive-products");
      const products = await resp.json();

      prescriptiveProducts = products;

      console.log("📦 Prescriptive Allocation Products:", products);

      const selSales = document.getElementById("productSelectorSales");
      const selOrders = document.getElementById("productSelectorOrders");

      if (selSales) selSales.innerHTML = "";
      if (selOrders) selOrders.innerHTML = "";

      products.forEach(p => {
        const cleanId = Number(String(p.product_id).split(":")[0]);

        const opt1 = document.createElement("option");
        opt1.value = cleanId;
        opt1.textContent = p.product_name;

        const opt2 = document.createElement("option");
        opt2.value = cleanId;
        opt2.textContent = p.product_name;

        if (selSales) selSales.appendChild(opt1);
        if (selOrders) selOrders.appendChild(opt2);
    });

    // Auto-fill first product summary
    if (products.length > 0) {
      const cleanId = Number(String(products[0].product_id).split(":")[0]);
      selSales.value = cleanId;
      updateProductSummary(products[0], "sales");
    }

    // Sales dropdown listener
    if (selSales) {
      selSales.addEventListener("change", () => {
        const selected = products.find(
          p => Number(String(p.product_id).split(":")[0]) == selSales.value
        );
        updateProductSummary(selected, "sales");
      });
    }

    // Orders dropdown listener
    if (selOrders) {
      selOrders.addEventListener("change", () => {
        const selected = products.find(
          p => Number(String(p.product_id).split(":")[0]) == selOrders.value
        );
        updateProductSummary(selected, "orders");
      });
    }

  } catch (err) {
    console.error("❌ Error loading prescriptive products:", err);
  }

  /* ---------- TOP FORECASTED SELLING ITEMS (Ranked) ---------- */
  const topBox = document.getElementById("topForecastedItems");
  if (topBox) {
    topBox.innerHTML = "";

    const topFive = [...products]
      .sort((a, b) => Number(b.demand || 0) - Number(a.demand || 0))
      .slice(0, 5);

    topFive.forEach((p, index) => {
      const row = document.createElement("div");
      row.className = "top-item";

      row.innerHTML = `
        <div class="top-item-rank">#${index + 1}</div>
        <div class="top-item-name">${p.product_name}</div>
        <div class="top-item-value">₱ ${Math.round((p.demand || 0) * 1).toLocaleString()}</div>
      `;

      topBox.appendChild(row);
    });
  }
}


async function calculateProductAllocationForSales() {
  const selector = document.getElementById("productSelectorSales");
  if (!selector) return;

  const productId = Number(selector.value);
  if (!productId) return;

  try {
    const resp = await fetch("http://localhost:5000/api/prescriptive-allocation?productId=" + productId);
    const data = await resp.json();

    const allocRetail = data.allocations.retail;
    const allocTiktok = data.allocations.tiktok;

    // Update allocation result UI (Retail + TikTok only)
    setText("allocRetail", allocRetail.toLocaleString());
    setText("allocTikTok", allocTiktok.toLocaleString());

    setText("allocTotal", (allocRetail + allocTiktok).toLocaleString());

    // Revenue per unit
    const rpuRetail = data.rpu.retail;   // may be 0 for now
    const rpuTiktok = data.rpu.tiktok;

    const addedRetailRevenue = allocRetail * rpuRetail;
    const addedTiktokRevenue = allocTiktok * rpuTiktok;

    // Base forecasts
    const baseRetail = platformNextSales.retail || 0;
    const baseTiktok = platformNextSales.tiktok || 0;

    // Retail
    setText("retailBaseForecast", formatPeso(baseRetail));
    if (rpuRetail > 0) {
      setText("retailAfterAllocation", formatPeso(baseRetail + addedRetailRevenue));
    } else {
      setText("retailAfterAllocation", "—");
    }

    // TikTok
    setText("tiktokBaseForecast", formatPeso(baseTiktok));
    if (rpuTiktok > 0) {
      setText("tiktokAfterAllocation", formatPeso(baseTiktok + addedTiktokRevenue));
    } else {
      setText("tiktokAfterAllocation", "—");
    }

    // Show result panel
    const el = document.getElementById("allocationResult");
    if (el) el.style.display = "block";

  } catch (err) {
    console.error("❌ Error calculating product allocation:", err);
    alert("Error computing allocation. See console.");
  }
}

  /* ============================================================
    UPDATE PRODUCT SUMMARY PANEL
    ============================================================ */
  function updateProductSummary(p, tab) {
  if (!p) return;

  if (tab === "sales") {
    setText("summaryStock", p.current_stock ?? "--");
    setText("summaryDemand", p.demand ?? "--");
  }

  if (tab === "orders") {
    setText("summaryStockOrders", p.current_stock ?? "--");
    setText("summaryDemandOrders", p.demand ?? "--");

    setText("summaryAllocatedOrders", p.allocated ?? "--");
    setText("summaryShortageOrders", p.shortage ?? "--");
    setText("summaryExcessOrders", p.excess_stock ?? "--");
    setText("summaryWeightOrders", p.weight ?? "--");
  }
}

function getRevenuePerUnitForPlatform(product, platformKey) {
  if (!product || !product.revenue_breakdown) return 0;

  const row = product.revenue_breakdown.find(r => {
    const p = (r.platform_name || "").toLowerCase();
    if (platformKey === "tiktok") return p.includes("tiktok");
    if (platformKey === "retail") return p.includes("retail");
    return false;
  });

  return row ? Number(row.revenue_per_unit || 0) : 0;
}

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  setupFirebaseAuth();
  setupTabs();
  loadNeonData();
  loadPrescriptiveProducts();

  attachOverrideWatcher("retailMarginInput");
  attachOverrideWatcher("tiktokMarginInput");
  
  attachOverrideWatcher("retailBudgetInput");
  attachOverrideWatcher("tiktokBudgetInput");

  const calcBtn = document.getElementById("calculateAllocationBtn");
  if (calcBtn) {
      calcBtn.addEventListener("click", calculateProductAllocationForSales);
  }


  const recalcBtn = document.getElementById("recalcAllocationBtn");
  if (recalcBtn) {
    recalcBtn.addEventListener("click", () => {
      if (lastMetrics) updateBudgetAllocation(lastMetrics);
    });
  }

  const allocationInputs = [
    "retailMarginInput",
    "tiktokMarginInput",
    "retailBudgetInput",
    "tiktokBudgetInput",
  ];

  allocationInputs.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", () => {
      if (lastMetrics) updateBudgetAllocation(lastMetrics);
    });
  });
});
