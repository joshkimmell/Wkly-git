import React, { useState, useEffect, useRef } from 'react';
import { ToastContainer, toast, type Id } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Eye, Maximize2, Minimize2, X } from 'lucide-react';

type ToastNotificationProps = {
  theme: 'theme-light' | 'theme-dark';
};

const HEADER_HEIGHT = 44; // px

const ToastNotification: React.FC<ToastNotificationProps> = ({ theme }) => {
  const activeIdsRef = useRef<Set<Id>>(new Set());
  const [activeCount, setActiveCount] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    return toast.onChange((item) => {
      if (item.status === 'added') {
        activeIdsRef.current.add(item.id);
      } else if (item.status === 'removed') {
        activeIdsRef.current.delete(item.id);
      }
      setActiveCount(activeIdsRef.current.size);
    });
  }, []);

  const handleCloseAll = () => toast.dismiss();

  const isDark = theme === 'theme-dark';

  const showHeader = activeCount > 1;

  return (
    <div className='fixed z-[20006] w-auto xs:w-[360px] left-4 xs:left-auto right-4' 
      style={{ 
        top: 'calc(var(--header-height, 7rem) + 1rem)',
        // right: '1rem',
        // left: '1rem',
        // width: 'auto',         
      }}
      >
      <style>{`
        html.dark .Toastify__close-button, html:not(.dark):hover .Toastify__close-button:hover {
          color: var(--toastify-close-button-color, #282828) !important;
          background: transparent !important;
          opacity: 0.7;
        }
        html.dark .Toastify__close-button:hover {
          background: var(--button-background) !important;
          opacity: 1;
        }
        html:not(.dark) .Toastify__close-button, html:not(.dark):hover .Toastify__close-button:hover {
          color: var(--toastify-close-button-color, #f4f4f4) !important;
          background: transparent !important;
          opacity: 0.7;
        }
        html:not(.dark) .Toastify__close-button:hover {
          background: var(--button-background) !important;
          opacity: 1;
        }
        .Toastify__toast {
          height: auto !important;
          min-height: unset !important;
          overflow: visible !important;
        }
        .Toastify__toast-body {
          height: auto !important;
          overflow: visible !important;
          white-space: normal !important;
          align-items: flex-start !important;
        }
        @media (max-width: 320px) {
          .Toastify__toast-container {
            width: 100% !important;
            right: 1rem !important;
            left: 1rem !important;
          }
        }
        @media (max-width: 480px) {
          .Toastify__toast-container {
            width: calc(100vw - 2rem) !important;
            right: 1rem !important;
            left: auto !important;
          }
        }
      `}</style>
      {showHeader && (
        <div
          className={`fixed z-[20006] flex items-center justify-between px-4 rounded-t-lg ${isMinimized ? 'rounded-b-lg' : ''} shadow-lg border-b min-w-[360px] sm:max-w-[360px] left-4 sm:left-auto right-4 ${
            isDark
              ? 'bg-gray-10 text-gray-100 border-gray-70'
              : 'bg-gray-90 text-gray-20 border-gray-30'
          }`}
          style={{
            // top: 'calc(var(--header-height, 7rem) + 1rem)',
            // right: '1rem',
            // width: 'min(360px, calc(100vw - 2rem))',
            height: `${HEADER_HEIGHT}px`,
            // alignItems: 'center',
            // backgroundColor: isDark ? 'rgba(17, 17, 17, 0.8)' : 'rgba(255, 255, 255, 0.8)',
          }}
        >
          <a
            onClick={() => setIsMinimized(prev => !prev)}
            className={`border-0 gap-2 bg-transparent hover:bg-transparent text-xs dark:text-brand-60 dark:hover:text-brand-80 text-brand-30 hover:text-brand-20 hover:underline transition-colors duration-150 flex items-center cursor-pointer`}
          >
            {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            <span className="text-sm font-semibold">Notifications <span className="opacity-70 text-xs font-normal">({activeCount})</span></span>
          </a>
          <div className="flex items-center gap-3">
            
            <button
              onClick={handleCloseAll}
              className={`bg-transparent border-0 gap-2 text-xs dark:text-brand-60 dark:hover:text-brand-20 text-brand-30 hover:text-brand-40 hover:bg-brand-80 hover:underline transition-colors duration-150 flex items-center rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${isDark ? 'gray-100' : 'gray-900'}`}
            >
              <span>Close all</span>
              <X className="w-3.5 h-3.5" />
            </button>
            
          </div>
        </div>
      )}
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
        theme={isDark ? 'dark' : 'light'}
        className={` p-4 ${showHeader ? 'bg-[rgba(17,17,17,0.8)] backdrop-blur-sm dark:bg-[rgba(254,254,254,0.7)] rounded-b-lg shadow-lg' : ''} items-center gap-2 overflow-y-auto`}
        style={{display: isMinimized ? 'none' : undefined,
          top: showHeader
            ? `calc(var(--header-height, 7rem) + 1rem + ${HEADER_HEIGHT}px)`
            : 'calc(var(--header-height, 7rem) + 1rem)',
          maxHeight: showHeader
            ? `calc(100vh - var(--header-height, 7rem) - ${HEADER_HEIGHT}px - 2rem)`
            : 'calc(100vh - var(--header-height, 7rem) - 2rem)',
          right: '1rem',
          transition: 'top 0.15s ease',
          width: 'min(360px, calc(100vw - 2rem))',
        }}
        toastClassName="flex w-full h-auto items-start bg-gray-90 text-gray-10 dark:bg-gray-10 dark:text-gray-100 rounded-md shadow-lg"
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
  toast.warning(
    <div className='@container flex flex-col gap-[0.5rem] w-full'>
      <div className='flex flex-col @sm:flex-row @sm:justify-between @sm:items-start gap-2 w-full'>
        <div className='font-bold text-base mb-1'>Reminder</div>
        <div className='font-normal text-xs'> {taskTitle}</div>
        {taskDescription && (
          <div className='font-normal text-[0.75rem] opacity-80 mt-1 text-ellipsis w-full'>
            {taskDescription.length > 100 ? `${taskDescription.substring(0, 100)}...` : taskDescription}
          </div>
        )}
      </div>
      {onViewTask && (
        <div className='flex justify-end'>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewTask();
            }}
            className='self-end bg-transparent border-0 text-brand-30 hover:text-brand-20 dark:text-brand-60 hover:text-brand-80 dark:hover:bg-brand-20 mt-2 self-start transition-colors duration-150'
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
            <Eye className='w-3.5 h-3.5 mr-1' />
            <span>View Task</span>
          </button>
        </div>
      )}
    </div>,
    { 
      autoClose: false, // Must manually close
      closeOnClick: false, // Allow clicking to close
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