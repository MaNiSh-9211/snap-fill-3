const fs = require('fs').promises;
const path = require('path');
const TestReport = require('../models/TestReport');
const logger = require('../utils/logger');

class ReportGenerator {
    constructor() {
        this.templatePath = path.join(__dirname, '../../templates/report.html');
        this.reportsDir = path.join(__dirname, '../../reports');
        this.publicDir = path.join(__dirname, '../../public');
        
        this.initializeDirectories();
    }
    
    async initializeDirectories() {
        try {
            await fs.mkdir(this.reportsDir, { recursive: true });
            await fs.mkdir(this.publicDir, { recursive: true });
        } catch (error) {
            logger.error('Failed to initialize report directories:', error);
        }
    }
    
    async generateReport(testResult) {
        try {
            logger.info(`Generating report for test: ${testResult.testId}`);
            
            // Create comprehensive report data
            const reportData = await this.prepareReportData(testResult);
            
            // Generate HTML report
            const htmlContent = await this.generateHtmlReport(reportData);
            
            // Save report to file
            const reportPath = await this.saveReportToFile(testResult.testId, htmlContent);
            
            // Create and save test report record
            const testReport = await TestReport.create({
                testId: testResult.testId,
                userStory: testResult.userStory,
                url: testResult.url,
                status: testResult.status,
                executionSummary: this.createExecutionSummary(testResult),
                testSteps: this.formatTestSteps(testResult.executionResults || []),
                screenshots: testResult.screenshots || [],
                errors: testResult.errors || [],
                evidence: testResult.evidence || [],
                htmlReport: htmlContent,
                reportPath: reportPath,
                executionTime: testResult.executionTime || 0,
                metadata: {
                    generatedAt: new Date(),
                    tokenCount: testResult.tokenCount || 0,
                    selectorCount: testResult.generatedSelectors?.length || 0,
                    stepCount: testResult.executionResults?.length || 0
                }
            });
            
            logger.info(`Report generated successfully: ${testReport.reportId}`);
            return testReport;
            
        } catch (error) {
            logger.error('Failed to generate report:', error);
            throw error;
        }
    }
    
    async prepareReportData(testResult) {
        const reportData = {
            testId: testResult.testId,
            userStory: testResult.userStory,
            url: testResult.url,
            status: testResult.status,
            createdAt: testResult.createdAt,
            executionTime: testResult.executionTime || 0,
            
            // Execution summary
            summary: this.createExecutionSummary(testResult),
            
            // Test steps with enhanced formatting
            steps: this.formatTestSteps(testResult.executionResults || []),
            
            // Screenshots with metadata
            screenshots: this.formatScreenshots(testResult.screenshots || []),
            
            // Error details
            errors: this.formatErrors(testResult.errors || []),
            
            // Evidence collection
            evidence: this.formatEvidence(testResult.evidence || []),
            
            // Generated content
            generatedSelectors: testResult.generatedSelectors || [],
            generatedScript: testResult.generatedScript,
            
            // Logs
            logs: this.formatLogs(testResult.logs || []),
            
            // Metadata
            metadata: {
                tokenCount: testResult.tokenCount || 0,
                selectorCount: testResult.generatedSelectors?.length || 0,
                stepCount: testResult.executionResults?.length || 0,
                screenshotCount: testResult.screenshots?.length || 0,
                errorCount: testResult.errors?.length || 0
            }
        };
        
        return reportData;
    }
    
    createExecutionSummary(testResult) {
        const executionResults = testResult.executionResults || [];
        const totalSteps = executionResults.length;
        const successfulSteps = executionResults.filter(step => step.success).length;
        const failedSteps = totalSteps - successfulSteps;
        
        return {
            totalSteps,
            successfulSteps,
            failedSteps,
            successRate: totalSteps > 0 ? ((successfulSteps / totalSteps) * 100).toFixed(2) : 0,
            executionTime: testResult.executionTime || 0,
            status: testResult.status,
            startTime: testResult.createdAt,
            endTime: new Date(testResult.createdAt.getTime() + (testResult.executionTime || 0)),
            failedStep: failedSteps > 0 ? executionResults.find(step => !step.success) : null
        };
    }
    
