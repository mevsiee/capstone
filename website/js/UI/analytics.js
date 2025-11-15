/* ============================================================
   ANALYTICS.JS  (DENORMALIZED + FORECAST CSV VERSION)
   ============================================================ */

console.log("📊 analytics.js (denormalized + forecast CSV version) loaded");

// ---------- GLOBAL STATE ----------
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

// simple helper for Peso formatting
function formatPeso(value) {
  return "₱ " + Math.round(value).toLocaleString();
}

// ---------- AUTH SETUP ----------
function setupFirebaseAuth() {
  if (typeof firebase === "undefined") return;

  firebase.auth().onAuthStateChanged((user) => {
    if (!user) {
      console.warn("⚠️ No user logged in — redirecting to login.");
      window.location.href = "../../index.html";
      return;
    }

    firebase
      .firestore()
      .collection("users")
      .doc(user.uid)
      .get()
      .then((doc) => {
        const role = doc.exists ? doc.data().role : "user";
        const userManagementLink = document.getElementById(
          "userManagementLink"
        );
        if (role === "Administrator" && userManagementLink) {
          userManagementLink.style.display = "block";
        }
      })
      .catch((err) => console.error("Error fetching user data:", err));

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        firebase
          .auth()
          .signOut()
          .then(() => {
            window.location.href = "../../index.html";
          });
      });
    }
  });
}

// ---------- BASIC DOM HELPERS ----------
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function setHTML(id, value) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = value;
}

function sumField(rows, field) {
  return rows.reduce((acc, r) => acc + (Number(r[field]) || 0), 0);
}

// robust date parser that supports:
// - "M/D/YYYY"
// - "YYYY-MM-DD" or "YYYY-MM"
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


// ---------- CSV LOADING (DENORMALIZED HISTORY) ----------
function normalizePlatformName(raw) {
  const p = (raw || "").toLowerCase();
  if (p.includes("shopee")) return "shopee";
  if (p.includes("tiktok")) return "tiktok";
  return "retail";
}


// ---------- METRIC COMPUTATION ----------
function computePlatformMetrics(historyRows, forecastRows) {
  // Take only the first record for current and next sales instead of summing
  const currentSales = historyRows.length ? Number(historyRows[0].y) : 0;
  const nextSales = forecastRows.length ? Number(forecastRows[0].y) : 0;

  const mae = forecastRows.reduce((acc, r) => acc + (r.mae || 0), 0) / forecastRows.length;
  const rmse = forecastRows.reduce((acc, r) => acc + (r.rmse || 0), 0) / forecastRows.length;
  const mape = forecastRows.reduce((acc, r) => acc + (r.mape || 0), 0) / forecastRows.length;

  return {
    currentSales,
    nextSales,
    mae,
    rmse,
    mape,
  };
}

// ---------- SMAPE CALCULATION ----------
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

  return (sum / count) * 100; // return % value
}


function computeChartSeries(historyRowsAll, forecastRowsAll) {

  // Merge and sort
  const allRows = [...historyRowsAll, ...forecastRowsAll].sort(
    (a, b) => parseDate(a.ds) - parseDate(b.ds)
  );

  const labels = [...new Set(allRows.map((r) => r.ds))];

  const ecommercePlatforms = ["shopee", "tiktok"];

  const historyEcom = {};
  const historyRetail = {};
  const forecastEcom = {};
  const forecastRetail = {};

  // Overwrite values instead of summing
  allRows.forEach((row) => {
    const isHistory = row.isHistory === true;
    const isEcom = ecommercePlatforms.includes(row.platform);
    const bucket = isHistory
      ? (isEcom ? historyEcom : historyRetail)
      : (isEcom ? forecastEcom : forecastRetail);

    bucket[row.ds] = Number(row.y);  // Overwrite, no sum
  });

  // Align series to labels
  return {
    labels,
    currentEcom: labels.map((d) => historyEcom[d]),
    currentRetail: labels.map((d) => historyRetail[d]),
    forecastEcomSeries: labels.map((d) => forecastEcom[d]),
    forecastRetailSeries: labels.map((d) => forecastRetail[d]),
  };
}



