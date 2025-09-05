#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 AI Fiscozen Parser - Setup Script');
console.log('=====================================\n');

const projectRoot = path.join(__dirname, '..');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function step(stepNumber, description) {
  log(`\n📋 Step ${stepNumber}: ${description}`, 'blue');
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function executeCommand(command, cwd = projectRoot) {
  try {
    log(`   Running: ${command}`, 'yellow');
    execSync(command, { cwd, stdio: 'inherit' });
    return true;
  } catch (err) {
    error(`Command failed: ${command}`);
    console.error(err.message);
    return false;
  }
}

function checkNodeVersion() {
  try {
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    
    if (majorVersion < 16) {
      error('Node.js version 16 or higher is required');
      error(`Current version: ${nodeVersion}`);
      return false;
    }
    
    success(`Node.js version: ${nodeVersion}`);
    return true;
  } catch (err) {
    error('Could not check Node.js version');
    return false;
  }
}

function createDirectories() {
  const directories = [
    'logs',
    'database',
    'backend/database',
    'frontend/dist'
  ];

  directories.forEach(dir => {
    const fullPath = path.join(projectRoot, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      log(`   Created directory: ${dir}`, 'yellow');
    }
  });
}

function installDependencies() {
  // Install root dependencies
  if (!executeCommand('npm install', projectRoot)) {
    return false;
  }

  // Install backend dependencies  
  if (!executeCommand('npm install', path.join(projectRoot, 'backend'))) {
    return false;
  }

  // Install frontend dependencies
  if (!executeCommand('npm install --legacy-peer-deps', path.join(projectRoot, 'frontend'))) {
    return false;
  }

  return true;
}

function createConfigFiles() {
  const envPath = path.join(projectRoot, '.env.local');
  
  if (!fs.existsSync(envPath)) {
    const envContent = `# AI Fiscozen Parser Configuration
FISCOZEN_BASE_URL=https://app.fiscozen.it
FRONTEND_PORT=3000
BACKEND_PORT=3001
NODE_ENV=development

# Database
DATABASE_PATH=./database/sessions.db

# Logs
LOG_LEVEL=info
LOG_PATH=./logs/

# Frontend URL (for production CORS)
FRONTEND_URL=http://localhost:3000
`;

    fs.writeFileSync(envPath, envContent);
    success('Created .env.local configuration file');
  } else {
    warning('.env.local already exists, skipping...');
  }

  // Create logs directory with .gitkeep
  const logsPath = path.join(projectRoot, 'logs');
  if (!fs.existsSync(logsPath)) {
    fs.mkdirSync(logsPath, { recursive: true });
  }
  
  const gitkeepPath = path.join(logsPath, '.gitkeep');
  if (!fs.existsSync(gitkeepPath)) {
    fs.writeFileSync(gitkeepPath, '# Keep this directory in git\n');
  }
}

function buildFrontend() {
  log('   Building frontend for production...', 'yellow');
  return executeCommand('npm run build', path.join(projectRoot, 'frontend'));
}

function testBackend() {
  log('   Testing backend startup...', 'yellow');
  
  try {
    // Start backend in background for testing
    const { spawn } = require('child_process');
    
    return new Promise((resolve) => {
      const backend = spawn('node', ['server.js'], {
        cwd: path.join(projectRoot, 'backend'),
        stdio: 'pipe'
      });

      let output = '';
      
      backend.stdout.on('data', (data) => {
        output += data.toString();
      });

      backend.stderr.on('data', (data) => {
        output += data.toString();
      });

      // Test for 3 seconds
      setTimeout(() => {
        backend.kill();
        
        if (output.includes('Server running on port') && output.includes('Database connected')) {
          success('Backend test successful');
          resolve(true);
        } else {
          error('Backend test failed');
          console.log('Backend output:', output);
          resolve(false);
        }
      }, 3000);
    });
    
  } catch (err) {
    error('Could not test backend');
    return false;
  }
}

async function main() {
  step(1, 'Checking system requirements');
  if (!checkNodeVersion()) {
    error('Setup failed: Node.js version requirements not met');
    process.exit(1);
  }
  success('System requirements OK');

  step(2, 'Creating project directories');
  createDirectories();
  success('Directories created');

  step(3, 'Installing dependencies');
  if (!installDependencies()) {
    error('Setup failed: Could not install dependencies');
    process.exit(1);
  }
  success('All dependencies installed');

  step(4, 'Creating configuration files');
  createConfigFiles();
  success('Configuration files created');

  step(5, 'Building frontend');
  if (!buildFrontend()) {
    warning('Frontend build failed, but you can still use development mode');
  } else {
    success('Frontend built successfully');
  }

  step(6, 'Testing backend');
  const backendTest = await testBackend();
  if (backendTest) {
    success('Backend test passed');
  } else {
    warning('Backend test failed, but setup is complete');
  }

  // Final success message
  log('\n🎉 Setup Complete!', 'bold');
  log('==================\n', 'bold');
  
  success('AI Fiscozen Parser has been set up successfully!');
  
  log('\n📋 Next Steps:', 'blue');
  log('1. Start the application:', 'reset');
  log('   npm start', 'green');
  log('');
  log('2. Or start in development mode:', 'reset');
  log('   npm run dev', 'green');
  log('');
  log('3. Access the application:', 'reset');
  log('   Frontend: http://localhost:3000', 'green');
  log('   Backend:  http://localhost:3001/health', 'green');
  log('');
  
  log('📖 For more information, see README.md', 'blue');
  log('💾 All data is stored locally in the database/ directory', 'yellow');
  
  process.exit(0);
}

// Handle errors
process.on('uncaughtException', (err) => {
  error('Uncaught exception during setup:');
  console.error(err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  error('Unhandled rejection during setup:');
  console.error(reason);
  process.exit(1);
});

// Run setup
main().catch((err) => {
  error('Setup failed:');
  console.error(err);
  process.exit(1);
});