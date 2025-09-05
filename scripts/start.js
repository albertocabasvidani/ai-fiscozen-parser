#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset', prefix = '') {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${colors[color]}${prefix}[${timestamp}] ${message}${colors.reset}`);
}

function logFrontend(message) {
  log(message, 'cyan', '🌐 ');
}

function logBackend(message) {
  log(message, 'green', '⚙️  ');
}

function logSystem(message) {
  log(message, 'blue', '🚀 ');
}

function logError(message) {
  log(message, 'red', '❌ ');
}

const projectRoot = path.join(__dirname, '..');

// Check if setup has been run
function checkSetup() {
  const envPath = path.join(projectRoot, '.env.local');
  const backendNodeModules = path.join(projectRoot, 'backend', 'node_modules');
  const frontendNodeModules = path.join(projectRoot, 'frontend', 'node_modules');

  if (!fs.existsSync(envPath)) {
    logError('Configuration file .env.local not found');
    logError('Please run: npm run setup');
    process.exit(1);
  }

  if (!fs.existsSync(backendNodeModules)) {
    logError('Backend dependencies not installed');
    logError('Please run: npm run setup');
    process.exit(1);
  }

  if (!fs.existsSync(frontendNodeModules)) {
    logError('Frontend dependencies not installed');
    logError('Please run: npm run setup');
    process.exit(1);
  }

  logSystem('✅ Setup check passed');
}

// Start backend server
function startBackend() {
  return new Promise((resolve, reject) => {
    const backend = spawn('node', ['server.js'], {
      cwd: path.join(projectRoot, 'backend'),
      stdio: 'pipe'
    });

    backend.stdout.on('data', (data) => {
      const message = data.toString().trim();
      if (message) {
        logBackend(message);
        
        if (message.includes('Server running on port')) {
          resolve(backend);
        }
      }
    });

    backend.stderr.on('data', (data) => {
      const message = data.toString().trim();
      if (message) {
        logBackend(`ERROR: ${message}`);
      }
    });

    backend.on('error', (err) => {
      logError(`Backend failed to start: ${err.message}`);
      reject(err);
    });

    backend.on('close', (code) => {
      if (code !== 0) {
        logError(`Backend exited with code ${code}`);
        reject(new Error(`Backend process exited with code ${code}`));
      }
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      reject(new Error('Backend startup timeout'));
    }, 10000);
  });
}

// Start frontend server
function startFrontend() {
  return new Promise((resolve, reject) => {
    const frontend = spawn('npm', ['run', 'dev'], {
      cwd: path.join(projectRoot, 'frontend'),
      stdio: 'pipe',
      shell: true
    });

    frontend.stdout.on('data', (data) => {
      const message = data.toString().trim();
      if (message) {
        logFrontend(message);
        
        if (message.includes('Local:') || message.includes('localhost:3000')) {
          resolve(frontend);
        }
      }
    });

    frontend.stderr.on('data', (data) => {
      const message = data.toString().trim();
      if (message && !message.includes('WARN')) {
        logFrontend(`ERROR: ${message}`);
      }
    });

    frontend.on('error', (err) => {
      logError(`Frontend failed to start: ${err.message}`);
      reject(err);
    });

    frontend.on('close', (code) => {
      if (code !== 0) {
        logError(`Frontend exited with code ${code}`);
        reject(new Error(`Frontend process exited with code ${code}`));
      }
    });

    // Timeout after 20 seconds
    setTimeout(() => {
      reject(new Error('Frontend startup timeout'));
    }, 20000);
  });
}

// Open browser (cross-platform)
function openBrowser(url) {
  const start = process.platform === 'darwin' ? 'open' : 
                process.platform === 'win32' ? 'start' : 'xdg-open';
  
  try {
    spawn(start, [url], { stdio: 'ignore' });
    logSystem(`🌐 Opening browser at ${url}`);
  } catch (err) {
    logSystem(`📋 Please open your browser and navigate to ${url}`);
  }
}

// Main startup function
async function startApplication() {
  console.log(colors.bold + '🚀 AI Fiscozen Parser - Starting Application' + colors.reset);
  console.log('='.repeat(50));
  
  logSystem('Checking setup...');
  checkSetup();
  
  logSystem('Starting backend server...');
  
  let backend, frontend;
  
  try {
    backend = await startBackend();
    logSystem('✅ Backend started successfully');
    
    // Wait a moment for backend to fully initialize
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    logSystem('Starting frontend development server...');
    frontend = await startFrontend();
    logSystem('✅ Frontend started successfully');
    
    // Wait for frontend to be ready
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Success message
    console.log('\n' + colors.bold + colors.green + '🎉 Application Started Successfully!' + colors.reset);
    console.log('='.repeat(40));
    logSystem('Frontend: http://localhost:3000');
    logSystem('Backend:  http://localhost:3001/health');
    logSystem('Press Ctrl+C to stop both servers');
    console.log('');
    
    // Auto-open browser after 2 seconds
    setTimeout(() => {
      openBrowser('http://localhost:3000');
    }, 2000);
    
    // Handle graceful shutdown
    const cleanup = () => {
      logSystem('🛑 Shutting down servers...');
      
      if (backend && !backend.killed) {
        backend.kill('SIGTERM');
        logBackend('Backend server stopped');
      }
      
      if (frontend && !frontend.killed) {
        frontend.kill('SIGTERM');
        logFrontend('Frontend server stopped');
      }
      
      logSystem('👋 Goodbye!');
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    
    // Keep the main process alive
    process.stdin.resume();
    
  } catch (error) {
    logError(`Failed to start application: ${error.message}`);
    
    // Cleanup on failure
    if (backend && !backend.killed) {
      backend.kill('SIGTERM');
    }
    if (frontend && !frontend.killed) {
      frontend.kill('SIGTERM');
    }
    
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  logError('Uncaught exception:');
  console.error(err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logError('Unhandled rejection:');
  console.error(reason);
  process.exit(1);
});

// Start the application
startApplication();