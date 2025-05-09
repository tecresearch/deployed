require('dotenv').config();
const WebSocket = require('ws');
const express = require('express');
const path = require('path');
const fs = require('fs');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000; // Default to 3000 locally, Render will provide its port

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Determine environment
const isProduction = process.env.RENDER !== undefined;
const protocol = isProduction ? 'https' : 'http';
let server;

if (isProduction) {
  // Production (Render.com) - they handle SSL automatically
  server = require('https').createServer({}, app);
} else {
  // Local development - plain HTTP
  server = require('http').createServer(app);
}

// WebSocket server (YOUR EXISTING LOGIC - NO CHANGES)
const wss = new WebSocket.Server({ server });
const clients = new Set();
const sensorData = new Map();

wss.on('connection', (ws) => {
  console.log(`New client connected via ${isProduction ? 'WSS' : 'WS'}`);
  clients.add(ws);
  
  // Your existing data sending logic
  sensorData.forEach((data, sensorId) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ sensorId, ...data }));
    }
  });

  // Your existing heartbeat system
  const heartbeatInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'heartbeat' }));
    }
  }, 15000);

  // Your existing message handler
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received:', data);
      
      if (data.type === 'heartbeat') return;
      
      if (data.sensorId) {
        if (!sensorData.has(data.sensorId)) {
          sensorData.set(data.sensorId, {});
        }
        const sensor = sensorData.get(data.sensorId);
        Object.assign(sensor, data);
        sensor.lastUpdated = new Date().toISOString();
        
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

// Your existing cleanup interval
setInterval(() => {
  clients.forEach(client => {
    if (client.readyState !== WebSocket.OPEN) {
      clients.delete(client);
    }
  });
}, 30000);

// Start server with environment-aware logging
server.listen(PORT, '0.0.0.0', () => {
  console.log(`=================================`);
  console.log(`Server running in ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'} mode`);
  console.log(`Port: ${PORT}`);
  console.log(`HTTP${isProduction ? 'S' : ''} endpoint: ${protocol}://localhost:${PORT}`);
  if (isProduction) {
    console.log(`WebSocket (WSS) endpoint: wss://${process.env.RENDER_EXTERNAL_HOSTNAME}`);
    console.log(`HTTPS endpoint: https://${process.env.RENDER_EXTERNAL_HOSTNAME}`);
  } else {
    console.log(`WebSocket (WS) endpoint: ws://localhost:${PORT}`);
  }
  console.log(`=================================`);
});