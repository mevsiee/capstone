const API_BASE = "http://localhost:8000";

// Global filters
let selectedYear = null;
let selectedMonth = null;
let selectedPlatform = "all";   // all | tiktok | retail
let selectedMetric = "sales";   // sales | orders

let salesTrendChart = null;
let ordersTrendChart = null;
let topProductsChart = null;
let categoryChart = null;
let ordersDemandChart = null;

// Platform colors for charts (TikTok + Retail only)
const PLATFORM_COLORS = {
  tiktok: "#00f5ff",   // teal
  retail: "#facc15"    // yellow
};

const PLATFORM_LABELS = {
  tiktok: "TikTok",
  retail: "Retail"
};

// ================================
// DOMContentLoaded
// ================================
document.addEventListener("DOMContentLoaded", () => {
  setupSidebarNav();
  setupMonthPicker();
  setupPlatformTabs();
  setupMetricTabs();
  setupTrendButtons();

  initDashboard();
});

// ================================
// Sidebar Navigation + Logout
// ================================
function setupSidebarNav() {
  const menuItems = document.querySelectorAll(".menu-item a");

  menuItems.forEach((item) => {
    item.addEventListener("click", function (e) {
      const href = this.getAttribute("href");

      if (this.id === "logoutBtn") {
        e.preventDefault();
        handleLogout();
        return;
      }

      if (href && href.endsWith(".html")) {
        window.location.href = href;
      }
    });
  });
}

function handleLogout() {
  if (typeof firebase !== "undefined" && firebase.auth) {
    firebase
      .auth()
      .signOut()
      .then(() => {
        alert("You have been logged out successfully.");
        window.location.href = "../index.html";
      })
      .catch((error) => {
        console.error("Logout failed:", error);
        alert("Logout failed: " + error.message);
      });
  } else {
    console.error("Firebase not initialized.");
  }
}

// ================================
// Month picker
// ================================
function setupMonthPicker() {
  const monthInput = document.getElementById("monthPicker");
  if (!monthInput) return;

  // Prevent future months
  monthInput.max = new Date().toISOString().slice(0, 7);

  monthInput.addEventListener("change", () => {
    if (!monthInput.value) {
      selectedYear = null;
      selectedMonth = null;
    } else {
      const [y, m] = monthInput.value.split("-");
      selectedYear = parseInt(y, 10);
      selectedMonth = parseInt(m, 10);
    }
    initDashboard();
  });
}

// Build query string for current filter
function buildFilterQuery(includeQuestionMark = false) {
  const now = new Date();
  const year = selectedYear ?? now.getFullYear();
  const month = (selectedMonth ?? now.getMonth() + 1)
    .toString()
    .padStart(2, "0");

  const params = new URLSearchParams({
    year: String(year),
    month,
    platform: selectedPlatform || "all"
  });

  const prefix = includeQuestionMark ? "?" : "&";
  return prefix + params.toString();
}

// Peso formatter
function formatPeso(value) {
  const num = Number(value) || 0;
  return (
    "₱" +
    num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  );
}

// ================================
// Platform & Metric Tabs
// ================================
function setupPlatformTabs() {
  document.querySelectorAll(".platform-tab").forEach((btn) => {
    btn.addEventListener("click", () => {

      // visually toggle UI buttons
      document
        .querySelectorAll(".platform-tab")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      selectedPlatform = btn.dataset.platform || "all";

      // IMMEDIATE KPI UI UPDATE
      applyRetailKpiVisibility();

      // then load data
      initDashboard();
    });
  });
}


function setupMetricTabs() {
  document.querySelectorAll(".metric-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".metric-tab")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      selectedMetric = btn.dataset.metric || "sales";
      toggleMetricSections();
      initDashboard();
    });
  });
}

function toggleMetricSections() {
  document.querySelectorAll(".metric-section").forEach((sec) => {
    const isSales = sec.classList.contains("metric-sales");
    const isOrders = sec.classList.contains("metric-orders");

    if (selectedMetric === "sales") {
      sec.classList.toggle("hidden", !isSales);
    } else {
      sec.classList.toggle("hidden", !isOrders);
    }
  });
}

