/**
 * Local Configurable Skill Dictionary for Resume Parsing and Skill Matching.
 * Includes aliases, categories, and functions to extend dynamically.
 */

const baseSkills = [
  // Programming Languages
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C', 'C++', 'C#', 'Go', 'Golang',
  'Rust', 'Ruby', 'PHP', 'Swift', 'Kotlin', 'Dart', 'R', 'Scala', 'Shell', 'Bash',

  // Web & Frontend Frameworks/Libraries
  'React', 'React.js', 'Next.js', 'Vue', 'Vue.js', 'Nuxt.js', 'Angular', 'Svelte',
  'HTML', 'HTML5', 'CSS', 'CSS3', 'Sass', 'SCSS', 'Tailwind CSS', 'Bootstrap',
  'Redux', 'Redux Toolkit', 'Zustand', 'MobX', 'jQuery', 'Webpack', 'Vite',

  // Backend & APIs
  'Node.js', 'Express', 'Express.js', 'NestJS', 'FastAPI', 'Flask', 'Django',
  'Spring', 'Spring Boot', 'ASP.NET', 'Laravel', 'GraphQL', 'REST API', 'RESTful API',
  'gRPC', 'WebSockets', 'Microservices',

  // Databases & Storage
  'MongoDB', 'Mongoose', 'PostgreSQL', 'MySQL', 'SQLite', 'Redis', 'Cassandra',
  'Elasticsearch', 'DynamoDB', 'Oracle', 'SQL Server', 'SQL', 'NoSQL', 'Prisma', 'TypeORM',

  // DevOps, Cloud & Containers
  'Docker', 'Kubernetes', 'AWS', 'Amazon Web Services', 'GCP', 'Google Cloud',
  'Azure', 'CI/CD', 'GitHub Actions', 'GitLab CI', 'Jenkins', 'Terraform', 'Ansible',
  'Nginx', 'Linux', 'Unix',

  // Machine Learning, AI & Data Science
  'Machine Learning', 'Deep Learning', 'Artificial Intelligence', 'Data Science',
  'TensorFlow', 'PyTorch', 'Keras', 'Scikit-Learn', 'Pandas', 'NumPy', 'NLP',
  'Computer Vision', 'LSTM', 'CNN', 'RNN', 'Transformers', 'LLM',

  // Testing & Quality
  'Jest', 'Mocha', 'Chai', 'Cypress', 'Playwright', 'Selenium', 'Unit Testing',
  'Integration Testing', 'TDD', 'Postman',

  // Version Control & Methodologies
  'Git', 'GitHub', 'GitLab', 'Bitbucket', 'Agile', 'Scrum', 'Jira', 'System Design'
];

// Synonyms / normalized mapping
const skillAliases = {
  'js': 'JavaScript',
  'javascript': 'JavaScript',
  'ts': 'TypeScript',
  'typescript': 'TypeScript',
  'react.js': 'React',
  'reactjs': 'React',
  'react': 'React',
  'node': 'Node.js',
  'nodejs': 'Node.js',
  'node.js': 'Node.js',
  'express': 'Express',
  'expressjs': 'Express',
  'express.js': 'Express',
  'mongo': 'MongoDB',
  'mongodb': 'MongoDB',
  'postgres': 'PostgreSQL',
  'postgresql': 'PostgreSQL',
  'rest': 'REST API',
  'rest api': 'REST API',
  'restful': 'REST API',
  'restful api': 'REST API',
  'k8s': 'Kubernetes',
  'golang': 'Go',
  'ml': 'Machine Learning',
  'dl': 'Deep Learning',
  'ai': 'Artificial Intelligence',
};

// Dynamic in-memory dictionary cache that recruiters can expand at runtime
const customSkillsSet = new Set(baseSkills.map(s => s.toLowerCase()));
const skillDisplayMap = new Map();

baseSkills.forEach(skill => {
  skillDisplayMap.set(skill.toLowerCase(), skill);
});

const getCanonicalSkill = (rawSkill) => {
  if (!rawSkill) return '';
  const trimmed = rawSkill.trim();
  const lower = trimmed.toLowerCase();

  if (skillAliases[lower]) {
    return skillAliases[lower];
  }

  if (skillDisplayMap.has(lower)) {
    return skillDisplayMap.get(lower);
  }

  // Capitalize nicely if not found
  return trimmed;
};

const getAllSkills = () => {
  return Array.from(skillDisplayMap.values());
};

const addCustomSkill = (skillName) => {
  if (!skillName || typeof skillName !== 'string') return null;
  const trimmed = skillName.trim();
  const lower = trimmed.toLowerCase();
  customSkillsSet.add(lower);
  skillDisplayMap.set(lower, trimmed);
  return trimmed;
};

module.exports = {
  baseSkills,
  skillAliases,
  getAllSkills,
  getCanonicalSkill,
  addCustomSkill,
};
