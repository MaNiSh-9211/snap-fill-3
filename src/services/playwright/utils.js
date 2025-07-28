const BrowserManager = require('./browser');
const DOMMutationTracker = require('../../utils/domMutationTracker');
const XPathHelper = require('../../utils/xpathHelper');
const logger = require('../../utils/logger');

class PlaywrightUtils {
    constructor() {
        this.browserManager = new BrowserManager();
        this.mutationTracker = new DOMMutationTracker();
        this.xpathHelper = new XPathHelper();
    }
    
    async initializeBrowser(options = {}) {
        try {
            await this.browserManager.initialize(options);
            
            // Initialize DOM mutation tracking
            await this.initializeMutationTracking();
            
            logger.info('Playwright utilities initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize Playwright utilities:', error);
            throw error;
        }
    }
    
    async initializeMutationTracking() {
        try {
            const page = this.browserManager.getPage();
            
            if (!page) {
                throw new Error('Page not initialized');
            }
            
            // Inject mutation tracking script
            await page.addInitScript(() => {
                window.domMutations = [];
                window.mutationObserver = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        window.domMutations.push({
                            type: mutation.type,
                            target: mutation.target.tagName,
                            addedNodes: Array.from(mutation.addedNodes).map(node => ({
                                type: node.nodeType,
                                tagName: node.tagName,
                                textContent: node.textContent?.substring(0, 100)
                            })),
                            removedNodes: Array.from(mutation.removedNodes).map(node => ({
                                type: node.nodeType,
                                tagName: node.tagName,
                                textContent: node.textContent?.substring(0, 100)
                            })),
                            attributeName: mutation.attributeName,
                            oldValue: mutation.oldValue,
                            timestamp: Date.now()
                        });
                    });
                });
                
                window.startMutationTracking = () => {
                    window.mutationObserver.observe(document.body, {
                        childList: true,
                        subtree: true,
                        attributes: true,
                        attributeOldValue: true,
                        characterData: true,
                        characterDataOldValue: true
                    });
                };
                
                window.stopMutationTracking = () => {
                    window.mutationObserver.disconnect();
                };
                
