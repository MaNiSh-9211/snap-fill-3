const groqConfig = require('../../config/groq');
const { validateSelectors, validateTestScript } = require('../../schemas/testSchemas');
const logger = require('../../utils/logger');
const { SelectorSchema } = require('../../schemas/testSchemas'); // adjust the path if needed

class GroqService {
    constructor() {
        this.config = groqConfig;
    }
    
    async generateSelectors(userStory, cleanedHtml, state) {
        try {
            logger.info('Generating selectors with Groq LLM');
            

        const systemPrompt = `
You are an expert web automation engineer. Your task is to analyze HTML content and selectors for elements that would be needed to test the given user story.

Rules:
1. Never generate precise CSS selectors that target specific elements.
2. Prefer ID selectors when available, then class selectors, then attribute selectors and giev teh type of selector which the playwright can understand directly like "xpath=//input[@name="username"]'".
3. Avoid overly specific selectors that might break easily.
4. Include XPath alternatives for complex selections.
5. Provide confidence scores (0-1) for each selector.
6. Include reasoning for each selector choice.
7. Your output must strictly follow the Zod schema.

In response return the array of SelectorSchema object  as below :

${SelectorSchema}

Each interaction_type maps to a function on the server that triggers the corresponding Playwright action (e.g., click, type, select, etc.).
Return your response as a JSON array of SelectorSchema objects with above structure :
example response:
[
  {
    "element": "Username input field",
    "selector": "#username",
    "xpath": "/html/body/div/form/input[1]",
    "confidence": 0.9,
    "reasoning": "ID and label 'Username' detected",
    "interaction_type": "type",
    "text": "testuser"
  }
]
        `.trim();

        const userPrompt = `
User Story:
${userStory}

HTML Content:
${cleanedHtml}

✅ Valid Selectors (Playwright understands):
#login-btn → Valid CSS ID selector

.btn-primary → Valid CSS class selector

text="Submit" or text=Submit → Valid text selector

xpath=//button[@id='login'] → Valid XPath (must start with xpath=)

role=button[name="Submit"] → Valid ARIA role selector

[data-testid="username"] → Valid attribute selector

input[name="email"] → Valid CSS attribute selector

button:has-text("Login") → Valid Playwright pseudo selector

❌ Invalid Selectors (Playwright cannot use directly):
//button[@id='login'] → ❌ Missing xpath= prefix

$('div') → ❌ jQuery-style selector (not supported)

div >> text="Hello" → ❌ Playwright chaining syntax (needs context)

# or . → ❌ Incomplete selector

login-btn → ❌ Missing # or . or tag prefix

getElementById("login") → ❌ JavaScript function, not a selector

*[@id='submit'] → ❌ Invalid XPath syntax (missing xpath=)

Rules:
CSS selectors: #id, .class, tag[attr="value"]

Text selectors: must use text=...

XPath: must start with xpath=

Role selectors: use role=type[name="..."]

No jQuery, no JavaScript DOM APIs

All selectors must be usable directly by page.locator(selector)

If you see below executionResults array of object then this means the previous test case have been completed or exicuted now from the userstory you have to focus on new html of page and the next testcases to exicute and give the zod scheema of testcases for them 
${state.executionResults}

Each object in the response array represents one interaction. Analyze the provided user story and the current HTML content, and return only the selectors for those interactions that are possible to perform on the given HTML. Do not attempt to generate selectors for the entire user story in a single response. After executing the returned interactions, we will send the updated HTML back to you, and the process will repeat. Your response should only include actionable selectors based on the current page content. Ensure the output strictly adheres to the schema and includes all 6 fields, and give the testcase objects in sequesnce because the one at 0 index will be exicuted first so think which intraction must be performed first like filling details before clicking on button.
        `.trim();

        const response = await this.config.makeRequest([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ]);

        console.log('==================== LLM SELECTOR GENERATION RESPONSE START ====================');
        console.log(response);
        console.log('==================== LLM SELECTOR GENERATION RESPONSE END ======================');

        const selectors = this.parseJsonResponse(response);
        console.log('==================== LLM SELECTORS PARSED JSON START =========================');
        console.log(JSON.stringify(selectors, null, 2));
        console.log('==================== LLM SELECTORS PARSED JSON END ============================');

        console.log('==================== LLM SELECTORS VALIDATION START ============================');
        console.log('Validating selectors...');
        const validatedSelectors = validateSelectors(selectors);
        console.log(validatedSelectors);
        console.log('==================== LLM SELECTORS VALIDATION END ==============================');

        logger.info(`Generated ${validatedSelectors.length} selectors`);
        return validatedSelectors;

    } catch (error) {
    console.error('Full error object:', error); // 🔍 log the raw error
    logger.error('Failed to generate selectors:', error?.message || error);
    throw new Error(`Selector generation failed: ${error?.message || 'Unknown error'}`);
}

    }
    
