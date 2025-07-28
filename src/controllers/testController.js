const TestResult = require('../models/TestResult');
const TestReport = require('../models/TestReport');
const TestAutomationWorkflow = require('../services/langgraph/workflow');
const { StateFactory } = require('../services/langgraph/states');
const reportGenerator = require('../services/reportGenerator');
const { validateTestExecutionRequest, validateJiraWebhook } = require('../schemas/testSchemas');
const logger = require('../utils/logger');

class TestController {
    constructor() {
        this.workflow = new TestAutomationWorkflow();
    }
    
    async executeTest(req, res) {
        try {
            logger.info('Test execution request received');
            
            // Validate request
            const validatedRequest = validateTestExecutionRequest(req.body);
            const { userStory, url, options = {} } = validatedRequest;
            
            // Create test result record
            const testResult = await TestResult.create({
                userStory,
                url,
                status: 'pending'
            });
            
            logger.info(`Test created with ID: ${testResult.testId}`);
            
            // Return immediate response with test ID
            res.status(202).json({
                success: true,
                testId: testResult.testId,
                status: 'pending',
                message: 'Test execution started',
                url: `/api/tests/${testResult.testId}`
            });
            
            // Start workflow execution asynchronously
            this.executeWorkflowAsync(testResult, options);
            
        } catch (error) {
            logger.error('Failed to start test execution:', error);
            res.status(400).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
    
    async executeWorkflowAsync(testResult, options) {
        try {
            logger.info(`Starting workflow for test: ${testResult.testId}`);
            
            // Update status to running
            await testResult.update({ status: 'running' });
            
            // Create initial workflow state
            const initialState = StateFactory.createInitialState(
                testResult.testId,
                testResult.userStory,
                testResult.url,
                testResult
            );
            
            // Execute workflow
            const workflowResult = await this.workflow.runWorkflow(initialState);
            
            logger.info(`Workflow completed for test: ${testResult.testId}`, {
                status: workflowResult.status,
                success: workflowResult.testSuccess
            });
            
        } catch (error) {
            logger.error(`Workflow execution failed for test: ${testResult.testId}`, error);
            
            // Update test result with error
            await testResult.update({
                status: 'failed'
            });
            
            await testResult.addError(error, { context: 'workflow-execution' });
        }
    }
    
    async getTestResult(req, res) {
        try {
            const { testId } = req.params;
            
            const testResult = await TestResult.findByTestId(testId);
            
            if (!testResult) {
                return res.status(404).json({
                    success: false,
                    error: `Test not found: ${testId}`,
                    timestamp: new Date().toISOString()
                });
            }
            
            res.json({
                success: true,
                data: testResult.toJSON()
            });
            
        } catch (error) {
            logger.error('Failed to get test result:', error);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
    
    async getTestReport(req, res) {
        try {
            const { testId } = req.params;
            
            const testReport = await TestReport.findByTestId(testId);
            
            if (!testReport) {
                return res.status(404).json({
                    success: false,
                    error: `Test report not found: ${testId}`,
                    timestamp: new Date().toISOString()
                });
            }
            
            res.json({
                success: true,
                data: testReport.toJSON()
            });
            
        } catch (error) {
            logger.error('Failed to get test report:', error);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
    
    async getTestReportHtml(req, res) {
        try {
            const { testId } = req.params;
            
            const testReport = await TestReport.findByTestId(testId);
            
            if (!testReport) {
                return res.status(404).send(`
                    <html>
                        <body>
                            <h1>Report Not Found</h1>
                            <p>Test report not found: ${testId}</p>
                        </body>
                    </html>
                `);
            }
            
            res.setHeader('Content-Type', 'text/html');
            res.send(testReport.htmlReport);
            
        } catch (error) {
            logger.error('Failed to get test report HTML:', error);
            res.status(500).send(`
                <html>
                    <body>
                        <h1>Error</h1>
                        <p>Failed to load report: ${error.message}</p>
                    </body>
                </html>
            `);
        }
    }
    
    async listTests(req, res) {
        try {
            const { 
                skip = 0, 
                limit = 20, 
                status, 
                sortBy = 'createdAt',
                sortOrder = 'desc' 
            } = req.query;
            
            const filter = status ? { status } : {};
            const options = {
                skip: parseInt(skip),
                limit: parseInt(limit),
                sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 }
            };
            
            const tests = await TestResult.findAll(filter, options);
            
            res.json({
                success: true,
                data: tests.map(test => test.toJSON()),
                pagination: {
                    skip: parseInt(skip),
                    limit: parseInt(limit),
                    total: tests.length
                }
            });
            
        } catch (error) {
            logger.error('Failed to list tests:', error);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
    
    async listReports(req, res) {
        try {
            const { skip = 0, limit = 20, status } = req.query;
            
            const options = {
                skip: parseInt(skip),
                limit: parseInt(limit)
            };
            
            const reports = await reportGenerator.listReports(options);
            
            res.json({
                success: true,
                data: reports,
                pagination: {
                    skip: parseInt(skip),
                    limit: parseInt(limit),
                    total: reports.length
                }
            });
            
        } catch (error) {
            logger.error('Failed to list reports:', error);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
    
    async deleteTest(req, res) {
        try {
            const { testId } = req.params;
            
            // Delete test result
            await TestResult.delete(testId);
            
            // Delete associated report
            try {
                await TestReport.delete(testId);
            } catch (error) {
                logger.warn(`Failed to delete report for test ${testId}:`, error);
            }
            
            res.json({
                success: true,
                message: `Test ${testId} deleted successfully`
            });
            
        } catch (error) {
            logger.error('Failed to delete test:', error);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
    
    async cleanupOldTests(req, res) {
        try {
            const { daysOld = 30 } = req.query;
            
            // Cleanup old test results
            const deletedResults = await TestResult.cleanup(parseInt(daysOld));
            
            // Cleanup old reports
            const deletedReports = await TestReport.cleanup(parseInt(daysOld));
            
            res.json({
                success: true,
                message: 'Cleanup completed',
                deletedResults,
                deletedReports
            });
            
        } catch (error) {
            logger.error('Failed to cleanup old tests:', error);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
    
    async handleJiraWebhook(req, res) {
        try {
            logger.info('Jira webhook received');
            
            // Validate webhook payload
            const validatedPayload = validateJiraWebhook(req.body);
            
            // Extract user story from Jira payload
            const userStory = validatedPayload.issue?.fields?.summary || validatedPayload.userStory;
            const url = validatedPayload.url || 'https://example.com'; // Default URL if not provided
            
            logger.info(`Processing Jira webhook for user story: ${userStory}`);
            
            // Create test result record
            const testResult = await TestResult.create({
                userStory,
                url,
                status: 'pending'
            });
            
            // Return immediate response
            res.status(202).json({
                success: true,
                testId: testResult.testId,
                status: 'pending',
                message: 'Jira webhook processed, test execution started',
                url: `/api/tests/${testResult.testId}`
            });
            
            // Start workflow execution asynchronously
            this.executeWorkflowAsync(testResult, {});
            
        } catch (error) {
            logger.error('Failed to process Jira webhook:', error);
            res.status(400).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
    
    async getTestStatus(req, res) {
        try {
            const { testId } = req.params;
            
            const testResult = await TestResult.findByTestId(testId);
            
            if (!testResult) {
                return res.status(404).json({
                    success: false,
                    error: `Test not found: ${testId}`,
                    timestamp: new Date().toISOString()
                });
            }
            
            res.json({
                success: true,
                data: {
                    testId: testResult.testId,
                    status: testResult.status,
                    userStory: testResult.userStory,
                    url: testResult.url,
                    createdAt: testResult.createdAt,
                    updatedAt: testResult.updatedAt,
                    executionTime: testResult.executionTime,
                    progress: this.calculateProgress(testResult)
                }
            });
            
        } catch (error) {
            logger.error('Failed to get test status:', error);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
    
    calculateProgress(testResult) {
        const stages = [
            'pending',
            'initialized',
            'html_processed',
            'selectors_generated',
            'script_generated',
            'completed',
            'report_generated'
        ];
        
        const currentStageIndex = stages.indexOf(testResult.status);
        const totalStages = stages.length;
        
        if (currentStageIndex === -1) {
            return 0;
        }
        
        return Math.round((currentStageIndex / (totalStages - 1)) * 100);
    }
    
    async getSystemStats(req, res) {
        try {
            const stats = {
                totalTests: await this.countTests(),
                completedTests: await this.countTests({ status: 'completed' }),
                failedTests: await this.countTests({ status: 'failed' }),
                runningTests: await this.countTests({ status: 'running' }),
                pendingTests: await this.countTests({ status: 'pending' }),
                recentTests: await this.getRecentTests(5),
                systemHealth: await this.getSystemHealth()
            };
            
            res.json({
                success: true,
                data: stats
            });
            
        } catch (error) {
            logger.error('Failed to get system stats:', error);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
    
    async countTests(filter = {}) {
        try {
            const tests = await TestResult.findAll(filter);
            return tests.length;
        } catch (error) {
            logger.error('Failed to count tests:', error);
            return 0;
        }
    }
    
    async getRecentTests(limit = 5) {
        try {
            const tests = await TestResult.findAll({}, {
                limit,
                sort: { createdAt: -1 }
            });
            
            return tests.map(test => ({
                testId: test.testId,
                userStory: test.userStory,
                status: test.status,
                createdAt: test.createdAt,
                executionTime: test.executionTime
            }));
        } catch (error) {
            logger.error('Failed to get recent tests:', error);
            return [];
        }
    }
    
    async getSystemHealth() {
        try {
            // Simple health check
            const health = {
                database: 'healthy',
                storage: 'healthy',
                timestamp: new Date().toISOString()
            };
            
            return health;
        } catch (error) {
            logger.error('Failed to get system health:', error);
            return {
                database: 'unhealthy',
                storage: 'unhealthy',
                timestamp: new Date().toISOString()
            };
        }
    }
}

module.exports = new TestController();