                window.getMutations = () => {
                    const mutations = [...window.domMutations];
                    window.domMutations = [];
                    return mutations;
                };
            });
            
            logger.info('DOM mutation tracking initialized');
        } catch (error) {
            logger.error('Failed to initialize mutation tracking:', error);
            throw error;
        }
    }
    
    async startMutationTracking() {
        try {
            const page = this.browserManager.getPage();
            await page.evaluate(() => {
                if (window.startMutationTracking) {
                    window.startMutationTracking();
                }
            });
            
            logger.info('DOM mutation tracking started');
        } catch (error) {
            logger.error('Failed to start mutation tracking:', error);
            throw error;
        }
    }
    
    async stopMutationTracking() {
        try {
            const page = this.browserManager.getPage();
            await page.evaluate(() => {
                if (window.stopMutationTracking) {
                    window.stopMutationTracking();
                }
            });
            
            logger.info('DOM mutation tracking stopped');
        } catch (error) {
            logger.error('Failed to stop mutation tracking:', error);
            throw error;
        }
    }
    
    async getMutations() {
        try {
            const page = this.browserManager.getPage();
            const mutations = await page.evaluate(() => {
                if (window.getMutations) {
                    return window.getMutations();
                }
                return [];
            });
            
            return mutations;
        } catch (error) {
            logger.error('Failed to get mutations:', error);
            return [];
        }
    }
    
    async findElementByXPath(xpath) {
        try {
            const page = this.browserManager.getPage();
            
            const element = await page.evaluate((xpath) => {
                const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                return result.singleNodeValue;
            }, xpath);
            
            return element;
        } catch (error) {
            logger.error(`Failed to find element by XPath ${xpath}:`, error);
            return null;
        }
    }
    
    async generateXPath(selector) {
        try {
            const page = this.browserManager.getPage();
            
            const xpath = await page.evaluate((selector) => {
                const element = document.querySelector(selector);
                if (!element) return null;
                
                const getXPath = (element) => {
                    if (element.id) {
                        return `//*[@id="${element.id}"]`;
                    }
                    
                    if (element === document.body) {
                        return '/html/body';
                    }
                    
                    let index = 0;
                    const siblings = element.parentNode.childNodes;
                    
                    for (let i = 0; i < siblings.length; i++) {
                        const sibling = siblings[i];
                        if (sibling === element) {
                            return getXPath(element.parentNode) + 
                                   `/${element.tagName.toLowerCase()}[${index + 1}]`;
                        }
                        if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
                            index++;
                        }
                    }
                };
                
                return getXPath(element);
            }, selector);
            
            return xpath;
        } catch (error) {
            logger.error(`Failed to generate XPath for selector ${selector}:`, error);
            return null;
        }
    }
    
    async waitForElementStable(selector, options = {}) {
        try {
            const page = this.browserManager.getPage();
            const { timeout = 10000, stableFor = 1000 } = options;
            
            await page.waitForFunction((selector, stableFor) => {
                const element = document.querySelector(selector);
                if (!element) return false;
                
                const rect = element.getBoundingClientRect();
                const currentPosition = { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
                
                if (!window.elementStabilityCheck) {
                    window.elementStabilityCheck = {
                        lastPosition: currentPosition,
                        stableTime: Date.now()
                    };
                    return false;
                }
                
                const lastPos = window.elementStabilityCheck.lastPosition;
                const positionChanged = 
                    Math.abs(currentPosition.x - lastPos.x) > 1 ||
                    Math.abs(currentPosition.y - lastPos.y) > 1 ||
                    Math.abs(currentPosition.width - lastPos.width) > 1 ||
                    Math.abs(currentPosition.height - lastPos.height) > 1;
                
                if (positionChanged) {
                    window.elementStabilityCheck.lastPosition = currentPosition;
                    window.elementStabilityCheck.stableTime = Date.now();
                    return false;
                }
                
                return (Date.now() - window.elementStabilityCheck.stableTime) >= stableFor;
            }, selector, stableFor, { timeout });
            
            logger.info(`Element ${selector} is stable`);
            return true;
        } catch (error) {
            logger.error(`Failed to wait for element stability ${selector}:`, error);
            return false;
        }
    }
    
    async highlightElement(selector, options = {}) {
        try {
            const page = this.browserManager.getPage();
            const { color = 'red', duration = 2000 } = options;
            
            await page.evaluate((selector, color, duration) => {
                const element = document.querySelector(selector);
                if (!element) return;
                
                const originalStyle = element.style.cssText;
                element.style.border = `3px solid ${color}`;
                element.style.backgroundColor = `${color}20`;
                
                setTimeout(() => {
                    element.style.cssText = originalStyle;
                }, duration);
            }, selector, color, duration);
            
            logger.info(`Highlighted element: ${selector}`);
        } catch (error) {
            logger.error(`Failed to highlight element ${selector}:`, error);
        }
    }
    
    async getElementMetadata(selector) {
        try {
            const page = this.browserManager.getPage();
            
            const metadata = await page.evaluate((selector) => {
                const element = document.querySelector(selector);
                if (!element) return null;
                
                const rect = element.getBoundingClientRect();
                const computedStyle = window.getComputedStyle(element);
                
                return {
                    tagName: element.tagName,
                    id: element.id,
                    className: element.className,
                    textContent: element.textContent?.trim(),
                    innerHTML: element.innerHTML,
                    attributes: Array.from(element.attributes).reduce((acc, attr) => {
                        acc[attr.name] = attr.value;
                        return acc;
                    }, {}),
                    boundingBox: {
                        x: rect.x,
                        y: rect.y,
                        width: rect.width,
                        height: rect.height
                    },
                    style: {
                        display: computedStyle.display,
                        visibility: computedStyle.visibility,
                        opacity: computedStyle.opacity,
                        zIndex: computedStyle.zIndex
                    },
                    isVisible: rect.width > 0 && rect.height > 0 && 
                               computedStyle.display !== 'none' && 
                               computedStyle.visibility !== 'hidden' && 
                               computedStyle.opacity !== '0'
                };
            }, selector);
            
            return metadata;
        } catch (error) {
            logger.error(`Failed to get element metadata for ${selector}:`, error);
            return null;
        }
    }
    
    async captureElementScreenshot(selector, options = {}) {
        try {
            const page = this.browserManager.getPage();
            
            const element = await page.$(selector);
            if (!element) {
                throw new Error(`Element not found: ${selector}`);
            }
            
            const screenshot = await element.screenshot(options);
            const base64Screenshot = screenshot.toString('base64');
            
            logger.info(`Element screenshot captured: ${selector}`);
            return base64Screenshot;
        } catch (error) {
            logger.error(`Failed to capture element screenshot ${selector}:`, error);
            throw error;
        }
    }
    
    async injectCustomScript(script) {
        try {
            const page = this.browserManager.getPage();
            await page.addInitScript(script);
            
            logger.info('Custom script injected');
        } catch (error) {
            logger.error('Failed to inject custom script:', error);
            throw error;
        }
    }
    
    async waitForNetworkIdle(options = {}) {
        try {
            const page = this.browserManager.getPage();
            const { timeout = 30000, idleTime = 1000 } = options;
            
            await page.waitForLoadState('networkidle', { timeout });
            
            logger.info('Network idle state reached');
        } catch (error) {
            logger.error('Failed to wait for network idle:', error);
            throw error;
        }
    }
    
    async interceptRequests(handler) {
        try {
            const page = this.browserManager.getPage();
            await page.route('**/*', handler);
            
            logger.info('Request interception enabled');
        } catch (error) {
            logger.error('Failed to setup request interception:', error);
            throw error;
        }
    }
    
    async simulateSlowNetwork() {
        try {
            const context = this.browserManager.getContext();
            
            await context.route('**/*', async (route) => {
                await new Promise(resolve => setTimeout(resolve, 100));
                await route.continue();
            });
            
            logger.info('Slow network simulation enabled');
        } catch (error) {
            logger.error('Failed to simulate slow network:', error);
            throw error;
        }
    }
    
    async getNetworkRequests() {
        try {
            const page = this.browserManager.getPage();
            
            const requests = await page.evaluate(() => {
                if (window.networkRequests) {
                    return window.networkRequests;
                }
                return [];
            });
            
            return requests;
        } catch (error) {
            logger.error('Failed to get network requests:', error);
            return [];
        }
    }
    
    async cleanup() {
        try {
            await this.stopMutationTracking();
            await this.browserManager.cleanup();
            
            logger.info('Playwright utilities cleanup completed');
        } catch (error) {
            logger.error('Failed to cleanup Playwright utilities:', error);
        }
    }
    
    getBrowserManager() {
        return this.browserManager;
    }
}

module.exports = PlaywrightUtils;