// ================================
// Trend toggle buttons
// ================================
function setupTrendButtons() {
  document.querySelectorAll(".sales-trend-section").forEach((section) => {
    section.querySelectorAll(".sales-toggle").forEach((btn) => {
      btn.addEventListener("click", () => {
        section
          .querySelectorAll(".sales-toggle")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        const mode = btn.dataset.mode || "daily";

        if (section.querySelector("#salesTrendChart")) {
          currentTrendModeSales = mode;
          loadSalesTrend();
        } else if (section.querySelector("#ordersTrendChart")) {
          currentTrendModeOrders = mode;
          loadOrdersTrend();
        }
      });
    });
  });
}

// ================================
// Dashboard init
// ================================
async function initDashboard() {
  if (selectedMetric === "sales") {
    await loadSalesKPIs();
    await loadSalesTrend();
    await loadCategoryPerformance();
    await loadTopSellingProducts();
  } else {
    await loadOrderKPIs();
    await loadOrdersTrend();
    await loadOrderSummaryAndDemand();
  }
}

// ================================
// SALES VIEW
// ================================

// 1. KPIs (Sales)
async function loadSalesKPIs() {
  const qs = buildFilterQuery(true);

  const endpoints = {
    gross: "/kpi/gross",
    net: "/kpi/net",
    discounts: "/kpi/discounts",
    aov: "/kpi/aov"
  };

  for (const [key, route] of Object.entries(endpoints)) {
    try {
      const res = await fetch(API_BASE + route + qs);
      const data = await res.json();
      updateSalesKpiCard(key, data);
    } catch (err) {
      console.error(`Failed to load Sales KPI (${key}):`, err);
    }
  }
}

function updateSalesKpiCard(type, data) {
  const card = document.querySelector(`#kpi-${type}`);
  if (!card) return;

  const val = card.querySelector(".kpi-value");
  const deltaEl = card.querySelector(".kpi-delta");

  // display current value
  val.textContent = formatPeso(data.current ?? 0);

  // compute percentage delta
  const prev = data.previous ?? 0;
  const curr = data.current ?? 0;

  let delta = 0;
  if (prev !== 0) {
    delta = ((curr - prev) / prev) * 100;
  }

  deltaEl.textContent = `${delta.toFixed(1)}% from last month`;
}

// 2. Sales Trend (revenue)
let currentTrendModeSales = "daily";

async function loadSalesTrend() {
  if (currentTrendModeSales === "hourly") return loadSalesTrendHourly();
  if (currentTrendModeSales === "monthly") return loadSalesTrendMonthly();
  return loadSalesTrendDaily();
}

function normalizePlatform(p) {
  return (p || "").toLowerCase();
}

async function loadSalesTrendHourly() {
  try {
    const qs = buildFilterQuery(true);
    const res = await fetch(`${API_BASE}/sales/trend/hourly` + qs);
    let data = await res.json();

    data = data.map((r) => ({
      ...r,
      platform_name: normalizePlatform(r.platform_name)
    }));

    let platforms = ["tiktok", "retail"];
      if (selectedPlatform !== "all") {
          platforms = [selectedPlatform];
      }
    const hours = [...new Set(data.map((r) => r.order_hour))].sort(
      (a, b) => a - b
    );

    const datasetMap = { tiktok: [], retail: [] };

    hours.forEach((hour) => {
      platforms.forEach((p) => {
        const row = data.find(
          (d) => d.order_hour === hour && d.platform_name === p
        );
        datasetMap[p].push(row ? row.hourly_sales : 0);
      });
    });

    renderSalesTrendChart(hours, datasetMap, "hourly");
  } catch (e) {
    console.error("Hourly sales trend failed:", e);
  }
}

