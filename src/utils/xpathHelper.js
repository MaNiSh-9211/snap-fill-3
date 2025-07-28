const logger = require('./logger');

class XPathHelper {
    constructor() {
        this.cache = new Map();
        this.maxCacheSize = 1000;
    }
    
    generateXPath(element) {
        try {
            if (!element || element.nodeType !== Node.ELEMENT_NODE) {
                throw new Error('Invalid element provided');
            }
            
            // Check cache first
            const cacheKey = this.generateElementKey(element);
            if (this.cache.has(cacheKey)) {
                return this.cache.get(cacheKey);
            }
            
            let xpath = this.buildXPath(element);
            
            // Cache the result
            this.cacheResult(cacheKey, xpath);
            
            return xpath;
        } catch (error) {
            logger.error('Failed to generate XPath:', error);
            throw error;
        }
    }
    
    buildXPath(element) {
        // Strategy 1: Use ID if available
        if (element.id) {
            return `//*[@id="${element.id}"]`;
        }
        
        // Strategy 2: Use unique class combination
        const uniqueClassPath = this.tryUniqueClassPath(element);
        if (uniqueClassPath) {
            return uniqueClassPath;
        }
        
        // Strategy 3: Use attribute-based path
        const attributePath = this.tryAttributePath(element);
        if (attributePath) {
            return attributePath;
        }
        
        // Strategy 4: Use structural path
        return this.buildStructuralPath(element);
    }
    
    tryUniqueClassPath(element) {
        if (!element.className) return null;
        
        const classes = element.className.split(' ').filter(c => c.trim());
        if (classes.length === 0) return null;
        
        // Try different combinations of classes
        for (let i = 1; i <= classes.length; i++) {
            const combinations = this.getCombinations(classes, i);
            
            for (const combination of combinations) {
                const classSelector = combination.join('.');
                const xpath = `//${element.tagName.toLowerCase()}[@class="${combination.join(' ')}"]`;
                
                // Check if this selector is unique
                if (this.isUniqueSelector(xpath)) {
                    return xpath;
                }
            }
        }
        
        return null;
    }
    
    tryAttributePath(element) {
        const importantAttributes = ['name', 'type', 'value', 'href', 'src', 'alt', 'title', 'data-testid', 'data-test', 'aria-label'];
        
        for (const attr of importantAttributes) {
            if (element.hasAttribute(attr)) {
                const value = element.getAttribute(attr);
                const xpath = `//${element.tagName.toLowerCase()}[@${attr}="${value}"]`;
                
                if (this.isUniqueSelector(xpath)) {
                    return xpath;
                }
            }
        }
        
        return null;
    }
    
    buildStructuralPath(element) {
        const path = [];
        let current = element;
        
        while (current && current.nodeType === Node.ELEMENT_NODE) {
            const tagName = current.tagName.toLowerCase();
            const index = this.getElementIndex(current);
            
            if (current.id) {
                path.unshift(`${tagName}[@id="${current.id}"]`);
                break;
            } else if (index > 1) {
                path.unshift(`${tagName}[${index}]`);
            } else {
                path.unshift(tagName);
            }
            
            current = current.parentNode;
            
            // Stop at body or html
            if (current === document.body || current === document.documentElement) {
                break;
            }
        }
        
        return '/' + path.join('/');
    }
    
    getElementIndex(element) {
        let index = 1;
        let sibling = element.previousElementSibling;
        
        while (sibling) {
            if (sibling.tagName === element.tagName) {
                index++;
            }
            sibling = sibling.previousElementSibling;
        }
        
        return index;
    }
    
    isUniqueSelector(xpath) {
        try {
            const result = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
            return result.snapshotLength === 1;
        } catch (error) {
            return false;
        }
    }
    
    getCombinations(array, k) {
        const combinations = [];
        
        const combine = (start, current) => {
            if (current.length === k) {
                combinations.push([...current]);
                return;
            }
            
            for (let i = start; i < array.length; i++) {
                current.push(array[i]);
                combine(i + 1, current);
                current.pop();
            }
        };
        
        combine(0, []);
        return combinations;
    }
    
    evaluateXPath(xpath, contextNode = document) {
        try {
            const result = document.evaluate(
                xpath,
                contextNode,
                null,
                XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                null
            );
            
            const nodes = [];
            for (let i = 0; i < result.snapshotLength; i++) {
                nodes.push(result.snapshotItem(i));
            }
            
            return nodes;
        } catch (error) {
            logger.error('Failed to evaluate XPath:', error);
            throw error;
        }
    }
    
    findElementByXPath(xpath, contextNode = document) {
        try {
            const result = document.evaluate(
                xpath,
                contextNode,
                null,
                XPathResult.FIRST_ORDERED_NODE_TYPE,
                null
            );
            
            return result.singleNodeValue;
        } catch (error) {
            logger.error('Failed to find element by XPath:', error);
            return null;
        }
    }
    
    validateXPath(xpath) {
        try {
            document.evaluate(xpath, document, null, XPathResult.BOOLEAN_TYPE, null);
            return true;
        } catch (error) {
            return false;
        }
    }
    
    optimizeXPath(xpath) {
        try {
            // Remove unnecessary predicates
            let optimized = xpath;
            
            // Remove position predicates if element is unique without them
            optimized = optimized.replace(/\[\d+\]/g, '');
            
            // Test if optimized version is still unique
            if (this.isUniqueSelector(optimized)) {
                return optimized;
            }
            
            return xpath;
        } catch (error) {
            logger.error('Failed to optimize XPath:', error);
            return xpath;
        }
    }
    
