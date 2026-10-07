const EventEmitter = require('events');
const Notification = require('../models/Notification');

class NotificationEmitter extends EventEmitter {}
const notificationEvents = new NotificationEmitter();

/**
 * Creates and saves an in-app notification in MongoDB
 */
const createNotification = async ({
  recipientUserId,
  type,
  title,
  message,
  relatedEntityType = 'General',
  relatedEntityId = null,
}) => {
  try {
    const notification = await Notification.create({
      recipientUserId,
      type,
      title,
      message,
      relatedEntityType,
      relatedEntityId,
      isRead: false,
    });

    // Emit event locally for real-time subscribers (SSE or WebSocket/polling)
    notificationEvents.emit('new_notification', notification);

    return notification;
  } catch (error) {
    console.error('[Notification Service] Error creating notification:', error.message);
    return null;
  }
};

module.exports = {
  createNotification,
  notificationEvents,
};
