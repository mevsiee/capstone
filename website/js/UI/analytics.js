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

let platformNextOrders = { 
  tiktok: 0, 
  retail: 0 
};


let salesChartInstance = null;
let ordersChartInstance = null;

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



  // ---- G) Chart Data ----
  const chartData = computeChartSeries(historyByPlatform, forecastByPlatform);

  return {
  totalCurrent,
  totalNext,
  growthRate,
  chartData,
  nextQMonths,  
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

function computeOrdersFromForecast(orderForecast, nextQMonths) {
  const tiktok = orderForecast
    .filter(r => r.platform === "tiktok" && nextQMonths.includes(r.ds.split("-")[1]))
    .reduce((a, r) => a + Number(r.orders), 0);

  const retail = orderForecast
    .filter(r => r.platform === "retail" && nextQMonths.includes(r.ds.split("-")[1]))
    .reduce((a, r) => a + Number(r.orders), 0);

  return {
    tiktok,
    retail,
    total: tiktok + retail
  };
}

/* ============================================================
   ORDERS TAB RENDERING
   ============================================================ */
function populateOrdersTab(m) {
  const ordersCurrent = Math.round(m.current);
  const ordersNext = Math.round(m.next);

  const growth = ordersCurrent > 0
    ? ((ordersNext - ordersCurrent) / ordersCurrent) * 100
    : 0;

  setText("ordersCurrent", ordersCurrent.toLocaleString());
  setText("ordersNext", ordersNext.toLocaleString());

  const arrow = growth > 0 ? "▲" : growth < 0 ? "▼" : "";
  const color = growth > 0 ? "#3fd965" : growth < 0 ? "#ff4e4e" : "#b5b5b5";

  setHTML(
    "ordersGrowth",
    `<span style="color:${color}; font-weight:700;">${arrow} ${Math.abs(growth).toFixed(1)}%</span>`
  );
}

/* ============================================================
   TOP PRODUCTS RENDERING (SALES + ORDERS)
   ============================================================ */

function renderTopProductsSales(items) {
  const container = document.getElementById("topForecastedItems");
  if (!container) return;

  container.innerHTML = "";

  items.forEach((item, index) => {
    const rank = index + 1;
    const row = document.createElement("div");
    row.className = "top-item";
    row.innerHTML = `
      <div class="top-item-rank">${rank}</div>
      <div class="top-item-name">${item.product_name}</div>
      <div class="top-item-value">${formatPeso(item.total_sales || 0)}</div>
    `;
    container.appendChild(row);
  });
}

function renderTopProductsOrders(items) {
  const container = document.getElementById("topForecastedOrders");
  if (!container) return;

  container.innerHTML = "";

  items.forEach((item, index) => {
    const rank = index + 1;
    const row = document.createElement("div");
    row.className = "top-item";
    row.innerHTML = `
      <div class="top-item-rank">${rank}</div>
      <div class="top-item-name">${item.product_name}</div>
      <div class="top-item-value">${(item.total_orders || 0).toLocaleString()}</div>
    `;
    container.appendChild(row);
  });
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
function renderOrdersChart(chartData) {
  const ctx = document.getElementById("ordersChart");
  if (!ctx) return;

  if (ordersChartInstance) ordersChartInstance.destroy();

  // Compute max Y from all 4 series
  const maxY = Math.max(
    ...chartData.tiktokCurrent,
    ...chartData.retailCurrent,
    ...chartData.tiktokForecast,
    ...chartData.retailForecast,
    10
  );

  ordersChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: chartData.labels,
      datasets: [
        {
          label: "TikTok (Current)",
          data: chartData.tiktokCurrent,
          borderColor: "#00c2ff",
          borderWidth: 2,
          tension: 0.3,
        },
        {
          label: "TikTok (Projected)",
          data: chartData.tiktokForecast,
          borderColor: "#00c2ff",
          borderDash: [6, 6],
          borderWidth: 2,
          tension: 0.3,
        },
        {
          label: "Retail (Current)",
          data: chartData.retailCurrent,
          borderColor: "#f5b400",
          borderWidth: 2,
          tension: 0.3,
        },
        {
          label: "Retail (Projected)",
          data: chartData.retailForecast,
          borderColor: "#f5b400",
          borderDash: [6, 6],
          borderWidth: 2,
          tension: 0.3,
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: "#fff" } }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 7000
        }
      }
    }
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
   LOAD TOP PRODUCTS (SALES + ORDERS)
   ============================================================ */
