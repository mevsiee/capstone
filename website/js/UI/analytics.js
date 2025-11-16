/* ============================================================
   Global State, Helpers, Auth, CSV Loading, Metrics, Chart Prep
   ============================================================ */

console.log("📊 analytics.js PART 1 loaded");

/* ---------- GLOBAL STATE ---------- */
let baselineSalesCurrent = 0;
let baselineSalesNext = 0;
let baselineOrdersCurrent = 0;
let baselineOrdersNext = 0;

let platformNextSales = {
  retail: 0,
  shopee: 0,
  tiktok: 0,
};

let salesChartInstance = null;
let ordersChartInstance = null;
let lastMetrics = null; // store metrics object for allocation recalculation

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
  if (p.includes("shopee")) return "shopee";
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

/* ---------- METRIC COMPUTATION ---------- */
function computePlatformMetrics(historyRows, forecastRows) {
  const currentSales = historyRows.length ? Number(historyRows[0].y) : 0;
  const nextSales = forecastRows.length ? Number(forecastRows[0].y) : 0;

  const mae = forecastRows.reduce((a, r) => a + (r.mae || 0), 0) / forecastRows.length;
  const rmse = forecastRows.reduce((a, r) => a + (r.rmse || 0), 0) / forecastRows.length;
  const mape = forecastRows.reduce((a, r) => a + (r.mape || 0), 0) / forecastRows.length;

  return { currentSales, nextSales, mae, rmse, mape };
}

/* ---------- SMAPE ---------- */
function computeSMAPE(actual, predicted) {
  let sum = 0;
  let count = 0;

  for (let i = 0; i < actual.length; i++) {
    const a = actual[i];
    const p = predicted[i];
    const denom = (Math.abs(a) + Math.abs(p)) / 2;
    if (denom !== 0) {
      sum += Math.abs(a - p) / denom;
      count++;
    }
  }
  return (sum / count) * 100;
}

