const { JSDOM } = require('jsdom');
const logger = require('../utils/logger');

class HtmlProcessor {
    constructor() {
        this.excludedTags = [
            'script', 'style', 'meta', 'link', 'head', 'title', 'noscript',
            'svg', 'path', 'g', 'defs', 'clipPath', 'use', 'symbol'
        ];
        
        this.excludedAttributes = [
            'style', 'onload', 'onerror', 'onclick', 'onmouseover', 'onmouseout',
            'onfocus', 'onblur', 'onchange', 'onsubmit', 'data-reactid',
            'data-react-checksum', 'data-reactroot'
        ];
        
        this.keepAttributes = [
            'id', 'class', 'name', 'type', 'href', 'src', 'alt', 'title',
            'placeholder', 'value', 'for', 'data-test', 'data-testid',
            'aria-label', 'aria-labelledby', 'role'
        ];
    }
    
    async fetchHtml(url) {
        try {
            // logger.info(`=============================================Fetching HTML from:   ${url}==================================================================`);
            
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                timeout: 30000
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const html = await response.text();
            logger.info(`=====================================================Fetched HTML content:============================================================== ${html.length} characters`);
            
            return html;
        } catch (error) {
            logger.error(`==================================================Failed to fetch HTML from   ${url}:========================================================`, error);
            throw error;
        }
    }
    