async function loadTopProducts() {
  try {
    // Top 5 by SALES (for Sales tab)
    const salesResp = await fetch("http://localhost:5000/api/top-products?metric=sales&platform=all");
    const salesTop = await salesResp.json();
    renderTopProductsSales(salesTop);

    // Top 5 by ORDERS (for Orders tab)
    const ordersResp = await fetch("http://localhost:5000/api/top-products?metric=orders&platform=all");
    const ordersTop = await ordersResp.json();
    renderTopProductsOrders(ordersTop);
  } catch (err) {
    console.error("❌ Failed to load top products:", err);
  }
}

/* ============================================================
   LOAD SHARE PROJECTIONS (SALES + ORDERS)
   ============================================================ */
async function loadShareProjection() {
  renderSalesShare();  
  renderOrdersShare();
}

/* ---------- RENDER SALES SHARE ---------- */
function renderSalesShare() {
  // Base values come from forecast totals
  const tiktokBase = platformNextSales.tiktok;
  const retailBase = platformNextSales.retail;

  // Optimistic +15%, Conservative –10%
  const tiktokOpt = tiktokBase * 1.15;
  const tiktokCon = tiktokBase * 0.90;

  const retailOpt = retailBase * 1.15;
  const retailCon = retailBase * 0.90;

  // Populate UI — Peso formatting
  setText("tiktokShareBase", formatPeso(tiktokBase));
  setText("tiktokShareOptimistic", formatPeso(tiktokOpt));
  setText("tiktokShareConservative", formatPeso(tiktokCon));

  setText("retailShareBase", formatPeso(retailBase));
  setText("retailShareOptimistic", formatPeso(retailOpt));
  setText("retailShareConservative", formatPeso(retailCon));
}


/* ---------- RENDER ORDERS SHARE ---------- */
function renderOrdersShare() {
  const tiktokBase = Math.round(platformNextOrders.tiktok);
  const retailBase = Math.round(platformNextOrders.retail);

  const tiktokOpt = Math.round(tiktokBase * 1.15);
  const tiktokCon = Math.round(tiktokBase * 0.90);

  const retailOpt = Math.round(retailBase * 1.15);
  const retailCon = Math.round(retailBase * 0.90);

  setText("tiktokOrdersShareBase", tiktokBase.toLocaleString());
  setText("tiktokOrdersShareOptimistic", tiktokOpt.toLocaleString());
  setText("tiktokOrdersShareConservative", tiktokCon.toLocaleString());

  setText("retailOrdersShareBase", retailBase.toLocaleString());
  setText("retailOrdersShareOptimistic", retailOpt.toLocaleString());
  setText("retailOrdersShareConservative", retailCon.toLocaleString());
}

