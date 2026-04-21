import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Task } from '@utils/goalUtils';

interface FocusModeRequest {
  task: Task;
  goalTitle?: string;
  onDone: (taskId: string) => Promise<void>;
  onClose: () => void;
}

interface FocusModeContextValue {
  openFocusMode: (req: FocusModeRequest) => void;
}

const FocusModeContext = createContext<FocusModeContextValue | null>(null);

// No-op fallback used when TaskCard renders outside the provider (e.g. react-modal portals
// that mount to document.body, or during React's error-recovery re-render pass).
const noop = () => {};
const fallbackValue: FocusModeContextValue = { openFocusMode: noop };

export const useFocusMode = (): FocusModeContextValue => {
  const ctx = useContext(FocusModeContext);
  return ctx ?? fallbackValue;
};

export const FocusModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [active, setActive] = useState<FocusModeRequest | null>(null);

  const openFocusMode = useCallback((req: FocusModeRequest) => {
    setActive(req);
  }, []);

  const handleClose = useCallback(() => {
    if (active) active.onClose();
    setActive(null);
  }, [active]);

  const handleDone = useCallback(async (taskId: string) => {
    if (active) await active.onDone(taskId);
  }, [active]);

  // Lazy import to avoid circular dep at module load time
  const [TaskFocusMode, setTaskFocusMode] = useState<React.ComponentType<any> | null>(null);
  React.useEffect(() => {
    import('../components/focus/TaskFocusMode').then((m) => setTaskFocusMode(() => m.default));
  }, []);

  return (
    <FocusModeContext.Provider value={{ openFocusMode }}>
      {children}
      {active && TaskFocusMode && (
        <TaskFocusMode
          task={active.task}
          goalTitle={active.goalTitle}
          onClose={handleClose}
          onMarkDone={handleDone}
        />
      )}
    </FocusModeContext.Provider>
  );
};
