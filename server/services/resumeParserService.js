const pdfParse = require('pdf-parse');
const { getAllSkills, getCanonicalSkill } = require('../config/skillsDictionary');

/**
 * Extracts raw text from a PDF buffer using pdf-parse
 */
const extractTextFromPDF = async (pdfBuffer) => {
  try {
    const data = await pdfParse(pdfBuffer);
    return data.text || '';
  } catch (error) {
    console.error('[Resume Parser] Failed to parse PDF text:', error.message);
    throw new Error(`Unable to extract text from PDF resume: ${error.message}`);
  }
};

/**
 * Normalizes text for matching
 */
const normalizeText = (text) => {
  if (!text) return '';
  return text
    .replace(/[\r\n]+/g, ' ')
    .replace(/[^\w\s\+\#\.\-]/g, ' ') // Keep chars like C++, C#, .NET
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();
};

/**
 * Extracts skills from resume text by searching through the dictionary
 */
const extractSkillsFromText = (text) => {
  if (!text) return [];

  const rawLower = text.toLowerCase();
  // Pad with spaces for boundary matching
  const padded = ` ${rawLower} `;

  const knownSkills = getAllSkills();
  const matchedSkillsSet = new Set();

  for (const skill of knownSkills) {
    const canon = getCanonicalSkill(skill);
    const searchTarget = skill.toLowerCase();

    // Escape special regex characters in skill (e.g. C++, .NET, C#)
    const escaped = searchTarget.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    // Word boundary or symbol boundary pattern
    const regex = new RegExp(`(?:^|[^a-zA-Z0-9_#+])${escaped}(?:$|[^a-zA-Z0-9_#+])`, 'i');

    if (regex.test(padded)) {
      matchedSkillsSet.add(canon);
    }
  }

  return Array.from(matchedSkillsSet);
};

/**
 * Detects approximate years of experience from resume text if stated
 */
const detectExperienceFromText = (text) => {
  if (!text) return null;

  // Patterns like "5 years of experience", "5+ years", "over 4 years", "3 yrs experience"
  const patterns = [
    /(\d+)(?:\+)?\s*(?:years?|yrs?)(?:\s+of)?\s+experience/i,
    /experience\s*:\s*(\d+)(?:\+)?\s*(?:years?|yrs?)/i,
    /over\s+(\d+)\s+(?:years?|yrs?)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const parsed = parseInt(match[1], 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 50) {
        return parsed;
      }
    }
  }

  return null;
};

/**
 * Full parsing pipeline
 */
const parseResumeBuffer = async (pdfBuffer) => {
  const rawText = await extractTextFromPDF(pdfBuffer);
  const normalized = normalizeText(rawText);
  const extractedSkills = extractSkillsFromText(rawText);
  const detectedExperience = detectExperienceFromText(rawText);

  return {
    rawText,
    normalized,
    extractedSkills,
    detectedExperience,
  };
};

module.exports = {
  extractTextFromPDF,
  normalizeText,
  extractSkillsFromText,
  detectExperienceFromText,
  parseResumeBuffer,
};
