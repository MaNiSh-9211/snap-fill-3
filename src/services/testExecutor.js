// const PlaywrightUtils = require('./playwright/utils');
// const logger = require('../utils/logger');

// class TestExecutor {
//     constructor() {
//         this.playwrightUtils = new PlaywrightUtils();
//         this.executionContext = null;
//         this.failFast = true;
//     }
    
//     async executeTest(testScript, testResult, pageContext = null) {
//         const startTime = Date.now();
//         let currentStepIndex = 0;
//         let executionResults = [];
//         let success = true;
//         let failedStep = null;
//         let page = pageContext;
//         let browserCreated = false;
//         try {
//             logger.info('==================== TESTCASE EXECUTION START ====================');
//             logger.info(`Starting test execution: ${testScript.title}`);
//             // Initialize browser if not provided
//             if (!page) {
//                 await this.playwrightUtils.initializeBrowser({
//                     headless: true,
//                     viewport: { width: 1920, height: 1080 }
//                 });
//                 page = await this.playwrightUtils.getBrowserManager().getPage();
//                 browserCreated = true;
//             }
//             // Start DOM mutation tracking
//             await this.playwrightUtils.startMutationTracking(page);
//             // Navigate to initial URL if first testcase
//             if (testScript.url && (!pageContext || page.url() !== testScript.url)) {
//                 await this.playwrightUtils.getBrowserManager().navigateToUrl(testScript.url, page);
//             }
//             // Take initial screenshot
//             const initialScreenshot = await this.playwrightUtils.getBrowserManager().takeScreenshot(page);
//             await testResult.addEvidence('screenshot', initialScreenshot, 'Initial page load');
//             // Execute setup steps if any
//             if (testScript.setup && testScript.setup.length > 0) {
//                 logger.info('Executing setup steps');
//                 await testResult.addLog('info', 'Executing setup steps');
//                 for (const step of testScript.setup) {
//                     const stepResult = await this.executeStep(step, testResult, undefined, page);
//                     executionResults.push(stepResult);
//                     if (!stepResult.success && this.failFast) {
//                         success = false;
//                         failedStep = `setup-${testScript.setup.indexOf(step)}`;
//                         break;
//                     }
//                 }
//             }
//             // Execute main test steps
//             if (success) {
//                 logger.info(`Executing ${testScript.steps.length} test steps`);
//                 await testResult.addLog('info', `Executing ${testScript.steps.length} test steps`);
//                 for (const step of testScript.steps) {
//                     currentStepIndex++;
//                     const stepResult = await this.executeStep(step, testResult, currentStepIndex, page);
//                     executionResults.push(stepResult);
//                     if (!stepResult.success && this.failFast) {
//                         success = false;
//                         failedStep = `step-${currentStepIndex}`;
//                         logger.error(`Test failed at step ${currentStepIndex}: ${step.description}`);
//                         break;
//                     }
//                 }
//             }
//             // Execute assertions
//             if (success && testScript.assertions) {
//                 logger.info('Executing assertions');
//                 await testResult.addLog('info', 'Executing assertions');
//                 for (const assertion of testScript.assertions) {
//                     const assertionResult = await this.executeStep(assertion, testResult, undefined, page);
//                     executionResults.push(assertionResult);
//                     if (!assertionResult.success && this.failFast) {
//                         success = false;
//                         failedStep = `assertion-${testScript.assertions.indexOf(assertion)}`;
//                         break;
//                     }
//                 }
//             }
//             // Execute teardown steps
//             if (testScript.teardown && testScript.teardown.length > 0) {
//                 logger.info('Executing teardown steps');
//                 await testResult.addLog('info', 'Executing teardown steps');
//                 for (const step of testScript.teardown) {
//                     const stepResult = await this.executeStep(step, testResult, undefined, page);
//                     executionResults.push(stepResult);
//                 }
//             }
//             // Take final screenshot
//             const finalScreenshot = await this.playwrightUtils.getBrowserManager().takeScreenshot(page);
//             await testResult.addEvidence('screenshot', finalScreenshot, 'Final page state');
//             // Get DOM mutations
//             const mutations = await this.playwrightUtils.getMutations(page);
//             await testResult.addEvidence('dom', mutations, 'DOM mutations during test');
//             const executionTime = Date.now() - startTime;
//             // Get updated HTML
//             const updatedHtml = await page.content();
//             logger.info(`Test execution completed: ${success ? 'SUCCESS' : 'FAILED'} (${executionTime}ms)`);
//             logger.info('==================== TESTCASE EXECUTION END ====================');
//             return {
//                 success,
//                 steps: executionResults,
//                 failedStep,
//                 executionTime,
//                 totalSteps: testScript.steps.length,
//                 completedSteps: currentStepIndex,
//                 updatedHtml,
//                 page // return page for reuse
//             };
//         } catch (error) {
//             logger.error('Test execution failed:', error);
//             await testResult.addError(error, { step: 'test-execution' });
//             try {
//                 const errorScreenshot = await this.playwrightUtils.getBrowserManager().takeScreenshot(page);
//                 await testResult.addEvidence('screenshot', errorScreenshot, 'Error screenshot');
//             } catch (screenshotError) {
//                 logger.error('Failed to take error screenshot:', screenshotError);
//             }
//             const executionTime = Date.now() - startTime;
//             logger.info('==================== TESTCASE EXECUTION END (ERROR) ====================');
//             return {
//                 success: false,
//                 steps: executionResults,
//                 failedStep: `step-${currentStepIndex}`,
//                 executionTime,
//                 totalSteps: testScript.steps.length,
//                 completedSteps: currentStepIndex,
//                 error: error.message,
//                 updatedHtml: page ? await page.content() : '',
//                 page
//             };
//         } finally {
//             // Only cleanup if we created the browser
//             if (browserCreated) {
//                 await this.playwrightUtils.cleanup();
//             }
//         }
//     }
    
