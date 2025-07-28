const logger = require('./logger');

class DOMMutationTracker {
    constructor() {
        this.mutations = [];
        this.observer = null;
        this.isTracking = false;
        this.config = {
            childList: true,
            subtree: true,
            attributes: true,
            attributeOldValue: true,
            characterData: true,
            characterDataOldValue: true
        };
    }
    
    startTracking(targetNode = document.body) {
        if (this.isTracking) {
            logger.warn('DOM mutation tracking is already active');
            return;
        }
        
        try {
            this.mutations = [];
            
            this.observer = new MutationObserver((mutations) => {
                this.processMutations(mutations);
            });
            
            this.observer.observe(targetNode, this.config);
            this.isTracking = true;
            
            logger.info('DOM mutation tracking started');
        } catch (error) {
            logger.error('Failed to start DOM mutation tracking:', error);
            throw error;
        }
    }
    
    stopTracking() {
        if (!this.isTracking) {
            logger.warn('DOM mutation tracking is not active');
            return;
        }
        
        try {
            if (this.observer) {
                this.observer.disconnect();
                this.observer = null;
            }
            
            this.isTracking = false;
            logger.info('DOM mutation tracking stopped');
        } catch (error) {
            logger.error('Failed to stop DOM mutation tracking:', error);
            throw error;
        }
    }
    
    processMutations(mutations) {
        mutations.forEach((mutation) => {
            const mutationData = this.extractMutationData(mutation);
            this.mutations.push(mutationData);
        });
    }
    
    extractMutationData(mutation) {
        const mutationData = {
            type: mutation.type,
            target: this.getElementInfo(mutation.target),
            timestamp: Date.now(),
            oldValue: mutation.oldValue
        };
        
        switch (mutation.type) {
            case 'childList':
                mutationData.addedNodes = Array.from(mutation.addedNodes).map(node => 
                    this.getNodeInfo(node)
                );
                mutationData.removedNodes = Array.from(mutation.removedNodes).map(node => 
                    this.getNodeInfo(node)
                );
                break;
                
            case 'attributes':
                mutationData.attributeName = mutation.attributeName;
                mutationData.attributeNamespace = mutation.attributeNamespace;
                mutationData.newValue = mutation.target.getAttribute(mutation.attributeName);
                break;
                
            case 'characterData':
                mutationData.newValue = mutation.target.textContent;
                break;
        }
        
        return mutationData;
    }
    
    getElementInfo(element) {
        if (!element || element.nodeType !== Node.ELEMENT_NODE) {
            return this.getNodeInfo(element);
        }
        
        return {
            nodeType: element.nodeType,
            tagName: element.tagName,
            id: element.id,
            className: element.className,
            textContent: element.textContent?.substring(0, 100),
            attributes: this.getElementAttributes(element),
            boundingRect: this.getElementBoundingRect(element),
            xpath: this.generateXPath(element)
        };
    }
    
    getNodeInfo(node) {
        if (!node) return null;
        
        return {
            nodeType: node.nodeType,
            nodeName: node.nodeName,
            nodeValue: node.nodeValue,
            textContent: node.textContent?.substring(0, 100)
        };
    }
    
    getElementAttributes(element) {
        const attributes = {};
        
        if (element.attributes) {
            Array.from(element.attributes).forEach(attr => {
                attributes[attr.name] = attr.value;
            });
        }
        
        return attributes;
    }
    
    getElementBoundingRect(element) {
        try {
            const rect = element.getBoundingClientRect();
            return {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height
            };
        } catch (error) {
            return null;
        }
    }
    
    generateXPath(element) {
        try {
            if (element.id) {
                return `//*[@id="${element.id}"]`;
            }
            
            const path = [];
            let current = element;
            
            while (current && current.nodeType === Node.ELEMENT_NODE) {
                let index = 0;
                const siblings = current.parentNode ? Array.from(current.parentNode.children) : [];
                
                for (let i = 0; i < siblings.length; i++) {
                    const sibling = siblings[i];
                    if (sibling === current) {
                        index = i + 1;
                        break;
                    }
                }
                
                const tagName = current.tagName.toLowerCase();
                const pathSegment = `${tagName}[${index}]`;
                path.unshift(pathSegment);
                
                current = current.parentNode;
                
                if (current === document.body) {
                    path.unshift('body');
                    break;
                }
            }
            
            return '/' + path.join('/');
        } catch (error) {
            return null;
        }
    }
    