/* ---------- CHART SERIES PREP ---------- */
function computeChartSeries(history, forecast) {

  const retailForecast3 = forecast.retail.slice(-3);
  const ecomForecast3 = forecast.ecommerce.slice(-3);

  const allRows = [
    ...history.retail,
    ...history.ecommerce,
    ...retailForecast3,
    ...ecomForecast3,
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
/* ---------- METRICS FROM ROWS (MAIN ENGINE) ---------- */
function computeMetricsFromRows({ historyByPlatform, forecastByPlatform }) {

  // ---- 1) Compute totals ----
  const totalCurrent = [...historyByPlatform.retail, ...historyByPlatform.ecommerce]
    .reduce((sum, r) => sum + Number(r.y || 0), 0);

  const totalNext = [...forecastByPlatform.retail, ...forecastByPlatform.ecommerce]
    .reduce((sum, r) => sum + Number(r.y || 0), 0);

  const growthRate =
    totalCurrent > 0 ? ((totalNext - totalCurrent) / totalCurrent) * 100 : 0;

  // ---- 2) Per-platform NEXT forecast (used for budget allocation) ----
  platformNextSales.retail =
    forecastByPlatform.retail.reduce((a, r) => a + Number(r.y || 0), 0);
  platformNextSales.shopee =
    forecastByPlatform.ecommerce
      .filter(r => r.platform === "shopee")
      .reduce((a, r) => a + Number(r.y || 0), 0);
  platformNextSales.tiktok =
    forecastByPlatform.ecommerce
      .filter(r => r.platform === "tiktok")
      .reduce((a, r) => a + Number(r.y || 0), 0);

  // ---- 3) Baseline Orders (AOV = 500) ----
  baselineOrdersCurrent = totalCurrent / 500;
  baselineOrdersNext = totalNext / 500;

  // ---- 4) Compute MAE/RMSE/MAPE averages ----
  const allForecast = [...forecastByPlatform.retail, ...forecastByPlatform.ecommerce];

  const mae = allForecast.reduce((sum, r) => sum + (r.mae || 0), 0) / allForecast.length;
  const rmse = allForecast.reduce((sum, r) => sum + (r.rmse || 0), 0) / allForecast.length;
  const mape = allForecast.reduce((sum, r) => sum + (r.mape || 0), 0) / allForecast.length;

  // ---- 5) Chart Data ----
  const chartData = computeChartSeries(historyByPlatform, forecastByPlatform);

  // ---- 6) Return metrics object ----
  return {
    totalCurrent,
    totalNext,
    growthRate,
    mae,
    rmse,
    mape,
    chartData,
  };
}

console.log("📊 analytics.js PART 2 loaded");

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
  const shopeeMarginEl = document.getElementById("shopeeMarginInput");
  const tiktokMarginEl = document.getElementById("tiktokMarginInput");

  const retailBudgetEl = document.getElementById("retailBudgetInput");
  const shopeeBudgetEl = document.getElementById("shopeeBudgetInput");
  const tiktokBudgetEl = document.getElementById("tiktokBudgetInput");

  /* ---------- B) Read Inputs ---------- */
  const retailMarginInput = Number(retailMarginEl?.value) / 100;
  const shopeeMarginInput = Number(shopeeMarginEl?.value) / 100;
  const tiktokMarginInput = Number(tiktokMarginEl?.value) / 100;

  const retailBudgetInput = Number(retailBudgetEl?.value);
  const shopeeBudgetInput = Number(shopeeBudgetEl?.value);
  const tiktokBudgetInput = Number(tiktokBudgetEl?.value);

  /* ---------- C) Detect Per-Field Overrides ---------- */
  const retailMarginOverride = retailMarginEl?.value.trim() !== "";
  const shopeeMarginOverride = shopeeMarginEl?.value.trim() !== "";
  const tiktokMarginOverride = tiktokMarginEl?.value.trim() !== "";

  const retailBudgetOverride = retailBudgetEl?.value.trim() !== "";
  const shopeeBudgetOverride = shopeeBudgetEl?.value.trim() !== "";
  const tiktokBudgetOverride = tiktokBudgetEl?.value.trim() !== "";

  /* ---------- D) Compute Profit Margins ---------- */
  const profitMargins = {
    retail: retailMarginOverride ? retailMarginInput : 0.30,
    shopee: shopeeMarginOverride ? shopeeMarginInput : 0.22,
    tiktok: tiktokMarginOverride ? tiktokMarginInput : 0.25,
  };

  /* ---------- E) Total Marketing Budget ---------- */
  let totalNext = baselineSalesNext || 0;
  let totalBudget = totalNext * 0.2; // default 20%

  const anyBudgetOverride =
    retailBudgetOverride || shopeeBudgetOverride || tiktokBudgetOverride;

  if (anyBudgetOverride) {
    totalBudget =
      (retailBudgetOverride ? retailBudgetInput : 0) +
      (shopeeBudgetOverride ? shopeeBudgetInput : 0) +
      (tiktokBudgetOverride ? tiktokBudgetInput : 0);
  }

  /* ---------- F) Compute Allocation Scores ---------- */
  const platforms = ["retail", "shopee", "tiktok"];
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
    if (p === "shopee" && shopeeBudgetOverride) bud = shopeeBudgetInput;
    if (p === "tiktok" && tiktokBudgetOverride) bud = tiktokBudgetInput;

    budgets[p] = bud;
    allocPercents[p] = totalBudget > 0 ? (bud / totalBudget) * 100 : 0;
  });

  /* ---------- H) Update Placeholders (Margins) ---------- */
  if (!retailMarginOverride)
    retailMarginEl.placeholder = `(${Math.round(profitMargins.retail * 100)}%)`;
  if (!shopeeMarginOverride)
    shopeeMarginEl.placeholder = `(${Math.round(profitMargins.shopee * 100)}%)`;
  if (!tiktokMarginOverride)
    tiktokMarginEl.placeholder = `(${Math.round(profitMargins.tiktok * 100)}%)`;

  /* ---------- I) Update Placeholders (Budgets) ---------- */
  if (!retailBudgetOverride)
    retailBudgetEl.placeholder = `(${formatPeso(budgets.retail)})`;
  if (!shopeeBudgetOverride)
    shopeeBudgetEl.placeholder = `(${formatPeso(budgets.shopee)})`;
  if (!tiktokBudgetOverride)
    tiktokBudgetEl.placeholder = `(${formatPeso(budgets.tiktok)})`;

  /* ---------- J) Update TOTAL Budget ---------- */
  setText("totalBudget", formatPeso(totalBudget));

  /* ---------- K) Update UI Cards ---------- */
  setText("allocationRetail", formatPeso(budgets.retail));
  setText("allocationShopee", formatPeso(budgets.shopee));
  setText("allocationTiktok", formatPeso(budgets.tiktok));

  setText("allocationRetailPct", allocPercents.retail.toFixed(1) + "%");
  setText("allocationShopeePct", allocPercents.shopee.toFixed(1) + "%");
  setText("allocationTiktokPct", allocPercents.tiktok.toFixed(1) + "%");

  /* ============================================================
     CHANNEL-LEVEL FORECAST AFTER BUDGETS
     ============================================================ */
  function updateChannelCards(m, budgets, margins) {
    const retailBase = platformNextSales.retail || 0;
    const shopeeBase = platformNextSales.shopee || 0;
    const tiktokBase = platformNextSales.tiktok || 0;

    const efficiency = {
      retail: 1.3,
      shopee: 1.1,
      tiktok: 1.8,
    };

    const marginFactor = {
      retail: 1 + (margins.retail || 0),
      shopee: 1 + (margins.shopee || 0),
      tiktok: 1 + (margins.tiktok || 0),
    };

    const retailAfter =
      retailBase + budgets.retail * efficiency.retail * marginFactor.retail;
    const shopeeAfter =
      shopeeBase + budgets.shopee * efficiency.shopee * marginFactor.shopee;
    const tiktokAfter =
      tiktokBase + budgets.tiktok * efficiency.tiktok * marginFactor.tiktok;

    setText("retailBaseForecast", formatPeso(retailBase));
    setText("retailAfterAllocation", formatPeso(retailAfter));

    setText("shopeeBaseForecast", formatPeso(shopeeBase));
    setText("shopeeAfterAllocation", formatPeso(shopeeAfter));

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

  setText("salesMAE", m.mae.toFixed(2));
  setText("salesRMSE", m.rmse.toFixed(2));
  setText("salesMAPE", m.mape.toFixed(2) + "%");

  /* ---------- SMAPE for Sales ---------- */
  const salesActual = m.chartData.labels.map((_, i) => {
    const ec = m.chartData.currentEcom[i] ?? 0;
    const rt = m.chartData.currentRetail[i] ?? 0;
    return ec + rt;
  });

  const salesPredicted = m.chartData.labels.map((_, i) => {
    const ec = m.chartData.forecastEcomSeries[i] ?? 0;
    const rt = m.chartData.forecastRetailSeries[i] ?? 0;
    return ec + rt;
  });

  const smapeSales = computeSMAPE(salesActual, salesPredicted);
  setText("salesSMAPE", smapeSales.toFixed(2) + "%");

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

  setText("ordersMAE", m.mae.toFixed(2));
  setText("ordersRMSE", m.rmse.toFixed(2));
  setText("ordersMAPE", m.mape.toFixed(2) + "%");

  /* ---------- SMAPE for Orders ---------- */
  const ordersActual = m.chartData.labels.map((_, i) => {
    const ec = (m.chartData.currentEcom[i] ?? 0) / 500;
    const rt = (m.chartData.currentRetail[i] ?? 0) / 500;
    return ec + rt;
  });

  const ordersPredicted = m.chartData.labels.map((_, i) => {
    const ec = (m.chartData.forecastEcomSeries[i] ?? 0) / 500;
    const rt = (m.chartData.forecastRetailSeries[i] ?? 0) / 500;
    return ec + rt;
  });

  const smapeOrders = computeSMAPE(ordersActual, ordersPredicted);
  setText("ordersSMAPE", smapeOrders.toFixed(2) + "%");

  const AOV = 500;
  setText(
    "ordersRetail",
    Math.round((platformNextSales.retail || 0) / AOV).toLocaleString()
  );
  setText(
    "ordersShopee",
    Math.round((platformNextSales.shopee || 0) / AOV).toLocaleString()
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
          label: "E-Commerce (Current)",
          data: chartData.currentEcom,
          borderColor: "#00c2ff",
          borderWidth: 2,
          tension: 0.3,
        },
        {
          label: "E-Commerce (Projected)",
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

  const historyEndIndex = chartData.currentEcom.findLastIndex(v => v !== null);

  const currentOrders = chartData.labels.map((_, i) => {
    if (i > historyEndIndex) return null;
    const ec = chartData.currentEcom[i] ?? 0;
    const rt = chartData.currentRetail[i] ?? 0;
    return (ec + rt) / aov;
  });

  const forecastOrders = chartData.labels.map((_, i) => {
    const ec = chartData.forecastEcomSeries[i] ?? 0;
    const rt = chartData.forecastRetailSeries[i] ?? 0;
    return (ec + rt) / aov;
  });

  const maxOrders = Math.max(...currentOrders, ...forecastOrders, 10);

  ordersChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: chartData.labels,
      datasets: [
        {
          label: "Current Orders",
          data: currentOrders,
          borderColor: "#00c2ff",
          borderWidth: 2,
          tension: 0.3,
        },
        {
          label: "Projected Orders",
          data: forecastOrders,
          borderColor: "#00c2ff",
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
          max: Math.ceil(maxOrders * 1.3),
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

    /* ---------- PLATFORM GROUPING (OPTION A) ---------- */
    const historyByPlatform = {
      retail: history.filter(r => r.platform === "retail"),
      ecommerce: history.filter(r => r.platform === "shopee" || r.platform === "tiktok"),
    };

    const forecastByPlatform = {
      retail: forecast.filter(r => r.platform === "retail"),
      ecommerce: forecast.filter(r => r.platform === "shopee" || r.platform === "tiktok"),
    };

    /* ---------- METRICS ---------- */
    const metrics = computeMetricsFromRows({
      historyByPlatform,
      forecastByPlatform,
    });

    lastMetrics = metrics;

    populateSalesTab(metrics);
    populateOrdersTab(metrics);
    initSliders();

  } catch (err) {
    console.error("❌ Failed to load NeonDB analytics:", err);
    alert("Failed to load analytics data. Check console for details.");
  }
}

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  setupFirebaseAuth();
  setupTabs();
  loadNeonData();

  attachOverrideWatcher("retailMarginInput");
  attachOverrideWatcher("shopeeMarginInput");
  attachOverrideWatcher("tiktokMarginInput");

  attachOverrideWatcher("retailBudgetInput");
  attachOverrideWatcher("shopeeBudgetInput");
  attachOverrideWatcher("tiktokBudgetInput");

  const recalcBtn = document.getElementById("recalcAllocationBtn");
  if (recalcBtn) {
    recalcBtn.addEventListener("click", () => {
      if (lastMetrics) updateBudgetAllocation(lastMetrics);
    });
  }

  const allocationInputs = [
    "retailMarginInput",
    "shopeeMarginInput",
    "tiktokMarginInput",
    "retailBudgetInput",
    "shopeeBudgetInput",
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