function computeMetricsFromRows({
  historyByPlatform,
  forecastByPlatform,
}) {
  const retail = computePlatformMetrics(
    historyByPlatform.retail,
    forecastByPlatform.retail
  );
  const shopee = computePlatformMetrics(
    historyByPlatform.shopee,
    forecastByPlatform.shopee
  );
  const tiktok = computePlatformMetrics(
    historyByPlatform.tiktok,
    forecastByPlatform.tiktok
  );

  const totalCurrent =
    retail.currentSales + shopee.currentSales + tiktok.currentSales;
  const totalNext =
    retail.nextSales + shopee.nextSales + tiktok.nextSales;

  baselineSalesCurrent = totalCurrent;
  baselineSalesNext = totalNext;

  const AVERAGE_ORDER_VALUE = 500;
  baselineOrdersCurrent = totalCurrent / AVERAGE_ORDER_VALUE;
  baselineOrdersNext = totalNext / AVERAGE_ORDER_VALUE;

  platformNextSales = {
    retail: retail.nextSales,
    shopee: shopee.nextSales,
    tiktok: tiktok.nextSales,
  };

  const growthRate =
    totalCurrent > 0
      ? ((totalNext - totalCurrent) / totalCurrent) * 100
      : 0;

  const allForecastRows = [
    ...forecastByPlatform.retail,
    ...forecastByPlatform.shopee,
    ...forecastByPlatform.tiktok,
  ];
  const denom = allForecastRows.length || 1;
  const allMae =
    allForecastRows.reduce((acc, r) => acc + (r.mae || 0), 0) /
    denom;
  const allRmse =
    allForecastRows.reduce((acc, r) => acc + (r.rmse || 0), 0) /
    denom;
  const allMape =
    allForecastRows.reduce((acc, r) => acc + (r.mape || 0), 0) /
    denom;

  const historyAll = [
    ...historyByPlatform.retail,
    ...historyByPlatform.shopee,
    ...historyByPlatform.tiktok,
  ];

  const chartData = computeChartSeries(historyAll, allForecastRows);

  return {
    totalCurrent,
    totalNext,
    growthRate,
    retail,
    shopee,
    tiktok,
    mae: allMae,
    rmse: allRmse,
    mape: allMape,
    chartData,
  };
}

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

  // ---------- BUDGET ALLOCATION & PROFIT TEXT ----------
  function updateBudgetAllocation(m) {
  if (!m) return;

  // -----------------------------------------
  // A) Grab input elements FIRST (fix #1)
  // -----------------------------------------
  const retailMarginEl = document.getElementById("retailMarginInput");
  const shopeeMarginEl = document.getElementById("shopeeMarginInput");
  const tiktokMarginEl = document.getElementById("tiktokMarginInput");

  const retailBudgetEl = document.getElementById("retailBudgetInput");
  const shopeeBudgetEl = document.getElementById("shopeeBudgetInput");
  const tiktokBudgetEl = document.getElementById("tiktokBudgetInput");

  // -----------------------------------------
  // B) Read user inputs (convert)
  // -----------------------------------------
  const retailMarginInput = Number(retailMarginEl?.value) / 100;
  const shopeeMarginInput = Number(shopeeMarginEl?.value) / 100;
  const tiktokMarginInput = Number(tiktokMarginEl?.value) / 100;

  const retailBudgetInput = Number(retailBudgetEl?.value);
  const shopeeBudgetInput = Number(shopeeBudgetEl?.value);
  const tiktokBudgetInput = Number(tiktokBudgetEl?.value);

  // -----------------------------------------
  // C) Detect per-field overrides
  // -----------------------------------------
  const retailMarginOverride = retailMarginEl?.value.trim() !== "";
  const shopeeMarginOverride = shopeeMarginEl?.value.trim() !== "";
  const tiktokMarginOverride = tiktokMarginEl?.value.trim() !== "";

  const retailBudgetOverride = retailBudgetEl?.value.trim() !== "";
  const shopeeBudgetOverride = shopeeBudgetEl?.value.trim() !== "";
  const tiktokBudgetOverride = tiktokBudgetEl?.value.trim() !== "";

  // Clear placeholder immediately once user types anything
  if (retailMarginOverride) retailMarginEl.placeholder = "";
  if (shopeeMarginOverride) shopeeMarginEl.placeholder = "";
  if (tiktokMarginOverride) tiktokMarginEl.placeholder = "";

  if (retailBudgetOverride) retailBudgetEl.placeholder = "";
  if (shopeeBudgetOverride) shopeeBudgetEl.placeholder = "";
  if (tiktokBudgetOverride) tiktokBudgetEl.placeholder = "";

  // -----------------------------------------
  // D) Compute profit margins (with overrides)
  // -----------------------------------------
  const profitMargins = {
    retail: retailMarginOverride ? retailMarginInput : 0.30,
    shopee: shopeeMarginOverride ? shopeeMarginInput : 0.22,
    tiktok: tiktokMarginOverride ? tiktokMarginInput : 0.25,
  };

  // -----------------------------------------
  // E) Compute total marketing budget
  // -----------------------------------------
  let totalNext = baselineSalesNext || 0;
  let totalBudget = totalNext * 0.2; // default = 20% of projected sales

  const anyBudgetOverride =
    retailBudgetOverride || shopeeBudgetOverride || tiktokBudgetOverride;

  // If user overrides any, TOTAL budget becomes sum of user-entered ones
  if (anyBudgetOverride) {
    totalBudget =
      (retailBudgetOverride ? retailBudgetInput : 0) +
      (shopeeBudgetOverride ? shopeeBudgetInput : 0) +
      (tiktokBudgetOverride ? tiktokBudgetInput : 0);
  }

  // -----------------------------------------
  // F) Compute platform scores
  // -----------------------------------------
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

  // -----------------------------------------
  // G) Allocate budgets (with per-field overrides)
  // -----------------------------------------
  const budgets = {};
  const allocPercents = {};

  platforms.forEach((p) => {
    let bud =
      totalScore > 0 ? (totalBudget * scores[p]) / totalScore : 0;

    // User overrides
    if (p === "retail" && retailBudgetOverride) bud = retailBudgetInput;
    if (p === "shopee" && shopeeBudgetOverride) bud = shopeeBudgetInput;
    if (p === "tiktok" && tiktokBudgetOverride) bud = tiktokBudgetInput;

    budgets[p] = bud;
    allocPercents[p] = totalBudget > 0 ? (bud / totalBudget) * 100 : 0;
  });

  // -----------------------------------------
  // H) Update margin inputs (only if untouched)
  // -----------------------------------------
  if (!retailMarginOverride)
    retailMarginEl.placeholder = `(${Math.round(
      profitMargins.retail * 100
    )}%)`;

  if (!shopeeMarginOverride)
    shopeeMarginEl.placeholder = `(${Math.round(
      profitMargins.shopee * 100
    )}%)`;

  if (!tiktokMarginOverride)
    tiktokMarginEl.placeholder = `(${Math.round(
      profitMargins.tiktok * 100
    )}%)`;

  // -----------------------------------------
  // I) Update budget inputs (only if untouched)
  // -----------------------------------------
  if (!retailBudgetOverride)
    retailBudgetEl.placeholder = `(${formatPeso(
      budgets.retail
    )})`;

  if (!shopeeBudgetOverride)
    shopeeBudgetEl.placeholder = `(${formatPeso(
      budgets.shopee
    )})`;

  if (!tiktokBudgetOverride)
    tiktokBudgetEl.placeholder = `(${formatPeso(
      budgets.tiktok
    )})`;

  // -----------------------------------------
  // J) Update TOTAL budget (display only)
  // -----------------------------------------
  setText("totalBudget", formatPeso(totalBudget));

  // -----------------------------------------
  // K) Update platform cards below (3rd image)
  // -----------------------------------------
  setText("allocationRetail", formatPeso(budgets.retail));
  setText("allocationShopee", formatPeso(budgets.shopee));
  setText("allocationTiktok", formatPeso(budgets.tiktok));

  setText("allocationRetailPct", allocPercents.retail.toFixed(1) + "%");
  setText("allocationShopeePct", allocPercents.shopee.toFixed(1) + "%");
  setText("allocationTiktokPct", allocPercents.tiktok.toFixed(1) + "%");

  function updateChannelCards(m, budgets, margins) {  
  // Base forecasts per platform (from computeMetrics)
  const retailBase = platformNextSales.retail || 0;
  const shopeeBase = platformNextSales.shopee || 0;
  const tiktokBase = platformNextSales.tiktok || 0;

  // 1️⃣ Define realistic ROI effectiveness
  const efficiency = {
    retail: 1.3,
    shopee: 1.1,
    tiktok: 1.8,
  };

  // 2️⃣ Convert margin (0.25 → 1.25 multiplier)
  const marginFactor = {
    retail: 1 + (margins.retail || 0),
    shopee: 1 + (margins.shopee || 0),
    tiktok: 1 + (margins.tiktok || 0),
  };

  // 3️⃣ NEW REALISTIC MODEL
  const retailAfter  = retailBase  + (budgets.retail  * efficiency.retail  * marginFactor.retail);
  const shopeeAfter  = shopeeBase  + (budgets.shopee  * efficiency.shopee  * marginFactor.shopee);
  const tiktokAfter  = tiktokBase  + (budgets.tiktok  * efficiency.tiktok  * marginFactor.tiktok);

  // Write to DOM
  setText("retailBaseForecast", formatPeso(retailBase));
  setText("retailAfterAllocation", formatPeso(retailAfter));

  setText("shopeeBaseForecast", formatPeso(shopeeBase));
  setText("shopeeAfterAllocation", formatPeso(shopeeAfter));

  setText("tiktokBaseForecast", formatPeso(tiktokBase));
  setText("tiktokAfterAllocation", formatPeso(tiktokAfter));  
  }
  
  updateChannelCards(m, budgets, profitMargins);

}


