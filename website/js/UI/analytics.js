/* ============================================================
   ANALYTICS.JS  (CSV-DRIVEN VERSION)
   - Loads forecast_retail.csv, forecast_shopee.csv, forecast_tiktok.csv
   - Computes current vs next quarter totals
   - Fills all KPI cards, chart, breakdown and what-if analysis
   - Still works with Firebase auth + tabs
   ============================================================ */

console.log("📊 analytics.js (CSV version) loaded");

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

function sumField(rows, field) {
  return rows.reduce((acc, r) => acc + (Number(r[field]) || 0), 0);
}

function parseDate(ds) {
  // ds like "10/1/2025"
  const [m, d, y] = ds.split("/").map(Number);
  return new Date(y, m - 1, d);
}

// ---------- CSV LOADING ----------
function parseCsv(path, platformName) {
  return new Promise((resolve, reject) => {
    Papa.parse(path, {
      download: true,
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = (results.data || [])
          .filter((row) => row.ds && row.y !== undefined && row.y !== null)
          .map((row) => ({
            platform: platformName,
            ds: row.ds,
            y: Number(row.y) || 0,
            lo95: Number(row.lo95) || 0,
            hi95: Number(row.hi95) || 0,
            model_use: row.model_use || "",
            mae: Number(row.mae) || 0,
            rmse: Number(row.rmse) || 0,
            mape: Number(row.mape) || 0,
            smape: Number(row.smape) || 0,
          }));
        resolve(rows);
      },
      error: (err) => reject(err),
    });
  });
}

async function loadCsvForecasts() {
  try {
    const [retailRows, shopeeRows, tiktokRows] = await Promise.all([
      parseCsv("../data/forecast_retail.csv", "retail"),
      parseCsv("../data/forecast_shopee.csv", "shopee"),
      parseCsv("../data/forecast_tiktok.csv", "tiktok"),
    ]);

    const allRows = [...retailRows, ...shopeeRows, ...tiktokRows];

    if (!allRows.length) {
      console.warn("No rows found in CSVs.");
      return;
    }

    const metrics = computeMetricsFromRows({
      retailRows,
      shopeeRows,
      tiktokRows,
      allRows,
    });

    populateSalesTab(metrics);
    populateOrdersTab(metrics);
    initSliders();
  } catch (err) {
    console.error("❌ Error loading CSV forecasts:", err);
    alert("Failed to load forecast CSV data. Check console for details.");
  }
}

// ---------- METRIC COMPUTATION ----------
function computePlatformMetrics(rows) {
  if (!rows.length) {
    return {
      currentSales: 0,
      nextSales: 0,
      mae: 0,
      rmse: 0,
      mape: 0,
    };
  }

  // sort by date
  const sorted = [...rows].sort(
    (a, b) => parseDate(a.ds) - parseDate(b.ds)
  );

  // Last 3 months = "forecast", previous months = "history"
  const forecastCount = Math.min(3, sorted.length);
  const forecastRows = sorted.slice(-forecastCount);
  const historyRows = sorted.slice(0, sorted.length - forecastCount);
  const historyTail = historyRows.slice(-3); // last up to 3 history months

  const currentSales = sumField(historyTail, "y");
  const nextSales = sumField(forecastRows, "y");

  const mae =
    rows.reduce((acc, r) => acc + (r.mae || 0), 0) / rows.length;
  const rmse =
    rows.reduce((acc, r) => acc + (r.rmse || 0), 0) / rows.length;
  const mape =
    rows.reduce((acc, r) => acc + (r.mape || 0), 0) / rows.length;

  return {
    currentSales,
    nextSales,
    mae,
    rmse,
    mape,
  };
}

function computeChartSeries(allRows) {
  const sorted = [...allRows].sort(
    (a, b) => parseDate(a.ds) - parseDate(b.ds)
  );
  const uniqueDates = [
    ...new Set(sorted.map((r) => r.ds)),
  ];

  // Last 3 distinct dates = "forecast months"
  const forecastDates = new Set(uniqueDates.slice(-3));

  const historyTotals = {};
  const forecastTotals = {};

  sorted.forEach((row) => {
    const key = row.ds;
    const bucket = forecastDates.has(key)
      ? forecastTotals
      : historyTotals;
    bucket[key] = (bucket[key] || 0) + row.y;
  });

  const currentSeries = uniqueDates.map(
    (d) => (historyTotals[d] !== undefined ? historyTotals[d] : null)
  );
  const forecastSeries = uniqueDates.map(
    (d) => (forecastTotals[d] !== undefined ? forecastTotals[d] : null)
  );

  return {
    labels: uniqueDates,
    currentSeries,
    forecastSeries,
  };
}

