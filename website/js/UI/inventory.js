// Sample inventory data
const inventoryData = [
    {
        name: 'ASYMMETRICAL POLO',
        sku: '17293983715580450',
        platform: 'Shopee',
        price: 125.00,
        cost: 100.00,
        stock: 85
    },
    {
        name: 'DIAMOND T-SHIRT',
        sku: '17293983715580451',
        platform: 'TikTok Shop',
        price: 125.00,
        cost: 100.00,
        stock: 45
    },
    {
        name: 'KNITTED POLO',
        sku: '17293983715580452',
        platform: 'Shopee',
        price: 125.00,
        cost: 100.00,
        stock: 10
    },
    // Add more items here
];

// Stock threshold values
let thresholds = {
    low: 30,
    high: 70
};

// Function to get stock level class
function getStockLevelClass(stock) {
    if (stock <= thresholds.low) return 'low';
    if (stock > thresholds.high) return 'high';
    return 'medium';
}

// Function to update stock counts in cards
function updateStockCounts() {
    const stockCounts = {
        high: 0,
        medium: 0,
        low: 0
    };

    inventoryData.forEach(item => {
        const level = getStockLevelClass(item.stock);
        stockCounts[level]++;
    });

    document.querySelector('.stock-card.high .stock-count').textContent = stockCounts.high;
    document.querySelector('.stock-card.medium .stock-count').textContent = stockCounts.medium;
    document.querySelector('.stock-card.low .stock-count').textContent = stockCounts.low;
}

// Function to populate table
function populateTable(data = inventoryData) {
    const tbody = document.querySelector('tbody');
    tbody.innerHTML = '';

    data.forEach(item => {
        const row = document.createElement('tr');
        const stockLevel = getStockLevelClass(item.stock);
        
        row.innerHTML = `
            <td>${item.name}</td>
            <td>${item.sku}</td>
            <td>${item.platform}</td>
            <td>₱ ${item.price.toFixed(2)}</td>
            <td>₱ ${item.cost.toFixed(2)}</td>
            <td><span class="stock-level ${stockLevel}">${item.stock} units</span></td>
        `;
        
        tbody.appendChild(row);
    });
}

// Search functionality
const searchInput = document.querySelector('.search-bar input');
searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filteredData = inventoryData.filter(item => 
        item.name.toLowerCase().includes(searchTerm) ||
        item.sku.toLowerCase().includes(searchTerm) ||
        item.platform.toLowerCase().includes(searchTerm)
    );
    populateTable(filteredData);
});

// Modal functionality
const thresholdBtn = document.querySelector('.control-btn:nth-child(3)');
const modal = document.getElementById('thresholdsModal');
// Threshold Modal functionality
const thresholdCloseBtn = document.querySelector('#thresholdsModal .close-btn');
const thresholdCancelBtn = document.querySelector('#thresholdsModal .cancel-btn');
const thresholdSaveBtn = document.querySelector('#thresholdsModal .save-btn');

thresholdBtn.addEventListener('click', () => {
    modal.classList.add('active');
    // Set current values
    document.querySelector('.threshold-input:first-child input').value = thresholds.low;
    document.querySelector('.threshold-input:last-child input').value = thresholds.high;
});

function closeThresholdModal() {
    modal.classList.remove('active');
}

thresholdCloseBtn.addEventListener('click', closeThresholdModal);
thresholdCancelBtn.addEventListener('click', closeThresholdModal);

thresholdSaveBtn.addEventListener('click', () => {
    const lowThreshold = parseInt(document.querySelector('.threshold-input:first-child input').value);
    const highThreshold = parseInt(document.querySelector('.threshold-input:last-child input').value);
    
    if (lowThreshold < highThreshold) {
        thresholds.low = lowThreshold;
        thresholds.high = highThreshold;
        updateStockCounts();
        populateTable();
        closeThresholdModal();
    } else {
        alert('High threshold must be greater than low threshold');
    }
});

// Product Cost Update Modal functionality
const updateCostBtn = document.querySelector('.control-btn:nth-child(4)');
const updateCostModal = document.getElementById('updateCostModal');
const productList = document.querySelector('.product-list');
const selectAllCheckbox = document.getElementById('selectAllProducts');
const selectedCountSpan = document.querySelector('.selected-count');
const newCostInput = document.getElementById('newCost');
const currentAverageCost = document.querySelector('.summary-item:first-child .value');
const newAverageCost = document.querySelector('.summary-item:nth-child(2) .value');
const costDifference = document.querySelector('.summary-item:last-child .value');

function populateProductList() {
    productList.innerHTML = '';
    inventoryData.forEach(item => {
        const productItem = document.createElement('div');
        productItem.className = 'product-item';
        productItem.innerHTML = `
            <div class="product-info">
                <label class="checkbox-container">
                    <input type="checkbox" class="product-checkbox" data-sku="${item.sku}">
                    <span class="checkmark"></span>
                </label>
                <div class="product-details">
                    <span class="product-name">${item.name}</span>
                    <span class="product-sku">${item.sku}</span>
                </div>
            </div>
            <span class="current-cost">₱${item.cost.toFixed(2)}</span>
        `;
        productList.appendChild(productItem);
    });
}