async function loadSalesTrendDaily() {
  try {
    const qs = buildFilterQuery(true);
    const res = await fetch(`${API_BASE}/sales/trend/daily` + qs);
    let data = await res.json();

    data = data.map((r) => ({
      ...r,
      platform_name: normalizePlatform(r.platform_name)
    }));

    let platforms = ["tiktok", "retail"];
      if (selectedPlatform !== "all") {
          platforms = [selectedPlatform];
      }
    const days = [
      ...new Set(data.map((r) => parseInt(r.order_date.split("-")[2])))
    ].sort((a, b) => a - b);

    const datasetMap = { tiktok: [], retail: [] };

    days.forEach((day) => {
      platforms.forEach((p) => {
        const row = data.find(
          (d) =>
            parseInt(d.order_date.split("-")[2]) === day &&
            d.platform_name === p
        );
        datasetMap[p].push(row ? row.daily_sales : 0);
      });
    });

    renderSalesTrendChart(days, datasetMap, "daily");
  } catch (e) {
    console.error("Daily sales trend failed:", e);
  }
}

async function loadSalesTrendMonthly() {
  try {
    const qs = buildFilterQuery(true);
    const res = await fetch(`${API_BASE}/sales/trend/monthly` + qs);
    let data = await res.json();

    data = data.map((r) => ({
      ...r,
      platform_name: normalizePlatform(r.platform_name)
    }));

    let platforms = ["tiktok", "retail"];

      if (selectedPlatform !== "all") {
          platforms = [selectedPlatform];
      }

    const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec"
    ];

    const datasetMap = { tiktok: [], retail: [] };

    months.forEach((m) => {
      platforms.forEach((p) => {
        const row = data.find(
          (d) => d.order_month === m && d.platform_name === p
        );
        datasetMap[p].push(row ? row.monthly_sales : 0);
      });
    });

    renderSalesTrendChart(monthNames, datasetMap, "monthly");
  } catch (e) {
    console.error("Monthly sales trend failed:", e);
  }
}

function renderSalesTrendChart(labels, datasetMap, mode) {
  const ctx = document.getElementById("salesTrendChart");
  if (!ctx) return;

  if (salesTrendChart) salesTrendChart.destroy();

  const pesoFormatter = (value) => {
    if (value >= 1_000_000) return "₱" + (value / 1_000_000).toFixed(1) + "M";
    if (value >= 1_000) return "₱" + (value / 1_000).toFixed(0) + "K";
    return "₱" + value;
  };

  salesTrendChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: Object.keys(datasetMap).map((key) => ({
        label: PLATFORM_LABELS[key],
        data: datasetMap[key],
        borderColor: PLATFORM_COLORS[key],
        backgroundColor: "transparent",
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 0
      }))
    },
    options: {
      maintainAspectRatio: false,
      responsive: true,
      plugins: {
        legend: { position: "bottom", labels: { color: "#fff" } }
      },
      scales: {
        x: {
          ticks: { color: "#aaa" },
          grid: { color: "#222" }
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: "#fff",
            callback: pesoFormatter
          },
          grid: { color: "#222" }
        }
      }
    }
  });
}

// 3. Top Category Performance (pie)
async function loadCategoryPerformance() {
  try {
    const qs = buildFilterQuery(true);
    const res = await fetch(`${API_BASE}/categories/top` + qs);
    const data = await res.json();
    updateCategoryChart(data);
  } catch (err) {
    console.error("Category performance failed:", err);
  }
}

function updateCategoryChart(data) {
  const ctx = document.getElementById("categoryPieChart");
  if (!ctx) return;

  if (categoryChart) categoryChart.destroy();

  const labels = data.map(d => d.category);
  const values = data.map(d => d.total_sales);

  // Clean color palette for categories
  const COLORS = [
    "#16375f", // blue
    "#f0b810", // yellow
    "#02250a", // green
    "#075c56", // teal
    "#919090", // gray 
    "#94a3b8"  // softer gray for overflow categories
  ];

  categoryChart = new Chart(ctx, {
    type: "pie",
    data: {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: COLORS,
          borderWidth: 0 // ← removes white borders completely
        }
      ]
    },
    options: {
      maintainAspectRatio: false,
      layout: {
        padding: {
          left: 0,
          right: 0,
          top: 10,
          bottom: 10
        }
      },
      plugins: {
        legend: {
          position: "right", // ← legend now on the right
          labels: {
            color: "#fff",
            font: { size: 12 },
            padding: 12,
            usePointStyle: true,
            pointStyle: "rectRounded"
          }
        },
        tooltip: {
          callbacks: {
            label: (ctx) =>
              `${ctx.label}: ₱${ctx.raw.toLocaleString()}`
          }
        }
      }
    }
  });
}

