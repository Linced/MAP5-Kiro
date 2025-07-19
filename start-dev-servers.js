#!/usr/bin/env node

// Simple script to start both development servers
const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting TradeInsight Development Servers...\n');

// Start backend server
console.log('📡 Starting backend server...');
const backend = spawn('npm', ['run', 'dev'], {
  cwd: path.join(__dirname, 'backend'),
  stdio: 'inherit',
  shell: true
});

// Wait a moment for backend to start
setTimeout(() => {
  console.log('\n🌐 Starting frontend server...');
  const frontend = spawn('npm', ['run', 'dev'], {
    cwd: path.join(__dirname, 'frontend'),
    stdio: 'inherit',
    shell: true
  });

  // Handle process termination
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down servers...');
    backend.kill('SIGINT');
    frontend.kill('SIGINT');
    process.exit(0);
  });

  frontend.on('close', (code) => {
    console.log(`Frontend server exited with code ${code}`);
    backend.kill('SIGINT');
  });

  backend.on('close', (code) => {
    console.log(`Backend server exited with code ${code}`);
    frontend.kill('SIGINT');
  });

}, 3000);

backend.on('close', (code) => {
  if (code !== 0) {
    console.log(`Backend server exited with code ${code}`);
  }
});

console.log('\n✅ Development servers starting...');
console.log('📡 Backend will be available at: http://localhost:3001');
console.log('🌐 Frontend will be available at: http://localhost:5173');
console.log('\n💡 Press Ctrl+C to stop both servers');