// ---------- POPULATE SALES TAB ----------
function populateSalesTab(m) {
  const growth = m.growthRate.toFixed(1);
  const leadingPlatform = Object.entries(platformNextSales).sort(
    (a, b) => b[1] - a[1]
  )[0][0];

  const platformLabelMap = {
    retail: "Retail Stores",
    shopee: "Shopee",
    tiktok: "TikTok Shop",
  };

  const leadLabel = platformLabelMap[leadingPlatform] || "Retail Stores";

  // KPIs
  setText("salesCurrent", formatPeso(m.totalCurrent));
  setText("salesNext", formatPeso(m.totalNext));

  // SALES GROWTH with arrow and color
  const salesArrow =
    m.growthRate > 0 ? "▲" : m.growthRate < 0 ? "▼" : "";
  const salesColor =
    m.growthRate > 0 ? "#3fd965" : m.growthRate < 0 ? "#ff4e4e" : "#b5b5b5";

  setHTML(
    "salesGrowth",
    `<span style="color:${salesColor}; font-weight:700;">${salesArrow} ${Math.abs(
      m.growthRate
    ).toFixed(1)}%</span>`
  );

  // Model validation
  setText("salesMAE", m.mae.toFixed(2));
  setText("salesRMSE", m.rmse.toFixed(2));
  setText("salesMAPE", m.mape.toFixed(2) + "%");

  // --- SMAPE for sales ---
  // Combine e-commerce + retail into total actual
  const salesActual = m.chartData.labels.map((_, i) => {
    const ec = m.chartData.currentEcom[i] ?? 0;
    const rt = m.chartData.currentRetail[i] ?? 0;
    return ec + rt;
  });

  // Combine e-commerce + retail into total forecast
  const salesPredicted = m.chartData.labels.map((_, i) => {
    const ec = m.chartData.forecastEcomSeries[i] ?? 0;
    const rt = m.chartData.forecastRetailSeries[i] ?? 0;
    return ec + rt;
  });

  const smapeSales = computeSMAPE(salesActual, salesPredicted);
  setText("salesSMAPE", smapeSales.toFixed(2) + "%");

  // Chart
  renderSalesChart(m.chartData);
}

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
]

    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          labels: {
            color: "#fff",
          },
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
          max: 2000000,    // ← HARD LIMIT, exactly 4M
        }
      },
    },
  });
}

