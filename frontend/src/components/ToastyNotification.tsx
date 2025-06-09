import React from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ToastNotification: React.FC = () => {
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
      />
    </div>
  );
};

export const notifySuccess = (message: string) => toast.success(message);
export const notifyError = (message: string) => toast.error(message);

export default ToastNotification;

// import React from 'react';
// import { Toaster } from 'react-hot-toast';

// const ToastNotification: React.FC = () => {
//   return (
//     <div>
//       <Toaster
//         position="top-right"
//         reverseOrder={false}
//         toastOptions={{
//           duration: 3000,
//           style: {
//             borderRadius: '8px',
//             padding: '16px',
//             fontSize: '14px',
//           },
//           success: {
//             style: {
//               background: '#4CAF50',
//               color: '#fff',
//             },
//           },
//           error: {
//             style: {
//               background: '#F44336',
//               color: '#fff',
//             },
//           },
//         }}
//       />
//     </div>
//   );
// };

// export default ToastNotification;