// 4. Top-Selling Products (sales)
async function loadTopSellingProducts() {
  try {
    const qs = buildFilterQuery(true);
    const res = await fetch(`${API_BASE}/products/top` + qs);
    const data = await res.json();
    updateTopSellingProductsChart(data, "topProductsChart");
  } catch (e) {
    console.error("Top products failed:", e);
  }
}

function updateTopSellingProductsChart(data, canvasId) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  if (canvasId === "topProductsChart" && topProductsChart) {
    topProductsChart.destroy();
  }
  if (canvasId === "ordersDemandChart" && ordersDemandChart) {
    ordersDemandChart.destroy();
  }

  const labels = data.map((item) => item.product_name);
  const values = data.map((item) => item.total_quantity);

  const chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Units",
          data: values,
          borderRadius: 6,
          backgroundColor: "#22c55e"
        }
      ]
    },
    options: {
      maintainAspectRatio: false,
      indexAxis: "y",
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ctx.raw.toLocaleString()
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: "#fff",
            callback: (value) => Number(value).toLocaleString()
          },
          grid: { color: "#333" }
        },
        y: {
          ticks: { color: "#fff" },
          grid: { display: false }
        }
      }
    }
  });

  if (canvasId === "topProductsChart") {
    topProductsChart = chart;
  } else if (canvasId === "ordersDemandChart") {
    ordersDemandChart = chart;
  }
}

// ================================
// ORDERS VIEW
// ================================
let currentTrendModeOrders = "daily";

// 1. Order KPIs – placeholder structure
async function loadOrderKPIs() {
  const qs = buildFilterQuery(true);

  const endpoints = {
    "completed": "/kpi/completed_orders",
    "completion-rate": "/kpi/completion_rate",
    "avg-qty": "/kpi/avg_qty",
    "cancelled": "/kpi/cancelled_orders",
    "cancel-rate": "/kpi/cancellation_rate"
  };

  for (const [key, route] of Object.entries(endpoints)) {
    try {
      const res = await fetch(API_BASE + route + qs);
      const data = await res.json();
      updateOrdersKpiCard(key, data);
    } catch (err) {
      console.error(`Failed to load Orders KPI (${key}):`, err);
    }
  }

  // NEW:
  applyRetailKpiVisibility();
}

function updateOrdersKpiCard(type, data) {
  const card = document.querySelector(`#kpi-orders-${type}`);
  if (!card) return;

  const val = card.querySelector(".kpi-value");
  const deltaEl = card.querySelector(".kpi-delta");

  let curr = data.current ?? 0;
  let prev = data.previous ?? 0;

  if (type === "completion-rate" || type === "cancel-rate") {
    val.textContent = `${curr.toFixed(2)}%`;
  } else {
    val.textContent = curr.toLocaleString();
  }

  let delta = 0;
  if (prev !== 0) delta = ((curr - prev) / prev) * 100;

  deltaEl.textContent = `${delta.toFixed(1)}% from last month`;
}

function applyRetailKpiVisibility() {
  const isRetail = selectedPlatform === "retail";

  const cancelled = document.querySelector("#kpi-orders-cancelled");
  const cancelRate = document.querySelector("#kpi-orders-cancel-rate");

  if (cancelled) cancelled.style.display = isRetail ? "none" : "block";
  if (cancelRate) cancelRate.style.display = isRetail ? "none" : "block";

  const section = document.querySelector("#orders-kpis");
  if (section) section.style.justifyContent = isRetail ? "center" : "flex-start";
}

