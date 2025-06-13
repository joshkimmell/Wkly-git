import React from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

type ToastNotificationProps = {
  theme: 'theme-light' | 'theme-dark';
};

const ToastNotification: React.FC<ToastNotificationProps> = ({ theme }) => {
  return (
    <div>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme={theme}
        className="z-50" // Ensure the toast is above other elements
        toastClassName="bg-gray-10 text-gray-100 dark:bg-gray-100 dark:text-gray-10 rounded-lg shadow-lg"
      />
    </div>
  );
};

export const notifySuccess = (message: string) => toast.success(message);
export const notifyError = (message: string) => toast.error(message);

export default ToastNotification;