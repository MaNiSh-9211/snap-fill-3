const { getDB } = require('../config/database');
const { ObjectId } = require('mongodb');
const logger = require('../utils/logger');

class TestReport {
    constructor(data) {
        this.reportId = data.reportId || new ObjectId().toString();
        this.testId = data.testId;
        this.userStory = data.userStory;
        this.url = data.url;
        this.status = data.status;
        this.executionSummary = data.executionSummary || {};
        this.testSteps = data.testSteps || [];
        this.screenshots = data.screenshots || [];
        this.errors = data.errors || [];
        this.evidence = data.evidence || [];
        this.htmlReport = data.htmlReport || '';
        this.reportPath = data.reportPath || '';
        this.executionTime = data.executionTime || 0;
        this.createdAt = data.createdAt || new Date();
        this.metadata = data.metadata || {};
    }
    
    static async create(data) {
        try {
            const db = getDB();
            const testReport = new TestReport(data);
            
            const result = await db.collection('testReports').insertOne(testReport);
            testReport._id = result.insertedId;
            
            logger.info(`Test report created with ID: ${testReport.reportId}`);
            return testReport;
        } catch (error) {
            logger.error('Failed to create test report:', error);
            throw error;
        }
    }
    
    static async findByTestId(testId) {
        try {
            const db = getDB();
            const result = await db.collection('testReports').findOne({ testId });
            
            if (!result) {
                return null;
            }
            
            return new TestReport(result);
        } catch (error) {
            logger.error('Failed to find test report:', error);
            throw error;
        }
    }
    
    static async findByReportId(reportId) {
        try {
            const db = getDB();
            const result = await db.collection('testReports').findOne({ reportId });
            
            if (!result) {
                return null;
            }
            
            return new TestReport(result);
        } catch (error) {
            logger.error('Failed to find test report:', error);
            throw error;
        }
    }
    
    static async findAll(filter = {}, options = {}) {
        try {
            const db = getDB();
            const { skip = 0, limit = 50, sort = { createdAt: -1 } } = options;
            
            const results = await db.collection('testReports')
                .find(filter)
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .toArray();
            
            return results.map(result => new TestReport(result));
        } catch (error) {
            logger.error('Failed to find test reports:', error);
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
            
            await db.collection('testReports').updateOne(
                { reportId: this.reportId },
                { $set: updateObj }
            );
            
            // Update local instance
            Object.assign(this, updateObj);
            
            logger.info(`Test report updated: ${this.reportId}`);
            return this;
        } catch (error) {
            logger.error('Failed to update test report:', error);
            throw error;
        }
    }
    
    static async cleanup(daysOld = 60) {
        try {
            const db = getDB();
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysOld);
            
            const result = await db.collection('testReports').deleteMany({
                createdAt: { $lt: cutoffDate }
            });
            
            logger.info(`Cleaned up ${result.deletedCount} old test reports`);
            return result.deletedCount;
        } catch (error) {
            logger.error('Failed to cleanup test reports:', error);
            throw error;
        }
    }
    
    static async delete(reportId) {
        try {
            const db = getDB();
            const result = await db.collection('testReports').deleteOne({ reportId });
            
            if (result.deletedCount === 0) {
                throw new Error(`Test report not found: ${reportId}`);
            }
            
            logger.info(`Test report deleted: ${reportId}`);
            return true;
        } catch (error) {
            logger.error('Failed to delete test report:', error);
            throw error;
        }
    }
    
    toJSON() {
        return {
            reportId: this.reportId,
            testId: this.testId,
            userStory: this.userStory,
            url: this.url,
            status: this.status,
            executionSummary: this.executionSummary,
            testSteps: this.testSteps,
            screenshots: this.screenshots,
            errors: this.errors,
            evidence: this.evidence,
            htmlReport: this.htmlReport,
            reportPath: this.reportPath,
            executionTime: this.executionTime,
            createdAt: this.createdAt,
            metadata: this.metadata
        };
    }
}

module.exports = TestReport;
