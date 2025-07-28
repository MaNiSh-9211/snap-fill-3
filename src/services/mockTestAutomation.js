const { v4: uuidv4 } = require('uuid');

class MockTestAutomationService {
    constructor() {
        this.tests = new Map(); // In-memory storage for tests
    }

    async executeTest(userStory, url) {
        const testId = uuidv4();
        const testResult = {
            testId,
            userStory,
            url,
            status: 'running',
            startTime: new Date(),
            steps: [],
            screenshots: [],
            errors: []
        };

        // Store test in memory
        this.tests.set(testId, testResult);

        try {
            console.log(`Starting test execution for: ${testId}`);
            
            // Simulate test execution
            await this.simulateTestExecution(testResult);
            
            // Update test result
            testResult.status = testResult.errors.length === 0 ? 'passed' : 'failed';
            testResult.endTime = new Date();
            testResult.duration = testResult.endTime - testResult.startTime;

            console.log(`Test completed: ${testId} - ${testResult.status}`);
            
        } catch (error) {
            console.error(`Test execution failed for ${testId}:`, error);
            testResult.status = 'failed';
            testResult.endTime = new Date();
            testResult.duration = testResult.endTime - testResult.startTime;
            testResult.errors.push({
                step: 'execution',
                error: error.message,
                timestamp: new Date()
            });
        }

        // Update stored test result
        this.tests.set(testId, testResult);
        return testResult;
    }

    async simulateTestExecution(testResult) {
        // Simulate navigation
        testResult.steps.push({
            action: 'navigate',
            description: `Navigate to ${testResult.url}`,
            timestamp: new Date(),
            success: true
        });

        // Add mock screenshot
        testResult.screenshots.push({
            description: 'Initial page load',
            timestamp: new Date(),
            data: this.generateMockScreenshot()
        });

        // Generate test steps based on user story
        const testSteps = this.generateTestSteps(testResult.userStory);
        
        // Simulate step execution
        for (const step of testSteps) {
            await this.simulateDelay(100); // Small delay to simulate real execution
            
            // 80% success rate for demonstration
            const success = Math.random() > 0.2;
            
            if (success) {
                testResult.steps.push({
                    ...step,
                    success: true,
                    timestamp: new Date()
                });
            } else {
                testResult.steps.push({
                    ...step,
                    success: false,
                    error: `Failed to execute ${step.action}`,
                    timestamp: new Date()
                });
                testResult.errors.push({
                    step: step.action,
                    error: `Failed to execute ${step.action}`,
                    timestamp: new Date()
                });
                break; // Fail-fast execution
            }
        }

        // Add final screenshot
        testResult.screenshots.push({
            description: 'Final page state',
            timestamp: new Date(),
            data: this.generateMockScreenshot()
        });
    }

    generateTestSteps(userStory) {
        const steps = [];
        const story = userStory.toLowerCase();
        
        // Basic step generation based on common user story patterns
        if (story.includes('click') || story.includes('button')) {
            steps.push({
                action: 'click',
                description: 'Click on interactive element',
                selector: 'button, input[type="button"], input[type="submit"], a'
            });
        }
        
        if (story.includes('fill') || story.includes('enter') || story.includes('type')) {
            steps.push({
                action: 'fill',
                description: 'Fill form field',
                selector: 'input[type="text"], input[type="email"], textarea',
                value: 'test@example.com'
            });
        }
        
        if (story.includes('search')) {
            steps.push({
                action: 'search',
                description: 'Perform search',
                selector: 'input[type="search"], input[name*="search"]',
                value: 'test search query'
            });
        }
        
        if (story.includes('login') || story.includes('sign in')) {
            steps.push({
                action: 'login',
                description: 'Login process',
                selector: 'input[type="email"], input[type="text"]',
                value: 'test@example.com'
            });
        }
        
        // Always add some basic steps
        steps.push({
            action: 'scroll',
            description: 'Scroll page to test responsiveness'
        });
        
        steps.push({
            action: 'wait',
            description: 'Wait for page to load completely',
            duration: 2000
        });
        
        return steps;
    }

    generateMockScreenshot() {
        // Generate a simple base64 encoded 1x1 pixel PNG
        return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    }

    async simulateDelay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getTestResult(testId) {
        return this.tests.get(testId);
    }

    getAllTests() {
        return Array.from(this.tests.values());
    }

    async generateReport(testId) {
        const testResult = this.tests.get(testId);
        if (!testResult) {
            throw new Error(`Test not found: ${testId}`);
        }

        const report = {
            testId: testResult.testId,
            userStory: testResult.userStory,
            url: testResult.url,
            status: testResult.status,
            startTime: testResult.startTime,
            endTime: testResult.endTime,
            duration: testResult.duration,
            totalSteps: testResult.steps.length,
            successfulSteps: testResult.steps.filter(s => s.success).length,
            failedSteps: testResult.steps.filter(s => !s.success).length,
            screenshots: testResult.screenshots.length,
            errors: testResult.errors.length,
            steps: testResult.steps,
            screenshotData: testResult.screenshots
        };

        return report;
    }

    async cleanup() {
        console.log('Mock test service cleanup completed');
    }
}

module.exports = new MockTestAutomationService();