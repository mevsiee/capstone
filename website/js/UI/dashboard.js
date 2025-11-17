const API_BASE = "http://localhost:8000"; // backend base URL

// Global month filter (null = use DB latest month)
let selectedYear = null;
let selectedMonth = null;

// ================================
// Sidebar Navigation + Logout
// ================================
document.addEventListener("DOMContentLoaded", () => {
  const menuItems = document.querySelectorAll(".menu-item a");

  // Sidebar navigation
  menuItems.forEach((item) => {
    item.addEventListener("click", function (e) {
      const href = this.getAttribute("href");

      // Handle logout separately
      if (this.id === "logoutBtn") {
        e.preventDefault();
        handleLogout();
        return;
      }

      // Navigate to HTML pages
      if (href && href.endsWith(".html")) {
        window.location.href = href;
      }
    });
  });

  // Month picker change -> reload dashboard with filter
  const monthInput = document.getElementById("monthPicker");

  if (monthInput) {
    // 🔒 Prevent selecting future months
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

  // Initial load (no filter => DB latest month)
  initDashboard();
});

// ================================
// CUSTOM DROPDOWN LOGIC
// ================================
const dropdown = document.getElementById("topProductsDropdown");
const dropdownBtn = document.getElementById("topProductsBtn");
const dropdownMenu = document.getElementById("topProductsMenu");

dropdownBtn.addEventListener("click", () => {
  dropdownMenu.classList.toggle("show");
});

document.querySelectorAll("#topProductsMenu .dropdown-item").forEach(item => {
  item.addEventListener("click", () => {
    const value = item.dataset.value;
    const label = item.textContent;

    dropdownBtn.innerHTML = `${label} <i class="fas fa-chevron-down"></i>`;
    dropdownMenu.classList.remove("show");

    loadTopSellingProducts(value);
  });
});

// Close dropdown when clicking outside
document.addEventListener("click", (e) => {
  if (!dropdown.contains(e.target)) {
    dropdownMenu.classList.remove("show");
  }
});

// Firebase logout function
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
// Helpers
// ================================
function formatPeso(value) {
  const num = Number(value) || 0;
  return "₱" + num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Build query string for current filter
function buildFilterQuery(includeQuestionMark = false) {
  const now = new Date();
  const year = selectedYear ?? now.getFullYear();
  const month = (selectedMonth ?? now.getMonth() + 1).toString().padStart(2, "0");

  return includeQuestionMark
    ? `?year=${year}&month=${month}`
    : `&year=${year}&month=${month}`;
}

// ================================
// Load All Dashboard Data
// ================================
async function initDashboard() {
  await loadKPIs();
  await loadPlatformDistribution();
  await loadSalesTrend();
  await loadTopSellingProducts();
  await loadAOVDistribution();
}

// ================================
// 1. KPI LOADERS
// ================================
async function loadKPIs() {
  const qs = buildFilterQuery(true);
  const endpoints = {
    net: "/kpi/net-sales",
    gross: "/kpi/gross-sales",
    discounts: "/kpi/discounts",
    aov: "/kpi/aov" // <-- Added AOV KPI
  };

  for (const [key, route] of Object.entries(endpoints)) {
    try {
      const response = await fetch(API_BASE + route + qs);
      const data = await response.json();
      updateKpiCard(key, data);
    } catch (err) {
      console.error(`Failed to load KPI (${key}):`, err);
    }
  }
}

function updateKpiCard(type, data) {
  const card = document.querySelector(`#kpi-${type}`);
  if (!card) return;

  const val = card.querySelector(".kpi-value");
  const delta = card.querySelector(".kpi-delta");

  // Net, Gross, Discounts, and NEW: AOV are all ₱ money values
  const isMoneyType = ["net", "gross", "discounts", "aov"].includes(type);

  if (isMoneyType) {
    val.textContent = isNaN(data.current) ? "₱0.00" : formatPeso(data.current);
  } else {
    // completed / cancelled — integers
    const n = Number.isFinite(data.current) ? data.current : 0;
    val.textContent = n.toLocaleString();
  }

  const d = Number.isFinite(data.delta) ? data.delta : 0;
  delta.textContent = `${d.toFixed(1)}% from last month`;
}

// ================================
// 2. PLATFORM DISTRIBUTION
// ================================
async function loadPlatformDistribution() {
  try {
    const qs = buildFilterQuery(true);
    const response = await fetch(`${API_BASE}/platform/distribution` + qs);
    const data = await response.json();

    data.forEach((row) => {
      const box = document.querySelector(`#platform-${row.platform}`);
      if (!box) return;

      box.querySelector(".platform-sales").textContent = formatPeso(
        row.sales
      );
      box.querySelector(".platform-share").textContent =
        `${row.share_percent}%`;
    });
  } catch (err) {
    console.error("Failed loading platform distribution:", err);
  }
}

// ================================
// 3. SALES TREND CHART (Hourly / Daily / Monthly)
// ================================

// ================================
// SALES TREND — CHART VARS
// ================================
let salesTrendChart = null;
let currentTrendMode = "daily"; // default

// ================================
// PLATFORM HELPERS
// ================================
const PLATFORM_COLORS = {
  shopee: "#E86A5F",
  tiktok: "#B32780",
  retail: "#B38A00"
};

const PLATFORM_LABELS = {
  shopee: "Shopee",
  tiktok: "TikTok",
  retail: "Retail"
};

// Normalize platform name
function normalizePlatform(p) {
  return p.toLowerCase();
}

// ================================
// TREND SWITCH (UI BUTTONS)
// ================================
function setupTrendButtons() {
  document.querySelectorAll(".sales-toggle").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".sales-toggle").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      currentTrendMode = btn.textContent.trim().toLowerCase(); // hourly|daily|monthly
      loadSalesTrend();
    });
  });
}

