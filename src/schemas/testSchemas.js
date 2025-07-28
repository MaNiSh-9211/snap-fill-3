const { z } = require('zod');

// Schema for validating generated selectors
// const SelectorSchema = z.object({
//     element: z.string().min(1, 'Element description is required'),
//     selector: z.string().min(1, 'Selector is required'),
//     xpath: z.string().optional(),
//     confidence: z.number().min(0).max(1).optional(),
//     reasoning: z.string().optional()
// });

const SelectorSchema = z.object({
  element: z.string().min(1, 'Element description is required'),
  selector: z.string().min(1, 'Selector is required'),
  xpath: z.string().min(1).optional(),
  confidence: z.number().min(0, 'Confidence must be >= 0').max(1, 'Confidence must be <= 1').optional(),
  reasoning: z.string().min(1, 'Reasoning must not be empty').optional(),
  interaction_type: z.enum([
    'click',
    'hover',
    'type',
    'select',
    'scroll',
    'submit',
    'drag',
    'drop',
    'check',
    'uncheck',
    'focus',
    'blur'
  ]),
  text: z.string().nullable().optional()
}).strict(); // <-- prevents extra fields

// Schema for validating generated test scripts
const TestActionSchema = z.object({
    action: z.enum(['click', 'type', 'wait', 'navigate', 'scroll', 'hover', 'select', 'check', 'uncheck', 'submit', 'assert']),
    selector: z.string().optional(), // Made optional since some actions like 'navigate' and 'wait' don't need selectors
    value: z.string().optional(),
    waitTime: z.number().optional(),
    description: z.string().min(1, 'Description is required'),
    expected: z.string().optional(),
    timeout: z.number().optional().default(30000)
}).refine((data) => {
    // Require selector for actions that need it
    const actionsRequiringSelector = ['click', 'type', 'hover', 'select', 'check', 'uncheck', 'submit', 'assert'];
    if (actionsRequiringSelector.includes(data.action) && !data.selector) {
        return false;
    }
    return true;
}, {
    message: "Selector is required for actions: click, type, hover, select, check, uncheck, submit, assert",
    path: ["selector"]
});

const TestScriptSchema = z.object({
    title: z.string().min(1, 'Test title is required'),
    description: z.string().min(1, 'Test description is required'),
    url: z.string().url('Valid URL is required'),
    steps: z.array(TestActionSchema).min(1, 'At least one test step is required'),
    assertions: z.array(TestActionSchema).optional(),
    setup: z.array(TestActionSchema).optional(),
    teardown: z.array(TestActionSchema).optional()
});

// Schema for test execution request
const TestExecutionRequestSchema = z.object({
    userStory: z.string().min(1, 'User story is required'),
    url: z.string().url('Valid URL is required'),
    options: z.object({
        headless: z.boolean().optional().default(true),
        timeout: z.number().optional().default(60000),
        viewport: z.object({
            width: z.number().optional().default(1920),
            height: z.number().optional().default(1080)
        }).optional(),
        waitForLoadState: z.enum(['load', 'domcontentloaded', 'networkidle']).optional().default('load'),
        screenshotOnFailure: z.boolean().optional().default(true),
        generateReport: z.boolean().optional().default(true)
    }).optional()
});

// Schema for Jira webhook payload
const JiraWebhookSchema = z.object({
    issue: z.object({
        fields: z.object({
            summary: z.string().optional(),
            description: z.string().optional(),
            issuetype: z.object({
                name: z.string()
            }).optional()
        }).optional()
    }).optional(),
    userStory: z.string().optional(),
    url: z.string().url().optional()
}).refine(data => data.issue?.fields?.summary || data.userStory, {
    message: "Either issue.fields.summary or userStory must be provided"
});

// Schema for test result update
const TestResultUpdateSchema = z.object({
    status: z.enum(['pending', 'running', 'completed', 'failed']).optional(),
    executionResults: z.array(z.any()).optional(),
    screenshots: z.array(z.any()).optional(),
    errors: z.array(z.any()).optional(),
    evidence: z.array(z.any()).optional(),
    executionTime: z.number().optional()
});

// Validation helper functions
const validateSelectors = (selectors) => { 
    try {
        return z.array(SelectorSchema).parse(selectors);
    } catch (error) {
        throw new Error(`Invalid selectors: ${error.message}`);
    }
};

const validateTestScript = (script) => {
    try {
        return TestScriptSchema.parse(script);
    } catch (error) {
        throw new Error(`Invalid test script: ${error.message}`);
    }
};

const validateTestExecutionRequest = (request) => {
    try {
        return TestExecutionRequestSchema.parse(request);
    } catch (error) {
        throw new Error(`Invalid test execution request: ${error.message}`);
    }
};

const validateJiraWebhook = (payload) => {
    try {
        return JiraWebhookSchema.parse(payload);
    } catch (error) {
        throw new Error(`Invalid Jira webhook payload: ${error.message}`);
    }
};

const validateTestResultUpdate = (update) => {
    try {
        return TestResultUpdateSchema.parse(update);
    } catch (error) {
        throw new Error(`Invalid test result update: ${error.message}`);
    }
};

module.exports = {
    SelectorSchema,
    TestActionSchema,
    TestScriptSchema,
    TestExecutionRequestSchema,
    JiraWebhookSchema,
    TestResultUpdateSchema,
    validateSelectors,
    validateTestScript,
    validateTestExecutionRequest,
    validateJiraWebhook,
    validateTestResultUpdate
};
