const WebSocket = require('ws');
const express = require('express');
const path = require('path');

// Create HTTP server
const app = express();
const PORT = 80;
const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Serve static files (your dashboard HTML)
app.use(express.static(path.join(__dirname, 'public')));

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Store connected clients and sensor data
const clients = new Set();
const sensorData = new Map();

wss.on('connection', (ws) => {
  console.log('New client connected');
  clients.add(ws);
  
  // Send existing sensor data to new client
  sensorData.forEach((data, sensorId) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        sensorId,
        ...data
      }));
    }
  });

  // Heartbeat system
  const heartbeatInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'heartbeat' }));
    }
  }, 15000);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received:', data);

      // sendToDB(data);
      
      // Handle heartbeat response
      if (data.type === 'heartbeat') return;
      
      // Store sensor data
      if (data.sensorId) {
        if (!sensorData.has(data.sensorId)) {
          sensorData.set(data.sensorId, {});
        }
        
        // Update sensor data with timestamp
        const sensor = sensorData.get(data.sensorId);
        Object.assign(sensor, data);
        sensor.lastUpdated = new Date().toISOString();
        
        // Broadcast to all clients
        clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
          }
        });
      }
    } catch (e) {
      console.error('Error processing message:', e);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    clients.delete(ws);
    clearInterval(heartbeatInterval);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Cleanup disconnected clients periodically
setInterval(() => {
  clients.forEach(client => {
    if (client.readyState !== WebSocket.OPEN) {
      clients.delete(client);
    }
  });
}, 30000);