// 2. Order Volume Trend
async function loadOrdersTrend() {
  const qs = buildFilterQuery(true);

  let endpoint = "";
  if (currentTrendModeOrders === "hourly") {
    endpoint = "/orders/trend/hourly";
  } else if (currentTrendModeOrders === "monthly") {
    endpoint = "/orders/trend/monthly";
  } else {
    endpoint = "/orders/trend/daily"; // default
  }

  try {
    const res = await fetch(API_BASE + endpoint + qs);
    const data = await res.json();
    renderOrdersTrendChartFromData(data);
  } catch (err) {
    console.error("Orders trend failed:", err);
  }
}

function renderOrdersTrendChartFromData(data) {
  const ctx = document.getElementById("ordersTrendChart");
  if (!ctx) return;

  if (ordersTrendChart) ordersTrendChart.destroy();

  const labels = data.map((d) => d.label);

  let valuesTikTok = [];
  let valuesRetail = [];

  if (selectedPlatform === "tiktok") {
    valuesTikTok = data.map((d) => d.tiktok_orders || 0);
    valuesRetail = data.map(() => 0);
  } else if (selectedPlatform === "retail") {
    valuesTikTok = data.map(() => 0);
    valuesRetail = data.map((d) => d.retail_orders || 0);
  } else {
    valuesTikTok = data.map((d) => d.tiktok_orders || 0);
    valuesRetail = data.map((d) => d.retail_orders || 0);
  }

  ordersTrendChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "TikTok",
          data: valuesTikTok,
          borderColor: PLATFORM_COLORS.tiktok,
          backgroundColor: "transparent",
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 0,
          hidden: selectedPlatform === "retail"
        },
        {
          label: "Retail",
          data: valuesRetail,
          borderColor: PLATFORM_COLORS.retail,
          backgroundColor: "transparent",
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 0,
          hidden: selectedPlatform === "tiktok"
        }
      ]
    },
    options: {
      maintainAspectRatio: false,
      plugins: {
        legend: { 
          position: "bottom", 
          labels: { color: "#fff" },
          display: selectedPlatform === "all"
        }
      },
      scales: {
        x: {
          ticks: { color: "#aaa" },
          grid: { color: "#222" }
        },
        y: {
          beginAtZero: true,
          ticks: { color: "#fff" },
          grid: { color: "#222" }
        }
      }
    }
  });
}

// 3. Orders summary + demand chart – placeholder
async function loadOrderSummaryAndDemand() {
  try {
    const qs = buildFilterQuery(true);
    const res = await fetch(`${API_BASE}/products/top` + qs);
    const data = await res.json();

    renderSalesOrderCorrelation(data);
    updateTopSellingProductsChart(data, "ordersDemandChart");

  } catch (err) {
    console.error("Orders correlation failed:", err);
  }
}

function renderSalesOrderCorrelation(data) {
  const ctx = document.getElementById("salesOrderCorrelationChart");
  if (!ctx) return;

  if (window.correlationChart) window.correlationChart.destroy();

  const points = data.map(p => {
    const avgSales = p.total_sales / p.total_quantity;
    return {
      x: p.total_quantity,
      y: avgSales,
      r: Math.sqrt(p.total_sales) / 6,
      label: p.product_name
    };
  });

  window.correlationChart = new Chart(ctx, {
    type: 'bubble',
    data: { datasets: [{
      label: "Products",
      data: points,
      backgroundColor: "rgba(34, 197, 94, 0.4)",
      borderColor: "#22c55e",
      borderWidth: 1
    }]},
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(ctx) {
              return [
                ctx.raw.label,
                `Orders: ${ctx.raw.x}`,
                `Avg sales/order: ₱${ctx.raw.y.toFixed(2)}`,
                `Total sales: ₱${(ctx.raw.y * ctx.raw.x).toLocaleString()}`
              ];
            }
          }
        }
      },
      scales: {
        x: {
          title: { display: true, text: "Order Volume", color: "#fff" },
          ticks: { color: "#fff" }
        },
        y: {
          title: { display: true, text: "Avg Sales per Order", color: "#fff" },
          ticks: { color: "#fff" }
        }
      }
    }
  });
}