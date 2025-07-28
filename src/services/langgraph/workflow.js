const { StateGraph, END } = require('@langchain/langgraph');
const { WorkflowStateSchema } = require('./states');
const htmlProcessor = require('../htmlProcessor');
const groqService = require('../llm/groqService');
const testExecutor = require('../testExecutor');
const reportGenerator = require('../reportGenerator');
const logger = require('../../utils/logger');
const testcaseParser = require('../../utils/testcaseParser');

class TestAutomationWorkflow {
    constructor() {
        this.graph = new StateGraph(WorkflowStateSchema);
        this.setupWorkflow();
    }
    
    // setupWorkflow() {
    //     // Add nodes to the workflow
    //     this.graph.addNode('initialize', this.initializeNode.bind(this));
    //     this.graph.addNode('fetchAndCleanHtml', this.fetchAndCleanHtmlNode.bind(this));
    //     this.graph.addNode('generateSelectors', this.generateSelectorsNode.bind(this));
    //     // this.graph.addNode('generateTestScript', this.generateTestScriptNode.bind(this));
    //     this.graph.addNode('executeTest', this.executeTestNode.bind(this));
    //     this.graph.addNode('generateReport', this.generateReportNode.bind(this));
    //     this.graph.addNode('handleError', this.handleErrorNode.bind(this));
        
    //     // Define workflow edges
    //     this.graph.addEdge('initialize', 'fetchAndCleanHtml');
    //     this.graph.addEdge('fetchAndCleanHtml', 'generateSelectors');
    //     // this.graph.addEdge('generateSelectors', 'generateTestScript');
    //     // this.graph.addEdge('generateTestScript', 'executeTest');
    //      this.graph.addEdge('generateSelectors', 'executeTest');
    //     this.graph.addEdge('executeTest', 'generateReport');
    //     this.graph.addEdge('generateReport', END);
    //     this.graph.addEdge('handleError', END);
        
    //     // Set conditional edges for error handling
    //     this.graph.addConditionalEdges('fetchAndCleanHtml', this.shouldContinueOrError.bind(this));
    //     this.graph.addConditionalEdges('generateSelectors', this.shouldContinueOrError.bind(this));
    //     // this.graph.addConditionalEdges('generateTestScript', this.shouldContinueOrError.bind(this));
    //     this.graph.addConditionalEdges('executeTest', this.shouldContinueOrError.bind(this));
        
    //     // Set entry point
    //     this.graph.setEntryPoint('initialize');
        
    //     // Compile the graph
    //     this.workflow = this.graph.compile();
    // }
    


    setupWorkflow() {
    // 🟢 Registering nodes
    this.graph.addNode('initialize', this.initializeNode.bind(this));
    this.graph.addNode('fetchAndCleanHtml', this.fetchAndCleanHtmlNode.bind(this));
    this.graph.addNode('generateSelectors', this.generateSelectorsNode.bind(this));
    this.graph.addNode('executeTest', this.executeTestNode.bind(this));
    this.graph.addNode('handleError', this.handleErrorNode.bind(this));

    // 🔄 MAIN FLOW: Setup edges to run one after the other
    this.graph.addEdge('initialize', 'fetchAndCleanHtml');
    this.graph.addEdge('fetchAndCleanHtml', 'generateSelectors');
    this.graph.addEdge('generateSelectors', 'executeTest');

    // 🔁 🔁 🔁 INFINITE LOOP BACK TO fetchAndCleanHtml FROM executeTest
    this.graph.addEdge('executeTest', 'fetchAndCleanHtml'); // 🆕 THIS IS NEW

    // ❌ REMOVED: Conditional edge after executeTest that stopped the flow
    /*
    this.graph.addConditionalEdges('executeTest', (state) => {
        return state.shouldContinue
            ? { path: 'loop', next: 'fetchAndCleanHtml' }
            : { path: 'end', next: END };
    });
    */

    // ✅ KEEP ERROR HANDLING CONDITIONALS AS IS
    this.graph.addConditionalEdges('fetchAndCleanHtml', this.shouldContinueOrError.bind(this));
    this.graph.addConditionalEdges('generateSelectors', this.shouldContinueOrError.bind(this));

    // 🔧 Slight change: Added dummy edge for handleError to prevent issues if called
    this.graph.addConditionalEdges('handleError', () => ({ path: 'end', next: 'handleError' }));

    // 🎯 ENTRY POINT
    this.graph.setEntryPoint('initialize');

    // 🛠️ COMPILE WORKFLOW
    this.workflow = this.graph.compile();
}


