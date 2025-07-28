#!/usr/bin/env node

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function setupBrowser() {
    try {
        console.log('Testing Playwright browser initialization...');
        
        // Try to launch browser to check if it's properly installed
        const browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        console.log('Browser launched successfully');
        
        // Test basic functionality
        const context = await browser.newContext();
        const page = await context.newPage();
        await page.goto('https://example.com');
        
        const title = await page.title();
        console.log(`Test navigation successful, page title: ${title}`);
        
        await browser.close();
        console.log('Browser test completed successfully');
        
        return true;
    } catch (error) {
        console.error('Browser setup failed:', error.message);
        return false;
    }
}

setupBrowser().then(success => {
    if (success) {
        console.log('Browser is ready for use');
        process.exit(0);
    } else {
        console.log('Browser setup failed - check installation');
        process.exit(1);
    }
});