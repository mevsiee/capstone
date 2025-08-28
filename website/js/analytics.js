// Initialize chart and data
let chart;
let baseData;

// Function to format date
function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

// Function to update metrics
function updateMetrics(data) {
    document.querySelector('.stat-value').textContent = '₱ ' + data.metrics.projected_sales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    document.querySelector('.stat-growth').textContent = `${data.metrics.growth_rate.toFixed(1)}% from current quarter`;
    
    // Update progress circle
    const progressCircle = document.querySelector('.progress-circle');
    const percentage = Math.min(Math.abs(data.metrics.growth_rate), 100);
    progressCircle.style.background = `conic-gradient(#F4B301 ${percentage}%, #333 0%)`;
    document.querySelector('.circle-text').textContent = `${Math.round(percentage)}%`;
}

// Function to update chart
function updateChart(data) {
    const ctx = document.getElementById('trendChart').getContext('2d');
    
    if (chart) {
        chart.destroy();
    }
    
    const actualDates = data.actual.map(d => formatDate(d.date));
    const forecastDates = data.forecast.map(d => formatDate(d.date));
    const actualValues = data.actual.map(d => d.value);
    const forecastValues = data.forecast.map(d => d.value);
    const upperBound = data.forecast.map(d => d.upper);
    const lowerBound = data.forecast.map(d => d.lower);

    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [...actualDates, ...forecastDates],
            datasets: [{
                label: 'Actual Sales',
                data: [...actualValues, ...Array(forecastDates.length).fill(null)],
                borderColor: '#F4B301',
                tension: 0.4,
                borderWidth: 2,
                pointRadius: 0
            },
            {
                label: 'Forecast',
                data: [...Array(actualDates.length).fill(null), ...forecastValues],
                borderColor: '#F4B301',
                borderDash: [5, 5],
                tension: 0.4,
                borderWidth: 2,
                pointRadius: 0
            },
            {
                label: 'Confidence Interval',
                data: [...Array(actualDates.length).fill(null), ...upperBound],
                borderColor: 'rgba(244, 179, 1, 0.2)',
                backgroundColor: 'rgba(244, 179, 1, 0.1)',
                fill: 1,
                tension: 0.4,
                pointRadius: 0
            },
            {
                label: 'Confidence Interval',
                data: [...Array(actualDates.length).fill(null), ...lowerBound],
                borderColor: 'rgba(244, 179, 1, 0.2)',
                tension: 0.4,
                pointRadius: 0,
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: '#333'
                    },
                    ticks: {
                        color: '#666',
                        callback: (value) => '₱' + value.toLocaleString()
                    }
                },
                x: {
                    grid: {
                        color: '#333'
                    },
                    ticks: {
                        color: '#666'
                    }
                }
            }
        }
    });
}

// Fetch initial forecast
async function fetchForecast() {
    try {
        const response = await fetch('https://asia-southeast1-capstone.cloudfunctions.net/api/forecast');
        baseData = await response.json();
        updateChart(baseData);
        updateMetrics(baseData);
    } catch (error) {
        console.error('Error fetching forecast:', error);
    }
}

// Handle sliders
document.querySelectorAll('.slider').forEach(slider => {
    slider.addEventListener('input', async (e) => {
        const value = e.target.value;
        e.target.parentElement.querySelector('.slider-label span:last-child').textContent = value + '%';
        
        // Get both slider values
        const priceAdjustment = document.querySelector('#priceSlider').value;
        const adExpenseAdjustment = document.querySelector('#adExpenseSlider').value;
        
        try {
            const response = await fetch('https://asia-southeast1-capstone.cloudfunctions.net/api/forecast/adjust', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    price_adjustment: parseFloat(priceAdjustment),
                    advertising_adjustment: parseFloat(adExpenseAdjustment)
                })
            });
            
            const adjustedData = await response.json();
            updateChart(adjustedData);
            updateMetrics(adjustedData);
        } catch (error) {
            console.error('Error adjusting forecast:', error);
        }
    });
});

// Handle export buttons
document.querySelector('.export-button:first-child').addEventListener('click', () => {
    // Export to Excel logic
    console.log('Exporting to Excel...');
});

document.querySelector('.export-button:last-child').addEventListener('click', () => {
    // Export to PDF logic
    console.log('Exporting to PDF...');
});

// Initialize forecast on load
fetchForecast();