    formatTestSteps(executionResults) {
        return executionResults.map((step, index) => ({
            ...step,
            index: index + 1,
            durationFormatted: this.formatDuration(step.executionTime || 0),
            timestampFormatted: this.formatTimestamp(step.timestamp),
            statusIcon: step.success ? '✅' : '❌',
            statusText: step.success ? 'SUCCESS' : 'FAILED'
        }));
    }
    
    formatScreenshots(screenshots) {
        return screenshots.map((screenshot, index) => ({
            ...screenshot,
            index: index + 1,
            timestampFormatted: this.formatTimestamp(screenshot.timestamp),
            sizeFormatted: this.formatFileSize(screenshot.data?.length || 0),
            dataUri: `data:image/png;base64,${screenshot.data}`
        }));
    }
    
    formatErrors(errors) {
        return errors.map((error, index) => ({
            ...error,
            index: index + 1,
            timestampFormatted: this.formatTimestamp(error.timestamp),
            stackTrace: error.stack ? error.stack.split('\n').slice(0, 10) : [],
            severity: this.determineErrorSeverity(error)
        }));
    }
    
    formatEvidence(evidence) {
        return evidence.map((item, index) => ({
            ...item,
            index: index + 1,
            timestampFormatted: this.formatTimestamp(item.timestamp),
            typeIcon: this.getEvidenceTypeIcon(item.type),
            formattedData: this.formatEvidenceData(item)
        }));
    }
    
    formatLogs(logs) {
        return logs.map((log, index) => ({
            ...log,
            index: index + 1,
            timestampFormatted: this.formatTimestamp(log.timestamp),
            levelIcon: this.getLogLevelIcon(log.level),
            levelClass: `log-${log.level}`
        }));
    }
    
    async generateHtmlReport(reportData) {
        try {
            // Read HTML template
            const templateContent = await fs.readFile(this.templatePath, 'utf8');
            
            // Replace placeholders with actual data
            let htmlContent = templateContent
                .replace(/\{\{testId\}\}/g, reportData.testId)
                .replace(/\{\{userStory\}\}/g, this.escapeHtml(reportData.userStory))
                .replace(/\{\{url\}\}/g, this.escapeHtml(reportData.url))
                .replace(/\{\{status\}\}/g, reportData.status)
                .replace(/\{\{statusClass\}\}/g, this.getStatusClass(reportData.status))
                .replace(/\{\{statusIcon\}\}/g, this.getStatusIcon(reportData.status))
                .replace(/\{\{createdAt\}\}/g, this.formatTimestamp(reportData.createdAt))
                .replace(/\{\{executionTime\}\}/g, this.formatDuration(reportData.executionTime))
                .replace(/\{\{summaryJson\}\}/g, JSON.stringify(reportData.summary))
                .replace(/\{\{stepsJson\}\}/g, JSON.stringify(reportData.steps))
                .replace(/\{\{screenshotsJson\}\}/g, JSON.stringify(reportData.screenshots))
                .replace(/\{\{errorsJson\}\}/g, JSON.stringify(reportData.errors))
                .replace(/\{\{evidenceJson\}\}/g, JSON.stringify(reportData.evidence))
                .replace(/\{\{logsJson\}\}/g, JSON.stringify(reportData.logs))
                .replace(/\{\{metadataJson\}\}/g, JSON.stringify(reportData.metadata))
                .replace(/\{\{generatedSelectorsJson\}\}/g, JSON.stringify(reportData.generatedSelectors))
                .replace(/\{\{generatedScriptJson\}\}/g, JSON.stringify(reportData.generatedScript));
            
            return htmlContent;
            
        } catch (error) {
            logger.error('Failed to generate HTML report:', error);
            throw error;
        }
    }
    
