const AuditLog = require('../models/AuditLog');

/**
 * Creates an audit log record for traceability
 */
const logAudit = async ({
  actorUserId,
  action,
  entityType,
  entityId,
  metadata = {},
}) => {
  try {
    const auditRecord = await AuditLog.create({
      actorUserId,
      action,
      entityType,
      entityId,
      metadata,
      timestamp: new Date(),
    });
    return auditRecord;
  } catch (error) {
    console.error('[Audit Service] Failed to create audit log:', error.message);
    return null;
  }
};

module.exports = {
  logAudit,
};
