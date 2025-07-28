const express = require('express');
const cors = require('cors');
const path = require('path');
const testAutomationService = require('./src/services/testAutomation');
const reportGenerator = require('./src/utils/reportGenerator');

// Set the GROQ API key
process.env.GROQ_API_KEY = "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";

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files for report viewing
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/reports', express.static(path.join(__dirname, 'reports')));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        service: 'TestWeaver AI Test Automation System'
    });
});

// Serve the web interface
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Test execution endpoint
app.post('/api/tests/execute', async (req, res) => {
    const { userStory, url } = req.body;
    
    if (!userStory || !url) {
        return res.status(400).json({ 
            error: 'Missing required fields: userStory and url' 
        });
    }
    
    try {
        console.log(`Executing test for: ${userStory} on ${url}`);
        
        // Execute test asynchronously
        const testResult = await testAutomationService.executeTest(userStory, url);
        
        // Filter screenshots to only count step-specific screenshots (excluding general screenshots)
        const stepScreenshots = testResult.screenshots.filter(screenshot => screenshot.stepNumber);
        
        res.json({
            success: true,
            testId: testResult.testId,
            message: 'Test execution completed',
            userStory,
            url,
            status: testResult.status,
            duration: testResult.duration,
            steps: testResult.steps.length,
            screenshots: stepScreenshots.length,
            errors: testResult.errors.length
        });
        
    } catch (error) {
        console.error('Test execution failed:', error);
        res.status(500).json({
            success: false,
            error: 'Test execution failed',
            message: error.message
        });
    }
});

// Get test result endpoint
app.get('/api/tests/:testId', (req, res) => {
    const { testId } = req.params;
    
    const testResult = testAutomationService.getTestResult(testId);
    
    if (!testResult) {
        return res.status(404).json({ 
            error: 'Test not found',
            testId 
        });
    }
    
    res.json({
        success: true,
        testResult
    });
});

// Get test report endpoint
app.get('/api/tests/:testId/report', async (req, res) => {
    const { testId } = req.params;
    
    try {
        const testResult = testAutomationService.getTestResult(testId);
        
        if (!testResult) {
            return res.status(404).json({ 
                error: 'Test not found',
                testId 
            });
        }
        
        const reportPath = await reportGenerator.generateHtmlReport(testResult);
        
        res.json({
            success: true,
            testId,
            reportPath,
            reportUrl: `/reports/${testId}.html`
        });
        
    } catch (error) {
        console.error('Report generation failed:', error);
        res.status(500).json({
            success: false,
            error: 'Report generation failed',
            message: error.message
        });
    }
});

// Get test report HTML endpoint
app.get('/api/tests/:testId/report/html', async (req, res) => {
    const { testId } = req.params;
    
    try {
        const testResult = testAutomationService.getTestResult(testId);
        
        if (!testResult) {
            return res.status(404).json({ 
                error: 'Test not found',
                testId 
            });
        }
        
        const reportPath = await reportGenerator.generateHtmlReport(testResult);
        res.sendFile(reportPath);
        
    } catch (error) {
        console.error('HTML report generation failed:', error);
        res.status(500).json({
            success: false,
            error: 'HTML report generation failed',
            message: error.message
        });
    }
});

// List all tests endpoint
app.get('/api/tests', (req, res) => {
    const allTests = testAutomationService.getAllTests();
    
    res.json({
        success: true,
        tests: allTests,
        count: allTests.length
    });
});

// Jira webhook simulation endpoint
app.post('/webhook/jira', (req, res) => {
    console.log('Received Jira webhook:', req.body);
    
    // Extract user story from webhook payload
    const userStory = req.body.issue?.fields?.summary || req.body.userStory;
    
    if (!userStory) {
        return res.status(400).json({ error: 'User story not found in webhook payload' });
    }
    
    res.json({ success: true, message: 'Webhook received', userStory });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ 
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ 
        error: 'Endpoint not found',
        path: req.originalUrl,
        timestamp: new Date().toISOString()
    });
});

// Start server
async function startServer() {
    try {
        // await connectDB();
        
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`TestWeaver server running on port ${PORT}`);
            console.log(`Health check: http://localhost:${PORT}/health`);
            // console.log(`API endpoints: http://localhost:${PORT}/api/tests`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    process.exit(0);
});

startServer();
