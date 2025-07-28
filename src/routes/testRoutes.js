const express = require('express');
const router = express.Router();
const testController = require('../controllers/testController');
const logger = require('../utils/logger');

// Middleware for request logging
router.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        body: req.method === 'POST' ? req.body : undefined
    });
    next();
});

// Test execution routes
router.post('/execute', testController.executeTest);
router.get('/stats', testController.getSystemStats);
router.get('/', testController.listTests);
router.delete('/cleanup', testController.cleanupOldTests);

// Individual test routes
router.get('/:testId', testController.getTestResult);
router.get('/:testId/status', testController.getTestStatus);
router.delete('/:testId', testController.deleteTest);

// Report routes
router.get('/reports', testController.listReports);
router.get('/:testId/report', testController.getTestReport);
router.get('/:testId/report/html', testController.getTestReportHtml);

// Error handling middleware
router.use((error, req, res, next) => {
    logger.error('Route error:', error);
    
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
    });
});

// 404 handler for test routes
router.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Test endpoint not found',
        path: req.originalUrl,
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
