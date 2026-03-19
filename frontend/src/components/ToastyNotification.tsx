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
        className="z-[10005]"
        style={{ top: 'calc(var(--header-height, 7rem) + 1rem)', right: '1rem' }}
        toastClassName="items-start bg-gray-100 text-gray-10 dark:bg-gray-10 dark:text-gray-100 rounded-lg shadow-lg"
      />
    </div>
  );
};

export const notifySuccess = (message: string) => toast.success(message);
export const notifyError = (message: string) => toast.error(message);

/**
 * Shows a task reminder notification that requires manual dismissal (no auto-close).
 * Used for task reminders that should stay visible until the user acknowledges them.
 */
export const notifyReminder = (taskTitle: string, taskDescription?: string, onViewTask?: () => void) => {
  toast.info(
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
      <div>
        <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Reminder</div>
        <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{taskTitle}</div>
        {taskDescription && (
          <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '0.25rem' }}>
            {taskDescription.length > 100 ? `${taskDescription.substring(0, 100)}...` : taskDescription}
          </div>
        )}
      </div>
      {onViewTask && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onViewTask();
          }}
          className='btn-secondary mt-2 self-start'
          // style={{
          //   fontWeight: 600,
          //   cursor: 'pointer',
          //   background: 'rgba(255, 255, 255, 0.2)',
          //   border: '1px solid rgba(255, 255, 255, 0.3)',
          //   padding: '4px 12px',
          //   color: 'inherit',
          //   fontSize: '0.875rem',
          //   borderRadius: '4px',
          //   alignSelf: 'flex-start',
          // }}
        >
          View Task
        </button>
      )}
    </div>,
    { 
      autoClose: false, // Must manually close
      closeOnClick: false,
      draggable: true,
      closeButton: true,
    },
  );
};

/**
 * Shows a toast with an "Undo" button.
 * The UI removal should be done *before* calling this.
 * The actual server delete is deferred until `duration` ms have elapsed.
 * If the user clicks Undo within that window, `onUndo` is called to restore
 * the item in the UI and the server delete is cancelled.
 */
export const notifyWithUndo = (
  message: string,
  performDelete: () => Promise<void>,
  onUndo?: () => void,
  duration = 5000,
) => {
  let undone = false;
  let toastId: ReturnType<typeof toast>;

  const handleUndo = (e: React.MouseEvent) => {
    e.stopPropagation();
    undone = true;
    toast.dismiss(toastId);
    onUndo?.();
  };

  toastId = toast.info(
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', justifyContent: 'space-between' }}>
      <span>{message}</span>
      <button
        onClick={handleUndo}
        style={{ fontWeight: 700, textDecoration: 'underline', cursor: 'pointer', background: 'none', border: 'none', padding: '2px 4px', color: 'inherit', fontSize: '0.875rem', flexShrink: 0, borderRadius: '3px' }}
      >
        Undo
      </button>
    </div>,
    { autoClose: duration, closeOnClick: false },
  );

  setTimeout(async () => {
    if (!undone) {
      try {
        await performDelete();
      } catch {
        toast.error('Deletion failed. Please try again.');
      }
    }
  }, duration + 100); // slight buffer after toast expires
};

export default ToastNotification;