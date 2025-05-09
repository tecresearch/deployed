
// WebSocket connection
const ws = new WebSocket('wss://smart-farming-v1.onrender.com');
const sensorGrid = document.getElementById('sensorGrid');
const sensorChartCanvas = document.getElementById('sensorChart');
const graphModal = document.getElementById('graphModal');
const modalTitle = document.getElementById('modalTitle');
const modalSubtitle = document.getElementById('modalSubtitle');
const closeModal = document.getElementById('closeModal');

// Stats elements
const activeSensors = document.getElementById('activeSensors');
const alertsCount = document.getElementById('alertsCount');
const lastUpdated = document.getElementById('lastUpdated');
const statusText  =document.getElementById('statusText');
const connectionStatus=document.getElementById('connectionStatus');
const dataPoints = document.getElementById('dataPoints');

let sensors = {};
let selectedSensorId = null;
let sensorChart = null;
let totalDataPoints = 0;

// Initialize Chart.js
function initChart() {
    const ctx = sensorChartCanvas.getContext('2d');
    sensorChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Value',
                data: [],
                borderColor: '#a29bfe',
                backgroundColor: 'rgba(108, 92, 231, 0.1)',
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#6c5ce7',
                pointRadius: 3,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(32, 32, 35, 0.9)',
                    titleColor: '#a29bfe',
                    bodyColor: '#f5f6fa',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    padding: 12,
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)'
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)'
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    });
}

// WebSocket event handlers
ws.onopen = function() {
    console.log('WebSocket connection established');
    lastUpdated.textContent = 'Connected';
    statusText.textContent = 'Connected';
    connectionStatus.style.backgroundColor='green';
};

ws.onmessage = function(event) {
    try {
        const data = JSON.parse(event.data);
        const sensorId = data.sensorId;
        const timestamp = new Date().toLocaleTimeString();
        totalDataPoints++;
        dataPoints.textContent = totalDataPoints.toLocaleString();
        lastUpdated.textContent = 'Just now';
        
        // Store sensor data
        if (!sensors[sensorId]) {
            sensors[sensorId] = {
                id: sensorId,
                type: determineSensorType(data),
                values: [],
                lastValue: 0,
                lastUpdated: timestamp,
                unit: getUnitForType(determineSensorType(data))
            };
            
            // Add new sensor card
            addSensorCard(sensors[sensorId]);
            activeSensors.textContent = Object.keys(sensors).length;
        }
        
        // Update sensor data
        const value = getMainValue(data, sensors[sensorId].type);
        sensors[sensorId].lastValue = value;
        sensors[sensorId].lastUpdated = timestamp;
        
        // Keep only the last 50 readings
        if (sensors[sensorId].values.length >= 50) {
            sensors[sensorId].values.shift();
        }
        sensors[sensorId].values.push({
            value: value,
            timestamp: timestamp
        });
        
        // Update UI
        updateSensorCard(sensorId);
        
        // If this is the selected sensor, update the chart
        if (sensorId === selectedSensorId) {
            updateChart();
        }
        
        // Check for alerts
        checkAlerts(sensorId, value, sensors[sensorId].type);
        
    } catch (e) {
        console.error('Error processing WebSocket message:', e);
    }
};

ws.onclose = function() {
    console.log('WebSocket connection closed');
    lastUpdated.textContent = 'Disconnected';
};

// Alert thresholds
const alertThresholds = {
    temperature: { min: 10, max: 35 },
    humidity: { min: 30, max: 80 },
    soil: { min: 20, max: 90 },
    light: { min: 10, max: 1000 }
};

let alertCount = 0;

function checkAlerts(sensorId, value, type) {
    const thresholds = alertThresholds[type];
    if (!thresholds) return;
    
    if (value < thresholds.min || value > thresholds.max) {
        // Only count new alerts
        if (!sensors[sensorId].alertTriggered) {
            alertCount++;
            alertsCount.textContent = alertCount;
            sensors[sensorId].alertTriggered = true;
            
            // Highlight card
            const card = document.getElementById(`card-${sensorId}`);
            if (card) {
                card.classList.add('alert');
                card.style.animation = 'pulse 2s infinite';
            }
        }
    } else if (sensors[sensorId].alertTriggered) {
        alertCount--;
        alertsCount.textContent = alertCount;
        sensors[sensorId].alertTriggered = false;
        
        // Remove highlight
        const card = document.getElementById(`card-${sensorId}`);
        if (card) {
            card.classList.remove('alert');
            card.style.animation = '';
        }
    }
}

// Helper functions
function determineSensorType(data) {
    if (data.temperature !== undefined) return 'temperature';
    if (data.humidity !== undefined) return 'humidity';
    if (data.soilMoisture !== undefined) return 'soil';
    if (data.lightLevel !== undefined) return 'light';
    return 'unknown';
}

function getMainValue(data, type) {
    switch(type) {
        case 'temperature': return data.temperature;
        case 'humidity': return data.humidity;
        case 'soil': return data.soilMoisture;
        case 'light': return data.lightLevel;
        default: return 0;
    }
}

function getUnitForType(type) {
    switch(type) {
        case 'temperature': return '°C';
        case 'humidity': return '%';
        case 'soil': return '%';
        case 'light': return 'lux';
        default: return '';
    }
}

