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
const closeBtn = document.querySelector('.close-btn');
const cancelBtn = document.querySelector('.cancel-btn');
const saveBtn = document.querySelector('.save-btn');

thresholdBtn.addEventListener('click', () => {
    modal.classList.add('active');
    // Set current values
    document.querySelector('.threshold-input:first-child input').value = thresholds.low;
    document.querySelector('.threshold-input:last-child input').value = thresholds.high;
});

function closeModal() {
    modal.classList.remove('active');
}

closeBtn.addEventListener('click', closeModal);
cancelBtn.addEventListener('click', closeModal);

saveBtn.addEventListener('click', () => {
    const lowThreshold = parseInt(document.querySelector('.threshold-input:first-child input').value);
    const highThreshold = parseInt(document.querySelector('.threshold-input:last-child input').value);
    
    if (lowThreshold < highThreshold) {
        thresholds.low = lowThreshold;
        thresholds.high = highThreshold;
        updateStockCounts();
        populateTable();
        closeModal();
    } else {
        alert('High threshold must be greater than low threshold');
    }
});

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    updateStockCounts();
    populateTable();
});
