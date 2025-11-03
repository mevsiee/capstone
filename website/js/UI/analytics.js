// =====================================================================
//  EShop InventoryIQ - Analytics & Forecasting
//  Clean structured version with gold/amber theme + dynamic KPI updates
// =====================================================================

// ==========================
// 1️⃣ Global Variables
// ==========================
let salesChart, ordersChart;
let _forecast = null;

// ==========================
// 2️⃣ Gradient Utilities
// ==========================
function makeGradient(ctx) {
  const g = ctx.createLinearGradient(0, 0, 0, 300);
  g.addColorStop(0, "#FFD54F"); // bright gold
  g.addColorStop(1, "#F4B301");
  return g;
}

function makeAmber(ctx) {
  const g = ctx.createLinearGradient(0, 0, 0, 300);
  g.addColorStop(0, "#FFB74D"); // darker amber
  g.addColorStop(1, "#FF9800");
  return g;
}

// ==========================
// 3️⃣ Fetch Forecast Data
// ==========================
async function fetchForecast() {
  try {
    // Load instantly from cache if available
    const cachedForecast = window._cachedForecast;
    if (cachedForecast) {
      console.log("⚡ Using cached forecast for instant load");
      _forecast = cachedForecast;
      initSalesTab(cachedForecast);
      initOrdersTab(cachedForecast);
    }

    // Fetch fresh forecast from mock API
    const res = await fetch("http://localhost:3200/api/forecast", { cache: "no-store" });
    const json = await res.json();
    const f = json?.response;
    if (!f) throw new Error("No forecast payload");

    // Cache & update UI
    window._cachedForecast = f;
    _forecast = f;
    initSalesTab(f);
    initOrdersTab(f);

    console.log("✅ Local forecast loaded:", f);
  } catch (e) {
    console.error("❌ Forecast fetch failed:", e);
  }
}

// ==========================
// 4️⃣ Sales Tab Initialization
// ==========================
function initSalesTab(f) {
  const currentSales = f.total_projected_sales * 0.9;
  const nextSales = f.total_projected_sales;
  const growth = Number(f.growth_rate_percent || 0);

  setText("salesSummary", `Sales projected to increase by ${growth.toFixed(1)}% next quarter. Maintain pricing strategy while increasing digital marketing spend.`);
  setText("salesCurrent", `₱ ${Math.round(currentSales).toLocaleString()}`);
  setText("salesNext", `₱ ${Math.round(nextSales).toLocaleString()}`);
  setText("salesGrowth", `+${growth.toFixed(1)}%`);

  // Model validation placeholders
  setText("salesMAE", "45,230");
  setText("salesRMSE", "58,120");
  setText("salesMAPE", "3.2%");

  // Breakdown
  const shopee = sumArray(f.series[0]?.monthly || []);
  const tiktok = sumArray(f.series[1]?.monthly || []);
  const retail = Math.round((shopee + tiktok) * 0.45);
  setText("salesRetail", "₱ " + retail.toLocaleString());
  setText("salesShopee", "₱ " + shopee.toLocaleString());
  setText("salesTiktok", "₱ " + tiktok.toLocaleString());

  renderSalesChart(f.series);
}

// ==========================
// 5️⃣ Orders Tab Initialization
// ==========================
function initOrdersTab(f) {
  const divisor = 50; // sales to orders ratio
  const currentOrders = (f.total_projected_sales / divisor) * 0.9;
  const nextOrders = f.total_projected_sales / divisor;
  const growth = Number(f.growth_rate_percent || 0) + 3;

  setText("ordersSummary", `Order volume expected to grow ${growth.toFixed(1)}% next quarter. Optimize inventory for TikTok & Shopee while minimizing holding costs.`);
  setText("ordersCurrent", Math.round(currentOrders).toLocaleString());
  setText("ordersNext", Math.round(nextOrders).toLocaleString());
  setText("ordersGrowth", `+${growth.toFixed(1)}%`);

  // Model validation placeholders
  setText("ordersMAE", "342");
  setText("ordersRMSE", "428");
  setText("ordersMAPE", "2.8%");

  // Breakdown
  const orderSeries = f.series.map(s => ({
    label: s.label,
    monthly: (s.monthly || []).map(v => Math.round(v / divisor))
  }));
  const shopeeO = sumArray(orderSeries[0]?.monthly || []);
  const tiktokO = sumArray(orderSeries[1]?.monthly || []);
  const retailO = Math.round((shopeeO + tiktokO) * 0.45);
  setText("ordersRetail", retailO.toLocaleString());
  setText("ordersShopee", shopeeO.toLocaleString());
  setText("ordersTiktok", tiktokO.toLocaleString());

  renderOrdersChart(orderSeries);
}

// ==========================
// 6️⃣ Chart Rendering
// ==========================
function renderSalesChart(series) {
  const canvas = document.getElementById("salesChart");
  const ctx = canvas.getContext("2d");
  if (salesChart) salesChart.destroy();

  const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const s1 = (series[0]?.monthly || []).slice(0, 6);
  const s2 = (series[1]?.monthly || []).slice(0, 6);
  const split = 3;
  const grad = makeGradient(ctx);
  const amber = makeAmber(ctx);

  salesChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        { label: "Ecommerce (Current)", data: s1.map((v,i)=>i<split?v:null), borderColor: grad, borderWidth: 2, tension: .35, pointRadius: 0 },
        { label: "Ecommerce (Forecast)", data: s1.map((v,i)=>i>=split?v:null), borderColor: grad, borderWidth: 2, tension: .35, pointRadius: 0, borderDash: [6,3] },
        { label: "Retail (Current)", data: s2.map((v,i)=>i<split?v:null), borderColor: amber, borderWidth: 2, tension: .35, pointRadius: 0 },
        { label: "Retail (Forecast)", data: s2.map((v,i)=>i>=split?v:null), borderColor: amber, borderWidth: 2, tension: .35, pointRadius: 0, borderDash: [6,3] }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: "#fff" } } },
      scales: {
        x: { grid: { color: "#2b2b2b" }, ticks: { color: "#cfcfcf" } },
        y: { grid: { color: "#2b2b2b" }, ticks: { color: "#cfcfcf", callback: v => "₱" + v.toLocaleString() } }
      }
    }
  });
}

