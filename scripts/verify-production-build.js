#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying production build configuration...\n');

// Check if we're in the right directory
if (!fs.existsSync('package.json')) {
  console.error('❌ Please run this script from the project root directory');
  process.exit(1);
}

const checks = [];

// 1. Verify package.json files exist
console.log('📦 Checking package.json files...');
const packageFiles = [
  'package.json',
  'frontend/package.json', 
  'backend/package.json'
];

packageFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} exists`);
    checks.push({ name: file, status: 'pass' });
  } else {
    console.log(`❌ ${file} missing`);
    checks.push({ name: file, status: 'fail' });
  }
});

// 2. Verify deployment configuration files
console.log('\n🚀 Checking deployment configuration...');
const deployFiles = [
  'vercel.json',
  'render.yaml',
  'DEPLOYMENT.md'
];

deployFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} exists`);
    checks.push({ name: file, status: 'pass' });
  } else {
    console.log(`❌ ${file} missing`);
    checks.push({ name: file, status: 'fail' });
  }
});

// 3. Verify environment files
console.log('\n🔧 Checking environment configuration...');
const envFiles = [
  'backend/.env.example',
  'backend/.env.production',
  'frontend/.env.production'
];

envFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} exists`);
    checks.push({ name: file, status: 'pass' });
  } else {
    console.log(`❌ ${file} missing`);
    checks.push({ name: file, status: 'fail' });
  }
});

// 4. Test frontend build
console.log('\n🏗️  Testing frontend build...');
try {
  process.chdir('frontend');
  execSync('npm run build', { stdio: 'pipe' });
  console.log('✅ Frontend build successful');
  checks.push({ name: 'frontend-build', status: 'pass' });
  
  // Check if dist directory was created
  if (fs.existsSync('dist')) {
    console.log('✅ Frontend dist directory created');
    checks.push({ name: 'frontend-dist', status: 'pass' });
  } else {
    console.log('❌ Frontend dist directory not found');
    checks.push({ name: 'frontend-dist', status: 'fail' });
  }
  
  process.chdir('..');
} catch (error) {
  console.log('❌ Frontend build failed');
  console.log(error.message);
  checks.push({ name: 'frontend-build', status: 'fail' });
  process.chdir('..');
}

// 5. Test backend build
console.log('\n🏗️  Testing backend build...');
try {
  process.chdir('backend');
  execSync('npm run build', { stdio: 'pipe' });
  console.log('✅ Backend build successful');
  checks.push({ name: 'backend-build', status: 'pass' });
  
  // Check if dist directory was created
  if (fs.existsSync('dist')) {
    console.log('✅ Backend dist directory created');
    checks.push({ name: 'backend-dist', status: 'pass' });
  } else {
    console.log('❌ Backend dist directory not found');
    checks.push({ name: 'backend-dist', status: 'fail' });
  }
  
  process.chdir('..');
} catch (error) {
  console.log('❌ Backend build failed');
  console.log(error.message);
  checks.push({ name: 'backend-build', status: 'fail' });
  process.chdir('..');
}

// 6. Verify production scripts
console.log('\n📜 Checking production scripts...');
const productionScripts = [
  'backend/src/production-startup.ts',
  'backend/src/database/production-init.ts',
  'backend/src/services/productionEmailService.ts',
  'backend/src/utils/productionChecker.ts'
];

productionScripts.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} exists`);
    checks.push({ name: file, status: 'pass' });
  } else {
    console.log(`❌ ${file} missing`);
    checks.push({ name: file, status: 'fail' });
  }
});

// Summary
console.log('\n📊 Build Verification Summary');
console.log('================================');

const passed = checks.filter(c => c.status === 'pass').length;
const failed = checks.filter(c => c.status === 'fail').length;

console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📊 Total:  ${checks.length}`);

if (failed === 0) {
  console.log('\n🎉 All checks passed! Ready for production deployment.');
  process.exit(0);
} else {
  console.log('\n⚠️  Some checks failed. Please fix the issues above before deploying.');
  process.exit(1);
}