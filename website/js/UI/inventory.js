// ✅ inventory.js — pagination + search + editable thresholds (localStorage)
document.addEventListener("DOMContentLoaded", () => {
  let inventoryData = [];
  let currentPage = 1;
  const itemsPerPage = 15;

  // Keep this BEFORE any usage
  let filteredData = [];

  // Load thresholds from localStorage (fallback to defaults)
  let thresholds = (() => {
    try {
      const t = JSON.parse(localStorage.getItem("thresholds"));
      if (t && Number.isFinite(t.low) && Number.isFinite(t.high)) return t;
    } catch (_) {}
    return { low: 30, high: 70 };
  })();

  // ------------------------------
  // FETCH INVENTORY DATA
  // ------------------------------
  async function fetchInventoryData() {
    try {
      const res = await fetch("/api/inventory");
      if (!res.ok) throw new Error("Failed to fetch inventory data");
      const data = await res.json();

      // Normalize backend fields
      inventoryData = data.map((item) => ({
        name: item.product_name,
        size: item.size || "UNKNOWN",
        color: item.color || "UNKNOWN",
        platform: item.platform || "UNKNOWN",
        price: parseFloat(item.price) || 0,
        cost: parseFloat(item.cost) || 0,
        stock: parseInt(item.stock_count) || 0,
      }));

      // ✅ Apply thresholds and render
      applyThresholds();

      // ✅ Populate product selector only AFTER data is loaded
      populateProductSelector();
    } catch (err) {
      console.error("Error fetching inventory:", err);
      alert("Unable to load inventory data from database.");
    }
  }

  // ------------------------------
  // STOCK LOGIC
  // ------------------------------
  function getStockLevelClass(stock) {
    if (stock <= thresholds.low) return "low";
    if (stock > thresholds.high) return "high";
    return "medium";
  }

  function updateStockCounts() {
    const stockCounts = { high: 0, medium: 0, low: 0 };
    (filteredData.length ? filteredData : inventoryData).forEach((item) => {
      stockCounts[getStockLevelClass(item.stock)]++;
    });

    const highEl = document.querySelector(".stock-card.high .stock-count");
    const medEl = document.querySelector(".stock-card.medium .stock-count");
    const lowEl = document.querySelector(".stock-card.low .stock-count");
    if (highEl) highEl.textContent = stockCounts.high;
    if (medEl) medEl.textContent = stockCounts.medium;
    if (lowEl) lowEl.textContent = stockCounts.low;
  }

// ------------------------------
// FILTER LOGIC (Platform + Stock)
// ------------------------------
const filterBtn = document.querySelector(".filter-btn");
const filterBtnText = document.querySelector(".filter-btn-text");
const filterMenu = document.querySelector(".filter-menu");
let selectedPlatform = null;
let selectedStock = null;

// Toggle dropdown
filterBtn?.addEventListener("click", () => {
  filterMenu.classList.toggle("active");
});

// Handle option selection
filterMenu?.addEventListener("click", (e) => {
  const option = e.target.closest(".filter-option");
  if (!option) return;

  const type = option.dataset.type;
  const value = option.dataset.value;

  // Toggle off if already selected
  if ((type === "platform" && selectedPlatform === value) ||
      (type === "stock" && selectedStock === value)) {
    if (type === "platform") selectedPlatform = null;
    if (type === "stock") selectedStock = null;
    option.classList.remove("active");
  } else {
    if (type === "platform") selectedPlatform = value;
    if (type === "stock") selectedStock = value;

    // Update active states
    document.querySelectorAll(`.filter-option[data-type='${type}']`).forEach(opt =>
      opt.classList.remove("active")
    );
    option.classList.add("active");
  }

  updateFilterButtonLabel();
  applyFilters();

  // Close menu
  setTimeout(() => filterMenu.classList.remove("active"), 150);
});

function updateFilterButtonLabel() {
  const selectedFilters = [];

  if (selectedPlatform) {
    selectedFilters.push(selectedPlatform === "ecommerce" ? "E-commerce" : "Retail");
  }
  if (selectedStock) {
    selectedFilters.push(
      selectedStock.charAt(0).toUpperCase() + selectedStock.slice(1) + " Stock"
    );
  }

  if (selectedFilters.length === 0) {
    filterBtnText.textContent = "Filter";
  } else if (selectedFilters.length === 1) {
    filterBtnText.textContent = selectedFilters[0];
  } else {
    filterBtnText.textContent = "Multiple Filters";
  }
}

function applyFilters() {
  let data = [...inventoryData];

  // Platform filter
  if (selectedPlatform) {
    data = data.filter(item => {
      const platformNormalized = item.platform.toLowerCase().replace(/[-\s]/g, "");
      const filterNormalized = selectedPlatform.toLowerCase().replace(/[-\s]/g, "");
      return platformNormalized.includes(filterNormalized);
    });
  }

  // Stock filter
  if (selectedStock) {
    data = data.filter(item => {
      const level = getStockLevelClass(item.stock);
      return level === selectedStock;
    });
  }

  currentPage = 1;
  populateTable(data);
}

// ------------------------------
// CLEAR FILTERS FUNCTION
// ------------------------------
const clearFiltersBtn = document.querySelector(".clear-filters");

clearFiltersBtn?.addEventListener("click", () => {
  // Reset selected filters
  selectedPlatform = null;
  selectedStock = null;

  // Remove all active checkamarks
  document.querySelectorAll(".filter-option").forEach(opt => opt.classList.remove("active"));

  // Reset button label
  filterBtnText.textContent = "Filter";

  // Re-populate full inventory
  populateTable(inventoryData);

  // Close menu
  filterMenu.classList.remove("active");
});

// ------------------------------
// TABLE + PAGINATION
// ------------------------------
function updateProductCount(totalItems) {
    const countSpan = document.getElementById("product-count");
    if (!countSpan) return;

    const start = (currentPage - 1) * itemsPerPage + 1;
    const end = Math.min(currentPage * itemsPerPage, totalItems);
    // Show counts for the CURRENT dataset (filtered or full)
    countSpan.textContent = `Showing ${totalItems === 0 ? 0 : start}–${end} of ${totalItems} products`;
  }

  function getPaginatedData(data) {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return data.slice(start, end);
  }

  function populateTable(data = (filteredData.length ? filteredData : inventoryData)) {
    const tbody = document.querySelector("tbody");
    tbody.innerHTML = "";

    const totalItems = data.length;
    const paginated = getPaginatedData(data);
    updateProductCount(totalItems);

    if (!totalItems) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center; color:#aaa;">
            No products match your search.
          </td>
        </tr>`;
      updatePaginationButtons(totalItems);
      return;
    }

    paginated.forEach((item) => {
      const row = document.createElement("tr");
      const stockLevel = getStockLevelClass(item.stock);
      row.innerHTML = `
        <td>${item.name}</td>
        <td>${item.size}</td>
        <td>${item.color}</td>
        <td>${item.platform}</td>
        <td>₱ ${item.price.toFixed(2)}</td>
        <td>₱ ${item.cost.toFixed(2)}</td>
        <td><span class="stock-level ${stockLevel}">${item.stock} units</span></td>
      `;
      tbody.appendChild(row);
    });

    updatePaginationButtons(totalItems);
  }

  function updatePaginationButtons(totalItems) {
    const backBtn = document.querySelector("#backBtn");
    const nextBtn = document.querySelector("#nextBtn");

    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
    if (backBtn) backBtn.disabled = currentPage <= 1;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
  }

  const backBtn = document.querySelector("#backBtn");
  const nextBtn = document.querySelector("#nextBtn");

  backBtn?.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      populateTable();
    }
  });

  nextBtn?.addEventListener("click", () => {
    const data = filteredData.length ? filteredData : inventoryData;
    const totalPages = Math.ceil(data.length / itemsPerPage);
    if (currentPage < totalPages) {
      currentPage++;
      populateTable();
    }
  });

// ------------------------------
// SEARCH BAR (respects filters)
// ------------------------------
const searchInput = document.querySelector(".search-bar input");

searchInput?.addEventListener("input", (e) => {
  const searchTerm = e.target.value.toLowerCase().trim();

  let data = [...inventoryData];

  // Apply platform filter if active
  if (selectedPlatform) {
    data = data.filter(item => {
      const platformNormalized = item.platform.toLowerCase().replace(/[-\s]/g, "");
      const filterNormalized = selectedPlatform.toLowerCase().replace(/[-\s]/g, "");
      return platformNormalized.includes(filterNormalized);
    });
  }

  // Apply stock filter if active
  if (selectedStock) {
    data = data.filter(item => getStockLevelClass(item.stock) === selectedStock);
  }

  // Apply search term
  if (searchTerm) {
    data = data.filter(item =>
      item.name.toLowerCase().includes(searchTerm) ||
      (item.size && item.size.toLowerCase().includes(searchTerm)) ||
      (item.color && item.color.toLowerCase().includes(searchTerm)) ||
      item.platform.toLowerCase().includes(searchTerm)
    );
  }

  filteredData = data;
  currentPage = 1;
  populateTable(filteredData);
  updateStockCounts();
});

  // ------------------------------
  // STOCK THRESHOLD SETTINGS (modal)
  // ------------------------------
  const thresholdBtn = document.querySelector(".control-btn:nth-child(3)");
  const thresholdsModal = document.getElementById("thresholdsModal");
  const thresholdClose = thresholdsModal?.querySelector(".close-btn");
  const thresholdCancel = thresholdsModal?.querySelector(".cancel-btn");
  const thresholdSave = thresholdsModal?.querySelector(".save-btn");
  const lowThresholdInput = document.getElementById("lowThreshold");
  const highThresholdInput = document.getElementById("highThreshold");

  function applyThresholds() {
    // Update the stock card descriptions dynamically
    const highDesc = document.querySelector(".stock-card.high .stock-description");
    const medDesc  = document.querySelector(".stock-card.medium .stock-description");
    const lowDesc  = document.querySelector(".stock-card.low .stock-description");

    if (highDesc) highDesc.textContent = `Items with ${thresholds.high}+ units in stock`;
    if (medDesc)  medDesc.textContent  = `Items with ${thresholds.low}–${thresholds.high - 1} units in stock`;
    if (lowDesc)  lowDesc.textContent  = `Items with less than ${thresholds.low} units`;

    updateStockCounts();
    populateTable();
  }

  thresholdBtn?.addEventListener("click", () => {
    thresholdsModal?.classList.add("active");
    if (lowThresholdInput)  lowThresholdInput.value  = thresholds.low;
    if (highThresholdInput) highThresholdInput.value = thresholds.high;
  });

  function closeThresholdModal() {
    thresholdsModal?.classList.remove("active");
  }

  thresholdClose?.addEventListener("click", closeThresholdModal);
  thresholdCancel?.addEventListener("click", closeThresholdModal);

  thresholdSave?.addEventListener("click", () => {
    const lowVal = parseInt(lowThresholdInput?.value, 10);
    const highVal = parseInt(highThresholdInput?.value, 10);

    if (!Number.isFinite(lowVal) || !Number.isFinite(highVal)) {
      alert("Please enter valid numbers.");
      return;
    }
    if (lowVal >= highVal) {
      alert("High threshold must be greater than low threshold.");
      return;
    }

    thresholds = { low: lowVal, high: highVal };
    localStorage.setItem("thresholds", JSON.stringify(thresholds)); // persist locally
    applyThresholds();
    closeThresholdModal();
  });

// ------------------------------
// UPDATE PRODUCT COST MODAL
// ------------------------------
const updateCostBtn = document.querySelector(".control-btn:nth-child(4)");
const updateCostModal = document.getElementById("updateCostModal");
const updateCostClose = updateCostModal?.querySelector(".close-btn");
const updateCostCancel = updateCostModal?.querySelector(".cancel-btn");
const updateCostSave = updateCostModal?.querySelector(".save-btn");
const productSelector = document.getElementById("productSelector");
const newCostInput = document.getElementById("newCost");

// Open modal
updateCostBtn?.addEventListener("click", () => {
  updateCostModal.classList.add("active");
});

// Close modal
function closeCostModal() {
  updateCostModal.classList.remove("active");
}
updateCostClose?.addEventListener("click", closeCostModal);
updateCostCancel?.addEventListener("click", closeCostModal);

// Save new cost
updateCostSave?.addEventListener("click", async () => {
  const selectedValue = productSelector.value;
  const newCost = parseFloat(newCostInput.value);

  if (!selectedValue) {
    alert("Please select a product.");
    return;
  }
  if (isNaN(newCost) || newCost <= 0) {
    alert("Please enter a valid cost value.");
    return;
  }

  // 🧩 Split product name and platform
  let product = selectedValue;
  let platform = null;

  if (selectedValue.includes("|")) {
    [product, platform] = selectedValue.split("|");
  }

  try {
    const res = await fetch("/api/update-cost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product, platform, newCost }),
    });

    const result = await res.json();

    if (res.ok) {
      alert(result.message || "✅ Cost updated successfully!");
      closeCostModal();
      fetchInventoryData(); // refresh table
    } else {
      alert(result.message || "❌ Failed to update cost.");
    }
  } catch (err) {
    console.error("Error updating product cost:", err);
    alert("An error occurred while updating product cost.");
  }
});

// ------------------------------
// DOWNLOAD INVENTORY MODAL
// ------------------------------
const downloadBtn = document.getElementById("downloadBtn");
const downloadModal = document.getElementById("downloadModal");
const downloadClose = downloadModal?.querySelector(".close-btn");
const downloadCancel = downloadModal?.querySelector(".cancel-btn");
const downloadSave = downloadModal?.querySelector(".save-btn");

// ✅ Open modal
downloadBtn?.addEventListener("click", () => {
  downloadModal.classList.add("active");
});

// ✅ Close modal helper
function closeDownloadModal() {
  downloadModal.classList.remove("active");
}

// ✅ Close via "×" and "Cancel"
downloadClose?.addEventListener("click", closeDownloadModal);
downloadCancel?.addEventListener("click", closeDownloadModal);

// ✅ Checkbox visual but radio logic
document.querySelectorAll(".download-option").forEach((box) => {
  box.addEventListener("change", (e) => {
    if (e.target.checked) {
      // uncheck all others
      document.querySelectorAll(".download-option").forEach((other) => {
        if (other !== e.target) other.checked = false;
      });
    } else {
      // prevent both from being unchecked
      e.target.checked = true;
    }
  });
});

// ✅ Handle download click
downloadSave?.addEventListener("click", () => {
  const allChecked = document.getElementById("downloadAll")?.checked;
  const currentChecked = document.getElementById("downloadCurrent")?.checked;

  if (!allChecked && !currentChecked) {
    alert("Please select which records to download.");
    return;
  }

  // determine dataset
  let dataToExport = [];
  if (allChecked) {
    dataToExport = inventoryData;
  } else if (currentChecked) {
    dataToExport = filteredData.length ? filteredData : inventoryData;
  }

  if (!dataToExport?.length) {
    alert("No data available to export.");
    closeDownloadModal();
    return;
  }

  // format data for Excel
  const exportRows = dataToExport.map((item) => ({
    "Product Name": item.name,
    "Size": item.size,
    "Color": item.color,
    "Platform": item.platform,
    "Price (₱)": item.price.toFixed(2),
    "Cost (₱)": item.cost.toFixed(2),
    "Stock Count": item.stock,
  }));

  // create workbook
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(exportRows);
  XLSX.utils.book_append_sheet(wb, ws, "Inventory");

  // filename
  const dateStr = new Date().toISOString().split("T")[0];
  XLSX.writeFile(wb, `Inventory_Export_${dateStr}.xlsx`);

  closeDownloadModal();
});

// ------------------------------
// POPULATE PRODUCT SELECTOR
// ------------------------------
function populateProductSelector() {
  const selector = document.getElementById("productSelector");
  if (!selector) return;

  // Clear existing options
  selector.innerHTML = `
    <option value="">Select a product...</option>
    <option value="all">All Products</option>
  `;

  // ✅ Combine name + platform as a unique key
  const uniqueProducts = new Map();

  inventoryData.forEach(item => {
    const key = `${item.name.trim().toLowerCase()}|${item.platform}`;
    if (!uniqueProducts.has(key)) {
      uniqueProducts.set(key, {
        name: item.name.trim(),
        platform: item.platform
      });
    }
  });

  // Sort alphabetically by product name, then platform
  const sortedProducts = Array.from(uniqueProducts.values()).sort((a, b) => {
    const nameCompare = a.name.localeCompare(b.name);
    return nameCompare !== 0 ? nameCompare : a.platform.localeCompare(b.platform);
  });

  // Add options
  sortedProducts.forEach(({ name, platform }) => {
    const option = document.createElement("option");
    option.value = `${name}|${platform}`; // keep both in the value
    option.textContent = `${name} — ${platform}`;
    selector.appendChild(option);
  });
}

  // ------------------------------
  // INIT
  // ------------------------------
    fetchInventoryData(); // ✅ now safely populates selector after data arrives
});