    async initializeNode(state) {
        try {
            logger.info(`Initializing workflow for test: ${state.testId}`);
            
            await state.testResult.addLog('info', 'Workflow initialized', {
                userStory: state.userStory,
                url: state.url
            });
            
            return {
                ...state,
                status: 'initialized',
                startTime: new Date()
            };
        } catch (error) {
            logger.error('Failed to initialize workflow:', error);
            return {
                ...state,
                status: 'failed',
                error: error.message
            };
        }
    }
    
    // async fetchAndCleanHtmlNode(state) {
    //     try {
    //         logger.info(`Fetching and cleaning HTML for: ${state.url}`);
            
    //         await state.testResult.addLog('info', 'Fetching HTML content', { url: state.url });
            
    //         // Fetch HTML content
    //         const htmlContent = await htmlProcessor.fetchHtml(state.url);
            
    //         await state.testResult.addLog('info', 'HTML content fetched', { 
    //             contentLength: htmlContent.length 
    //         });
            
    //         // Clean HTML for token optimization
    //         const cleanedHtml = await htmlProcessor.cleanHtml(htmlContent);
    //         const tokenCount = await htmlProcessor.estimateTokens(cleanedHtml);
            
    //         await state.testResult.addLog('info', 'HTML content cleaned', { 
    //             originalLength: htmlContent.length,
    //             cleanedLength: cleanedHtml.length,
    //             tokenCount
    //         });
            
    //         // Update test result
    //         await state.testResult.update({
    //             htmlContent,
    //             cleanedHtml,
    //             tokenCount,
    //             status: 'html_processed'
    //         });
            
    //         return {
    //             ...state,
    //             htmlContent,
    //             cleanedHtml,
    //             tokenCount,
    //             status: 'html_processed'
    //         };
    //     } catch (error) {
    //         logger.error('Failed to fetch and clean HTML:', error);
    //         await state.testResult.addError(error, { step: 'fetchAndCleanHtml' });
            
