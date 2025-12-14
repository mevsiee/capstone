// =============================
// Inventory UI Controller
// =============================
document.addEventListener("DOMContentLoaded", () => {

  let inventoryData = [];
  let filteredData = [];
  let currentPage = 1;
  const itemsPerPage = 10;

  // ------------------------------
  // Load Thresholds (localStorage)
  // ------------------------------
  let thresholds = (() => {
    try {
      const t = JSON.parse(localStorage.getItem("thresholds"));
      if (t && Number.isFinite(t.low) && Number.isFinite(t.high)) return t;
    } catch (_) {}
    return { low: 30, high: 70 };
  })();

  // =============================
  // FETCH INVENTORY DATA
  // =============================
  async function fetchInventoryData() {
    try {
      const res = await fetch("http://localhost:5000/api/inventory");
      if (!res.ok) throw new Error("Failed to fetch inventory data");

      const data = await res.json();

      // 🔥 MAP DB ROWS → UI ROWS
      inventoryData = data.map((item) => ({
        name: item.product_name,
        size: item.size || "-",
        color: item.color || "-",
        platform: item.platform || "-",
        price: parseFloat(item.price) || 0,
        cost: parseFloat(item.cost) || 0,
        stock: item.stock === null ? 0 : parseInt(item.stock)
      }));
            
      // 🔥 CLEAR cached filters
      filteredData = [];
      currentPage = 1;

      applyThresholds();
      populateTable(inventoryData);
      populateProductSelector();
    } catch (err) {
      console.error("Inventory fetch error:", err);
      alert("Unable to load inventory data from database.");
    }
  }

  // =============================
  // STOCK LEVEL LOGIC
  // =============================
  function getStockLevelClass(stock) {
    if (stock <= thresholds.low) return "low";
    if (stock > thresholds.high) return "high";
    return "medium";
  }

  function updateStockCounts() {
    const stockCounts = { high: 0, medium: 0, low: 0 };
    const activeData = filteredData.length ? filteredData : inventoryData;

    activeData.forEach(item => {
      stockCounts[getStockLevelClass(item.stock)]++;
    });

    document.querySelector(".stock-card.high .stock-count").textContent = stockCounts.high;
    document.querySelector(".stock-card.medium .stock-count").textContent = stockCounts.medium;
    document.querySelector(".stock-card.low .stock-count").textContent = stockCounts.low;
  }

  // =============================
  // FILTER HANDLING
  // =============================
  const filterBtn = document.querySelector(".filter-btn");
  const filterBtnText = document.querySelector(".filter-btn-text");
  const filterMenu = document.querySelector(".filter-menu");

  let selectedPlatform = null;
  let selectedStock = null;

  filterBtn?.addEventListener("click", () => {
    filterMenu.classList.toggle("active");
  });

  filterMenu?.addEventListener("click", e => {
    const option = e.target.closest(".filter-option");
    if (!option) return;

    const type = option.dataset.type;
    const value = option.dataset.value;

    if (type === "platform") {
      selectedPlatform = selectedPlatform === value ? null : value;
    }
    if (type === "stock") {
      selectedStock = selectedStock === value ? null : value;
    }

    filterMenu.querySelectorAll(".filter-option").forEach(o => o.classList.remove("active"));
    if (selectedPlatform || selectedStock) option.classList.add("active");

    updateFilterButtonLabel();
    applyFilters();
  });

  function updateFilterButtonLabel() {
    const selected = [];
    if (selectedPlatform) selected.push(selectedPlatform);
    if (selectedStock) selected.push(selectedStock + " Stock");

    filterBtnText.textContent = selected.length ? selected.join(" + ") : "Filter";
  }

  function applyFilters() {
    let data = [...inventoryData];

    // platform filter
    if (selectedPlatform) {
      data = data.filter(item => {
        if (!item.platform) return false;
        return item.platform.toLowerCase() === selectedPlatform.toLowerCase();
      });
    }

    // stock filter
    if (selectedStock) {
      data = data.filter(item => {
        return getStockLevelClass(item.stock) === selectedStock;
      });
    }

    filteredData = data;
    currentPage = 1;
    populateTable(data);
    updateStockCounts();
  }

  document.querySelector(".clear-filters")?.addEventListener("click", () => {
    selectedPlatform = null;
    selectedStock = null;
    filteredData = [];

    filterBtnText.textContent = "Filter";
    populateTable(inventoryData);
  });

  // =============================
  // SEARCH BAR
  // =============================
  const searchInput = document.querySelector(".search-bar input");

  searchInput?.addEventListener("input", e => {
    const term = e.target.value.toLowerCase().trim();
    let data = [...inventoryData];

    if (selectedPlatform) {
      data = data.filter(item => item.platform.toLowerCase() === selectedPlatform);
    }

    if (selectedStock) {
      data = data.filter(item => getStockLevelClass(item.stock) === selectedStock);
    }

    if (term) {
      data = data.filter(item =>
        item.name.toLowerCase().includes(term) ||
        item.size.toLowerCase().includes(term) ||
        item.color.toLowerCase().includes(term)
      );
    }

    filteredData = data;
    currentPage = 1;
    populateTable(filteredData);
    updateStockCounts();
  });

  // =============================
  // TABLE + PAGINATION
  // =============================
  function updateProductCount(totalItems) {
    const span = document.getElementById("product-count");
    if (!span) return;

    const start = (currentPage - 1) * itemsPerPage + 1;
    const end = Math.min(currentPage * itemsPerPage, totalItems);

    span.textContent = `Showing ${totalItems ? start : 0}–${end} of ${totalItems} products`;
  }

  function getPaginatedData(data) {
    const start = (currentPage - 1) * itemsPerPage;
    return data.slice(start, start + itemsPerPage);
  }

  function populateTable(data) {
    const tbody = document.querySelector("tbody");
    tbody.innerHTML = "";

    if (!data) data = filteredData.length ? filteredData : inventoryData;

    const totalItems = data.length;
    const pageData = getPaginatedData(data);

    updateProductCount(totalItems);

    if (!totalItems) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#aaa;">No products found.</td></tr>`;
      updatePaginationButtons(totalItems);
      return;
    }

    pageData.forEach(item => {
      const row = document.createElement("tr");
      const stockClass = getStockLevelClass(item.stock);

      row.innerHTML = `
        <td>${item.name}</td>
        <td>${item.size}</td>
        <td>${item.color}</td>
        <td>${item.platform}</td>
        <td>₱ ${item.price.toFixed(2)}</td>
        <td>₱ ${item.cost.toFixed(2)}</td>
        <td><span class="stock-level ${stockClass}">${item.stock} units</span></td>
      `;
      tbody.appendChild(row);
    });

    updatePaginationButtons(totalItems);
  }

  function updatePaginationButtons(total) {
    const back = document.querySelector("#backBtn");
    const next = document.querySelector("#nextBtn");

    const totalPages = Math.ceil(total / itemsPerPage) || 1;

    back.disabled = currentPage <= 1;
    next.disabled = currentPage >= totalPages;
  }

  document.querySelector("#backBtn")?.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      populateTable(filteredData.length ? filteredData : inventoryData);
    }
  });

  document.querySelector("#nextBtn")?.addEventListener("click", () => {
    const data = filteredData.length ? filteredData : inventoryData;
    if (currentPage < Math.ceil(data.length / itemsPerPage)) {
      currentPage++;
      populateTable(data);
    }
  });

  // =============================
  // STOCK THRESHOLD MODAL
  // =============================
  const thresholdsModal = document.getElementById("thresholdsModal");
  const lowInput = document.getElementById("lowThreshold");
  const highInput = document.getElementById("highThreshold");

  document.getElementById("editThresholdsBtn")?.addEventListener("click", () => {
  thresholdsModal.classList.add("active");
  lowInput.value = thresholds.low;
  highInput.value = thresholds.high;
});

  thresholdsModal?.querySelector(".save-btn")?.addEventListener("click", () => {
    const low = parseInt(lowInput.value);
    const high = parseInt(highInput.value);

    if (!Number.isFinite(low) || !Number.isFinite(high) || low >= high) {
      alert("Invalid threshold values.");
      return;
    }

    thresholds = { low, high };
    localStorage.setItem("thresholds", JSON.stringify(thresholds));
    applyThresholds();

    thresholdsModal.classList.remove("active");
  });

  thresholdsModal?.querySelector(".cancel-btn")?.addEventListener("click", () => {
    thresholdsModal.classList.remove("active");
  });

  thresholdsModal?.querySelector(".close-btn")?.addEventListener("click", () => {
      thresholdsModal.classList.remove("active");
  });

  function applyThresholds() {
    document.querySelector(".stock-card.high .stock-description").textContent =
      `Items with ${thresholds.high}+ units in stock`;

    document.querySelector(".stock-card.medium .stock-description").textContent =
      `Items with ${thresholds.low}–${thresholds.high - 1} units in stock`;

    document.querySelector(".stock-card.low .stock-description").textContent =
      `Items with less than ${thresholds.low} units`;

    updateStockCounts();
    populateTable();
  }

  // =============================
  // UPDATE PRODUCT COST MODAL
  // =============================
  const updateCostModal = document.getElementById("updateCostModal");

  // Open Update Product Cost Modal (4th control button)
  document.getElementById("updateCostBtn")?.addEventListener("click", () => {
    updateCostModal.classList.add("active");
  });

  // Close button (X)
  updateCostModal?.querySelector(".close-btn")?.addEventListener("click", () => {
      updateCostModal.classList.remove("active");
  });

  // Cancel button
  updateCostModal?.querySelector(".cancel-btn")?.addEventListener("click", () => {
      updateCostModal.classList.remove("active");
  });

  // Save button
  updateCostModal?.querySelector(".save-btn")?.addEventListener("click", async () => {
    const selector = document.getElementById("productSelector");
    const newCostInput = document.getElementById("newCost");

    const selectedValue = selector.value;
    const newCost = parseFloat(newCostInput.value);

    if (!selectedValue) {
        alert("Please select a product.");
        return;
    }

    if (!Number.isFinite(newCost) || newCost <= 0) {
        alert("Please enter a valid cost.");
        return;
    }

    let payload = {};

    // For "All Products"
    if (selectedValue === "all") {
        payload = { product: "all", platform: null, newCost };
    } else {
        const [productName, platform] = selectedValue.split("|");
        payload = {
            product: productName.trim(),
            platform: platform?.trim() || null,
            newCost
        };
    }

    try {
        const res = await fetch("http://localhost:5000/api/update-cost", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) return alert("Error: " + data.message);

        alert(data.message);
        updateCostModal.classList.remove("active");

        // Refresh inventory
        fetchInventoryData();
    } catch (err) {
        console.error(err);
        alert("Server error updating cost.");
    }
});

  // =============================
  // PRODUCT SELECTOR (Cost Update)
  // =============================
  function populateProductSelector() {
    const selector = document.getElementById("productSelector");
    if (!selector) return;

    selector.innerHTML = `
      <option value="">Select a product...</option>
      <option value="all">All Products</option>
    `;

    const unique = new Map();

    inventoryData.forEach(item => {
      const key = `${item.name.toLowerCase()}|${item.platform}`;
      if (!unique.has(key)) unique.set(key, { name: item.name, platform: item.platform });
    });

    [...unique.values()]
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach(p => {
        const opt = document.createElement("option");
        opt.value = `${p.name}|${p.platform}`;
        opt.textContent = `${p.name} — ${p.platform}`;
        selector.appendChild(opt);
      });
  }

  // =============================
  // INIT
  // =============================
  fetchInventoryData();

});