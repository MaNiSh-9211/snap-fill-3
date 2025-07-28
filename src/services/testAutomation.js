const { chromium } = require('playwright');
const { v4: uuidv4 } = require('uuid');

class TestAutomationService {
    constructor() {
        this.browser = null;
        this.tests = new Map(); // In-memory storage for tests
    }

    async initializeBrowser() {
        if (!this.browser) {
            try {
                // Try to use Playwright's built-in browser
                this.browser = await chromium.launch({
                    headless: true,
                    args: [
                        '--no-sandbox', 
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-extensions',
                        '--disable-gpu',
                        '--disable-web-security',
                        '--allow-running-insecure-content',
                        '--disable-features=VizDisplayCompositor'
                    ]
                });
                console.log('Browser initialized with Playwright built-in Chromium');
            } catch (error) {
                console.log('Browser initialization failed:', error.message);
                console.log('Please install Playwright browsers by running: npx playwright install chromium');
                throw new Error('Browser not available. Run "npx playwright install chromium" to install the browser.');
            }
        }
        return this.browser;
    }
// =================================Manin function to execute test==================================
    async executeTest(userStory, url) {

          console.log('\n=======================🟢 START============================\n');

          console.log(`\n========================== Executing test on: ${url} ===============================\n\n${userStory}\n\n=====================================================================================\n`);
        
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
           console.log(`\nStarting test execution for: ${testId}\n`);
            
            // Initialize browser
            await this.initializeBrowser();
            console.log('\n======================= ✅ Browser initialized successfully ============================\n');
            const context = await this.browser.newContext();
            const page = await context.newPage();

            // Step 1: Navigate to URL
            console.log(`\n====== 🌐 Navigating to ======\n${url}\n`);

            await page.goto(url);
            testResult.steps.push({
                action: 'navigate',
                description: `Navigate to ${url}`,
                timestamp: new Date(),
                success: true
            });

            // Take initial screenshot
            const initialScreenshot = await page.screenshot({ fullPage: true });
            testResult.screenshots.push({
                description: 'Initial page load',
                timestamp: new Date(),
                data: initialScreenshot.toString('base64')
            });

            // Step 2: Analyze page content
            const pageTitle = await page.title();
            const pageContent = await page.content();
            
            console.log(`\n====== 📄 Page Title ======\n${pageTitle}\n`);

            testResult.steps.push({
                action: 'analyze',
                description: `Analyzed page: ${pageTitle}`,
                timestamp: new Date(),
                success: true
            });

            // Step 3: Generate initial test steps based on user story calling the llm function indirectly
            console.log('\n🤖 Making API call to LLM for generating initial test step...\n');
            console.log(`\n📝 ==========User Story:==========\n${userStory}\n`);
            console.log(`\n📄 ==========Page Content:========\n${pageContent}\n`);
            // ==================================================================================================================================================================
            let testSteps = await this.generateTestSteps(userStory, pageContent);

             console.log('\n🤖 Initial steps response from LLM..\n');
             console.log(`\n=====================Generated test steps:====================\n , ${steps}\n`);
             console.log(`\n🎯 Using ${testSteps.length} test steps from LLM generation\n`);


            // Step 4: Execute test steps with individual screenshots
            let i = 0;
            while (i < testSteps.length) {
                const step = testSteps[i];
                try {
                    console.log(`Executing step ${i + 1}/${testSteps.length}: ${step.description}`);
                    
                    // Take screenshot BEFORE executing the step
                    const beforeScreenshot = await page.screenshot({ fullPage: true });
                    testResult.screenshots.push({
                        description: `Step ${i + 1} - Before: ${step.description}`,
                        timestamp: new Date(),
                        data: beforeScreenshot.toString('base64'),
                        stepNumber: i + 1,
                        stepAction: step.action,
                        stepStatus: 'before'
                    });
                    
                    // Execute the step
                    await this.executeStep(page, step);
                    
                    // Take screenshot AFTER executing the step
                    const afterScreenshot = await page.screenshot({ fullPage: true });
                    testResult.screenshots.push({
                        description: `Step ${i + 1} - After: ${step.description}`,
                        timestamp: new Date(),
                        data: afterScreenshot.toString('base64'),
                        stepNumber: i + 1,
                        stepAction: step.action,
                        stepStatus: 'after'
                    });
                    
                    testResult.steps.push({
                        ...step,
                        success: true,
                        timestamp: new Date(),
                        stepNumber: i + 1
                    });
                    
                    i++;
                    
                } catch (error) {
                    console.error(`Step ${i + 1} failed: ${step.action}`, error);
                    
                    // Take screenshot of the error state
                    const errorScreenshot = await page.screenshot({ fullPage: true });
                    testResult.screenshots.push({
                        description: `Step ${i + 1} - Error: ${step.description} - ${error.message}`,
                        timestamp: new Date(),
                        data: errorScreenshot.toString('base64'),
                        stepNumber: i + 1,
                        stepAction: step.action,
                        stepStatus: 'error'
                    });
                    
                    testResult.steps.push({
                        ...step,
                        success: false,
                        error: error.message,
                        timestamp: new Date(),
                        stepNumber: i + 1
                    });
                    testResult.errors.push({
                        step: step.action,
                        error: error.message,
                        timestamp: new Date(),
                        stepNumber: i + 1
                    });
                    break; // Fail-fast execution
                }
            }

            // Take final screenshot
            const finalScreenshot = await page.screenshot({ fullPage: true });
            testResult.screenshots.push({
                description: 'Final page state',
                timestamp: new Date(),
                data: finalScreenshot.toString('base64')
            });

            // Close context
            await context.close();

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
// =========================================================   3rd step    ================================================================================
    async generateTestSteps(userStory, pageContent) {
        const steps = [];
        // const story = userStory.toLowerCase();
        
        // console.log('Parsing user story:', userStory);
        
        // Extract credentials from user story
        const credentials = this.extractCredentials(userStory);
        console.log('Extracted credentials:', credentials);
        
        // Use LLM to generate test steps if available
        try {
            const groqService = require('./llm/groqService');
            // ==================================================================  4th step  =======================================================================================
            const testScript = await groqService.generateTestScript(userStory, [], pageContent);
            console.log('LLM Generated test script:', JSON.stringify(testScript, null, 2));
            
            if (testScript && testScript.steps && testScript.steps.length > 0) {
                return testScript.steps;
            }
        } catch (error) {
            console.log(`\n============== ❌ LLM Service Not Available ===============\n${error.message}\n`);
        }
        
        // // Fallback to regex-based parsing
        // console.log('🔄 Using regex-based test step generation');
        
        // // Parse the user story step by step based on sequence
        // const lines = userStory.split('\n').map(line => line.trim()).filter(line => line);
        // console.log(`📝 Parsing ${lines.length} lines from user story`);
        
        // for (const line of lines) {
        //     const lowerLine = line.toLowerCase();
        //     console.log(`🔍 Analyzing line: "${line}"`);
            
        //     // Check for username step in this line
        //     if (lowerLine.includes('username is') || lowerLine.includes('enter username') || lowerLine.includes('type username')) {
        //         const usernameMatch = line.match(/username\s+is\s+["']([^"']*)["']/i);
        //         const username = usernameMatch ? usernameMatch[1] : credentials.username;
        //         console.log(`👤 Detected username step, using extracted username: "${username}"`);
                
        //         steps.push({
        //             action: 'fill',
        //             description: `Fill username field with: ${username}`,
        //             selector: 'input[type="text"], input[name*="user"], input[id*="user"], input[placeholder*="user"], input[name*="username"], input[id*="username"]',
        //             value: username
        //         });
        //     }
            
        //     // Check for password step in this line
        //     if (lowerLine.includes('password is') || lowerLine.includes('enter password') || lowerLine.includes('type password') || lowerLine.includes('password as') || lowerLine.includes('fill the password')) {
        //         const passwordMatch = line.match(/password\s+is\s+["']([^"']*)["']/i);
        //         const password = passwordMatch ? passwordMatch[1] : credentials.password;
        //         console.log(`🔐 Detected password step, using extracted password: "${password}"`);
                
        //         steps.push({
        //             action: 'fill',
        //             description: `Fill password field with: ${password}`,
        //             selector: 'input[type="password"], input[name*="pass"], input[id*="pass"]',
        //             value: password
        //         });
        //     }
            
        //     // Email filling step (fallback)
        //     if (lowerLine.includes('type email') || lowerLine.includes('enter email') || lowerLine.includes('email section')) {
        //         const emailMatch = line.match(/["']([^"']*@[^"']*)["']/);
        //         const email = emailMatch ? emailMatch[1] : credentials.username;
        //         console.log(`📧 Detected email step, using email: "${email}"`);
                
        //         steps.push({
        //             action: 'fill',
        //             description: `Fill email field with: ${email}`,
        //             selector: 'input[type="email"], input[name*="email"], input[id*="email"], input[placeholder*="email"], input[name*="user"], input[id*="user"]',
        //             value: email
        //         });
        //     }
            
        //     // Login button click
        //     else if (lowerLine.includes('click on login') || lowerLine.includes('login button')) {
        //         steps.push({
        //             action: 'click',
        //             description: 'Click login button',
        //             selector: 'button[type="submit"], input[type="submit"], button:has-text("login"), button:has-text("Login"), button:has-text("Sign in")'
        //         });
                
        //         // Add wait after login
        //         steps.push({
        //             action: 'wait',
        //             description: 'Wait for page to load after login',
        //             duration: 3000
        //         });
        //     }
            
        //     // Bookmark click
        //     else if (lowerLine.includes('click on any tag') && lowerLine.includes('bookmark')) {
        //         steps.push({
        //             action: 'click',
        //             description: 'Click on bookmark tag',
        //             selector: 'p:has-text("BOOKMARKS"), div:has-text("BOOKMARKS"), [class*="bookmark"], [class*="text_one"], .text_one:has-text("BOOKMARKS"), .text-with-icon-quick-links:has-text("BOOKMARKS")'
        //         });
                
        //         // Add wait after bookmark click
        //         steps.push({
        //             action: 'wait',
        //             description: 'Wait for bookmark page to load',
        //             duration: 2000
        //         });
        //     }
            
        //     // General click actions for other elements
        //     else if (lowerLine.includes('click on') && !lowerLine.includes('login')) {
        //         const textMatch = line.match(/["']([^"']*)["']/);
        //         const clickText = textMatch ? textMatch[1] : 'interactive element';
                
        //         steps.push({
        //             action: 'click',
        //             description: `Click on ${clickText}`,
        //             selector: `button:has-text("${clickText}"), a:has-text("${clickText}"), [href*="${clickText}"], [class*="${clickText}"]`
        //         });
        //     }
        // }
        
        // // Fallback for simple login cases
        // if (steps.length === 0 && (story.includes('login') || story.includes('sign in'))) {
        //     console.log('🔄 No specific steps detected, using fallback login flow');
            
        //     if (credentials.username) {
        //         console.log(`👤 Adding username step with: "${credentials.username}"`);
        //         steps.push({
        //             action: 'fill',
        //             description: `Fill username field with: ${credentials.username}`,
        //             selector: 'input[type="email"], input[name*="email"], input[id*="email"], input[name*="user"], input[id*="user"]',
        //             value: credentials.username
        //         });
        //     }
            
        //     if (credentials.password) {
        //         console.log(`🔐 Adding password step with: "${credentials.password}"`);
        //         steps.push({
        //             action: 'fill',
        //             description: `Fill password field with: ${credentials.password}`,
        //             selector: 'input[type="password"], input[name*="pass"], input[id*="pass"]',
        //             value: credentials.password
        //         });
        //     }
            
        //     console.log('🔘 Adding login button click step');
        //     steps.push({
        //         action: 'click',
        //         description: 'Click login button',
        //         selector: 'button[type="submit"], input[type="submit"], button:has-text("login"), button:has-text("Login"), button:has-text("Sign in")'
        //     });
        // }
        
        
        console.log('Generated test steps:', steps);
        return steps;
    }
    
    // =========================================================================================================================================================
    extractCredentials(userStory) {
        const credentials = {};
        
        console.log('🔍 Extracting credentials from user story...');
        
        // Extract email from quoted strings
        const emailMatches = [
            /["']([^"']*@[^"']*)["']/,
            /email\s*["']([^"']*@[^"']*)["']/i,
            /username\s*["']([^"']*@[^"']*)["']/i
        ];
        
        for (const pattern of emailMatches) {
            const match = userStory.match(pattern);
            if (match && match[1]) {
                credentials.username = match[1].trim();
                console.log(`✅ Extracted username: "${credentials.username}" using pattern: ${pattern}`);
                break;
            }
        }
        
        // Extract password from quoted strings
        const passwordMatches = [
            /password\s*is\s*["']([^"']*)["']/i,
            /password\s*as\s*["']([^"']*)["']/i,
            /password\s*["']([^"']*)["']/i,
            /pass\s*["']([^"']*)["']/i
        ];
        
        for (const pattern of passwordMatches) {
            const match = userStory.match(pattern);
            if (match && match[1]) {
                credentials.password = match[1].trim();
                console.log(`✅ Extracted password: "${credentials.password}" using pattern: ${pattern}`);
                break;
            }
        }
        
        // Fallback patterns without quotes
        if (!credentials.username) {
            console.log('⚠️ No username found with quoted patterns, trying fallback patterns...');
            const usernameMatches = [
                /username.*?is\s*:?\s*["']?([^"\s\n]+)["']?/i,
                /user.*?name.*?:?\s*["']?([^"\s\n]+)["']?/i,
                /username.*?:?\s*["']?([^"\s\n]+)["']?/i
            ];
            
            for (const pattern of usernameMatches) {
                const match = userStory.match(pattern);
                if (match) {
                    credentials.username = match[1].trim().replace(/^["']|["']$/g, '');
                    console.log(`✅ Extracted username (fallback): "${credentials.username}" using pattern: ${pattern}`);
                    break;
                }
            }
        }
        
        if (!credentials.password) {
            console.log('⚠️ No password found with quoted patterns, trying fallback patterns...');
            const passwordMatches = [
                /password.*?is\s*:?\s*([^\s\n]+)/i,
                /password.*?:?\s*([^\s\n]+)/i,
                /pass.*?:?\s*([^\s\n]+)/i
            ];
            
            for (const pattern of passwordMatches) {
                const match = userStory.match(pattern);
                if (match) {
                    credentials.password = match[1].trim();
                    console.log(`✅ Extracted password (fallback): "${credentials.password}" using pattern: ${pattern}`);
                    break;
                }
            }
        }
        
        console.log(`📋 Final extracted credentials:`, credentials);
        return credentials;
    }

// =========================================================================================================================================================================
    async executeStep(page, step) {
        switch (step.action) {
            case 'click':
                let clickElement;
                try {
                    // Handle :has-text() selector
                    if (step.selector.includes(':has-text(')) {
                        const textMatch = step.selector.match(/:has-text\("([^"]+)"\)/);
                        if (textMatch) {
                            const buttonText = textMatch[1];
                            clickElement = page.locator(`button:has-text("${buttonText}"), input[type="submit"][value*="${buttonText}"]`);
                        } else {
                            clickElement = page.locator(step.selector);
                        }
                    } else {
                        clickElement = page.locator(step.selector);
                    }
                    
                    await clickElement.first().click({ timeout: 10000 });
                    console.log(`Clicked element: ${step.selector}`);
                } catch (error) {
                    // Try alternative selectors for bookmarks
                    if (step.description.includes('bookmark') || step.selector.includes('BOOKMARKS')) {
                        const bookmarkSelectors = [
                            'p:has-text("BOOKMARKS")',
                            'div:has-text("BOOKMARKS")',
                            '[class*="bookmark"]',
                            '[class*="text_one"]',
                            '.text_one:has-text("BOOKMARKS")',
                            '.text-with-icon-quick-links:has-text("BOOKMARKS")',
                            'div.text-with-icon-quick-links p.text_one',
                            '[class*="quick-links"]:has-text("BOOKMARKS")'
                        ];
                        
                        for (const selector of bookmarkSelectors) {
                            try {
                                await page.locator(selector).first().click({ timeout: 5000 });
                                console.log(`Clicked bookmark with selector: ${selector}`);
                                return;
                            } catch (e) {
                                continue;
                            }
                        }
                    }
                    // Try alternative selectors for login buttons
                    if (step.description.includes('login')) {
                        const loginButtons = [
                            'button[type="submit"]',
                            'input[type="submit"]',
                            'button:has-text("Login")',
                            'button:has-text("Sign in")',
                            'button:has-text("Submit")',
                            '.login-btn',
                            '#login-btn'
                        ];
                        
                        for (const selector of loginButtons) {
                            try {
                                await page.locator(selector).first().click({ timeout: 5000 });
                                console.log(`Clicked login button with selector: ${selector}`);
                                return;
                            } catch (e) {
                                continue;
                            }
                        }
                    }
                    
                    // Try alternative selectors for delete buttons
                    if (step.description.includes('delete')) {
                        const deleteButtons = [
                            'button:has-text("Delete")',
                            'button:has-text("delete")',
                            'button[class*="delete"]',
                            'button[id*="delete"]',
                            '.delete-btn',
                            '.btn-delete'
                        ];
                        
                        for (const selector of deleteButtons) {
                            try {
                                await page.locator(selector).first().click({ timeout: 5000 });
                                console.log(`Clicked delete button with selector: ${selector}`);
                                return;
                            } catch (e) {
                                continue;
                            }
                        }
                    }
                    
                    throw new Error(`Element not found or not clickable: ${step.selector}`);
                }
                break;
                
            case 'fill':
            case 'search':
            case 'login':
                try {
                    const fillElement = page.locator(step.selector).first();
                    await fillElement.fill(step.value, { timeout: 10000 });
                    console.log(`Filled element: ${step.selector} with: ${step.value}`);
                } catch (error) {
                    // Try alternative selectors based on step description
                    if (step.description.includes('username')) {
                        const usernameSelectors = [
                            'input[name="username"]',
                            'input[name="user"]',
                            'input[id="username"]',
                            'input[id="user"]',
                            'input[placeholder*="username"]',
                            'input[placeholder*="user"]',
                            'input[type="text"]'
                        ];
                        
                        for (const selector of usernameSelectors) {
                            try {
                                await page.locator(selector).first().fill(step.value, { timeout: 5000 });
                                console.log(`Filled username field with selector: ${selector}`);
                                return;
                            } catch (e) {
                                continue;
                            }
                        }
                    }
                    
                    if (step.description.includes('password')) {
                        const passwordSelectors = [
                            'input[name="password"]',
                            'input[name="pass"]',
                            'input[id="password"]',
                            'input[id="pass"]',
                            'input[type="password"]'
                        ];
                        
                        for (const selector of passwordSelectors) {
                            try {
                                await page.locator(selector).first().fill(step.value, { timeout: 5000 });
                                console.log(`Filled password field with selector: ${selector}`);
                                return;
                            } catch (e) {
                                continue;
                            }
                        }
                    }
                    
                    throw new Error(`Element not found or not fillable: ${step.selector}`);
                }
                break;
                
            case 'scroll':
                await page.evaluate(() => {
                    window.scrollTo(0, document.body.scrollHeight / 2);
                });
                console.log('Scrolled page');
                break;
                
            case 'wait':
                if (step.selector) {
                    // Wait for specific element
                    try {
                        await page.waitForSelector(step.selector, { timeout: step.timeout || 30000 });
                        console.log(`Waited for element: ${step.selector}`);
                    } catch (error) {
                        // If waiting for bookmarks element fails, try alternative selectors
                        if (step.selector.includes('BOOKMARKS') || step.description.includes('bookmark')) {
                            const bookmarkSelectors = [
                                'p:has-text("BOOKMARKS")',
                                'div:has-text("BOOKMARKS")',
                                '[class*="bookmark"]',
                                '[class*="text_one"]',
                                '.text_one:has-text("BOOKMARKS")',
                                '.text-with-icon-quick-links:has-text("BOOKMARKS")',
                                'div.text-with-icon-quick-links p.text_one',
                                '[class*="quick-links"]:has-text("BOOKMARKS")'
                            ];
                            
                            for (const selector of bookmarkSelectors) {
                                try {
                                    await page.waitForSelector(selector, { timeout: 10000 });
                                    console.log(`Waited for bookmark element with selector: ${selector}`);
                                    return;
                                } catch (e) {
                                    continue;
                                }
                            }
                        }
                        throw error;
                    }
                } else if (step.duration) {
                    // Wait for specific duration
                    await page.waitForTimeout(step.duration);
                    console.log(`Waited ${step.duration}ms`);
                } else {
                    // Default wait
                    await page.waitForTimeout(3000);
                    console.log('Waited 3000ms (default)');
                }
                break;
                
            case 'navigate':
                if (step.selector) {
                    // Navigate to URL stored in selector field
                    await page.goto(step.selector);
                    console.log(`Navigated to: ${step.selector}`);
                } else if (step.value) {
                    // Navigate to URL stored in value field
                    await page.goto(step.value);
                    console.log(`Navigated to: ${step.value}`);
                } else {
                    throw new Error('Navigate action requires a URL in selector or value field');
                }
                break;
                
            case 'type':
                try {
                    const typeElement = page.locator(step.selector).first();
                    await typeElement.fill(step.value, { timeout: step.timeout || 10000 });
                    console.log(`Typed in element: ${step.selector} with value: ${step.value}`);
                } catch (error) {
                    throw new Error(`Element not found or not fillable: ${step.selector}`);
                }
                break;
                
            case 'hover':
                try {
                    const hoverElement = page.locator(step.selector).first();
                    await hoverElement.hover({ timeout: step.timeout || 10000 });
                    console.log(`Hovered over element: ${step.selector}`);
                } catch (error) {
                    throw new Error(`Element not found or not hoverable: ${step.selector}`);
                }
                break;
                
            case 'select':
                try {
                    const selectElement = page.locator(step.selector).first();
                    await selectElement.selectOption(step.value, { timeout: step.timeout || 10000 });
                    console.log(`Selected option: ${step.value} in element: ${step.selector}`);
                } catch (error) {
                    throw new Error(`Element not found or not selectable: ${step.selector}`);
                }
                break;
                
            case 'check':
                try {
                    const checkElement = page.locator(step.selector).first();
                    await checkElement.check({ timeout: step.timeout || 10000 });
                    console.log(`Checked element: ${step.selector}`);
                } catch (error) {
                    throw new Error(`Element not found or not checkable: ${step.selector}`);
                }
                break;
                
            case 'uncheck':
                try {
                    const uncheckElement = page.locator(step.selector).first();
                    await uncheckElement.uncheck({ timeout: step.timeout || 10000 });
                    console.log(`Unchecked element: ${step.selector}`);
                } catch (error) {
                    throw new Error(`Element not found or not uncheckable: ${step.selector}`);
                }
                break;
                
            case 'submit':
                try {
                    const submitElement = page.locator(step.selector).first();
                    await submitElement.press('Enter', { timeout: step.timeout || 10000 });
                    console.log(`Submitted form: ${step.selector}`);
                } catch (error) {
                    throw new Error(`Element not found or not submittable: ${step.selector}`);
                }
                break;
                
            case 'assert':
                try {
                    if (step.selector === 'url') {
                        // Assert URL
                        const currentUrl = page.url();
                        if (currentUrl.includes(step.expected)) {
                            console.log(`URL assertion passed: ${currentUrl} contains ${step.expected}`);
                        } else {
                            throw new Error(`URL assertion failed: expected ${step.expected} but got ${currentUrl}`);
                        }
                    } else {
                        // Assert element content
                        const element = page.locator(step.selector).first();
                        const text = await element.textContent({ timeout: step.timeout || 10000 });
                        if (text.includes(step.expected)) {
                            console.log(`Assertion passed: ${text} contains ${step.expected}`);
                        } else {
                            throw new Error(`Assertion failed: expected ${step.expected} but got ${text}`);
                        }
                    }
                } catch (error) {
                    throw new Error(`Assertion failed: ${error.message}`);
                }
                break;
                
            default:
                throw new Error(`Unknown step action: ${step.action}`);
        }
    }

    //======================================================================================================================================================================================
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
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            console.log('Browser closed');
        }
    }
}

module.exports = new TestAutomationService();