    //         return {
    //             ...state,
    //             status: 'failed',
    //             error: error.message
    //         };
    //     }
    // }
    
//     async fetchAndCleanHtmlNode(state) {
//     try {
//         logger.info(`Fetching and cleaning HTML for: ${state.url}`);
//         await state.testResult.addLog('info', 'Fetching HTML content', { url: state.url });

//         // Fetch HTML content
//         const htmlContent = await htmlProcessor.fetchHtml(state.url);
//         console.log('Fetched HTML:', htmlContent);  // Debug print

//         await state.testResult.addLog('info', 'HTML content fetched', {
//             contentLength: htmlContent.length
//         });

//         // Clean HTML for token optimization
//         const cleanedHtml = await htmlProcessor.cleanHtml(htmlContent);
//         console.log('Cleaned HTML:', cleanedHtml);  // Debug print

//         const tokenCount = await htmlProcessor.estimateTokens(cleanedHtml);

//         await state.testResult.addLog('info', 'HTML content cleaned', {
//             originalLength: htmlContent.length,
//             cleanedLength: cleanedHtml.length,
//             tokenCount
//         });

//         await state.testResult.update({
//             htmlContent,
//             cleanedHtml,
//             tokenCount,
//             status: 'html_processed'
//         });

//         return {
//             ...state,
//             htmlContent,
//             cleanedHtml,
//             tokenCount,
//             status: 'html_processed'
//         };
//     } catch (error) {
//         logger.error('Failed to fetch and clean HTML:', error);
//         await state.testResult.addError(error, { step: 'fetchAndCleanHtml' });

//         return {
//             ...state,
//             status: 'failed',
//             error: error.message
//         };
//     }
// }


// async fetchAndCleanHtmlNode(state) {
//     try {
//         logger.info(`Fetching and cleaning HTML for: ${state.url}`);
//         await state.testResult.addLog('info', 'Fetching HTML content', { url: state.url });

//         // Fetch HTML content
//         const htmlContent = await htmlProcessor.fetchHtml(state.url);
//         console.log('Fetched HTML:', htmlContent);  // Debug print

//         await state.testResult.addLog('info', 'HTML content fetched', {
//             contentLength: htmlContent?.length || 0
//         });

//         // Clean HTML for token optimization
//         const cleanedHtml = await htmlProcessor.cleanHtml(htmlContent);
//         console.log('Cleaned HTML:', cleanedHtml);  // Debug print

//         const tokenCount = cleanedHtml
//             ? await htmlProcessor.estimateTokens(cleanedHtml)
//             : 0;

//         await state.testResult.addLog('info', 'HTML content cleaned', {
//             originalLength: htmlContent?.length || 0,
//             cleanedLength: cleanedHtml?.length || 0,
//             tokenCount
//         });

//         if (state.testResult && typeof state.testResult.update === 'function') {
//             await state.testResult.update({
//                 htmlContent,
//                 cleanedHtml,
//                 tokenCount,
//                 status: 'html_processed'
//             });
//         }

//         return {
//             ...state,
//             htmlContent,
//             cleanedHtml,
//             tokenCount,
//             status: 'html_processed'
//         };
//     } catch (error) {
//         logger.error('Failed to fetch and clean HTML:', error);
//         await state.testResult.addError(error, { step: 'fetchAndCleanHtml' });

//         return {
//             ...state,
//             status: 'failed',
//             error: error.message
//         };
//     }
// }

async fetchAndCleanHtmlNode(state) {
    try {
        logger.info(`Fetching and cleaning HTML for: ${state.url}`);
        await state.testResult.addLog('info', 'Processing HTML content', { url: state.url });

        let htmlContent = state.htmlContent;

        // ✅ If not already present, fetch HTML from the page URL
        if (!htmlContent) {
            htmlContent = await htmlProcessor.fetchHtml(state.url);
            console.log('✅ Fetched HTML:', htmlContent?.slice(0, 500));  // Preview print

            await state.testResult.addLog('info', 'HTML content fetched', {
                contentLength: htmlContent?.length || 0
            });

            // ✅ Store fetched HTML in state for reuse
            state.htmlContent = htmlContent;
        } else {
            console.log('ℹ️ Using existing HTML content from state');
        }

        // ✅ Clean the HTML content
        const cleanedHtml = await htmlProcessor.cleanHtml(htmlContent);
        console.log('🧹 Cleaned HTML Preview:', cleanedHtml?.slice(0, 500));

        const tokenCount = cleanedHtml
            ? await htmlProcessor.estimateTokens(cleanedHtml)
            : 0;

        await state.testResult.addLog('info', 'HTML content cleaned', {
            originalLength: htmlContent?.length || 0,
            cleanedLength: cleanedHtml?.length || 0,
            tokenCount
        });

        // ✅ Update state object and test result tracker
        if (state.testResult && typeof state.testResult.update === 'function') {
            await state.testResult.update({
                htmlContent,
                cleanedHtml,
                tokenCount,
                status: 'html_processed'
            });
        }

        return {
            ...state,
            htmlContent,     // keep original HTML
            cleanedHtml,     // store cleaned HTML
            tokenCount,
            status: 'html_processed'
        };
    } catch (error) {
        logger.error('❌ Failed to fetch and clean HTML:', error);
        await state.testResult.addError(error, { step: 'fetchAndCleanHtml' });

        return {
            ...state,
            status: 'failed',
            error: error.message
        };
    }
}


//     async generateSelectorsNode(state) {
//         try {
//             logger.info(`Generating selectors for test: ${state.testId}`);
            
//             await state.testResult.addLog('info', 'Generating element selectors', {
//                 userStory: state.userStory
//             });
            
//             const selectors = await groqService.generateSelectors(
//                 state.userStory,
//                 state.cleanedHtml
//             );
            
//             await state.testResult.addLog('info', 'Selectors generated', {
//                 selectorCount: selectors.length
//             });
            
//             // Update test result
//             // await state.testResult.update({
//             //     generatedSelectors: selectors,
//             //     status: 'selectors_generated'
//             // });
            
//             return {
//                 ...state,
//                 generatedSelectors: selectors,
//                 status: 'selectors_generated'
//             };
//         } catch (error) {
//   logger.error('Failed to generate selectors:', error);

// //   try {
// //     await state.testResult.update({
// //       status: 'failed',
// //       error: error.message,
// //       failedStep: 'generateSelectors'
// //     });
// //   } catch (loggingError) {
// //     logger.error('Failed to log the error to testResult:', loggingError);
// //   }

//   return {
//     ...state,
//     status: 'failed',
//     error: error.message
//   };
//         }
//     }
    

async generateSelectorsNode(state) {
    try {
        logger.info(`Generating selectors for test: ${state.testId}`);
        
        await state.testResult.addLog('info', 'Generating element selectors', {
            userStory: state.userStory
        });
        
        const selectors = await groqService.generateSelectors(
            state.userStory,
            state.cleanedHtml,
            state
        );
        
        await state.testResult.addLog('info', 'Selectors generated', {
            selectorCount: selectors.length
        });

        const updatedState = {
            ...state,
            generatedSelectors: selectors,
            status: 'selectors_generated'
        };

        console.log('[generateSelectorsNode] Updated state:', JSON.stringify(updatedState, null, 2));

        return updatedState;

    } catch (error) {
        logger.error('Failed to generate selectors:', error);

        return {
            ...state,
            status: 'failed',
            error: error.message
        };
    }
}

