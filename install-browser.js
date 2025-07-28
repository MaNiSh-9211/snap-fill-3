#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Installing Playwright browser...');

try {
    // Check if browser is already installed
    const browserPath = path.join(process.cwd(), '.cache/ms-playwright/chromium-1179/chrome-linux');
    if (fs.existsSync(browserPath)) {
        console.log('Browser already installed');
        process.exit(0);
    }

    // Install the browser
    console.log('Downloading Chromium browser...');
    execSync('npx playwright install chromium', { 
        stdio: 'inherit',
        timeout: 300000 // 5 minutes timeout
    });
    
    console.log('Browser installed successfully');
} catch (error) {
    console.error('Failed to install browser:', error.message);
    console.log('This is expected in some environments. The system will fall back to mock testing.');
    process.exit(0);
}