function buildOrdersChartSeries(history, forecast) {
  const AOV = 500;

  const all = [...history, ...forecast].sort(
    (a, b) => new Date(a.ds) - new Date(b.ds)
  );

  const labels = [...new Set(all.map(r => r.ds))];

  const tiktokCurrent = labels.map(() => null);
  const retailCurrent = labels.map(() => null);
  const tiktokForecast = labels.map(() => null);
  const retailForecast = labels.map(() => null);

  labels.forEach((date, i) => {
    // Convert historical sales → orders
    history.forEach(r => {
      if (r.ds === date) {
        if (r.platform === "tiktok") tiktokCurrent[i] = r.y / AOV;
        if (r.platform === "retail") retailCurrent[i] = r.y / AOV;
      }
    });

    // Forecasted orders
    forecast.forEach(r => {
      if (r.ds === date) {
        if (r.platform === "tiktok") tiktokForecast[i] = r.orders;
        if (r.platform === "retail") retailForecast[i] = r.orders;
      }
    });
  });

  return {
    labels,
    tiktokCurrent,
    retailCurrent,
    tiktokForecast,
    retailForecast
  };
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

    const orderResp = await fetch("http://localhost:5000/api/order-forecast");
    const orderForecast = await orderResp.json();


    console.log("🔥 RAW HISTORY ROWS:", history);
    console.log("🔥 RAW FORECAST ROWS:", forecast);

    history.forEach(r => r.isHistory = true);
    forecast.forEach(r => r.isHistory = false);

    /* ---------- MODEL INFORMATION POPULATION (PER PLATFORM) ---------- */
    if (forecast.length > 0) {

      // TikTok rows always contain the same RMSE/SMAPE repeated
      const tiktokRow = forecast.find(r => r.platform === "tiktok");
      const retailRow = forecast.find(r => r.platform === "retail");

      const tiktokRMSE  = tiktokRow ? Number(tiktokRow.rmse)  : 0;
      const tiktokSMAPE = tiktokRow ? Number(tiktokRow.smape) : 0;

      const retailRMSE  = retailRow ? Number(retailRow.rmse)  : 0;
      const retailSMAPE = retailRow ? Number(retailRow.smape) : 0;

      // Populate sales tab
      setText("rmseTiktok", tiktokRMSE.toLocaleString(undefined, { maximumFractionDigits: 2 }));
      setText("smapeTiktok", tiktokSMAPE.toFixed(2) + "%");

      setText("rmseRetail", retailRMSE.toLocaleString(undefined, { maximumFractionDigits: 2 }));
      setText("smapeRetail", retailSMAPE.toFixed(2) + "%");

      /* ---------- MODEL INFORMATION FOR ORDERS TAB (USE order_forecast) ---------- */
      const tiktokOrderRow = orderForecast.find(r => r.platform === "tiktok");
      const retailOrderRow = orderForecast.find(r => r.platform === "retail");

      const tiktokOrdersRMSE  = tiktokOrderRow ? Number(tiktokOrderRow.rmse)  : 0;
      const tiktokOrdersSMAPE = tiktokOrderRow ? Number(tiktokOrderRow.smape) : 0;

      const retailOrdersRMSE  = retailOrderRow ? Number(retailOrderRow.rmse)  : 0;
      const retailOrdersSMAPE = retailOrderRow ? Number(retailOrderRow.smape) : 0;

      // Populate ONLY the Orders tab fields
      setText("rmseTiktokOrders", tiktokOrdersRMSE.toLocaleString(undefined, { maximumFractionDigits: 2 }));
      setText("smapeTiktokOrders", tiktokOrdersSMAPE.toFixed(2) + "%");

      setText("rmseRetailOrders", retailOrdersRMSE.toLocaleString(undefined, { maximumFractionDigits: 2 }));
      setText("smapeRetailOrders", retailOrdersSMAPE.toFixed(2) + "%");

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
    const salesMetrics = computeMetricsFromRows({
      historyByPlatform,
      forecastByPlatform,
    });

    const nextQMonths = salesMetrics.nextQMonths;
    const ordersData = computeOrdersFromForecast(orderForecast, nextQMonths);

    const ordersMetrics = {
      current: salesMetrics.totalCurrent / 500,  // still the current quarter = sales/AOV
      next: ordersData.total,
    };
    
    platformNextOrders = {
    tiktok: ordersData.tiktok,
    retail: ordersData.retail
    };

    baselineSalesCurrent = salesMetrics.totalCurrent;
    baselineSalesNext = salesMetrics.totalNext;

    populateSalesTab(salesMetrics);
    const ordersChartData = buildOrdersChartSeries(
      historyByPlatform.retail.concat(historyByPlatform.ecommerce),
      orderForecast
    );

    // Render UI
    populateOrdersTab(ordersMetrics);
    renderOrdersChart(ordersChartData);
    initSliders();


    loadShareProjection();

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
  loadTopProducts();
});
