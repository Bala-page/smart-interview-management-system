const mongoose = require('mongoose');
const User = require('../models/User');
const Interview = require('../models/Interview');
const Application = require('../models/Application');
const { uploadFileToGridFS, getFileStream, getFileMetadata } = require('../services/gridfsService');
const { parseResumeBuffer } = require('../services/resumeParserService');
const { logAudit } = require('../services/auditService');

/**
 * @desc    Upload resume PDF and parse skills
 * @route   POST /api/resume/upload
 * @access  Private (Candidate)
 */
const uploadResume = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please select a valid PDF file.',
        errors: ['File missing'],
      });
    }

    const { buffer, originalname, mimetype, size } = req.file;

    // 1. Upload to MongoDB GridFS
    const gridFile = await uploadFileToGridFS(buffer, originalname, mimetype, {
      userId: req.user._id,
      uploadedBy: req.user.email,
      fileSize: size,
    });

    // 2. Parse PDF locally with pdf-parse
    let parsedInfo = { extractedSkills: [], detectedExperience: null };
    try {
      parsedInfo = await parseResumeBuffer(buffer);
    } catch (parseError) {
      console.warn('[Resume Upload] Parsing note:', parseError.message);
    }

    // 3. Update candidate document
    const candidate = await User.findById(req.user._id);
    candidate.resumeFileId = gridFile._id;

    // Merge detected skills into user's skills if not already present
    if (parsedInfo.extractedSkills && parsedInfo.extractedSkills.length > 0) {
      const mergedSkills = new Set([...(candidate.skills || []), ...parsedInfo.extractedSkills]);
      candidate.skills = Array.from(mergedSkills);
    }

    if (parsedInfo.detectedExperience && (!candidate.experience || candidate.experience === 0)) {
      candidate.experience = parsedInfo.detectedExperience;
    }

    await candidate.save();

    await logAudit({
      actorUserId: req.user._id,
      action: 'RESUME_UPLOADED',
      entityType: 'User',
      entityId: req.user._id,
      metadata: {
        filename: originalname,
        fileId: gridFile._id,
        skillsFound: parsedInfo.extractedSkills.length,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Resume uploaded and parsed successfully',
      data: {
        fileId: gridFile._id,
        filename: originalname,
        size,
        contentType: mimetype,
        extractedSkills: parsedInfo.extractedSkills,
        detectedExperience: parsedInfo.detectedExperience,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Stream resume PDF from MongoDB GridFS
 * @route   GET /api/resume/:id
 * @access  Private (Candidate own, Recruiter any, Interviewer assigned)
 */
const getResume = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid resume file identifier format',
        errors: ['Invalid ObjectId'],
      });
    }

    const fileMeta = await getFileMetadata(id);
    if (!fileMeta) {
      return res.status(404).json({
        success: false,
        message: 'Resume file not found in storage',
        errors: ['File does not exist'],
      });
    }

    // Ownership / Authorization check
    if (req.user.role === 'candidate') {
      const isOwner = req.user.resumeFileId && req.user.resumeFileId.toString() === id;
      if (!isOwner) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You can only view your own resume.',
          errors: ['Unauthorized file access'],
        });
      }
    } else if (req.user.role === 'interviewer') {
      // Allow if interviewer has an assigned interview with a candidate holding this resume
      const candidate = await User.findOne({ resumeFileId: id });
      const application = await Application.findOne({ resumeFileId: id });
      const candId = candidate ? candidate._id : application ? application.candidateId : null;

      if (candId) {
        const hasAssignment = await Interview.findOne({
          interviewerId: req.user._id,
          candidateId: candId,
        });
        if (!hasAssignment) {
          return res.status(403).json({
            success: false,
            message: 'Forbidden: You are not assigned to interview this candidate.',
            errors: ['Unauthorized file access'],
          });
        }
      }
    }

    res.setHeader('Content-Type', fileMeta.contentType || 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${fileMeta.filename}"`);

    const stream = getFileStream(id);
    stream.on('error', (streamErr) => {
      console.error('[GridFS Stream Error]', streamErr);
      if (!res.headersSent) {
        return res.status(500).json({
          success: false,
          message: 'Error streaming resume file',
          errors: [streamErr.message],
        });
      }
    });

    stream.pipe(res);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadResume,
  getResume,
};