    // async generateTestScriptNode(state) {
    //     try {
    //         logger.info(`Generating test script for test: ${state.testId}`);
            
    //         await state.testResult.addLog('info', 'Generating test script', {
    //             userStory: state.userStory,
    //             selectorCount: state.generatedSelectors.length
    //         });
            
    //         const testScript = await groqService.generateTestScript(
    //             state.userStory,
    //             state.generatedSelectors,
    //             state.cleanedHtml
    //         );
            
    //         await state.testResult.addLog('info', 'Test script generated', {
    //             stepCount: testScript.steps.length,
    //             title: testScript.title
    //         });
            
    //         // Update test result
    //         await state.testResult.update({
    //             generatedScript: testScript,
    //             status: 'script_generated'
    //         });
            
    //         return {
    //             ...state,
    //             generatedScript: testScript,
    //             status: 'script_generated'
    //         };
    //     } catch (error) {
    //         logger.error('Failed to generate test script:', error);
    //         // await state.testResult.addError(error, { step: 'generateTestScript' });
            
    //         // return {
    //         //     ...state,
    //         //     status: 'failed',
    //         //     error: error.message
    //         // };
    //     }
    // }
    
    // async executeTestNode(state) {
    //     try {
    //         logger.info(`Executing test: ${state.testId}`);
            
    //         await state.testResult.addLog('info', 'Starting test execution', {
    //             scriptTitle: state.generatedScript.title
    //         });
            
    //         const executionResult = await testExecutor.executeTest(
    //             state.generatedScript,
    //             state.testResult,
    //             state.page // Pass the page to the executor
    //         );
            
    //         await state.testResult.addLog('info', 'Test execution completed', {
    //             success: executionResult.success,
    //             stepCount: executionResult.steps.length,
    //             failedStep: executionResult.failedStep
    //         });
            
    //         const finalStatus = executionResult.success ? 'completed' : 'failed';
            
    //         // Update test result
    //         await state.testResult.update({
    //             executionResults: executionResult.steps,
    //             status: finalStatus,
    //             executionTime: executionResult.executionTime
    //         });
            
    //         return {
    //             ...state,
    //             executionResults: executionResult.steps,
    //             status: finalStatus,
    //             executionTime: executionResult.executionTime,
    //             testSuccess: executionResult.success,
    //             updatedHtml: executionResult.updatedHtml, // Add updatedHtml to state
    //             page: executionResult.page // Add page to state
    //         };
    //     } catch (error) {
    //         logger.error('Failed to execute test:', error);
    //         await state.testResult.addError(error, { step: 'executeTest' });
            