//     async executeStep(step, testResult, stepIndex = 0, page = null) {
//         const stepStart = Date.now();
        
//         try {
//             logger.info(`Executing step ${stepIndex}: ${step.action} - ${step.description}`);
            
//             await testResult.addLog('info', `Step ${stepIndex}: ${step.description}`, {
//                 action: step.action,
//                 selector: step.selector,
//                 value: step.value
//             });
            
//             // Take screenshot before action
//             const beforeScreenshot = await this.playwrightUtils.getBrowserManager().takeScreenshot(page);
//             await testResult.addEvidence('screenshot', beforeScreenshot, `Before step ${stepIndex}: ${step.description}`);
            
//             let result = null;
            
//             // Execute action based on type
//             switch (step.action) {
//                 case 'click':
//                     result = await this.executeClick(step, page);
//                     break;
//                 case 'type':
//                     result = await this.executeType(step, page);
//                     break;
//                 case 'wait':
//                     result = await this.executeWait(step, page);
//                     break;
//                 case 'navigate':
//                     result = await this.executeNavigate(step, page);
//                     break;
//                 case 'scroll':
//                     result = await this.executeScroll(step, page);
//                     break;
//                 case 'hover':
//                     result = await this.executeHover(step, page);
//                     break;
//                 case 'select':
//                     result = await this.executeSelect(step, page);
//                     break;
//                 case 'check':
//                     result = await this.executeCheck(step, page);
//                     break;
//                 case 'uncheck':
//                     result = await this.executeUncheck(step, page);
//                     break;
//                 case 'submit':
//                     result = await this.executeSubmit(step, page);
//                     break;
//                 case 'assert':
//                     result = await this.executeAssert(step, page);
//                     break;
//                 default:
//                     throw new Error(`Unknown action: ${step.action}`);
//             }
            
//             // Take screenshot after action
//             const afterScreenshot = await this.playwrightUtils.getBrowserManager().takeScreenshot(page);
//             await testResult.addEvidence('screenshot', afterScreenshot, `After step ${stepIndex}: ${step.description}`);
            
//             const stepTime = Date.now() - stepStart;
            
//             const stepResult = {
//                 stepIndex,
//                 action: step.action,
//                 selector: step.selector,
//                 description: step.description,
//                 success: true,
//                 result,
//                 executionTime: stepTime,
//                 timestamp: new Date()
//             };
            
//             logger.info(`Step ${stepIndex} completed successfully (${stepTime}ms)`);
            
//             return stepResult;
            
//         } catch (error) {
//             logger.error(`Step ${stepIndex} failed:`, error);
            
//             await testResult.addError(error, { 
//                 step: stepIndex,
//                 action: step.action,
//                 selector: step.selector,
//                 description: step.description
//             });
            
