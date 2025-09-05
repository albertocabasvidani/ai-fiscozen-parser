require('dotenv').config({ path: '../.env.local' });
const express = require('express');
const path = require('path');
const database = require('./database/sqlite');
const corsMiddleware = require('./middleware/cors');

// Routes
const fiscozenRoutes = require('./routes/fiscozen');
const dataRoutes = require('./routes/data');

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

// Middleware
app.use(corsMiddleware);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'ai-fiscozen-parser-backend',
    version: '1.0.0'
  });
});

// API Routes
app.use('/api/fiscozen', fiscozenRoutes);
app.use('/api/data', dataRoutes);

// Serve static files from frontend build (for production)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  });
}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server Error:', error);
  
  database.log('error', 'Server error', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method
  }).catch(console.error);

  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'development' 
      ? error.message 
      : 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Initialize database and start server
async function startServer() {
  try {
    console.log('🔧 Initializing database...');
    await database.connect();
    
    console.log('📊 Database connected successfully');
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`💾 Local mode: All data stored locally`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      
      // Log server start
      database.log('info', 'Server started', { 
        port: PORT, 
        environment: process.env.NODE_ENV || 'development'
      }).catch(console.error);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  await database.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  await database.close();
  process.exit(0);
});

// Start the server
startServer();