    //         return {
    //             ...state,
    //             status: 'failed',
    //             error: error.message
    //         };
    //     }
    // }


//     async executeTestNode(state) {
//     // try {
//         logger.info(`Executing test: ${state.testId}`);

//         // await state.testResult.addLog('info', 'Starting test execution', {
//         //     scriptTitle: state.generatedScript.title
//         // });

//         // Extract selectors from state context (assuming this is where they're stored)
//         const selectors = state.generatedSelectors || [];

//         const executionResult = await testExecutor.executeTest(
//             selectors,              // Only pass the selector array
//             state                   // Pass full state for access to testResult, page, etc.
//         );

//         await state.testResult.addLog('info', 'Test execution completed', {
//             success: executionResult.success,
//             stepCount: executionResult.steps.length,
//             failedStep: executionResult.failedStep
//         });

//         const finalStatus = executionResult.success ? 'completed' : 'failed';

//         await state.testResult.update({
//             executionResults: executionResult.steps,
//             status: finalStatus,
//             executionTime: executionResult.executionTime
//         });

//         return {
//             ...state,
//             executionResults: executionResult.steps,
//             status: finalStatus,
//             executionTime: executionResult.executionTime,
//             testSuccess: executionResult.success,
//             updatedHtml: executionResult.updatedHtml,
//             page: executionResult.page
//         // };
//     // } catch (error) {
//         // logger.error('Failed to execute test:', error);
//         // await state.testResult.addError(error, { step: 'executeTest' });

//         // return {
//         //     ...state,
//         //     status: 'failed',
//         //     error: error.message
//         // };
//     }
// }


async executeTestNode(state) {
    logger.info(`Executing test: ${state.testId}`);

    const selectors = state.generatedSelectors || [];

const executionResult = await testExecutor.executeTest(
            selectors,              // Only pass the selector array
            state                   // Pass full state for access to testResult, page, etc.
        );

        console.log("=========control reached on function executeTestNode=======" )
    const { success, steps, executionTime, page } = executionResult;

    const finalStatus = success ? 'completed' : 'failed';

    // ✅ Manually update the testResult object inside state
    state.testResult.executionResults = steps;
    state.testResult.status = finalStatus;
    state.testResult.executionTime = executionTime;
    // state.testResult.log.push(`Test ${success ? 'succeeded' : 'failed'} in ${executionTime}ms`);

    // ✅ Update browser-related state (retain open session)
    state.page = page;
    // state.url = page?.url?.() || state.url;  // Update with new page URL if available

    // ✅ Optionally store HTML for next steps or debugging
    // state.updatedHtml = updatedHtml || (page ? await page.content() : '');

    // ✅ Return the fully updated state
    console.log("UPdated========from workflow file ========= URL = ", state.url)
    return state;
    
}



    
    async generateReportNode(state) {
        try {
            logger.info(`Generating report for test: ${state.testId}`);
            
            await state.testResult.addLog('info', 'Generating HTML report');
            
            const report = await reportGenerator.generateReport(state.testResult);
            
            await state.testResult.addLog('info', 'Report generated', {
                reportId: report.reportId,
                reportPath: report.reportPath
            });
            
            return {
                ...state,
                report,
                status: 'report_generated'
            };
        } catch (error) {
            logger.error('Failed to generate report:', error);
            await state.testResult.addError(error, { step: 'generateReport' });
            
            return {
                ...state,
                status: 'failed',
                error: error.message
            };
        }
    }
    
    async handleErrorNode(state) {
        try {
            logger.error(`Handling error for test: ${state.testId}`, state.error);
            
            await state.testResult.addLog('error', 'Workflow failed', {
                error: state.error,
                step: state.currentStep
            });
            
            // Update test result with final error status
            await state.testResult.update({
                status: 'failed'
            });
            
            return {
                ...state,
                status: 'failed'
            };
        } catch (error) {
            logger.error('Failed to handle error:', error);
            return state;
        }
    }
    
    shouldContinueOrError(state) {
        if (state.status === 'failed' || state.error) {
            return 'handleError';
        }
        
        switch (state.status) {
            case 'html_processed':
                return 'generateSelectors';
            case 'selectors_generated':
                return 'generateTestScript';
            case 'script_generated':
                return 'executeTest';
            case 'completed':
            case 'failed':
                return 'generateReport';
            default:
                return 'handleError';
        }
    }
    