    async saveReportToFile(testId, htmlContent) {
        try {
            const fileName = `test-report-${testId}-${Date.now()}.html`;
            const filePath = path.join(this.reportsDir, fileName);
            
            await fs.writeFile(filePath, htmlContent, 'utf8');
            
            logger.info(`Report saved to: ${filePath}`);
            return `/reports/${fileName}`;
            
        } catch (error) {
            logger.error('Failed to save report to file:', error);
            throw error;
        }
    }
    
    async getReportContent(reportId) {
        try {
            const testReport = await TestReport.findByReportId(reportId);
            
            if (!testReport) {
                throw new Error(`Report not found: ${reportId}`);
            }
            
            return testReport.htmlReport;
            
        } catch (error) {
            logger.error('Failed to get report content:', error);
            throw error;
        }
    }
    
    async getReportFile(reportPath) {
        try {
            const fullPath = path.join(__dirname, '../..', reportPath);
            const content = await fs.readFile(fullPath, 'utf8');
            
            return content;
            
        } catch (error) {
            logger.error('Failed to get report file:', error);
            throw error;
        }
    }
    
    async listReports(options = {}) {
        try {
            const { skip = 0, limit = 20, status } = options;
            
            const filter = status ? { status } : {};
            const reports = await TestReport.findAll(filter, { skip, limit });
            
            return reports.map(report => ({
                reportId: report.reportId,
                testId: report.testId,
                userStory: report.userStory,
                url: report.url,
                status: report.status,
                createdAt: report.createdAt,
                executionTime: report.executionTime,
                reportPath: report.reportPath
            }));
            
        } catch (error) {
            logger.error('Failed to list reports:', error);
            throw error;
        }
    }
    
    // Utility methods
    formatDuration(milliseconds) {
        if (milliseconds < 1000) {
            return `${milliseconds}ms`;
        }
        
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        
        if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        }
        
        return `${seconds}s`;
    }
    
    formatTimestamp(timestamp) {
        if (!timestamp) return 'N/A';
        
        const date = new Date(timestamp);
        return date.toLocaleString();
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        
        return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
    }
    
    getStatusClass(status) {
        const statusClasses = {
            'completed': 'success',
            'failed': 'danger',
            'running': 'warning',
            'pending': 'info'
        };
        
        return statusClasses[status] || 'secondary';
    }
    
    getStatusIcon(status) {
        const statusIcons = {
            'completed': '✅',
            'failed': '❌',
            'running': '⏳',
            'pending': '🔄'
        };
        
        return statusIcons[status] || '❓';
    }
    
    getEvidenceTypeIcon(type) {
        const typeIcons = {
            'screenshot': '📸',
            'dom': '🌐',
            'log': '📝',
            'error': '❌',
            'network': '🌐'
        };
        
        return typeIcons[type] || '📄';
    }
    
    getLogLevelIcon(level) {
        const levelIcons = {
            'info': 'ℹ️',
            'warn': '⚠️',
            'error': '❌',
            'debug': '🐛'
        };
        
        return levelIcons[level] || 'ℹ️';
    }
    
    determineErrorSeverity(error) {
        if (error.message.includes('timeout')) return 'high';
        if (error.message.includes('not found')) return 'medium';
        if (error.message.includes('network')) return 'high';
        
        return 'medium';
    }
    
    formatEvidenceData(evidence) {
        switch (evidence.type) {
            case 'screenshot':
                return {
                    type: 'image',
                    dataUri: `data:image/png;base64,${evidence.data}`
                };
            case 'dom':
                return {
                    type: 'json',
                    data: JSON.stringify(evidence.data, null, 2)
                };
            case 'log':
                return {
                    type: 'text',
                    data: evidence.data.message || evidence.data
                };
            default:
                return {
                    type: 'text',
                    data: JSON.stringify(evidence.data, null, 2)
                };
        }
    }
    
    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

module.exports = new ReportGenerator();
