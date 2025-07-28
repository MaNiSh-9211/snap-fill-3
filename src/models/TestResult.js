const { getDB } = require('../config/database');
const { ObjectId } = require('mongodb');
const logger = require('../utils/logger');

class TestResult {
    constructor(data) {
        this.testId = data.testId || new ObjectId().toString();
        this.userStory = data.userStory;
        this.url = data.url;
        this.status = data.status || 'pending'; // pending, running, completed, failed
        this.generatedSelectors = data.generatedSelectors || [];
        this.generatedScript = data.generatedScript || null;
        this.executionResults = data.executionResults || [];
        this.screenshots = data.screenshots || [];
        this.domStates = data.domStates || [];
        this.logs = data.logs || [];
        this.errors = data.errors || [];
        this.evidence = data.evidence || [];
        this.executionTime = data.executionTime || null;
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
        this.htmlContent = data.htmlContent || '';
        this.cleanedHtml = data.cleanedHtml || '';
        this.tokenCount = data.tokenCount || 0;
    }
    
    static async create(data) {
        try {
            const db = getDB();
            const testResult = new TestResult(data);
            
            const result = await db.collection('testResults').insertOne(testResult);
            testResult._id = result.insertedId;
            
            logger.info(`Test result created with ID: ${testResult.testId}`);
            return testResult;
        } catch (error) {
            logger.error('Failed to create test result:', error);
            throw error;
        }
    }
    
    static async findByTestId(testId) {
        try {
            const db = getDB();
            const result = await db.collection('testResults').findOne({ testId });
            
            if (!result) {
                return null;
            }
            
            return new TestResult(result);
        } catch (error) {
            logger.error('Failed to find test result:', error);
            throw error;
        }
    }
    
    static async findAll(filter = {}, options = {}) {
        try {
            const db = getDB();
            const { skip = 0, limit = 50, sort = { createdAt: -1 } } = options;
            
            const results = await db.collection('testResults')
                .find(filter)
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .toArray();
            
            return results.map(result => new TestResult(result));
        } catch (error) {
            logger.error('Failed to find test results:', error);
            throw error;
        }
    }
    
    async update(updateData) {
        try {
            const db = getDB();
            
            const updateObj = {
                ...updateData,
                updatedAt: new Date()
            };
            
            await db.collection('testResults').updateOne(
                { testId: this.testId },
                { $set: updateObj }
            );
            
            // Update local instance
            Object.assign(this, updateObj);
            
            logger.info(`Test result updated: ${this.testId}`);
            return this;
        } catch (error) {
            logger.error('Failed to update test result:', error);
            throw error;
        }
    }
    
    async addLog(level, message, metadata = {}) {
        const logEntry = {
            level,
            message,
            metadata,
            timestamp: new Date()
        };
        
        this.logs.push(logEntry);
        
        await this.update({ logs: this.logs });
        logger.info(`Log added to test ${this.testId}: ${level} - ${message}`);
    }
    
    async addError(error, context = {}) {
        const errorEntry = {
            message: error.message,
            stack: error.stack,
            context,
            timestamp: new Date()
        };
        
        this.errors.push(errorEntry);
        
        await this.update({ errors: this.errors });
        logger.error(`Error added to test ${this.testId}:`, error);
    }
    
    async addScreenshot(screenshot, description = '') {
        const screenshotEntry = {
            data: screenshot,
            description,
            timestamp: new Date()
        };
        
        this.screenshots.push(screenshotEntry);
        
        await this.update({ screenshots: this.screenshots });
        logger.info(`Screenshot added to test ${this.testId}: ${description}`);
    }
    
    async addEvidence(type, data, description = '') {
        const evidenceEntry = {
            type, // 'screenshot', 'dom', 'log', 'error'
            data,
            description,
            timestamp: new Date()
        };
        
        this.evidence.push(evidenceEntry);
        
        await this.update({ evidence: this.evidence });
        logger.info(`Evidence added to test ${this.testId}: ${type} - ${description}`);
    }
    
    static async cleanup(daysOld = 30) {
        try {
            const db = getDB();
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysOld);
            
            const result = await db.collection('testResults').deleteMany({
                createdAt: { $lt: cutoffDate }
            });
            
            logger.info(`Cleaned up ${result.deletedCount} old test results`);
            return result.deletedCount;
        } catch (error) {
            logger.error('Failed to cleanup test results:', error);
            throw error;
        }
    }
    
    static async delete(testId) {
        try {
            const db = getDB();
            const result = await db.collection('testResults').deleteOne({ testId });
            
            if (result.deletedCount === 0) {
                throw new Error(`Test result not found: ${testId}`);
            }
            
            logger.info(`Test result deleted: ${testId}`);
            return true;
        } catch (error) {
            logger.error('Failed to delete test result:', error);
            throw error;
        }
    }
    
    toJSON() {
        return {
            testId: this.testId,
            userStory: this.userStory,
            url: this.url,
            status: this.status,
            generatedSelectors: this.generatedSelectors,
            generatedScript: this.generatedScript,
            executionResults: this.executionResults,
            screenshots: this.screenshots,
            domStates: this.domStates,
            logs: this.logs,
            errors: this.errors,
            evidence: this.evidence,
            executionTime: this.executionTime,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            tokenCount: this.tokenCount
        };
    }
}

module.exports = TestResult;