    getMutations() {
        return [...this.mutations];
    }
    
    clearMutations() {
        this.mutations = [];
    }
    
    getMutationsSince(timestamp) {
        return this.mutations.filter(mutation => mutation.timestamp >= timestamp);
    }
    
    getMutationsByType(type) {
        return this.mutations.filter(mutation => mutation.type === type);
    }
    
    getMutationsByTarget(targetSelector) {
        return this.mutations.filter(mutation => {
            const target = mutation.target;
            return target && this.matchesSelector(target, targetSelector);
        });
    }
    
    matchesSelector(elementInfo, selector) {
        try {
            // Simple selector matching - can be enhanced
            if (selector.startsWith('#')) {
                return elementInfo.id === selector.substring(1);
            }
            
            if (selector.startsWith('.')) {
                const className = selector.substring(1);
                return elementInfo.className && elementInfo.className.includes(className);
            }
            
            if (selector.toLowerCase() === elementInfo.tagName?.toLowerCase()) {
                return true;
            }
            
            return false;
        } catch (error) {
            return false;
        }
    }
    
    getStatistics() {
        const stats = {
            totalMutations: this.mutations.length,
            mutationTypes: {},
            targetElements: {},
            timeRange: {
                earliest: null,
                latest: null
            }
        };
        
        this.mutations.forEach(mutation => {
            // Count mutation types
            stats.mutationTypes[mutation.type] = (stats.mutationTypes[mutation.type] || 0) + 1;
            
            // Count target elements
            const tagName = mutation.target?.tagName;
            if (tagName) {
                stats.targetElements[tagName] = (stats.targetElements[tagName] || 0) + 1;
            }
            
            // Update time range
            if (!stats.timeRange.earliest || mutation.timestamp < stats.timeRange.earliest) {
                stats.timeRange.earliest = mutation.timestamp;
            }
            
            if (!stats.timeRange.latest || mutation.timestamp > stats.timeRange.latest) {
                stats.timeRange.latest = mutation.timestamp;
            }
        });
        
        return stats;
    }
    
    exportMutations(format = 'json') {
        switch (format) {
            case 'json':
                return JSON.stringify(this.mutations, null, 2);
                
            case 'csv':
                return this.convertToCSV();
                
            case 'summary':
                return this.createSummary();
                
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }
    
    convertToCSV() {
        const headers = ['timestamp', 'type', 'targetTag', 'targetId', 'targetClass', 'attributeName', 'oldValue', 'newValue'];
        const rows = [headers.join(',')];
        
        this.mutations.forEach(mutation => {
            const row = [
                mutation.timestamp,
                mutation.type,
                mutation.target?.tagName || '',
                mutation.target?.id || '',
                mutation.target?.className || '',
                mutation.attributeName || '',
                mutation.oldValue || '',
                mutation.newValue || ''
            ];
            
            rows.push(row.map(cell => `"${cell}"`).join(','));
        });
        
        return rows.join('\n');
    }
    
    createSummary() {
        const stats = this.getStatistics();
        
        return `
DOM Mutation Summary
===================
Total Mutations: ${stats.totalMutations}
Time Range: ${new Date(stats.timeRange.earliest).toISOString()} - ${new Date(stats.timeRange.latest).toISOString()}

Mutation Types:
${Object.entries(stats.mutationTypes).map(([type, count]) => `  ${type}: ${count}`).join('\n')}

Target Elements:
${Object.entries(stats.targetElements).map(([element, count]) => `  ${element}: ${count}`).join('\n')}
        `.trim();
    }
    
    // Client-side integration helpers
    static injectTrackingScript() {
        return `
            (function() {
                window.domMutationTracker = new (${DOMMutationTracker.toString()})();
                
                // Auto-start tracking when DOM is ready
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', function() {
                        window.domMutationTracker.startTracking();
                    });
                } else {
                    window.domMutationTracker.startTracking();
                }
                
                // Expose methods to window
                window.startDOMTracking = function() {
                    window.domMutationTracker.startTracking();
                };
                
                window.stopDOMTracking = function() {
                    window.domMutationTracker.stopTracking();
                };
                
                window.getDOMMutations = function() {
                    return window.domMutationTracker.getMutations();
                };
                
                window.clearDOMMutations = function() {
                    window.domMutationTracker.clearMutations();
                };
            })();
        `;
    }
}

module.exports = DOMMutationTracker;