//             // Take error screenshot
//             try {
//                 const errorScreenshot = await this.playwrightUtils.getBrowserManager().takeScreenshot(page);
//                 await testResult.addEvidence('screenshot', errorScreenshot, `Error at step ${stepIndex}: ${step.description}`);
//             } catch (screenshotError) {
//                 logger.error('Failed to take error screenshot:', screenshotError);
//             }
            
//             const stepTime = Date.now() - stepStart;
            
//             return {
//                 stepIndex,
//                 action: step.action,
//                 selector: step.selector,
//                 description: step.description,
//                 success: false,
//                 error: error.message,
//                 executionTime: stepTime,
//                 timestamp: new Date()
//             };
//         }
//     }
    
//     async executeClick(step, page) {
//         // Wait for element to be clickable
//         await this.playwrightUtils.getBrowserManager().waitForSelector(step.selector, {
//             timeout: step.timeout || 30000,
//             state: 'visible',
//             page: page
//         });
        
//         // Wait for element to be stable
//         await this.playwrightUtils.waitForElementStable(step.selector, page);
        
//         // Highlight element before clicking
//         await this.playwrightUtils.highlightElement(step.selector, page);
        
//         // Click the element
//         await this.playwrightUtils.getBrowserManager().click(step.selector, page);
        
//         // Wait for any potential navigation or loading
//         await new Promise(resolve => setTimeout(resolve, 1000));
        
//         return { clicked: true };
//     }
    
//     async executeType(step, page) {
//         if (!step.value) {
//             throw new Error('Type action requires a value');
//         }
        
//         // Wait for element to be visible
//         await this.playwrightUtils.getBrowserManager().waitForSelector(step.selector, {
//             timeout: step.timeout || 30000,
//             state: 'visible',
//             page: page
//         });
        
//         // Clear existing content first
//         await this.playwrightUtils.getBrowserManager().click(step.selector, page);
//         await this.playwrightUtils.getBrowserManager().getPage().keyboard.down('Control', { page: page });
//         await this.playwrightUtils.getBrowserManager().getPage().keyboard.press('KeyA', { page: page });
//         await this.playwrightUtils.getBrowserManager().getPage().keyboard.up('Control', { page: page });
        
//         // Type the value
//         await this.playwrightUtils.getBrowserManager().type(step.selector, step.value, page);
        
//         return { typed: step.value };
//     }
    
//     async executeWait(step, page) {
//         const waitTime = step.waitTime || 1000;
        
//         if (step.selector) {
//             // Wait for selector
//             await this.playwrightUtils.getBrowserManager().waitForSelector(step.selector, {
//                 timeout: step.timeout || 30000,
//                 page: page
//             });
//         } else {
//             // Wait for time
//             await new Promise(resolve => setTimeout(resolve, waitTime));
//         }
        
//         return { waited: waitTime };
//     }
    
//     async executeNavigate(step, page) {
//         if (!step.value) {
//             throw new Error('Navigate action requires a URL value');
//         }
        
//         await this.playwrightUtils.getBrowserManager().navigateToUrl(step.value, page);
        
//         return { navigated: step.value };
//     }
    
//     async executeScroll(step, page) {
//         if (step.selector) {
//             // Scroll to element
//             await this.playwrightUtils.getBrowserManager().getPage().locator(step.selector, { page: page }).scrollIntoViewIfNeeded();
//         } else {
//             // Scroll by amount
//             const scrollY = step.value ? parseInt(step.value) : 500;
//             await this.playwrightUtils.getBrowserManager().scroll({ y: scrollY, page: page });
//         }
        
//         return { scrolled: true };
//     }
    
//     async executeHover(step, page) {
//         await this.playwrightUtils.getBrowserManager().waitForSelector(step.selector, {
//             timeout: step.timeout || 30000,
//             state: 'visible',
//             page: page
//         });
        
//         await this.playwrightUtils.getBrowserManager().hover(step.selector, page);
        
//         return { hovered: true };
//     }
    
//     async executeSelect(step, page) {
//         if (!step.value) {
//             throw new Error('Select action requires a value');
//         }
        
//         await this.playwrightUtils.getBrowserManager().waitForSelector(step.selector, {
//             timeout: step.timeout || 30000,
//             state: 'visible',
//             page: page
//         });
        
//         await this.playwrightUtils.getBrowserManager().select(step.selector, step.value, page);
        
//         return { selected: step.value };
//     }
    