function computeMetricsFromRows({
  retailRows,
  shopeeRows,
  tiktokRows,
  allRows,
}) {
  const retail = computePlatformMetrics(retailRows);
  const shopee = computePlatformMetrics(shopeeRows);
  const tiktok = computePlatformMetrics(tiktokRows);

  const totalCurrent =
    retail.currentSales + shopee.currentSales + tiktok.currentSales;
  const totalNext =
    retail.nextSales + shopee.nextSales + tiktok.nextSales;

  baselineSalesCurrent = totalCurrent;
  baselineSalesNext = totalNext;

  // Orders: simple placeholder assumption (will replace when we have actual orders)
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

  // Overall validation: simple average across all rows
  const allMae =
    allRows.reduce((acc, r) => acc + (r.mae || 0), 0) /
    allRows.length;
  const allRmse =
    allRows.reduce((acc, r) => acc + (r.rmse || 0), 0) /
    allRows.length;
  const allMape =
    allRows.reduce((acc, r) => acc + (r.mape || 0), 0) /
    allRows.length;

  const chartData = computeChartSeries(allRows);

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

// ---------- POPULATE SALES TAB ----------
function populateSalesTab(m) {
  // Executive summary
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

  setText(
    "salesSummary",
    `Sales are projected to grow by ${growth}% in the next period. ` +
      `${leadLabel} is expected to contribute the largest share of forecasted revenue ` +
      `based on current model outputs. Consider reinforcing marketing and stock allocations ` +
      `towards this channel while monitoring model error metrics (MAE/RMSE/MAPE) for stability.`
  );

  // KPIs
  setText("salesCurrent", formatPeso(m.totalCurrent));
  setText("salesNext", formatPeso(m.totalNext));
  setText(
    "salesGrowth",
    `${m.growthRate >= 0 ? "+" : ""}${growth}%`
  );

  // Model validation
  setText("salesMAE", m.mae.toFixed(2));
  setText("salesRMSE", m.rmse.toFixed(2));
  setText("salesMAPE", m.mape.toFixed(2) + "%");

  // Channel breakdown (next period forecast)
  setText("salesRetail", formatPeso(platformNextSales.retail));
  setText("salesShopee", formatPeso(platformNextSales.shopee));
  setText("salesTiktok", formatPeso(platformNextSales.tiktok));

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
          label: "Current Sales",
          data: chartData.currentSeries,
          borderColor: "#f5b400",
          backgroundColor: "transparent",
          borderWidth: 2,
          tension: 0.3,
        },
        {
          label: "Projected Sales",
          data: chartData.forecastSeries,
          borderColor: "#ffffff",
          backgroundColor: "transparent",
          borderWidth: 2,
          borderDash: [6, 6],
          tension: 0.3,
        },
      ],
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
        },
      },
    },
  });
}

// ---------- POPULATE ORDERS TAB ----------
function populateOrdersTab(m) {
  // simple derived orders from sales (placeholder for when we have real order CSV)
  const ordersCurrent = Math.round(baselineOrdersCurrent);
  const ordersNext = Math.round(baselineOrdersNext);
  const growth =
    ordersCurrent > 0
      ? ((ordersNext - ordersCurrent) / ordersCurrent) * 100
      : 0;

  setText(
    "ordersSummary",
    `Order volume is projected to change by ${growth.toFixed(
      1
    )}% next period based on current sales forecasts. ` +
      `Use this as a guide for staffing, warehousing, and fulfillment capacity planning.`
  );

  setText("ordersCurrent", ordersCurrent.toLocaleString());
  setText("ordersNext", ordersNext.toLocaleString());
  setText(
    "ordersGrowth",
    `${growth >= 0 ? "+" : ""}${growth.toFixed(1)}%`
  );

  setText("ordersMAE", m.mae.toFixed(2));
  setText("ordersRMSE", m.rmse.toFixed(2));
  setText("ordersMAPE", m.mape.toFixed(2) + "%");

  const AVERAGE_ORDER_VALUE = 500;
  setText(
    "ordersRetail",
    Math.round(platformNextSales.retail / AVERAGE_ORDER_VALUE).toLocaleString()
  );
  setText(
    "ordersShopee",
    Math.round(platformNextSales.shopee / AVERAGE_ORDER_VALUE).toLocaleString()
  );
  setText(
    "ordersTiktok",
    Math.round(platformNextSales.tiktok / AVERAGE_ORDER_VALUE).toLocaleString()
  );

  renderOrdersChart(m.chartData, AVERAGE_ORDER_VALUE);
}

function renderOrdersChart(chartData, aov) {
  const ctx = document.getElementById("ordersChart");
  if (!ctx) return;

  if (ordersChartInstance) {
    ordersChartInstance.destroy();
  }

  const currentOrders = chartData.currentSeries.map((v) =>
    v == null ? null : v / aov
  );
  const forecastOrders = chartData.forecastSeries.map((v) =>
    v == null ? null : v / aov
  );

  ordersChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: chartData.labels,
      datasets: [
        {
          label: "Current Orders",
          data: currentOrders,
          borderColor: "#00c2ff",
          backgroundColor: "transparent",
          borderWidth: 2,
          tension: 0.3,
        },
        {
          label: "Projected Orders",
          data: forecastOrders,
          borderColor: "#ffffff",
          backgroundColor: "transparent",
          borderWidth: 2,
          borderDash: [6, 6],
          tension: 0.3,
        },
      ],
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
        },
      },
    },
  });
}

// ---------- SLIDERS / WHAT-IF ----------
function initSliders() {
  const bindings = [
    { id: "priceSlider", valueId: "priceValue", type: "sales" },
    { id: "adSlider", valueId: "adValue", type: "sales" },
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

      if (type === "sales") {
        const price = Number(
          document.getElementById("priceSlider").value
        );
        const ad = Number(document.getElementById("adSlider").value);
        const factor = 1 + (price + ad) / 200; // simple combined effect

        const adjusted = baselineSalesNext * factor;
        const pct =
          baselineSalesNext > 0
            ? ((adjusted - baselineSalesNext) /
                baselineSalesNext) *
              100
            : 0;

        setText("salesImpact", formatPeso(adjusted));
        setText(
          "salesImpactPct",
          `${pct.toFixed(1)}% vs baseline forecast`
        );
      } else if (type === "orders") {
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
  setText("salesImpact", formatPeso(baselineSalesNext));
  setText("salesImpactPct", "0.0% vs baseline forecast");
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

// ---------- INIT ----------
document.addEventListener("DOMContentLoaded", () => {
  setupFirebaseAuth();
  setupTabs();
  loadCsvForecasts();
});