    convertCSSToXPath(cssSelector) {
        try {
            let xpath = cssSelector;
            
            // Basic conversions
            xpath = xpath.replace(/>/g, '/');
            xpath = xpath.replace(/\s+/g, '//');
            xpath = xpath.replace(/^/, '//');
            
            // ID selectors
            xpath = xpath.replace(/#([a-zA-Z0-9_-]+)/g, '[@id="$1"]');
            
            // Class selectors
            xpath = xpath.replace(/\.([a-zA-Z0-9_-]+)/g, '[contains(@class,"$1")]');
            
            // Attribute selectors
            xpath = xpath.replace(/\[([a-zA-Z0-9_-]+)="([^"]+)"\]/g, '[@$1="$2"]');
            xpath = xpath.replace(/\[([a-zA-Z0-9_-]+)\]/g, '[@$1]');
            
            // Pseudo-selectors (basic support)
            xpath = xpath.replace(/:first-child/g, '[1]');
            xpath = xpath.replace(/:last-child/g, '[last()]');
            xpath = xpath.replace(/:nth-child\((\d+)\)/g, '[$1]');
            
            return xpath;
        } catch (error) {
            logger.error('Failed to convert CSS to XPath:', error);
            throw error;
        }
    }
    
    convertXPathToCSS(xpath) {
        try {
            let css = xpath;
            
            // Basic conversions
            css = css.replace(/^\/\//, '');
            css = css.replace(/\//g, ' > ');
            css = css.replace(/\/\//g, ' ');
            
            // ID attributes
            css = css.replace(/@id="([^"]+)"/g, '#$1');
            
            // Class attributes (simplified)
            css = css.replace(/contains\(@class,"([^"]+)"\)/g, '.$1');
            
            // Other attributes
            css = css.replace(/@([a-zA-Z0-9_-]+)="([^"]+)"/g, '[$1="$2"]');
            css = css.replace(/@([a-zA-Z0-9_-]+)/g, '[$1]');
            
            // Position predicates
            css = css.replace(/\[1\]/g, ':first-child');
            css = css.replace(/\[last\(\)\]/g, ':last-child');
            css = css.replace(/\[(\d+)\]/g, ':nth-child($1)');
            
            return css;
        } catch (error) {
            logger.error('Failed to convert XPath to CSS:', error);
            throw error;
        }
    }
    
    getElementXPathVariations(element) {
        const variations = [];
        
        try {
            // Standard XPath
            variations.push({
                type: 'standard',
                xpath: this.generateXPath(element)
            });
            
            // Absolute path
            variations.push({
                type: 'absolute',
                xpath: this.buildStructuralPath(element)
            });
            
            // Text-based
            const textContent = element.textContent?.trim();
            if (textContent) {
                variations.push({
                    type: 'text',
                    xpath: `//${element.tagName.toLowerCase()}[contains(text(),"${textContent}")]`
                });
            }
            
            // Attribute-based variations
            const attributes = ['name', 'type', 'value', 'href', 'src', 'alt', 'title'];
            attributes.forEach(attr => {
                if (element.hasAttribute(attr)) {
                    const value = element.getAttribute(attr);
                    variations.push({
                        type: `attribute-${attr}`,
                        xpath: `//${element.tagName.toLowerCase()}[@${attr}="${value}"]`
                    });
                }
            });
            
            // Class-based variations
            if (element.className) {
                const classes = element.className.split(' ').filter(c => c.trim());
                classes.forEach(cls => {
                    variations.push({
                        type: `class-${cls}`,
                        xpath: `//${element.tagName.toLowerCase()}[contains(@class,"${cls}")]`
                    });
                });
            }
            
            return variations;
        } catch (error) {
            logger.error('Failed to get XPath variations:', error);
            return variations;
        }
    }
    
    generateElementKey(element) {
        return `${element.tagName}-${element.id || ''}-${element.className || ''}-${element.getAttribute('name') || ''}`;
    }
    
    cacheResult(key, xpath) {
        if (this.cache.size >= this.maxCacheSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        
        this.cache.set(key, xpath);
    }
    
    clearCache() {
        this.cache.clear();
    }
    
    getCacheStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxCacheSize,
            hitRate: this.cacheHits / (this.cacheHits + this.cacheMisses) || 0
        };
    }
    
    // Client-side integration helper
    static injectXPathScript() {
        return `
            (function() {
                window.xpathHelper = new (${XPathHelper.toString()})();
                
                // Expose methods to window
                window.generateXPath = function(element) {
                    return window.xpathHelper.generateXPath(element);
                };
                
                window.findElementByXPath = function(xpath) {
                    return window.xpathHelper.findElementByXPath(xpath);
                };
                
                window.validateXPath = function(xpath) {
                    return window.xpathHelper.validateXPath(xpath);
                };
                
                window.convertCSSToXPath = function(cssSelector) {
                    return window.xpathHelper.convertCSSToXPath(cssSelector);
                };
                
                window.convertXPathToCSS = function(xpath) {
                    return window.xpathHelper.convertXPathToCSS(xpath);
                };
            })();
        `;
    }
}

module.exports = XPathHelper;