// UI functions
function addSensorCard(sensor) {
    const card = document.createElement('div');
    card.className = `sensor-card ${sensor.type}`;
    card.id = `card-${sensor.id}`;
    card.innerHTML = `
        <div class="sensor-header">
            <div class="sensor-id">${sensor.id}</div>
            <div class="sensor-type">${sensor.type}</div>
        </div>
        <div class="sensor-value">${sensor.lastValue.toFixed(2)}<span class="sensor-unit">${sensor.unit}</span></div>
        <div class="sensor-footer">
            <div>Last update</div>
            <div>${sensor.lastUpdated}</div>
        </div>
    `;
    card.addEventListener('click', () => selectSensor(sensor.id));
    sensorGrid.appendChild(card);
}

function updateSensorCard(sensorId) {
    const sensor = sensors[sensorId];
    const card = document.getElementById(`card-${sensorId}`);
    if (card) {
        card.querySelector('.sensor-value').innerHTML = `${sensor.lastValue.toFixed(2)}<span class="sensor-unit">${sensor.unit}</span>`;
        card.querySelector('.sensor-footer div:last-child').textContent = sensor.lastUpdated;
    }
}

function selectSensor(sensorId) {
    // Deselect previous sensor
    if (selectedSensorId) {
        document.getElementById(`card-${selectedSensorId}`).classList.remove('selected');
    }
    
    // Select new sensor
    selectedSensorId = sensorId;
    document.getElementById(`card-${sensorId}`).classList.add('selected');
    
    // Show modal and update chart
    showModal();
    updateChart();
}

function showModal() {
    graphModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    // Initialize chart if not already done
    if (!sensorChart) {
        initChart();
    }
}

function hideModal() {
    graphModal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

function updateChart() {
    if (!selectedSensorId || !sensors[selectedSensorId]) return;
    
    const sensor = sensors[selectedSensorId];
    
    // Update chart data
    modalTitle.textContent = `${sensor.id} - ${sensor.type.toUpperCase()}`;
    modalSubtitle.textContent = `Last value: ${sensor.lastValue.toFixed(2)}${sensor.unit} at ${sensor.lastUpdated}`;
    
    const labels = sensor.values.map(item => item.timestamp);
    const data = sensor.values.map(item => item.value);
    
    sensorChart.data.labels = labels;
    sensorChart.data.datasets[0].data = data;
    sensorChart.data.datasets[0].label = `${sensor.type} (${sensor.unit})`;
    
    // Update color based on sensor type
    let borderColor, backgroundColor;
    switch(sensor.type) {
        case 'temperature':
            borderColor = '#ff7675';
            backgroundColor = 'rgba(214, 48, 49, 0.1)';
            break;
        case 'humidity':
            borderColor = '#55efc4';
            backgroundColor = 'rgba(0, 184, 148, 0.1)';
            break;
        case 'soil':
            borderColor = '#ffeaa7';
            backgroundColor = 'rgba(253, 203, 110, 0.1)';
            break;
        case 'light':
            borderColor = '#74b9ff';
            backgroundColor = 'rgba(9, 132, 227, 0.1)';
            break;
        default:
            borderColor = '#a29bfe';
            backgroundColor = 'rgba(108, 92, 231, 0.1)';
    }
    
    sensorChart.data.datasets[0].borderColor = borderColor;
    sensorChart.data.datasets[0].backgroundColor = backgroundColor;
    sensorChart.data.datasets[0].pointBackgroundColor = borderColor;
    
    sensorChart.update();
}

// Event listeners
closeModal.addEventListener('click', hideModal);

// Close modal when clicking outside content
graphModal.addEventListener('click', function(event) {
    if (event.target === graphModal) {
        hideModal();
    }
});

// Initialize with sample sensors
function initializeWithSampleSensors() {
    const types = ['temperature', 'humidity', 'soil', 'light'];
    const units = ['°C', '%', '%', 'lux'];
    
    for (let i = 1; i <= 100; i++) {
        const type = types[i % 4];
        const sensorId = `ESP32_${i}`;
        const value = getRandomValue(type);
        const timestamp = new Date().toLocaleTimeString();
        
        sensors[sensorId] = {
            id: sensorId,
            type: type,
            values: [{ value: value, timestamp: timestamp }],
            lastValue: value,
            lastUpdated: timestamp,
            unit: units[i % 4]
        };
        
        addSensorCard(sensors[sensorId]);
    }
    
    activeSensors.textContent = Object.keys(sensors).length;
    dataPoints.textContent = Object.keys(sensors).length;
}

function getRandomValue(type) {
    switch(type) {
        case 'temperature': return Math.random() * 30 + 10; // 10-40°C
        case 'humidity': return Math.random() * 70 + 15; // 15-85%
        case 'soil': return Math.random() * 80 + 10; // 10-90%
        case 'light': return Math.random() * 900 + 100; // 100-1000 lux
        default: return Math.random() * 100;
    }
}

// Start with sample data (will be replaced by real WebSocket data)
initializeWithSampleSensors();

// Add some alerts for demo
setTimeout(() => {
    alertsCount.textContent = '3';
}, 1000);
 