const { Readable } = require('stream');
const mongoose = require('mongoose');
const { getGridFSBucket } = require('../config/db');

/**
 * Stores a file buffer into MongoDB GridFS bucket
 */
const uploadFileToGridFS = (buffer, filename, contentType, metadata = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const bucket = getGridFSBucket();
      const readableStream = new Readable();
      readableStream.push(buffer);
      readableStream.push(null);

      const uploadStream = bucket.openUploadStream(filename, {
        contentType,
        metadata: {
          ...metadata,
          uploadedAt: new Date(),
        },
      });

      readableStream
        .pipe(uploadStream)
        .on('error', (error) => {
          console.error('[GridFS] Upload error:', error);
          reject(error);
        })
        .on('finish', () => {
          resolve({
            _id: uploadStream.id,
            filename,
            contentType,
          });
        });
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Returns a readable stream of a file from MongoDB GridFS by ObjectId
 */
const getFileStream = (fileId) => {
  const bucket = getGridFSBucket();
  const objectId = typeof fileId === 'string' ? new mongoose.Types.ObjectId(fileId) : fileId;
  return bucket.openDownloadStream(objectId);
};

/**
 * Reads entire file from GridFS into a Buffer
 */
const getFileBuffer = (fileId) => {
  return new Promise((resolve, reject) => {
    try {
      const stream = getFileStream(fileId);
      const chunks = [];

      stream.on('data', (chunk) => {
        chunks.push(chunk);
      });

      stream.on('error', (err) => {
        reject(err);
      });

      stream.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Retrieves file metadata from GridFS bucket files collection
 */
const getFileMetadata = async (fileId) => {
  const bucket = getGridFSBucket();
  const objectId = typeof fileId === 'string' ? new mongoose.Types.ObjectId(fileId) : fileId;
  const files = await bucket.find({ _id: objectId }).toArray();
  if (!files || files.length === 0) {
    return null;
  }
  return files[0];
};

/**
 * Deletes a file from MongoDB GridFS
 */
const deleteFileFromGridFS = async (fileId) => {
  const bucket = getGridFSBucket();
  const objectId = typeof fileId === 'string' ? new mongoose.Types.ObjectId(fileId) : fileId;
  await bucket.delete(objectId);
  return true;
};

module.exports = {
  uploadFileToGridFS,
  getFileStream,
  getFileBuffer,
  getFileMetadata,
  deleteFileFromGridFS,
};