    async runWorkflow(initialState) {
    try {
        // logger.info(`==================== WORKFLOW START FOR TEST: ${initialState.testId} ====================`);
        const finalState = await this.workflow.invoke(initialState);
        logger.info(`==================== WORKFLOW END ====================`);
        return finalState;
    } catch (error) {
        logger.error('==================== WORKFLOW ERROR ====================');
        logger.error(error);
        logger.error('========================================================');
        throw error;
    }
}

    // async runWorkflow(initialState) {
    //     let browserPage = null;
    //     try {
    //         logger.info(`==================== WORKFLOW START FOR TEST: ${initialState.testId} ====================`);
    //         // 1. Parse user story into testcases
    //         const testcases = testcaseParser.parseTestcases(initialState.userStory);
    //         logger.info('==================== PARSED TESTCASES ====================');
    //         logger.info(JSON.stringify(testcases, null, 2));
    //         logger.info('==========================================================');
    //         // Create Playwright browser/page once
    //         const PlaywrightUtils = require('../playwright/utils');
    //         const playwrightUtils = new PlaywrightUtils();
    //         await playwrightUtils.initializeBrowser({ headless: true, viewport: { width: 1920, height: 1080 } });
    //         browserPage = await playwrightUtils.getBrowserManager().getPage();
    //         let currentHtml = await browserPage.content();
    //         let cleanedHtml = await htmlProcessor.cleanHtml(currentHtml);
    //         let state = { ...initialState, status: 'initialized', htmlContent: currentHtml, cleanedHtml };
    //         let allResults = [];
    //         for (let i = 0; i < testcases.length; i++) {
    //             const testcase = testcases[i];
    //             logger.info(`==================== STARTING TESTCASE ${i+1}/${testcases.length} ====================`);
    //             // 2a. Generate selectors for this testcase
    //             logger.info(`==================== LLM SELECTOR GENERATION FOR TESTCASE ${i+1} ====================`);
    //             const selectors = await groqService.generateSelectors(testcase, cleanedHtml);
    //             logger.info('==================== LLM SELECTOR GENERATION END ====================');
    //             // 2b. Generate script/actions for this testcase
    //             logger.info(`==================== LLM SCRIPT GENERATION FOR TESTCASE ${i+1} ====================`);
    //             const script = await groqService.generateTestScript(testcase, selectors, cleanedHtml);
    //             logger.info('==================== LLM SCRIPT GENERATION END ====================');
    //             // 2c. Execute the script/actions
    //             logger.info(`==================== EXECUTING SCRIPT FOR TESTCASE ${i+1} ====================`);
    //             const executionResult = await testExecutor.executeTest(script, state.testResult, browserPage);
    //             allResults.push({ testcase, selectors, script, executionResult });
    //             logger.info('==================== SCRIPT EXECUTION END ====================');
    //             // 2d. Update HTML for next testcase from the Playwright page
    //             currentHtml = executionResult.updatedHtml || await browserPage.content();
    //             cleanedHtml = await htmlProcessor.cleanHtml(currentHtml);
    //             state.htmlContent = currentHtml;
    //             state.cleanedHtml = cleanedHtml;
    //             browserPage = executionResult.page || browserPage;
    //         }
    //         // 3. Generate report
    //         logger.info('==================== GENERATING FINAL REPORT ====================');
    //         const report = await reportGenerator.generateReport(state.testResult);
    //         logger.info('==================== REPORT GENERATION END ====================');
    //         logger.info('==================== WORKFLOW END ====================');
    //         // Cleanup browser
    //         await playwrightUtils.cleanup();
    //         return { ...state, allResults, report, status: 'report_generated' };
    //     } catch (error) {
    //         logger.error('==================== WORKFLOW ERROR ====================');
    //         logger.error(error);
    //         logger.error('========================================================');
    //         // Cleanup browser if error
    //         if (browserPage) {
    //             try {
    //                 const PlaywrightUtils = require('../playwright/utils');
    //                 const playwrightUtils = new PlaywrightUtils();
    //                 await playwrightUtils.cleanup();
    //             } catch (e) {}
    //         }
    //         throw error;
    //     }
    // }
}

module.exports = TestAutomationWorkflow;