    async cleanHtml(htmlContent) {
        try {
            logger.info('Cleaning HTML content for token optimization');

            // Remove <style>, <script>, and <link rel="stylesheet"> tags and their contents using regex
            let strippedHtml = htmlContent
                .replace(/<script[\s\S]*?<\/script>/gi, '')
                .replace(/<style[\s\S]*?<\/style>/gi, '')
                .replace(/<link[^>]*rel=["']stylesheet["'][^>]*>/gi, '');

            // Parse HTML with JSDOM
            const dom = new JSDOM(strippedHtml);
            const document = dom.window.document;
            
            // Remove excluded tags
            this.removeExcludedTags(document);
            
            // Clean attributes
            this.cleanAttributes(document);
            
            // Remove empty elements
            this.removeEmptyElements(document);
            
            // Normalize whitespace
            this.normalizeWhitespace(document);
            
            // Remove comments
            this.removeComments(document);
            
            // Extract only body content
            const bodyContent = document.body ? document.body.innerHTML : document.documentElement.innerHTML;
            
            const cleanedHtml = this.minifyHtml(bodyContent);
            
            logger.info(`====================================================HTML cleaned: ${htmlContent.length} → ${cleanedHtml.length} characters=============================================`);
            
            return cleanedHtml;
        } catch (error) {
            logger.error('=================================================Failed to clean HTML:============================================================', error);
            throw error;
        }
    }
    
    // removeExcludedTags(document) {
    //     this.excludedTags.forEach(tag => {
    //         const elements = document.querySelectorAll(tag);
    //         elements.forEach(element => element.remove());
    //     });
    // }


    // Completely removes certain tags like <script>, <style>, <meta>, etc. from the DOM
    removeExcludedTags(document) {
    const removedTagStats = {};

    this.excludedTags.forEach(tag => {
        const elements = document.querySelectorAll(tag);
        
        if (elements.length > 0) {
            removedTagStats[tag] = elements.length;
        }

        elements.forEach(element => {
            // Optional: log exact element being removed
            logger.debug(`==========================Removing <${tag}> element: ${element.outerHTML.slice(0, 200)}...=======================================`);
            element.remove();
        });
    });

    if (Object.keys(removedTagStats).length > 0) {
        logger.info('===========================================================Removed tags summary:=====================================================', removedTagStats);
    } else {
        logger.info('=============================================================No excluded tags found for removal.=====================================================');
    }
}

    // Strips or keeps specific attributes like style, onclick, href, id, etc. from elements
    cleanAttributes(document) {
        const allElements = document.querySelectorAll('*');
        
        allElements.forEach(element => {
            const attributes = Array.from(element.attributes);
            
            attributes.forEach(attr => {
                const attrName = attr.name.toLowerCase();
                
                // Remove excluded attributes
                if (this.excludedAttributes.includes(attrName)) {
                    element.removeAttribute(attrName);
                    return;
                }
                
                // Keep only important attributes
                if (!this.keepAttributes.includes(attrName) && 
                    !attrName.startsWith('data-test') && 
                    !attrName.startsWith('aria-')) {
                    element.removeAttribute(attrName);
                }
            });
        });
    }
    

//     remove unnecessary or useless HTML elements from the DOM — specifically, elements that are:

// Visually and semantically empty

// Not interactive or uniquely identifiable

// Not self-closing or void elements like <img>, <br>, etc.


    removeEmptyElements(document) {
        const elements = document.querySelectorAll('*');
        
        elements.forEach(element => {
            // Skip certain elements that might be empty but important
            if (['input', 'img', 'br', 'hr', 'area', 'base', 'col', 'embed', 'link', 'meta', 'param', 'source', 'track', 'wbr'].includes(element.tagName.toLowerCase())) {
                return;
            }
            
            // Remove if empty and has no important attributes
            if (!element.textContent.trim() && 
                !element.hasAttribute('id') && 
                !element.hasAttribute('class') && 
                !element.hasAttribute('data-testid') && 
                element.children.length === 0) {
                element.remove();
            }
        });
    }
    
    normalizeWhitespace(document) {
        const walker = document.createTreeWalker(
            document.body || document.documentElement,
            document.defaultView.NodeFilter.SHOW_TEXT,
            null,
            false
        );
        
        const textNodes = [];
        let node;
        
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }
        
        textNodes.forEach(textNode => {
            const normalizedText = textNode.textContent
                .replace(/\s+/g, ' ')
                .trim();
            
            if (normalizedText) {
                textNode.textContent = normalizedText;
            } else {
                textNode.remove();
            }
        });
    }
    
    removeComments(document) {
        const walker = document.createTreeWalker(
            document.body || document.documentElement,
            document.defaultView.NodeFilter.SHOW_COMMENT,
            null,
            false
        );
        
        const comments = [];
        let node;
        
        while (node = walker.nextNode()) {
            comments.push(node);
        }
        
        comments.forEach(comment => comment.remove());
    }
    
    minifyHtml(html) {
        return html
            .replace(/>\s+</g, '><') // Remove whitespace between tags
            .replace(/\s+/g, ' ') // Normalize whitespace
            .replace(/\s*=\s*/g, '=') // Remove spaces around equals
            // .replace(/;\s*}/g, ';}') // Minify inline styles
            .trim();
    }
    
    async estimateTokens(text) {
        // Rough estimation: 1 token ≈ 4 characters for English text
        // HTML might be denser, so use 3.5 characters per token
        return Math.ceil(text.length / 3.5);
    }
    

    // below function returns 
//     [
//   {
//     tagName: "button",
//     id: "submitBtn",
//     className: "",
//     type: "",
//     name: "",
//     href: "",
//     textContent: "Submit",
//     placeholder: "",
//     value: "",
//     ariaLabel: null,
//     selector: "#submitBtn"
//   },
//   {
//     tagName: "input",
//     id: "",
//     className: "",
//     type: "text",
//     name: "email",
//     href: "",
//     textContent: "",
//     placeholder: "Enter your email",
//     value: "",
//     ariaLabel: null,
//     selector: 'input[name="email"]'
//   }
// ]
    async extractInteractiveElements(htmlContent) {
        try {
            const dom = new JSDOM(htmlContent);
            const document = dom.window.document;
            
            const interactiveSelectors = [
                'input', 'button', 'select', 'textarea', 'a[href]',
                '[onclick]', '[onsubmit]', '[role="button"]', '[role="link"]',
                '[tabindex]', '[contenteditable]'
            ];
            
            const elements = [];
            
            interactiveSelectors.forEach(selector => {
                const found = document.querySelectorAll(selector);
                found.forEach(element => {
                    elements.push({
                        tagName: element.tagName.toLowerCase(),
                        id: element.id,
                        className: element.className,
                        type: element.type,
                        name: element.name,
                        href: element.href,
                        textContent: element.textContent?.trim().substring(0, 100),
                        placeholder: element.placeholder,
                        value: element.value,
                        ariaLabel: element.getAttribute('aria-label'),
                        selector: this.generateSelector(element)
                    });
                });
            });
            
            logger.info(`Found ${elements.length} interactive elements`);
            return elements;
        } catch (error) {
            logger.error('Failed to extract interactive elements:', error);
            return [];
        }
    }
    
    generateSelector(element) {
        // Generate a CSS selector for the element
        if (element.id) {
            return `#${element.id}`;
        }
        
        if (element.className) {
            const classes = element.className.split(' ').filter(c => c);
            if (classes.length > 0) {
                return `${element.tagName.toLowerCase()}.${classes.join('.')}`;
            }
        }
        
        if (element.name) {
            return `${element.tagName.toLowerCase()}[name="${element.name}"]`;
        }
        
        if (element.type) {
            return `${element.tagName.toLowerCase()}[type="${element.type}"]`;
        }
        
        // Generate path-based selector as fallback
        const path = [];
        let current = element;
        
        while (current && current.tagName) {
            let selector = current.tagName.toLowerCase();
            
            if (current.id) {
                selector += `#${current.id}`;
                path.unshift(selector);
                break;
            }
            
            if (current.className) {
                const classes = current.className.split(' ').filter(c => c);
                if (classes.length > 0) {
                    selector += `.${classes[0]}`;
                }
            }
            
            // Add index if there are siblings with same tag
            const siblings = Array.from(current.parentNode?.children || []);
            const sameTagSiblings = siblings.filter(s => s.tagName === current.tagName);
            if (sameTagSiblings.length > 1) {
                const index = sameTagSiblings.indexOf(current) + 1;
                selector += `:nth-child(${index})`;
            }
            
            path.unshift(selector);
            current = current.parentNode;
            
            // Limit depth to avoid overly long selectors
            if (path.length >= 5) break;
        }
        
        return path.join(' > ');
    }
    
    async extractFormStructure(htmlContent) {
        try {
            const dom = new JSDOM(htmlContent);
            const document = dom.window.document;
            
            const forms = document.querySelectorAll('form');
            const formStructures = [];
            
            forms.forEach((form, index) => {
                const formData = {
                    index,
                    id: form.id,
                    className: form.className,
                    action: form.action,
                    method: form.method,
                    selector: this.generateSelector(form),
                    fields: []
                };
                
                const fields = form.querySelectorAll('input, select, textarea');
                fields.forEach(field => {
                    formData.fields.push({
                        tagName: field.tagName.toLowerCase(),
                        type: field.type,
                        name: field.name,
                        id: field.id,
                        placeholder: field.placeholder,
                        required: field.required,
                        selector: this.generateSelector(field)
                    });
                });
                
                formStructures.push(formData);
            });
            
            logger.info(`Found ${formStructures.length} forms`);
            return formStructures;
        } catch (error) {
            logger.error('Failed to extract form structure:', error);
            return [];
        }
    }
    
    async optimizeForLLM(htmlContent, maxTokens = 8000) {
        try {
            let currentTokens = await this.estimateTokens(htmlContent);
            
            if (currentTokens <= maxTokens) {
                return htmlContent;
            }
            
            logger.info(`Optimizing HTML for LLM: ${currentTokens} tokens → target: ${maxTokens} tokens`);
            
            // Aggressive cleaning for token optimization
            const dom = new JSDOM(htmlContent);
            const document = dom.window.document;
            
            // Remove less important elements
            const lowPriorityTags = ['span', 'div', 'p', 'img', 'video', 'audio', 'canvas'];
            lowPriorityTags.forEach(tag => {
                const elements = document.querySelectorAll(`${tag}:not([id]):not([class]):not([data-testid])`);
                elements.forEach(element => {
                    if (!element.textContent.trim() || element.textContent.length < 10) {
                        element.remove();
                    }
                });
            });
            
            // Truncate long text content
            const textElements = document.querySelectorAll('*');
            textElements.forEach(element => {
                if (element.textContent && element.textContent.length > 200) {
                    element.textContent = element.textContent.substring(0, 200) + '...';
                }
            });
            
            let optimizedHtml = document.body ? document.body.innerHTML : document.documentElement.innerHTML;
            optimizedHtml = this.minifyHtml(optimizedHtml);
            
            currentTokens = await this.estimateTokens(optimizedHtml);
            
            // If still too long, truncate
            if (currentTokens > maxTokens) {
                const targetLength = maxTokens * 3.5 * 0.8; // 80% of max to be safe
                optimizedHtml = optimizedHtml.substring(0, targetLength);
                logger.warn(`HTML truncated to ${optimizedHtml.length} characters`);
            }
            
            logger.info(`HTML optimized: ${await this.estimateTokens(optimizedHtml)} tokens`);
            
            return optimizedHtml;
        } catch (error) {
            logger.error('Failed to optimize HTML for LLM:', error);
            return htmlContent;
        }
    }
}

module.exports = new HtmlProcessor();
