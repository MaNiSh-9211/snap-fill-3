const { z } = require('zod');

// Define the state schema for the workflow
const WorkflowStateSchema = z.object({
    // Test identification
    testId: z.string(),
    userStory: z.string(),
    url: z.string(),
    
    // Test result reference
    testResult: z.any(), // TestResult instance
    
    // Workflow status
    status: z.enum([
        'initialized',
        'html_processed',
        'selectors_generated',
        'script_generated',
        'completed',
        'failed',
        'report_generated'
    ]).optional(),
    
    // HTML processing
    htmlContent: z.string().optional(),
    cleanedHtml: z.string().optional(),
    tokenCount: z.number().optional(),
    
    // AI generation results
    generatedSelectors: z.array(z.any()).optional(),
    generatedScript: z.any().optional(),
    
    // Execution results
    executionResults: z.array(z.any()).optional(),
    testSuccess: z.boolean().optional(),
    executionTime: z.number().optional(),
    
    // Report generation
    report: z.any().optional(),
    
    // Error handling
    error: z.string().optional(),
    currentStep: z.string().optional(),
    
    // Timing
    startTime: z.date().optional(),
    endTime: z.date().optional(),

    shouldContinue: z.boolean().optional(),

    });

class WorkflowState {
    constructor(data) {
        // Validate the initial state
        const validatedData = WorkflowStateSchema.parse(data);
        
        // Assign properties
        Object.assign(this, validatedData);
        
        // Set default values
        this.status = this.status || 'initialized';
        this.generatedSelectors = this.generatedSelectors || [];
        this.executionResults = this.executionResults || [];
        this.startTime = this.startTime || new Date();
        this.shouldContinue = this.shouldContinue ?? true;
    }
    
    updateStatus(newStatus) {
        this.status = newStatus;
        this.currentStep = newStatus;
    }
    
    setError(error) {
        this.error = error;
        this.status = 'failed';
    }
    
    isCompleted() {
        return this.status === 'completed' || this.status === 'report_generated';
    }
    
    isFailed() {
        return this.status === 'failed' || !!this.error;
    }
    
    getDuration() {
        if (!this.startTime) return 0;
        
        const endTime = this.endTime || new Date();
        return endTime.getTime() - this.startTime.getTime();
    }
    
    toJSON() {
        return {
            testId: this.testId,
            userStory: this.userStory,
            url: this.url,
            status: this.status,
            tokenCount: this.tokenCount,
            generatedSelectors: this.generatedSelectors,
            generatedScript: this.generatedScript,
            executionResults: this.executionResults,
            testSuccess: this.testSuccess,
            executionTime: this.executionTime,
            error: this.error,
            currentStep: this.currentStep,
            startTime: this.startTime,
            endTime: this.endTime,
            duration: this.getDuration()
        };
    }
}

// State transition helpers
class StateTransitions {
    static canTransitionTo(currentStatus, nextStatus) {
        const validTransitions = {
            'initialized': ['html_processed', 'failed'],
            'html_processed': ['selectors_generated', 'failed'],
            'selectors_generated': ['script_generated', 'failed'],
            'script_generated': ['completed', 'failed'],
            'completed': ['report_generated', 'failed'],
            'failed': ['report_generated'],
            'report_generated': []
        };
        
        return validTransitions[currentStatus]?.includes(nextStatus) || false;
    }
    
    static getNextValidStates(currentStatus) {
        const validTransitions = {
            'initialized': ['html_processed', 'failed'],
            'html_processed': ['selectors_generated', 'failed'],
            'selectors_generated': ['script_generated', 'failed'],
            'script_generated': ['completed', 'failed'],
            'completed': ['report_generated', 'failed'],
            'failed': ['report_generated'],
            'report_generated': []
        };
        
        return validTransitions[currentStatus] || [];
    }
    
    static isTerminalState(status) {
        return status === 'report_generated' || status === 'failed';
    }
}

// State validation helpers
class StateValidation {
    static validateStateData(data) {
        try {
            return WorkflowStateSchema.parse(data);
        } catch (error) {
            throw new Error(`Invalid workflow state data: ${error.message}`);
        }
    }
    
    static validateTransition(currentState, nextState) {
        if (!StateTransitions.canTransitionTo(currentState.status, nextState.status)) {
            throw new Error(
                `Invalid state transition from ${currentState.status} to ${nextState.status}`
            );
        }
        
        return true;
    }
    
    static validateRequiredFields(state, requiredFields) {
        const missingFields = requiredFields.filter(field => !state[field]);
        
        if (missingFields.length > 0) {
            throw new Error(
                `Missing required fields for current state: ${missingFields.join(', ')}`
            );
        }
        
        return true;
    }
}

// State factory for creating initial states
class StateFactory {
    static createInitialState(testId, userStory, url, testResult) {
        return new WorkflowState({
            testId,
            userStory,
            url,
            testResult,
            status: 'initialized',
            startTime: new Date()
        });
    }
    
    static createFromTestResult(testResult) {
        return new WorkflowState({
            testId: testResult.testId,
            userStory: testResult.userStory,
            url: testResult.url,
            testResult,
            status: testResult.status || 'initialized',
            htmlContent: testResult.htmlContent,
            cleanedHtml: testResult.cleanedHtml,
            tokenCount: testResult.tokenCount,
            generatedSelectors: testResult.generatedSelectors,
            generatedScript: testResult.generatedScript,
            executionResults: testResult.executionResults,
            executionTime: testResult.executionTime,
            startTime: testResult.createdAt
            
            
        });
    }
}

module.exports = {
    WorkflowState,
    WorkflowStateSchema,
    StateTransitions,
    StateValidation,
    StateFactory
};