//     async executeCheck(step, page) {
//         await this.playwrightUtils.getBrowserManager().waitForSelector(step.selector, {
//             timeout: step.timeout || 30000,
//             state: 'visible',
//             page: page
//         });
        
//         await this.playwrightUtils.getBrowserManager().check(step.selector, page);
        
//         return { checked: true };
//     }
    
//     async executeUncheck(step, page) {
//         await this.playwrightUtils.getBrowserManager().waitForSelector(step.selector, {
//             timeout: step.timeout || 30000,
//             state: 'visible',
//             page: page
//         });
        
//         await this.playwrightUtils.getBrowserManager().uncheck(step.selector, page);
        
//         return { unchecked: true };
//     }
    
//     async executeSubmit(step, page) {
//         await this.playwrightUtils.getBrowserManager().waitForSelector(step.selector, {
//             timeout: step.timeout || 30000,
//             state: 'visible',
//             page: page
//         });
        
//         // Submit the form
//         await this.playwrightUtils.getBrowserManager().getPage().evaluate((selector) => {
//             const element = document.querySelector(selector);
//             if (element.tagName === 'FORM') {
//                 element.submit();
//             } else {
//                 // Find parent form and submit
//                 const form = element.closest('form');
//                 if (form) {
//                     form.submit();
//                 }
//             }
//         }, step.selector, page);
        
//         // Wait for navigation or response
//         await new Promise(resolve => setTimeout(resolve, 2000));
        
//         return { submitted: true };
//     }
    
//     async executeAssert(step, page) {
//         if (!step.expected) {
//             throw new Error('Assert action requires an expected value');
//         }
        
//         await this.playwrightUtils.getBrowserManager().waitForSelector(step.selector, {
//             timeout: step.timeout || 30000,
//             state: 'visible',
//             page: page
//         });
        
//         const actualValue = await this.playwrightUtils.getBrowserManager().getText(step.selector, page);
//         const expected = step.expected;
        
//         if (actualValue.trim() !== expected.trim()) {
//             throw new Error(`Assertion failed: expected "${expected}" but got "${actualValue}"`);
//         }
        
//         return { 
//             asserted: true,
//             expected,
//             actual: actualValue
//         };
//     }
// }

// module.exports = new TestExecutor();



// ✅ UPDATED: HEADLESS MODE DISABLED
// ✅ UPDATED: HANDLE generatedSelectors DIRECTLY
// ✅ UPDATED: USE interaction_type TO MAP TO CORRECT FUNCTION
// ✅ UPDATED: PREFER XPATH IF AVAILABLE

const PlaywrightUtils = require('./playwright/utils');
const logger = require('../utils/logger');

class TestExecutor {
    constructor() {
        this.playwrightUtils = new PlaywrightUtils();
        this.executionContext = null;
        this.failFast = true;
    }

