/* ============================================================
   ANALYTICS.JS  (DENORMALIZED + FORECAST CSV VERSION)

   - Uses denormalized_table_2025.csv for "current" (history) from
     Jan 1, 2025 up to the last recorded date per platform.
   - Uses forecast_retail.csv, forecast_shopee.csv, forecast_tiktok.csv
     for the NEXT 3 MONTHS AFTER the last recorded month of each platform.
   - Fills all KPI cards, chart, breakdown and what-if analysis.
   - Still works with Firebase auth + tabs.
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
  document.getElementById(id).innerHTML = value;
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
      // assume YYYY-MM or YYYY-MM-DD
      const parts = s.split("-");
      const y = Number(parts[0]);
      const m = Number(parts[1]);
      const d = parts[2] ? Number(parts[2]) : 1;
      return new Date(y, m - 1, d);
    } else if (s.includes("/")) {
      // assume M/D/YYYY
      const [m, d, y] = s.split("/").map(Number);
      return new Date(y, m - 1, d || 1);
    }
  }

  // fallback
  return new Date(ds);
}

function formatMonthKey(dateObj) {
  const y = dateObj.getFullYear();
  const m = dateObj.getMonth() + 1;
  return `${y}-${String(m).padStart(2, "0")}-01`;
}

// ---------- CSV LOADING (FORECAST) ----------
function parseForecastCsv(path, platformName) {
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

// ---------- CSV LOADING (DENORMALIZED HISTORY) ----------
function normalizePlatformName(raw) {
  const p = (raw || "").toLowerCase();
  if (p.includes("shopee")) return "shopee";
  if (p.includes("tiktok")) return "tiktok";
  // everything else treated as retail
  return "retail";
}

/**
 * denormalized_table_2025.csv → monthly sales history rows
 * Only "Completed" orders from 2025 onward are used.
 * Aggregates by (platform, month).
 */
function parseDenormalizedHistory(path) {
  return new Promise((resolve, reject) => {
    Papa.parse(path, {
      download: true,
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        const raw = results.data || [];

        const byKey = {};
        raw.forEach((row) => {
          const status = (row.order_status || "").trim();
          if (status !== "Completed") return;

          // order_date like "5/8/2025"
          const orderDateStr = row.order_date || "";
          const dt = parseDate(orderDateStr);
          if (!dt || isNaN(dt.getTime())) return;
          if (dt.getFullYear() < 2025) return; // only 2025 onward

          const platform = normalizePlatformName(row.platform_name);
          const monthKey = formatMonthKey(dt);

          // prefer order_amount; fallback to product_subtotal_after
          let amount =
            Number(row.order_amount) ||
            Number(row.product_subtotal_after) ||
            0;

          const key = `${platform}|${monthKey}`;
          if (!byKey[key]) {
            byKey[key] = {
              platform,
              ds: monthKey,
              y: 0,
            };
          }
          byKey[key].y += amount;
        });

        const historyRows = Object.values(byKey);
        resolve(historyRows);
      },
      error: (err) => reject(err),
    });
  });
}