// ================================
// MAIN TREND LOADER
// ================================
async function loadSalesTrend() {
  if (currentTrendMode === "hourly") return loadSalesTrendHourly();
  if (currentTrendMode === "monthly") return loadSalesTrendMonthly();
  return loadSalesTrendDaily(); // default
}

// ================================
// 1) HOURLY SALES TREND
// ================================
async function loadSalesTrendHourly() {
  try {
    const qs = buildFilterQuery(true);
    const res = await fetch(`${API_BASE}/sales/trend/hourly` + qs);
    let data = await res.json();

    data = data.map(r => ({
      ...r,
      platform_name: normalizePlatform(r.platform_name)
    }));

    const platforms = ["shopee", "tiktok", "retail"];
    const hours = [...new Set(data.map(r => r.order_hour))].sort((a,b)=>a-b);

    const datasetMap = { shopee: [], tiktok: [], retail: [] };

    hours.forEach(hour => {
      platforms.forEach(p => {
        const row = data.find(d => d.order_hour === hour && d.platform_name === p);
        datasetMap[p].push(row ? row.hourly_sales : 0);
      });
    });

    renderTrendChart(hours, datasetMap, "hourly");
  } catch (e) {
    console.error("Hourly sales trend failed:", e);
  }
}

// ================================
// 2) DAILY SALES TREND
// ================================
async function loadSalesTrendDaily() {
  try {
    const qs = buildFilterQuery(true);
    const res = await fetch(`${API_BASE}/sales/trend/daily` + qs);
    let data = await res.json();

    data = data.map(r => ({
      ...r,
      platform_name: normalizePlatform(r.platform_name)
    }));

    const platforms = ["shopee", "tiktok", "retail"];
    const days = [...new Set(data.map(r => parseInt(r.order_date.split("-")[2])))].sort((a,b)=>a-b);

    const datasetMap = { shopee: [], tiktok: [], retail: [] };

    days.forEach(day => {
      platforms.forEach(p => {
        const row = data.find(
          d => parseInt(d.order_date.split("-")[2]) === day && d.platform_name === p
        );
        datasetMap[p].push(row ? row.daily_sales : 0);
      });
    });

    renderTrendChart(days, datasetMap, "daily");
  } catch (e) {
    console.error("Daily sales trend failed:", e);
  }
}

// ================================
// 3) MONTHLY SALES TREND
// ================================
async function loadSalesTrendMonthly() {
  try {
    const qs = buildFilterQuery(true);
    const res = await fetch(`${API_BASE}/sales/trend/monthly` + qs);
    let data = await res.json();

    data = data.map(r => ({
      ...r,
      platform_name: normalizePlatform(r.platform_name)
    }));

    const platforms = ["shopee", "tiktok", "retail"];
    const months = [1,2,3,4,5,6,7,8,9,10,11,12];
    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

    const datasetMap = { shopee: [], tiktok: [], retail: [] };

    months.forEach(m => {
      platforms.forEach(p => {
        const row = data.find(d => d.order_month === m && d.platform_name === p);
        datasetMap[p].push(row ? row.monthly_sales : 0);
      });
    });

    renderTrendChart(monthNames, datasetMap, "monthly");
  } catch (e) {
    console.error("Monthly sales trend failed:", e);
  }
}

