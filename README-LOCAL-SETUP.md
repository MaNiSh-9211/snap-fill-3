# TestWeaver Local Setup Guide

## Prerequisites

### 1. Install Node.js
Make sure you have Node.js version 18 or higher installed on your system.

### 2. Install Dependencies
```bash
npm install
```

### 3. Install Playwright Browsers
**This is the most important step for local development:**

```bash
# Install Playwright browsers
npx playwright install

# Or install only Chromium
npx playwright install chromium

# If you encounter permission issues on Linux/Mac:
sudo npx playwright install-deps
```

### 4. Set Environment Variables
Create a `.env` file in the project root:
```bash
GROQ_API_KEY=your_groq_api_key_here
PORT=5000
```

### 5. Run the Application
```bash
npm start
```

## Troubleshooting

### Browser Issues
If you get errors like "Executable doesn't exist", try:

1. **Complete browser installation:**
   ```bash
   npx playwright install chromium --force
   ```

2. **Install system dependencies (Linux):**
   ```bash
   sudo apt-get update
   sudo apt-get install -y \
     libnss3 \
     libatk-bridge2.0-0 \
     libdrm2 \
     libxkbcommon0 \
     libgtk-3-0 \
     libgbm1 \
     libasound2
   ```

3. **For macOS:**
   ```bash
   brew install --cask chromium
   ```

4. **For Windows:**
   - Download and install Visual C++ Redistributable
   - Run PowerShell as Administrator and execute:
     ```powershell
     npx playwright install chromium
     ```

### Alternative: Use System Browser
If Playwright's built-in browser doesn't work, you can modify `src/services/testAutomation.js` to use your system browser:

```javascript
// In initializeBrowser() method, add:
executablePath: '/usr/bin/chromium-browser', // Linux
// or
executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', // macOS
// or
executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', // Windows
```

## API Usage

### Execute Test
```bash
curl -X POST http://localhost:5000/api/tests/execute \
  -H "Content-Type: application/json" \
  -d '{
    "userStory": "As a user I want to login with username: test and password: 123",
    "url": "https://example.com"
  }'
```

### Get Test Results
```bash
curl http://localhost:5000/api/tests/{testId}
```

### View HTML Report
```bash
curl http://localhost:5000/api/tests/{testId}/report/html
```

## Features

- Real browser automation using Playwright
- AI-powered test generation from user stories
- Automatic credential extraction from natural language
- Screenshot capture during test execution
- Comprehensive HTML reports
- Fail-fast testing with detailed error reporting

## Important Notes

1. **Credentials**: The system extracts credentials from your user story text
2. **Screenshots**: Real screenshots are captured during test execution
3. **Browser**: Uses Playwright's built-in Chromium for cross-platform compatibility
4. **Headless**: Runs in headless mode for CI/CD compatibility