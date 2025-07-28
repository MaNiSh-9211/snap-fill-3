const { chromium } = require('playwright');
const logger = require('../../utils/logger');

class BrowserManager {
    constructor() {
        this.browser = null;
        this.context = null;
        this.page = null;
        this.isInitialized = false;
    }
    
    async initialize(options = {}) {
        try {
            if (this.isInitialized) {
                return;
            }
            
            const defaultOptions = {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--disable-gpu',
                    '--window-size=1920,1080'
                ]
            };
            
            const browserOptions = { ...defaultOptions, ...options };
            
            logger.info('Initializing browser with options:', browserOptions);
            
            this.browser = await chromium.launch(browserOptions);
            
            const contextOptions = {
                viewport: options.viewport || { width: 1920, height: 1080 },
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                ignoreHTTPSErrors: true,
                ...options.contextOptions
            };
            
            this.context = await this.browser.newContext(contextOptions);
            this.page = await this.context.newPage();
            
            // Set default timeout
            this.page.setDefaultTimeout(options.timeout || 30000);
            
            // Enable request interception if needed
            if (options.interceptRequests) {
                await this.page.route('**/*', (route) => {
                    const resourceType = route.request().resourceType();
                    
                    // Block unnecessary resources to speed up loading
                    if (['image', 'font', 'media'].includes(resourceType)) {
                        route.abort();
                    } else {
                        route.continue();
                    }
                });
            }
            
            // Add console listener for debugging
            this.page.on('console', msg => {
                if (msg.type() === 'error') {
                    logger.error('Browser console error:', msg.text());
                } else if (msg.type() === 'warning') {
                    logger.warn('Browser console warning:', msg.text());
                }
            });
            
            // Add error listeners
            this.page.on('pageerror', error => {
                logger.error('Page error:', error);
            });
            
            this.page.on('requestfailed', request => {
                logger.warn('Request failed:', request.url(), request.failure());
            });
            
            this.isInitialized = true;
            logger.info('Browser initialized successfully');
            
        } catch (error) {
            logger.error('Failed to initialize browser:', error);
            await this.cleanup();
            throw error;
        }
    }
    
    async navigateToUrl(url, options = {}) {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }
            
            const defaultOptions = {
                waitUntil: 'load',
                timeout: 60000
            };
            
            const navigateOptions = { ...defaultOptions, ...options };
            
            logger.info(`Navigating to URL: ${url}`);
            
            const response = await this.page.goto(url, navigateOptions);
            
            if (!response.ok()) {
                throw new Error(`Failed to navigate to ${url}: ${response.status()}`);
            }
            
            // Wait for network idle if specified
            if (options.waitForLoadState) {
                await this.page.waitForLoadState(options.waitForLoadState);
            }
            
            logger.info(`Successfully navigated to: ${url}`);
            return response;
            
        } catch (error) {
            logger.error(`Failed to navigate to ${url}:`, error);
            throw error;
        }
    }
    
    async takeScreenshot(options = {}) {
        try {
            if (!this.page) {
                throw new Error('Page not initialized');
            }
            
            const defaultOptions = {
                type: 'png',
                fullPage: true,
                quality: 80
            };
            
            const screenshotOptions = { ...defaultOptions, ...options };
            
            const screenshot = await this.page.screenshot(screenshotOptions);
            
            // Convert to base64 for storage
            const base64Screenshot = screenshot.toString('base64');
            
            logger.info('Screenshot taken successfully');
            return base64Screenshot;
            
        } catch (error) {
            logger.error('Failed to take screenshot:', error);
            throw error;
        }
    }
    
    async getPageContent() {
        try {
            if (!this.page) {
                throw new Error('Page not initialized');
            }
            
            const content = await this.page.content();
            return content;
            
        } catch (error) {
            logger.error('Failed to get page content:', error);
            throw error;
        }
    }
    
    async evaluateScript(script) {
        try {
            if (!this.page) {
                throw new Error('Page not initialized');
            }
            
            const result = await this.page.evaluate(script);
            return result;
            
        } catch (error) {
            logger.error('Failed to evaluate script:', error);
            throw error;
        }
    }
    
    // async waitForSelector(selector, options = {}) {
    //     try {
    //         if (!this.page) {
    //             throw new Error('Page not initialized');
    //         }
            
    //         const defaultOptions = {
    //             timeout: 30000,
    //             state: 'visible'
    //         };
            
    //         const waitOptions = { ...defaultOptions, ...options };
            
    //         const element = await this.page.waitForSelector(selector, waitOptions);
    //         return element;
            
    //     } catch (error) {
    //         logger.error(`Failed to wait for selector ${selector}:`, error);
    //         throw error;
    //     }
    // }

    async waitForSelector(selector, options = {}) {
    try {
        if (!this.page) {
            throw new Error('Page not initialized');
        }

        const defaultOptions = {
            timeout: 30000,
            state: 'visible'
        };

        const waitOptions = { ...defaultOptions, ...options };

        const isXPath = selector.startsWith('/');
        const formattedSelector = isXPath ? `xpath=${selector}` : selector;

        const element = await this.page.waitForSelector(formattedSelector, waitOptions);
        return element;

    } catch (error) {
        logger.error(`Failed to wait for selector ${selector}:`, error);
        throw error;
    }
}

    
    async click(selector, options = {}) {
        try {
            if (!this.page) {
                throw new Error('Page not initialized');
            }
            
            const defaultOptions = {
                timeout: 30000,
                force: false
            };
            
            const clickOptions = { ...defaultOptions, ...options };
            
            await this.page.click(selector, clickOptions);
            logger.info(`Clicked on selector: ${selector}`);
            
        } catch (error) {
            logger.error(`Failed to click selector ${selector}:`, error);
            throw error;
        }
    }
    
    async type(selector, text, options = {}) {
        try {
            if (!this.page) {
                throw new Error('Page not initialized');
            }
            
            const defaultOptions = {
                timeout: 30000,
                delay: 100
            };
            
            const typeOptions = { ...defaultOptions, ...options };
            
            await this.page.type(selector, text, typeOptions);
            logger.info(`Typed text into selector: ${selector}`);
            
        } catch (error) {
            logger.error(`Failed to type into selector ${selector}:`, error);
            throw error;
        }
    }
    
    async scroll(options = {}) {
        try {
            if (!this.page) {
                throw new Error('Page not initialized');
            }
            
            const defaultOptions = {
                x: 0,
                y: 0,
                behavior: 'smooth'
            };
            
            const scrollOptions = { ...defaultOptions, ...options };
            
            await this.page.evaluate((options) => {
                window.scrollTo(options);
            }, scrollOptions);
            
            logger.info('Scrolled page');
            
        } catch (error) {
            logger.error('Failed to scroll page:', error);
            throw error;
        }
    }
    
    async hover(selector, options = {}) {
        try {
            if (!this.page) {
                throw new Error('Page not initialized');
            }
            
            const defaultOptions = {
                timeout: 30000
            };
            
            const hoverOptions = { ...defaultOptions, ...options };
            
            await this.page.hover(selector, hoverOptions);
            logger.info(`Hovered over selector: ${selector}`);
            
        } catch (error) {
            logger.error(`Failed to hover over selector ${selector}:`, error);
            throw error;
        }
    }
    
    async select(selector, value, options = {}) {
        try {
            if (!this.page) {
                throw new Error('Page not initialized');
            }
            
            const defaultOptions = {
                timeout: 30000
            };
            
            const selectOptions = { ...defaultOptions, ...options };
            
            await this.page.selectOption(selector, value, selectOptions);
            logger.info(`Selected value ${value} in selector: ${selector}`);
            
        } catch (error) {
            logger.error(`Failed to select value in selector ${selector}:`, error);
            throw error;
        }
    }
    
    async check(selector, options = {}) {
        try {
            if (!this.page) {
                throw new Error('Page not initialized');
            }
            
            const defaultOptions = {
                timeout: 30000
            };
            
            const checkOptions = { ...defaultOptions, ...options };
            
            await this.page.check(selector, checkOptions);
            logger.info(`Checked selector: ${selector}`);
            
        } catch (error) {
            logger.error(`Failed to check selector ${selector}:`, error);
            throw error;
        }
    }
    
    async uncheck(selector, options = {}) {
        try {
            if (!this.page) {
                throw new Error('Page not initialized');
            }
            
            const defaultOptions = {
                timeout: 30000
            };
            
            const uncheckOptions = { ...defaultOptions, ...options };
            
            await this.page.uncheck(selector, uncheckOptions);
            logger.info(`Unchecked selector: ${selector}`);
            
        } catch (error) {
            logger.error(`Failed to uncheck selector ${selector}:`, error);
            throw error;
        }
    }
    
    async getText(selector, options = {}) {
        try {
            if (!this.page) {
                throw new Error('Page not initialized');
            }
            
            const defaultOptions = {
                timeout: 30000
            };
            
            const textOptions = { ...defaultOptions, ...options };
            
            const element = await this.page.waitForSelector(selector, textOptions);
            const text = await element.textContent();
            
            logger.info(`Got text from selector: ${selector}`);
            return text;
            
        } catch (error) {
            logger.error(`Failed to get text from selector ${selector}:`, error);
            throw error;
        }
    }
    
    async getAttribute(selector, attribute, options = {}) {
        try {
            if (!this.page) {
                throw new Error('Page not initialized');
            }
            
            const defaultOptions = {
                timeout: 30000
            };
            
            const attrOptions = { ...defaultOptions, ...options };
            
            const element = await this.page.waitForSelector(selector, attrOptions);
            const value = await element.getAttribute(attribute);
            
            logger.info(`Got attribute ${attribute} from selector: ${selector}`);
            return value;
            
        } catch (error) {
            logger.error(`Failed to get attribute from selector ${selector}:`, error);
            throw error;
        }
    }
    
    async waitForTimeout(timeout) {
        try {
            await this.page.waitForTimeout(timeout);
            logger.info(`Waited for ${timeout}ms`);
        } catch (error) {
            logger.error(`Failed to wait for timeout:`, error);
            throw error;
        }
    }
    
    async cleanup() {
        try {
            if (this.page) {
                await this.page.close();
                this.page = null;
            }
            
            if (this.context) {
                await this.context.close();
                this.context = null;
            }
            
            if (this.browser) {
                await this.browser.close();
                this.browser = null;
            }
            
            this.isInitialized = false;
            logger.info('Browser cleanup completed');
            
        } catch (error) {
            logger.error('Failed to cleanup browser:', error);
        }
    }
    
    getPage() {
        return this.page;
    }
    
    getContext() {
        return this.context;
    }
    
    getBrowser() {
        return this.browser;
    }
}

module.exports = BrowserManager;