// ---------- LOAD ALL DATA ----------
async function loadCsvForecasts() {
  try {
    // 1) History from denormalized table
    const historyRows = await parseDenormalizedHistory(
      "../data/denormalized_table_2025.csv"
    );

    // 2) Forecast CSVs (next 3 months per platform)
    const [retailForecast, shopeeForecast, tiktokForecast] =
      await Promise.all([
        parseForecastCsv("../data/forecast_retail.csv", "retail"),
        parseForecastCsv("../data/forecast_shopee.csv", "shopee"),
        parseForecastCsv("../data/forecast_tiktok.csv", "tiktok"),
      ]);

    // 3) Determine last history month per platform
    const lastHistoryPerPlatform = {};
    historyRows.forEach((row) => {
      const d = parseDate(row.ds);
      const plat = row.platform;
      if (!lastHistoryPerPlatform[plat]) {
        lastHistoryPerPlatform[plat] = d;
      } else if (d > lastHistoryPerPlatform[plat]) {
        lastHistoryPerPlatform[plat] = d;
      }
    });

    // 4) Filter forecast rows to ONLY months AFTER last history month
    function filterForecastForPlatform(forecastRows, platformKey) {
      const lastHistDate = lastHistoryPerPlatform[platformKey];
      if (!lastHistDate) return forecastRows; // fallback
      return forecastRows.filter((r) => parseDate(r.ds) > lastHistDate);
    }

    const filteredRetailForecast = filterForecastForPlatform(
      retailForecast,
      "retail"
    );
    const filteredShopeeForecast = filterForecastForPlatform(
      shopeeForecast,
      "shopee"
    );
    const filteredTiktokForecast = filterForecastForPlatform(
      tiktokForecast,
      "tiktok"
    );

    // 5) Split history by platform
    const historyRetail = historyRows.filter(
      (r) => r.platform === "retail"
    );
    const historyShopee = historyRows.filter(
      (r) => r.platform === "shopee"
    );
    const historyTiktok = historyRows.filter(
      (r) => r.platform === "tiktok"
    );

    // 6) Build metrics object from history + forecast
    const metrics = computeMetricsFromRows({
      historyByPlatform: {
        retail: historyRetail,
        shopee: historyShopee,
        tiktok: historyTiktok,
      },
      forecastByPlatform: {
        retail: filteredRetailForecast,
        shopee: filteredShopeeForecast,
        tiktok: filteredTiktokForecast,
      },
    });

    populateSalesTab(metrics);
    populateOrdersTab(metrics);
    initSliders();
  } catch (err) {
    console.error("❌ Error loading data:", err);
    alert("Failed to load analytics CSV data. Check console for details.");
  }
}

// ---------- METRIC COMPUTATION ----------
function computePlatformMetrics(historyRows, forecastRows) {
  const currentSales = sumField(historyRows, "y");
  const nextSales = sumField(forecastRows, "y");

  const combined = [...historyRows, ...forecastRows];
  const len = combined.length || 1;

  const mae =
    combined.reduce((acc, r) => acc + (r.mae || 0), 0) / len;
  const rmse =
    combined.reduce((acc, r) => acc + (r.rmse || 0), 0) / len;
  const mape =
    combined.reduce((acc, r) => acc + (r.mape || 0), 0) / len;

  return {
    currentSales,
    nextSales,
    mae,
    rmse,
    mape,
  };
}

function computeChartSeries(historyRowsAll, forecastRowsAll) {
  const allRows = [...historyRowsAll, ...forecastRowsAll].sort(
    (a, b) => parseDate(a.ds) - parseDate(b.ds)
  );

  const labels = [...new Set(allRows.map((r) => r.ds))];

  const historyTotals = {};
  historyRowsAll.forEach((row) => {
    historyTotals[row.ds] =
      (historyTotals[row.ds] || 0) + (row.y || 0);
  });

  const forecastTotals = {};
  forecastRowsAll.forEach((row) => {
    forecastTotals[row.ds] =
      (forecastTotals[row.ds] || 0) + (row.y || 0);
  });

  const currentSeries = labels.map((d) =>
    historyTotals[d] !== undefined ? historyTotals[d] : null
  );
  const forecastSeries = labels.map((d) =>
    forecastTotals[d] !== undefined ? forecastTotals[d] : null
  );

  return {
    labels,
    currentSeries,
    forecastSeries,
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

  // Overall validation based on forecast rows only
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
  // SALES GROWTH
    const salesArrow = m.growthRate > 0 ? "▲" : m.growthRate < 0 ? "▼" : "";
    const salesColor = m.growthRate > 0 ? "green" : m.growthRate < 0 ? "red" : "#b5b5b5";

    setHTML(
    "salesGrowth",
    `<span style="color:${salesColor}; font-weight:700;">${salesArrow} ${Math.abs(m.growthRate).toFixed(1)}%</span>`
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
    // ORDERS GROWTH
    const ordersArrow = growth > 0 ? "▲" : growth < 0 ? "▼" : "";
    const ordersColor = growth > 0 ? "green" : growth < 0 ? "red" : "#b5b5b5";

    setHTML(
    "ordersGrowth",
    `<span style="color:${ordersColor}; font-weight:700;">${ordersArrow} ${Math.abs(growth).toFixed(1)}%</span>`
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