    async executeTest(selectors, state) {
        const startTime = Date.now();
        let executionResults = [];
        let success = true;
        let failedStep = null;
        let page = state.page;
        let browserCreated = false;
        const testResult = state.testResult;

        try {
            console.log('==================== TESTCASE EXECUTION START ====================');
            console.log(`Starting test execution with ${selectors.length} selectors`);

            if (!page) {
                await this.playwrightUtils.initializeBrowser({
                    headless: false,
                    viewport: { width: 1280, height: 800 }
                });
                page = await this.playwrightUtils.getBrowserManager().getPage();
                browserCreated = true;
            }

            else if (state.url) {
                await this.playwrightUtils.getBrowserManager().navigateToUrl(state.url, page);
            }
// ✅ Register early to catch future navigations
page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) {
        console.log("✅ Page URL changed to:", frame.url());
        state.url = frame.url(); // update state with the new URL
    }
});


          try {
    const response = await page.goto(state.url, { waitUntil: 'domcontentloaded', timeout: 10000 });
    if (!response.ok()) {
        throw new Error(`Navigation failed with status: ${response.status()} ${response.statusText()}`);
    }
} catch (error) {
    const html = await page.content();
    logger.error('Navigation failed with error:', {
        message: error.message,
        htmlPreview: html.slice(0, 500)
    });
    throw error;
}

            // await this.playwrightUtils.startMutationTracking(page);

            // const initialScreenshot = await this.playwrightUtils.getBrowserManager().takeScreenshot(page);
            // await testResult.addEvidence('screenshot', initialScreenshot, 'Initial state');

           for (let i = 0; i < selectors.length; i++) {
    const sel = selectors[i];

    // 🔁 Execute the step and wait for any possible navigation
    const [stepResult] = await Promise.all([
        this.executeStep(sel, i, page, testResult),
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {})
    ]);

    executionResults.push(stepResult);

    // 🌐 Update state with latest URL and HTML
    const currentUrl = page.url();
    const updatedHtml = await page.content();

    state.url = currentUrl;
    state.htmlContent = updatedHtml;

    console.log(`✅ Step ${i} completed. Updated URL: ${currentUrl}`);
    console.log(`🧬 HTML length: ${updatedHtml.length}`);

    if (!stepResult.success && this.failFast) {
        success = false;
        failedStep = `step-${i}`;
        break;
    }
}


            
            // const finalScreenshot = await this.playwrightUtils.getBrowserManager().takeScreenshot(page);
            // await testResult.addEvidence('screenshot', finalScreenshot, 'Final state');

            // const mutations = await this.playwrightUtils.getMutations(page);
            // await testResult.addEvidence('dom', mutations, 'DOM mutations during test');

            const executionTime = Date.now() - startTime;
            // const updatedHtml = await page.content();

            logger.info(`Test execution completed: ${success ? 'SUCCESS' : 'FAILED'} (${executionTime}ms)`);
            console.log('==================== TESTCASE EXECUTION END ====================');

            
        // ✅ Update the graph state
        state.page = page;  // Keep browser state alive
        state.testResult.status = success ? 'success' : 'failure';
        state.testResult.log.push(`Test ${success ? 'succeeded' : 'failed'} in ${executionTime}ms`);
        // state.url = page.url();  // Update current page URL
        ContentVisibilityAutoStateChangeEvent.logger.info(`Test completed with status: ${state.testResult.status}`);
        console.log("===================================Next url to be scraped is :", state.url);
            return {
                success,
                steps: executionResults,
                // failedStep,
                executionTime,
                page
            };
        } catch (error) {
            logger.error('Execution error:', error);
await testResult.addLog('error', error.message, { step: 'test-execution' });
            return {
                success: false,
                steps: executionResults,
                failedStep,
                executionTime: Date.now() - startTime,
                error: error.message,
                // updatedHtml: page ? await page.content() : '',
                page
            };
        } finally {
            // if (browserCreated) {
            //     await this.playwrightUtils.cleanup();
            // }
        }
    }

    // async executeStep(sel, index, page, testResult) {
    //     const start = Date.now();
    //     const selector = sel.xpath || sel.selector;
    //     const action = sel.interaction_type;

    //     try {
    //         logger.info(`Executing step ${index}: ${action} on ${selector}`);
    //         await testResult.addLog('info', `Step ${index}`, sel);

    //         // const before = await this.playwrightUtils.getBrowserManager().takeScreenshot(page);
    //         // await testResult.addEvidence('screenshot', before, `Before step ${index}`);

    //         if (!selector) 
    //             throw new Error('Selector or XPath is required');

    //         // await this.playwrightUtils.getBrowserManager().waitForSelector(selector, {
    //         //     timeout: 30000,
    //         //     state: 'visible',
    //         //     page
    //         // });

    //         console.log(`Waiting for selector: ${selector}`);
    //         // Wait for the selector to be visible
    //         await this.playwrightUtils.getBrowserManager().waitForSelector(selector, {
    //             timeout: 30000,
    //             state: 'visible',
    //             page
    //         });
    //         // Wait for the element to be stable
    //                     // await page.waitForSelector('selector', { state: 'visible' });
    //         await this.playwrightUtils.waitForElementStable(selector, page);
    //         // Highlight the element before interaction
    //         console.log(`Highlighting element: ${selector}`);
            
    //         await this.playwrightUtils.highlightElement(selector, page);

    //         // const result = await this._performAction(action, 'selector', sel.value, page);
    //         const result = await this._performAction(action, 'selector', sel.value, page, sel.text ?? null);
    //         console.log(`Step ${index} executed successfully: ${result}`);
            

            
    //         // const after = await this.playwrightUtils.getBrowserManager().takeScreenshot(page);
    //         // await testResult.addEvidence('screenshot', after, `After step ${index}`);

    //         return {
    //             stepIndex: index,
    //             action,
    //             selector,
    //             description: sel.element,
    //             success: true,
    //             result,
    //             executionTime: Date.now() - start,
    //             timestamp: new Date()
    //         };
    //     } catch (err) {
    //         logger.error(`Step ${index} failed:`, err);
    //         // await testResult.addError(err, { step: index, selector, action });
    //         await testResult.addLog('error', error.message, { step: 'test-execution' });
    //         try {
    //             const errShot = await this.playwrightUtils.getBrowserManager().takeScreenshot(page);
    //             await testResult.addEvidence('screenshot', errShot, `Error step ${index}`);
    //         } catch (e) {
    //             logger.error('Error taking screenshot:', e);
    //         }

    //         return {
    //             stepIndex: index,
    //             action,
    //             selector,
    //             description: sel.element,
    //             success: false,
    //             error: err.message,
    //             executionTime: Date.now() - start,
    //             timestamp: new Date()
    //         };
    //     }
    // }

    async executeStep(sel, index, page, testResult) {
    const start = Date.now();
    const selector = sel.xpath;
    const action = sel.interaction_type;

    console.log(`🟡 Step ${index}: Attempting to execute "${action}" on selector: ${selector}`);

    let stepResult = {
        success: false,
        stepIndex: index,
        action,
        selector,
        errorMessage: '',
        evidence: null
    };

    try {
        await testResult?.addLog?.('info', `Step ${index}`, sel);

        if (!selector) {
            const msg = `Missing selector or XPath`;
            console.log(`🔴 Step ${index}: ${msg}`);
            stepResult.errorMessage = msg;
            return stepResult;
        }

        try {
            const result = await this._performAction?.(
                action,
                selector,
                sel.value,
                page,
                sel.text ?? null
            );
            console.log(`✅ Step ${index}: Action completed successfully: ${result}`);
            stepResult.success = true;
        } catch (actionErr) {
            console.log(`❌ Step ${index}: Action execution failed: ${actionErr.message}`);
            stepResult.errorMessage = actionErr.message;
        }

    } catch (mainErr) {
        console.log(`🛑 Step ${index}: Unexpected failure: ${mainErr.message}`);
        stepResult.errorMessage = mainErr.message;
    }

    // try {
    //     const shot = await page?.screenshot?.({ fullPage: true }).catch(() => null);
    //     if (shot) {
    //         await testResult?.addEvidence?.('screenshot', shot, `Step ${index} evidence`);
    //         stepResult.evidence = shot;
    //     }
    // } catch (screenshotErr) {
    //     console.log(`⚠️ Step ${index}: Screenshot failed: ${screenshotErr.message}`);
    // }

    console.log(`⏱️ Step ${index} finished in ${Date.now() - start} ms`);
    return stepResult;
}


