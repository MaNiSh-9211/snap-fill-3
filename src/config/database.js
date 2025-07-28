const { MongoClient } = require('mongodb');
const logger = require('../utils/logger');

let db = null;
let client = null;

const connectDB = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/testweaver';
        
        client = new MongoClient(mongoUri, {
            useUnifiedTopology: true,
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });

        await client.connect();
        db = client.db();
        
        logger.info('Connected to MongoDB successfully');
        
        // Create indexes for better performance
        await createIndexes();
        
        return db;
    } catch (error) {
        logger.error('MongoDB connection failed:', error);
        throw error;
    }
};

const createIndexes = async () => {
    try {
        // Test results indexes
        await db.collection('testResults').createIndex({ testId: 1 });
        await db.collection('testResults').createIndex({ userStory: 1 });
        await db.collection('testResults').createIndex({ createdAt: -1 });
        await db.collection('testResults').createIndex({ status: 1 });
        
        // Test reports indexes
        await db.collection('testReports').createIndex({ testId: 1 });
        await db.collection('testReports').createIndex({ createdAt: -1 });
        
        logger.info('Database indexes created successfully');
    } catch (error) {
        logger.error('Failed to create indexes:', error);
    }
};

const getDB = () => {
    if (!db) {
        throw new Error('Database not initialized. Call connectDB first.');
    }
    return db;
};

const closeDB = async () => {
    if (client) {
        await client.close();
        logger.info('MongoDB connection closed');
    }
};

module.exports = {
    connectDB,
    getDB,
    closeDB
};
