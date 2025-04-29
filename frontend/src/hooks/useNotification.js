import { useState } from 'react';
import { categorizeError } from '../utils/notificationUtils';

/**
 * Custom hook for handling notifications with auto-dismiss
 * @returns {Object} Notification state and control functions
 */
export const useNotification = () => {
  const [notification, setNotification] = useState({
    show: false,
    type: '',
    message: ''
  });

  /**
   * Show a notification with auto-dismiss after 3 seconds
   * @param {string} type - The notification type ('success', 'error', 'info', 'warning')
   * @param {string} message - The notification message
   */
  const showNotification = (type, message) => {
    setNotification({
      show: true,
      type,
      message
    });

    // Auto-clear notification after dismissal
    setTimeout(() => {
      setNotification(prev => ({
        ...prev,
        show: false
      }));
    }, 3000);
  };

  /**
   * Handle errors by categorizing them and showing a notification
   * @param {Error} error - The error object
   */
  const handleError = (error) => {
    const { type, message } = categorizeError(error);
    showNotification(type, message);
  };

  /**
   * Clear the current notification
   */
  const clearNotification = () => {
    setNotification(prev => ({
      ...prev,
      show: false
    }));
  };

  return {
    notification,
    showNotification,
    handleError,
    clearNotification
  };
}; 