async _performAction(type, selector, value, page, text = null) {
    console.log(`==================Performing action: ${type} on ${selector} with value: ${value} and text: ${text}=====================`);

    try {
        switch (type) {
            case 'click':
                await this.playwrightUtils.getBrowserManager().click(selector, page);
                return true;

            case 'hover':
                await this.playwrightUtils.getBrowserManager().hover(selector, page);
                return true;

            case 'type':
                if (!text) throw new Error(`Missing text for 'type' action on selector: ${selector}`);
                await this.playwrightUtils.getBrowserManager().type(selector, text, page);
                return true;

            case 'scroll':
                await this.playwrightUtils.getBrowserManager().getPage().locator(selector).scrollIntoViewIfNeeded();
                return true;

            case 'select':
                await this.playwrightUtils.getBrowserManager().select(selector, value, page);
                return true;

            case 'submit':
                await this.playwrightUtils.getBrowserManager().getPage().evaluate((sel) => {
                    const el = document.evaluate(sel, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    if (el && el.closest('form')) el.closest('form').submit();
                }, selector);
                return true;

            case 'check':
                await this.playwrightUtils.getBrowserManager().check(selector, page);
                return true;

            case 'uncheck':
                await this.playwrightUtils.getBrowserManager().uncheck(selector, page);
                return true;

            case 'focus':
                await this.playwrightUtils.getBrowserManager().getPage().focus(selector);
                return true;

            case 'blur':
                await this.playwrightUtils.getBrowserManager().getPage().evaluate(sel => {
                    const el = document.evaluate(sel, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    if (el) el.blur();
                }, selector);
                return true;

            default:
                throw new Error(`Unknown interaction type: ${type}`);
        }
    } catch (err) {
        console.error(`❌ Action failed: ${type} on ${selector}. Error: ${err.message}`);
        return false;
    }
}

}

module.exports = new TestExecutor();