// ================================
// CHART RENDERER (shared by all modes)
// ================================
function renderTrendChart(labels, datasetMap, mode) {
  const ctx = document.getElementById("salesTrendChart");

  if (salesTrendChart) salesTrendChart.destroy();

  // Y-axis peso formatter
  const pesoFormatter = value => {
    if (value >= 1_000_000) return "₱" + (value / 1_000_000).toFixed(1) + "M";
    if (value >= 1_000) return "₱" + (value / 1_000).toFixed(0) + "K";
    return "₱" + value;
  };

  // X-axis label
  let xLabel = "Value";
  if (mode === "hourly") xLabel = "Hour (0–23)";
  if (mode === "daily") xLabel = "Day of Month";
  if (mode === "monthly") xLabel = "Month";

  salesTrendChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: Object.keys(datasetMap).map(key => ({
        label: PLATFORM_LABELS[key],
        data: datasetMap[key],
        backgroundColor: PLATFORM_COLORS[key]
      }))
    },
    options: {
      maintainAspectRatio: false,
      responsive: true,
      plugins: {
        legend: { position: "right" }
      },
      scales: {
        x: {
          stacked: true,
          title: { display: true, text: xLabel, color: "#fff" }
        },
        y: {
            stacked: true,
            beginAtZero: true,
            min: 0,
            title: { display: true, text: "Sales (₱)", color: "#fff" },
            ticks: {
                color: "#fff",
                callback: pesoFormatter
            }
        }
      }
    }
  });
}

// Initialize buttons once
document.addEventListener("DOMContentLoaded", () => {
    setupTrendButtons();

    // Set currentTrendMode based on active button
    const activeBtn = document.querySelector(".sales-toggle.active");
    if (activeBtn) {
        currentTrendMode = activeBtn.textContent.trim().toLowerCase();
    }

    initDashboard();
});

// ================================
// 4. TOP SELLING PRODUCTS
// ================================

async function loadTopSellingProducts(platform = "all") {
  try {
    const res = await fetch(
      `${API_BASE}/products/top?platform=${platform}&year=${selectedYear}&month=${selectedMonth}`
    );

    const data = await res.json();
    updateTopSellingProducts(data);
  } catch (e) {
    console.error("Top products failed:", e);
  }
}

let topProductsChart = null;

function updateTopSellingProducts(data) {
    const ctx = document.getElementById("topProductsChart");

    if (topProductsChart) topProductsChart.destroy();

    const labels = data.map(item => item.product_name);
    const values = data.map(item => item.total_quantity);

    topProductsChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [{
                label: "Units Sold",
                data: values,
                borderRadius: 6,
                backgroundColor: "#4ade80",
            }]
        },
        options: {
            maintainAspectRatio: false,
            indexAxis: "y",
            responsive: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => ctx.raw.toLocaleString()   // ✅ NO PESO
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: "#fff",
                        callback: (value) => Number(value).toLocaleString() // ✅ NO PESO
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
}

// Title case helper
function toTitleCase(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// ================================
// 5. AOV DISTRIBUTION
// ================================
async function loadAOVDistribution() {
    try {
        const qs = buildFilterQuery(true);
        const res = await fetch(`${API_BASE}/aov/distribution${qs}`);
        const data = await res.json();

        const container = document.getElementById("aovBarList");
        container.innerHTML = "";

        const maxAOV = Math.max(...data.map(d => d.average_aov));
        const scale = 1.2; // tune as needed

        data.forEach(item => {
            const row = document.createElement("div");
            row.classList.add("aov-row", item.platform_name.toLowerCase());

            const barWidth = item.average_aov * scale;

            row.innerHTML = `
                <div class="aov-name">${toTitleCase(item.platform_name)}</div>
                <div class="aov-bar-outer">
                    <div class="aov-bar-inner" style="width:${barWidth}px"></div>
                </div>
                <div class="aov-value">₱${item.average_aov.toFixed(2)}</div>
            `;

            container.appendChild(row);
        });

    } catch (err) {
        console.error("AOV load error:", err);
    }
}