// ---------- POPULATE ORDERS TAB ----------
function populateOrdersTab(m) {
  const ordersCurrent = Math.round(baselineOrdersCurrent);
  const ordersNext = Math.round(baselineOrdersNext);
  const growth =
    ordersCurrent > 0
      ? ((ordersNext - ordersCurrent) / ordersCurrent) * 100
      : 0;

  setText("ordersCurrent", ordersCurrent.toLocaleString());
  setText("ordersNext", ordersNext.toLocaleString());

  const ordersArrow = growth > 0 ? "▲" : growth < 0 ? "▼" : "";
  const ordersColor =
    growth > 0 ? "#3fd965" : growth < 0 ? "#ff4e4e" : "#b5b5b5";

  setHTML(
    "ordersGrowth",
    `<span style="color:${ordersColor}; font-weight:700;">${ordersArrow} ${Math.abs(
      growth
    ).toFixed(1)}%</span>`
  );

  setText("ordersMAE", m.mae.toFixed(2));
  setText("ordersRMSE", m.rmse.toFixed(2));
  setText("ordersMAPE", m.mape.toFixed(2) + "%");

  // --- SMAPE for orders ---
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



  const AVERAGE_ORDER_VALUE = 500;
  setText(
    "ordersRetail",
    Math.round(
      (platformNextSales.retail || 0) / AVERAGE_ORDER_VALUE
    ).toLocaleString()
  );
  setText(
    "ordersShopee",
    Math.round(
      (platformNextSales.shopee || 0) / AVERAGE_ORDER_VALUE
    ).toLocaleString()
  );
  setText(
    "ordersTiktok",
    Math.round(
      (platformNextSales.tiktok || 0) / AVERAGE_ORDER_VALUE
    ).toLocaleString()
  );

  renderOrdersChart(m.chartData, AVERAGE_ORDER_VALUE);
}