    // async generateTestScript(userStory, selectors, cleanedHtml) {
    //     try {
    //         logger.info('==================== LLM TEST SCRIPT GENERATION REQUEST START ====================');
    //         logger.info('🟦 [LLM Test Script Generation] System Prompt:');
    //         logger.info('--------------------------------------------------------------------------------');
    //         logger.info(this._truncateForLog(this._getSystemPrompt()));
    //         logger.info('--------------------------------------------------------------------------------');
    //         logger.info('🟦 [LLM Test Script Generation] User Story:');
    //         logger.info('--------------------------------------------------------------------------------');
    //         logger.info(userStory);
    //         logger.info('--------------------------------------------------------------------------------');
    //         logger.info('🟦 [LLM Test Script Generation] Selectors:');
    //         logger.info('--------------------------------------------------------------------------------');
    //         logger.info(JSON.stringify(selectors, null, 2));
    //         logger.info('--------------------------------------------------------------------------------');
    //         logger.info('🟦 [LLM Test Script Generation] HTML Content (truncated):');
    //         logger.info('--------------------------------------------------------------------------------');
    //         logger.info(this._truncateForLog(cleanedHtml));
    //         logger.info('==================== LLM TEST SCRIPT GENERATION REQUEST END =====================');

    //         const systemPrompt = this._getSystemPrompt();
    //         const selectorsText = selectors.map(s => 
    //             `Element: ${s.element}\nSelector: ${s.selector}\nReasoning: ${s.reasoning}`
    //         ).join('\n\n');
    //         const userPrompt = `User Story: ${userStory}\n\nAvailable Selectors:\n${selectorsText}\n\nHTML Content:\n${cleanedHtml}\n\nPlease generate a comprehensive test script for this user story.`;

    //         const response = await this.config.makeRequest([
    //             { role: 'system', content: systemPrompt },
    //             { role: 'user', content: userPrompt }
    //         ]);

    //         logger.info('==================== LLM TEST SCRIPT GENERATION RESPONSE START ==================');
    //         logger.info('🟩 [LLM Test Script Generation] Raw Response:');
    //         logger.info('--------------------------------------------------------------------------------');
    //         logger.info(typeof response === 'string' ? this._truncateForLog(response) : JSON.stringify(response, null, 2));
    //         logger.info('==================== LLM TEST SCRIPT GENERATION RESPONSE END ====================');

    //         // Parse and validate the response
    //         const testScript = this.parseJsonResponse(response);
    //         logger.info('==================== LLM TEST SCRIPT PARSED JSON START =========================');
    //         logger.info('🟩 [LLM Test Script Generation] Parsed JSON:');
    //         logger.info('--------------------------------------------------------------------------------');
    //         logger.info(JSON.stringify(testScript, null, 2));
    //         logger.info('==================== LLM TEST SCRIPT PARSED JSON END ===========================');

    //         const validatedScript = validateTestScript(testScript);
    //         logger.info('==================== LLM TEST SCRIPT VALIDATION START ==========================');
    //         logger.info('🟩 [LLM Test Script Generation] Validated Script:');
    //         logger.info('--------------------------------------------------------------------------------');
    //         logger.info(JSON.stringify(validatedScript, null, 2));
    //         logger.info('==================== LLM TEST SCRIPT VALIDATION END ============================');