function updateSelectedCount() {
    const selectedCount = document.querySelectorAll('.product-checkbox:checked').length;
    selectedCountSpan.textContent = `${selectedCount} Selected`;
}

function calculateAverageCost() {
    const selectedProducts = Array.from(document.querySelectorAll('.product-checkbox:checked'))
        .map(checkbox => inventoryData.find(item => item.sku === checkbox.dataset.sku));
    
    if (selectedProducts.length === 0) return;

    const currentAvg = selectedProducts.reduce((sum, item) => sum + item.cost, 0) / selectedProducts.length;
    const newCost = parseFloat(newCostInput.value) || currentAvg;
    const difference = newCost - currentAvg;

    currentAverageCost.textContent = `₱${currentAvg.toFixed(2)}`;
    newAverageCost.textContent = `₱${newCost.toFixed(2)}`;
    costDifference.textContent = `₱${Math.abs(difference).toFixed(2)}`;
    costDifference.className = `value ${difference > 0 ? 'positive' : difference < 0 ? 'negative' : 'neutral'}`;
}

updateCostBtn.addEventListener('click', () => {
    updateCostModal.classList.add('active');
    populateProductList();
    updateSelectedCount();
    calculateAverageCost();
});

selectAllCheckbox.addEventListener('change', (e) => {
    document.querySelectorAll('.product-checkbox').forEach(checkbox => {
        checkbox.checked = e.target.checked;
    });
    updateSelectedCount();
    calculateAverageCost();
});

productList.addEventListener('change', (e) => {
    if (e.target.classList.contains('product-checkbox')) {
        selectAllCheckbox.checked = document.querySelectorAll('.product-checkbox:not(:checked)').length === 0;
        updateSelectedCount();
        calculateAverageCost();
    }
});

newCostInput.addEventListener('input', calculateAverageCost);

// Bulk action buttons
document.querySelector('.bulk-actions .increase-btn').addEventListener('click', () => {
    const selectedProducts = Array.from(document.querySelectorAll('.product-checkbox:checked'))
        .map(checkbox => inventoryData.find(item => item.sku === checkbox.dataset.sku));
    
    if (selectedProducts.length === 0) return;
    
    const avgCost = selectedProducts.reduce((sum, item) => sum + item.cost, 0) / selectedProducts.length;
    newCostInput.value = (avgCost * 1.1).toFixed(2);
    calculateAverageCost();
});

document.querySelector('.bulk-actions .decrease-btn').addEventListener('click', () => {
    const selectedProducts = Array.from(document.querySelectorAll('.product-checkbox:checked'))
        .map(checkbox => inventoryData.find(item => item.sku === checkbox.dataset.sku));
    
    if (selectedProducts.length === 0) return;
    
    const avgCost = selectedProducts.reduce((sum, item) => sum + item.cost, 0) / selectedProducts.length;
    newCostInput.value = (avgCost * 0.9).toFixed(2);
    calculateAverageCost();
});

document.querySelector('.bulk-actions .custom-btn').addEventListener('click', () => {
    const percentage = prompt('Enter percentage change (e.g., 15 for +15% or -15 for -15%):', '0');
    if (percentage === null) return;
    
    const selectedProducts = Array.from(document.querySelectorAll('.product-checkbox:checked'))
        .map(checkbox => inventoryData.find(item => item.sku === checkbox.dataset.sku));
    
    if (selectedProducts.length === 0) return;
    
    const avgCost = selectedProducts.reduce((sum, item) => sum + item.cost, 0) / selectedProducts.length;
    newCostInput.value = (avgCost * (1 + parseFloat(percentage) / 100)).toFixed(2);
    calculateAverageCost();
});

// Update costs
document.querySelector('#updateCostModal .save-btn').addEventListener('click', () => {
    const newCost = parseFloat(newCostInput.value);
    if (isNaN(newCost) || newCost < 0) {
        alert('Please enter a valid cost');
        return;
    }

    const selectedSkus = Array.from(document.querySelectorAll('.product-checkbox:checked'))
        .map(checkbox => checkbox.dataset.sku);

    inventoryData.forEach(item => {
        if (selectedSkus.includes(item.sku)) {
            item.cost = newCost;
        }
    });

    populateTable();
    updateCostModal.classList.remove('active');
});

document.querySelector('#updateCostModal .close-btn').addEventListener('click', () => {
    updateCostModal.classList.remove('active');
});

document.querySelector('#updateCostModal .cancel-btn').addEventListener('click', () => {
    updateCostModal.classList.remove('active');
});

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    updateStockCounts();
    populateTable();
});