function renderOrdersChart(chartData, aov) {
  const ctx = document.getElementById("ordersChart");
  if (!ctx) return;

  if (ordersChartInstance) {
    ordersChartInstance.destroy();
  }

  // Build orders based on new structure
  const currentOrders = chartData.labels.map((d, i) => {
    const ec = chartData.currentEcom[i] ?? 0;
    const rt = chartData.currentRetail[i] ?? 0;
    return (ec + rt) / aov;
  });

  const forecastOrders = chartData.labels.map((d, i) => {
    const ec = chartData.forecastEcomSeries[i] ?? 0;
    const rt = chartData.forecastRetailSeries[i] ?? 0;
    return (ec + rt) / aov;
  });

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
          borderColor: "#ffffff",
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
        x: { ticks: { color: "#fff" }, grid: { color: "#333" } },
        y: { ticks: { color: "#fff" }, grid: { color: "#333" } },
      },
    },
  });
}


// ---------- SLIDERS / WHAT-IF (orders tab only) ----------
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
        const demand = Number(
          document.getElementById("demandSlider").value
        );
        const inv = Number(
          document.getElementById("inventorySlider").value
        );
        const factor = 1 + (demand + inv) / 200;

        const adjusted = baselineOrdersNext * factor;
        const pct =
          baselineOrdersNext > 0
            ? ((adjusted - baselineOrdersNext) /
                baselineOrdersNext) *
              100
            : 0;

        setText("ordersImpact", Math.round(adjusted).toLocaleString());
        setText(
          "ordersImpactPct",
          `${pct.toFixed(1)}% vs baseline forecast`
        );
      }
    });
  });

  // initialize with baseline impact
  setText(
    "ordersImpact",
    Math.round(baselineOrdersNext).toLocaleString()
  );
  setText("ordersImpactPct", "0.0% vs baseline forecast");
}

// ---------- TABS ----------
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

// ---------- LOAD ALL DATA FROM NEONDB ----------
async function loadNeonData() {
  try {
    // Load history (denormalized_table)
    const histResp = await fetch("http://localhost:5000/api/history");
    const history = await histResp.json();

    // Load forecast (forecast table)
    const foreResp = await fetch("http://localhost:5000/api/forecast");
    const forecast = await foreResp.json();

    // Mark rows so computeChartSeries can distinguish history vs forecast
    history.forEach(r => r.isHistory = true);
    forecast.forEach(r => r.isHistory = false);

    // Split by platform
    const historyByPlatform = {
      retail: history.filter(r => r.platform === "retail"),
      shopee: history.filter(r => r.platform === "shopee"),
      tiktok: history.filter(r => r.platform === "tiktok"),
    };

    const forecastByPlatform = {
      retail: forecast.filter(r => r.platform === "retail"),
      shopee: forecast.filter(r => r.platform === "shopee"),
      tiktok: forecast.filter(r => r.platform === "tiktok"),
    };

    // Compute metrics
    const metrics = computeMetricsFromRows({
      historyByPlatform,
      forecastByPlatform
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


// ---------- INIT ----------
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

    // --- LIVE RECALC WHEN USER EDITS INPUTS ---
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