    //         logger.info(`Generated test script with ${validatedScript.steps.length} steps`);
    //         return validatedScript;
    //     } catch (error) {
    //         logger.error('==================== LLM TEST SCRIPT ERROR START ===============================');
    //         logger.error('🟥 [LLM Test Script Generation] Error:');
    //         logger.error('--------------------------------------------------------------------------------');
    //         logger.error(error);
    //         logger.error('==================== LLM TEST SCRIPT ERROR END =================================');
    //         throw new Error(`Test script generation failed: ${error.message}`);
    //     }
    // }

//     _getSystemPrompt() {
//         return `You are an expert test automation engineer. Your task is to generate a comprehensive test script based on the user story, available selectors, and HTML content.\n\nCRITICAL RULES FOR SELECTOR GENERATION:\n1. ALWAYS analyze the HTML content first to understand the actual page structure\n2. Look for elements by their text content, not just href attributes\n3. For text-based elements, use selectors like: p:has-text(\"BOOKMARKS\"), div:has-text(\"BOOKMARKS\"), [class*=\"bookmark\"]\n4. For buttons/links, prefer: button:has-text(\"text\"), a:has-text(\"text\"), [class*=\"text\"]\n5. Avoid href-based selectors unless the element is actually an anchor tag\n6. Use class-based selectors when text content is in specific classes\n7. Generate multiple fallback selectors for robustness\n\nTest Script Rules:\n1. Create a logical sequence of test steps\n2. Include proper waits and assertions\n3. Handle potential errors gracefully\n4. Add meaningful descriptions for each step\n5. Use appropriate timeouts\n6. Include setup and teardown steps if needed\n7. Return ONLY valid JSON - no metadata, no explanations, no markdown formatting\n\nAvailable Actions:\n- click: Click on an element\n- type: Type text into an input field\n- wait: Wait for a specific time or condition\n- navigate: Navigate to a URL\n- scroll: Scroll the page\n- hover: Hover over an element\n- select: Select an option from a dropdown\n- check: Check a checkbox\n- uncheck: Uncheck a checkbox\n- submit: Submit a form\n- assert: Assert element state or content\n\nIMPORTANT: Return ONLY a valid JSON object with this structure, no other text:\n{\n  \"title\": \"Test title\",\n  \"description\": \"Test description\",\n  \"url\": \"starting URL\",\n  \"steps\": [\n    {\n      \"action\": \"click\",\n      \"selector\": \"CSS selector\",\n      \"description\": \"Human readable description\",\n      \"timeout\": 30000,\n      \"value\": \"text to type (for type action)\",\n      \"expected\": \"expected result (for assert action)\"\n    }\n  ],\n  \"assertions\": [\n    {\n      \"action\": \"assert\",\n      \"selector\": \"CSS selector\",\n      \"description\": \"What to assert\",\n      \"expected\": \"expected value\"\n    }\n  ]\n}`;
//     }

//     _truncateForLog(str, maxLen = 2000) {
//         if (!str) return '';
//         if (typeof str !== 'string') str = String(str);
//         return str.length > maxLen ? str.slice(0, maxLen) + '... [truncated]' : str;
//     }
    
//     async enhanceSelectors(selectors, domState) {
//         try {
//             logger.info('Enhancing selectors with DOM state');
            
//             const systemPrompt = `You are an expert web automation engineer. Your task is to enhance existing selectors based on current DOM state and make them more robust.

// Rules:
// 1. Improve selector specificity if needed
// 2. Add fallback selectors
// 3. Optimize for better performance
// 4. Handle dynamic content
// 5. Maintain selector reliability

// Return enhanced selectors in the same format as input.`;
            
//             const userPrompt = `Current Selectors:
// ${JSON.stringify(selectors, null, 2)}

// Current DOM State:
// ${JSON.stringify(domState, null, 2)}

// Please enhance these selectors for better reliability.`;
            
//             const response = await this.config.makeRequest([
//                 { role: 'system', content: systemPrompt },
//                 { role: 'user', content: userPrompt }
//             ]);
            
//             const enhancedSelectors = this.parseJsonResponse(response);
//             return validateSelectors(enhancedSelectors);
            
//         } catch (error) {
//             logger.error('Failed to enhance selectors:', error);
//             return selectors; // Return original selectors if enhancement fails
//         }
//     }
    
//     async generateAssertions(userStory, executionResults) {
//         try {
//             logger.info('Generating assertions based on execution results');
            
//             const systemPrompt = `You are an expert test automation engineer. Your task is to generate meaningful assertions based on the user story and test execution results.

// Rules:
// 1. Generate assertions that validate the user story requirements
// 2. Include both positive and negative test cases
// 3. Check for element states, text content, and visibility
// 4. Validate user flow completion
// 5. Include error handling assertions

// Return assertions in the same format as test steps.`;
            
//             const userPrompt = `User Story: ${userStory}

// Execution Results:
// ${JSON.stringify(executionResults, null, 2)}

// Please generate appropriate assertions for this test.`;
            
//             const response = await this.config.makeRequest([
//                 { role: 'system', content: systemPrompt },
//                 { role: 'user', content: userPrompt }
//             ]);
            
//             const assertions = this.parseJsonResponse(response);
//             return assertions;
            
//         } catch (error) {
//             logger.error('Failed to generate assertions:', error);
//             return [];
//         }
//     }
    
//     async analyzeTestFailure(testScript, executionResults, error) {
//         try {
//             logger.info('Analyzing test failure with Groq LLM');
            
//             const systemPrompt = `You are an expert test automation engineer. Your task is to analyze test failures and provide insights for improvement.

// Analyze the test failure and provide:
// 1. Root cause analysis
// 2. Potential fixes
// 3. Improved selectors or steps
// 4. Recommendations for test stability

// Return your analysis as a JSON object with:
// {
//   "rootCause": "explanation of the root cause",
//   "suggestedFixes": ["fix1", "fix2"],
//   "improvedSelectors": [],
//   "recommendations": ["recommendation1", "recommendation2"]
// }`;
            
//             const userPrompt = `Test Script:
// ${JSON.stringify(testScript, null, 2)}

// Execution Results:
// ${JSON.stringify(executionResults, null, 2)}

// Error:
// ${error}

// Please analyze this test failure and provide recommendations.`;
            
//             const response = await this.config.makeRequest([
//                 { role: 'system', content: systemPrompt },
//                 { role: 'user', content: userPrompt }
//             ]);
            
//             return this.parseJsonResponse(response);
            
//         } catch (error) {
//             logger.error('Failed to analyze test failure:', error);
//             return {
//                 rootCause: 'Unable to analyze failure',
//                 suggestedFixes: [],
//                 improvedSelectors: [],
//                 recommendations: []
//             };
//         }
//     }
    
