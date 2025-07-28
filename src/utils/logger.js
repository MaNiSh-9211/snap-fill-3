const fs = require('fs');
const path = require('path');

class Logger {
    constructor() {
        this.levels = {
            ERROR: 0,
            WARN: 1,
            INFO: 2,
            DEBUG: 3
        };
        
        this.currentLevel = this.levels[process.env.LOG_LEVEL || 'INFO'];
        this.logDir = path.join(__dirname, '../../logs');
        this.logFile = path.join(this.logDir, 'testweaver.log');
        
        this.initializeLogDirectory();
    }
    
    initializeLogDirectory() {
        try {
            if (!fs.existsSync(this.logDir)) {
                fs.mkdirSync(this.logDir, { recursive: true });
            }
        } catch (error) {
            console.error('Failed to initialize log directory:', error);
        }
    }
    
    formatMessage(level, message, metadata = {}) {
        const timestamp = new Date().toISOString();
        const pid = process.pid;
        
        const logEntry = {
            timestamp,
            level,
            pid,
            message,
            metadata: Object.keys(metadata).length > 0 ? metadata : undefined
        };
        
        return JSON.stringify(logEntry);
    }
    
    writeToFile(formattedMessage) {
        try {
            fs.appendFileSync(this.logFile, formattedMessage + '\n');
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }
    
    writeToConsole(level, message, metadata = {}) {
        const timestamp = new Date().toISOString();
        const colorCode = this.getColorCode(level);
        const resetCode = '\x1b[0m';
        
        let consoleMessage = `${colorCode}[${timestamp}] ${level}: ${message}${resetCode}`;
        
        if (Object.keys(metadata).length > 0) {
            consoleMessage += `\n${colorCode}Metadata: ${JSON.stringify(metadata, null, 2)}${resetCode}`;
        }
        
        console.log(consoleMessage);
    }
    
    getColorCode(level) {
        const colors = {
            ERROR: '\x1b[31m', // Red
            WARN: '\x1b[33m',  // Yellow
            INFO: '\x1b[36m',  // Cyan
            DEBUG: '\x1b[37m'  // White
        };
        
        return colors[level] || '\x1b[37m';
    }
    
    log(level, message, metadata = {}) {
        if (this.levels[level] <= this.currentLevel) {
            const formattedMessage = this.formatMessage(level, message, metadata);
            
            // Write to console
            this.writeToConsole(level, message, metadata);
            
            // Write to file
            this.writeToFile(formattedMessage);
        }
    }
    
    error(message, metadata = {}) {
        this.log('ERROR', message, metadata);
    }
    
    warn(message, metadata = {}) {
        this.log('WARN', message, metadata);
    }
    
    info(message, metadata = {}) {
        this.log('INFO', message, metadata);
    }
    
    debug(message, metadata = {}) {
        this.log('DEBUG', message, metadata);
    }
    
    // Utility methods for structured logging
    logRequest(req, res, next) {
        const startTime = Date.now();
        
        this.info('Request received', {
            method: req.method,
            url: req.url,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            requestId: req.id || this.generateRequestId()
        });
        
        const originalSend = res.send;
        res.send = function(body) {
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            logger.info('Request completed', {
                method: req.method,
                url: req.url,
                statusCode: res.statusCode,
                duration: `${duration}ms`,
                responseSize: body ? body.length : 0
            });
            
            return originalSend.call(this, body);
        };
        
        if (next) next();
    }
    
    logError(error, context = {}) {
        this.error('Error occurred', {
            message: error.message,
            stack: error.stack,
            context
        });
    }
    
    logPerformance(operation, duration, metadata = {}) {
        this.info('Performance metric', {
            operation,
            duration: `${duration}ms`,
            ...metadata
        });
    }
    
    logDatabaseOperation(operation, query, duration, metadata = {}) {
        this.debug('Database operation', {
            operation,
            query,
            duration: `${duration}ms`,
            ...metadata
        });
    }
    
    logExternalAPI(url, method, statusCode, duration, metadata = {}) {
        this.info('External API call', {
            url,
            method,
            statusCode,
            duration: `${duration}ms`,
            ...metadata
        });
    }
    
    logTestExecution(testId, action, metadata = {}) {
        this.info('Test execution', {
            testId,
            action,
            ...metadata
        });
    }
    
    logWorkflowStep(testId, step, status, metadata = {}) {
        this.info('Workflow step', {
            testId,
            step,
            status,
            ...metadata
        });
    }
    
    generateRequestId() {
        return Math.random().toString(36).substr(2, 9);
    }
    
    // Log file management
    rotateLogs() {
        try {
            const timestamp = new Date().toISOString().replace(/:/g, '-');
            const archivedLogFile = path.join(this.logDir, `testweaver-${timestamp}.log`);
            
            if (fs.existsSync(this.logFile)) {
                fs.renameSync(this.logFile, archivedLogFile);
            }
            
            this.info('Log file rotated', { archivedFile: archivedLogFile });
        } catch (error) {
            this.error('Failed to rotate log file', { error: error.message });
        }
    }
    
    clearOldLogs(daysOld = 30) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysOld);
            
            const logFiles = fs.readdirSync(this.logDir);
            let deletedCount = 0;
            
            logFiles.forEach(file => {
                const filePath = path.join(this.logDir, file);
                const stats = fs.statSync(filePath);
                
                if (stats.mtime < cutoffDate && file.endsWith('.log')) {
                    fs.unlinkSync(filePath);
                    deletedCount++;
                }
            });
            
            this.info('Old logs cleared', { deletedCount });
        } catch (error) {
            this.error('Failed to clear old logs', { error: error.message });
        }
    }
    
    getLogLevel() {
        return Object.keys(this.levels).find(key => this.levels[key] === this.currentLevel);
    }
    
    setLogLevel(level) {
        if (this.levels[level] !== undefined) {
            this.currentLevel = this.levels[level];
            this.info('Log level changed', { newLevel: level });
        } else {
            this.warn('Invalid log level', { level });
        }
    }
    
    // Health check for logging system
    healthCheck() {
        try {
            const testMessage = 'Logger health check';
            this.info(testMessage);
            
            // Check if log file is writable
            const testLogFile = path.join(this.logDir, 'test.log');
            fs.writeFileSync(testLogFile, testMessage);
            fs.unlinkSync(testLogFile);
            
            return {
                status: 'healthy',
                logDir: this.logDir,
                logFile: this.logFile,
                currentLevel: this.getLogLevel()
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message
            };
        }
    }
}

// Create singleton instance
const logger = new Logger();

module.exports = logger;
