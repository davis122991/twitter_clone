import Notification from '../models/notification.model.js';

// Get Notification controller
export const getNotifications = async (req, res) => {
  try {
    // Getting userId
    const userId = req.user._id;

    // Getting user notifications
    const notifications = await Notification.find({ to: userId }).populate({
      path: 'from',
      select: 'username profileImg',
    });

    // Setting notification to read
    await Notification.updateMany({ to: userId }, { read: true });

    // Returning notification
    res.status(200).json(notifications);
  } catch (error) {
    console.log('Error in getNotification controller', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Delete Notification controller
export const deleteNotifications = async (req, res) => {
  try {
    // Getting userId
    const userId = req.user._id;

    // Deleting user notifications
    await Notification.deleteMany({ to: userId });

    // Returning success message
    res.status(200).json({ message: 'Notifications deleted successfully' });
  } catch (error) {
    console.log('Error in deleteNotification controller', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Delete Notification controller
export const deleteNotification = async (req, res) => {
  try {
    // Getting id's
    const notificationId = req.params.id;
    const userId = req.user._id;

    // Getting notification
    const notification = await Notification.findById(notificationId);

    // Checking if notification exist
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    // Checking if user owns notification
    if (notification.to.toString() != userId.toString()) {
      return res
        .status(403)
        .json({ error: 'You are not allowed to delete this notification' });
    }

    // Deleting notification
    await Notification.findByIdAndDelete(notificationId);

    // Returning success message
    res.status(200).json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.log('Error in deleteNotification controller', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