    // parseJsonResponse(response) {
    //     try {
    //         logger.info('Parsing LLM response for JSON extraction');
            
    //         // First, try to extract JSON from markdown code blocks
    //         let jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    //         if (jsonMatch) {
    //             logger.info('Found JSON in markdown code block');
    //             const parsed = JSON.parse(jsonMatch[1].trim());
    //             return parsed;
    //         }
            
    //         // If no markdown, try to find JSON object in the response
    //         jsonMatch = response.match(/\{[\s\S]*\}/);
    //         if (jsonMatch) {
    //             logger.info('Found JSON object in response');
    //             const parsed = JSON.parse(jsonMatch[0]);
    //             return parsed;
    //         }
            
    //         // Remove markdown code blocks if present and try parsing the whole response
    //         const cleanResponse = response.replace(/```json\n?/, '').replace(/```\n?$/, '');
            
    //         // Parse JSON
    //         const parsed = JSON.parse(cleanResponse);
    //         return parsed;
            
    //     } catch (error) {
    //         logger.error('Failed to parse JSON response:', error);
    //         logger.error('Response content:', response);
    //         throw new Error(`Invalid JSON response: ${error.message}`);
    //     }
    // }


    parseJsonResponse(response) {
    try {
        logger.info('Parsing LLM response for JSON extraction');

        // 1. Strip out any <think>…</think> blocks entirely
        const withoutThink = response.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

        // 2. Try to extract JSON from markdown code fences
        let jsonMatch = withoutThink.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
        if (jsonMatch) {
            logger.info('Found JSON in markdown code block');
            return JSON.parse(jsonMatch[1].trim());
        }

        // 3. Try to extract a top‑level JSON array
        jsonMatch = withoutThink.match(/\[([\s\S]*?)\]/m);
        if (jsonMatch) {
            logger.info('Found top‑level JSON array in response');
            return JSON.parse('[' + jsonMatch[1].trim() + ']');
        }

        // 4. Try to extract a JSON object as fallback
        jsonMatch = withoutThink.match(/\{([\s\S]*?)\}/m);
        if (jsonMatch) {
            logger.info('Found JSON object in response');
            return JSON.parse('{' + jsonMatch[1].trim() + '}');
        }

        // 5. As a last resort, attempt to parse the entire cleaned string
        const parsed = JSON.parse(withoutThink);
        return parsed;

    } catch (error) {
        logger.error('Failed to parse JSON response:', error);
        logger.error('Response content:', response);
        throw new Error(`Invalid JSON response: ${error.message}`);
    }
}

    
    async testConnection() {
        try {
            logger.info('Testing Groq API connection');
            
            const response = await this.config.makeRequest([
                { role: 'user', content: 'Hello, can you confirm the connection is working?' }
            ]);
            
            logger.info('Groq API connection test successful');
            return true;
        } catch (error) {
            logger.error('Groq API connection test failed:', error);
            return false;
        }
    }
    
    async estimateTokens(text) {
        // Rough estimation: 1 token ≈ 4 characters
        return Math.ceil(text.length / 4);
    }
    
    async optimizePrompt(prompt, maxTokens = 8000) {
        try {
            const currentTokens = await this.estimateTokens(prompt);
            
            if (currentTokens <= maxTokens) {
                return prompt;
            }
            
            // Truncate prompt if too long
            const targetLength = maxTokens * 4 * 0.8; // 80% of max to be safe
            const truncatedPrompt = prompt.substring(0, targetLength);
            
            logger.warn(`Prompt truncated from ${prompt.length} to ${truncatedPrompt.length} characters`);
            return truncatedPrompt;
            
        } catch (error) {
            logger.error('Failed to optimize prompt:', error);
            return prompt;
        }
    }
}

module.exports = new GroqService();
