const mongoose = require('mongoose');

let gridFSBucket = null;

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart_interview_management';

  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`[Database] MongoDB Connected to: ${conn.connection.host}/${conn.connection.name}`);

    // Initialize GridFS Bucket
    const db = mongoose.connection.db;
    gridFSBucket = new mongoose.mongo.GridFSBucket(db, {
      bucketName: 'resumes',
    });
    console.log('[Database] GridFS Bucket "resumes" initialized successfully');

    return conn;
  } catch (err) {
    console.warn(`[Database] Standard MongoDB connection to ${mongoUri} failed: ${err.message}`);

    // Check if mongodb-memory-server is available for seamless local fallback
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      console.log('[Database] Starting local embedded MongoDB instance...');
      const mongod = await MongoMemoryServer.create();
      const uri = mongod.getUri();
      const conn = await mongoose.connect(uri);
      console.log(`[Database] Embedded MongoDB connected at: ${uri}`);

      const db = mongoose.connection.db;
      gridFSBucket = new mongoose.mongo.GridFSBucket(db, {
        bucketName: 'resumes',
      });
      console.log('[Database] GridFS Bucket "resumes" initialized successfully on embedded instance');
      return conn;
    } catch (fallbackErr) {
      console.error('[Database] Failed to connect to MongoDB and fallback unavailable:', fallbackErr.message);
      throw err;
    }
  }
};

const getGridFSBucket = () => {
  if (!gridFSBucket) {
    if (mongoose.connection && mongoose.connection.db) {
      gridFSBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: 'resumes',
      });
    } else {
      throw new Error('Database not connected. GridFS bucket is not available yet.');
    }
  }
  return gridFSBucket;
};

module.exports = {
  connectDB,
  getGridFSBucket,
};