function renderOrdersChart(series) {
  const canvas = document.getElementById("ordersChart");
  const ctx = canvas.getContext("2d");
  if (ordersChart) ordersChart.destroy();

  const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const s1 = (series[0]?.monthly || []).slice(0, 6);
  const s2 = (series[1]?.monthly || []).slice(0, 6);
  const split = 3;
  const grad = makeGradient(ctx);
  const amber = makeAmber(ctx);

  ordersChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        { label: "Ecommerce (Current)", data: s1.map((v,i)=>i<split?v:null), borderColor: grad, borderWidth: 2, tension: .35, pointRadius: 0 },
        { label: "Ecommerce (Forecast)", data: s1.map((v,i)=>i>=split?v:null), borderColor: grad, borderWidth: 2, tension: .35, pointRadius: 0, borderDash: [6,3] },
        { label: "Retail (Current)", data: s2.map((v,i)=>i<split?v:null), borderColor: amber, borderWidth: 2, tension: .35, pointRadius: 0 },
        { label: "Retail (Forecast)", data: s2.map((v,i)=>i>=split?v:null), borderColor: amber, borderWidth: 2, tension: .35, pointRadius: 0, borderDash: [6,3] }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: "#fff" } } },
      scales: {
        x: { grid: { color: "#2b2b2b" }, ticks: { color: "#cfcfcf" } },
        y: { grid: { color: "#2b2b2b" }, ticks: { color: "#cfcfcf" } }
      }
    }
  });
}

// Normalize equal heights across sections
function syncLayoutHeights() {
  const grids = document.querySelectorAll(".main-grid");
  grids.forEach(grid => {
    const chart = grid.querySelector(".chart-card");
    const right = grid.querySelector(".right-stack");
    if (chart && right) right.style.height = `${chart.offsetHeight}px`;
  });
}

window.addEventListener("load", syncLayoutHeights);
window.addEventListener("resize", syncLayoutHeights);


// ==========================
// 7️⃣ Slider Logic (Dynamic KPI)
// ==========================
function initSliders() {
  const pairs = [
    ["priceSlider", "priceValue"],
    ["adSlider", "adValue"],
    ["demandSlider", "demandValue"],
    ["inventorySlider", "inventoryValue"]
  ];

  pairs.forEach(([sid, vid]) => {
    const s = document.getElementById(sid);
    const v = document.getElementById(vid);
    if (!s || !v) return;

    s.addEventListener("input", e => {
      v.textContent = `${e.target.value}%`;
      if (!_forecast) return;

      const price = parseFloat(document.getElementById("priceSlider")?.value || 0);
      const ad = parseFloat(document.getElementById("adSlider")?.value || 0);
      const demand = parseFloat(document.getElementById("demandSlider")?.value || 0);
      const inv = parseFloat(document.getElementById("inventorySlider")?.value || 0);

      const salesFactor = 1 + (price + ad) / 200;
      updateSalesKPIs(_forecast, salesFactor);
      scaleSalesChart(_forecast, salesFactor);

      const ordersFactor = 1 + (demand + inv) / 200;
      updateOrdersKPIs(_forecast, ordersFactor);
      scaleOrdersChart(_forecast, ordersFactor);
    });
  });
}

// ==========================
// 8️⃣ KPI Update Helpers
// ==========================
function updateSalesKPIs(f, factor) {
  const current = f.total_projected_sales * 0.9 * factor;
  const next = f.total_projected_sales * factor;
  const growth = Number(f.growth_rate_percent || 0) * factor;

  setText("salesCurrent", `₱ ${Math.round(current).toLocaleString()}`);
  setText("salesNext", `₱ ${Math.round(next).toLocaleString()}`);
  setText("salesGrowth", `${growth.toFixed(1)}%`);
}

function scaleSalesChart(f, factor) {
  const s = f.series.map(x => ({ ...x, monthly: x.monthly.map(v => Math.round(v * factor)) }));
  renderSalesChart(s);
}

function updateOrdersKPIs(f, factor) {
  const divisor = 50;
  const current = (f.total_projected_sales / divisor) * 0.9 * factor;
  const next = (f.total_projected_sales / divisor) * factor;
  const growth = (Number(f.growth_rate_percent || 0) + 3) * factor;

  setText("ordersCurrent", Math.round(current).toLocaleString());
  setText("ordersNext", Math.round(next).toLocaleString());
  setText("ordersGrowth", `${growth.toFixed(1)}%`);
}

function scaleOrdersChart(f, factor) {
  const divisor = 50;
  const s = f.series.map(x => ({ ...x, monthly: x.monthly.map(v => Math.round(v / divisor * factor)) }));
  renderOrdersChart(s);
}

// ==========================
// 9️⃣ Utilities
// ==========================
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function sumArray(arr) {
  return arr.reduce((a, b) => a + (+b || 0), 0);
}

// ==========================
// 🔟 Tabs
// ==========================
document.querySelectorAll(".tab-button").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    const tab = btn.dataset.tab;
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
    document.getElementById(`${tab}-tab`).classList.add("active");
  });
});

// ==========================
// 11️⃣ Initialize
// ==========================
window.addEventListener("DOMContentLoaded", () => {
  fetchForecast();
  initSliders();
});
