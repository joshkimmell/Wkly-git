import { createElement } from 'react';
import { Toaster } from 'react-hot-toast';

const ToastNotifications = () => {
  return (
    createElement(Toaster, {
      position: "top-right",
      reverseOrder: false,
      toastOptions: {
        duration: 3000,
        style: {
          borderRadius: '8px',
          padding: '16px',
          fontSize: '14px',
        },
        success: {
          style: {
            background: '#4CAF50',
            color: '#fff',
          },
        },
        error: {
          style: {
            background: '#F44336',
            color: '#fff',
          },
        },
      },
    })
  );
};

export default ToastNotifications;