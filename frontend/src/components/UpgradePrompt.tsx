import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@mui/material';
import { Unlock } from 'lucide-react';

interface UpgradePromptProps {
  message?: string;
  compact?: boolean;
}

const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  message = 'Upgrade to unlock this feature',
  compact = false,
}) => {
  const navigate = useNavigate();

  if (compact) {
    return (
      <button
        onClick={() => navigate('/pricing')}
        className="inline-flex items-center gap-1 text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
      >
        <Unlock size={14} />
        Upgrade
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
        <Unlock size={16} />
        <span>{message}</span>
      </div>
      <Button
        variant="contained"
        size="small"
        className="!normal-case btn-primary"
        onClick={() => navigate('/pricing')}
      >
        View Plans
      </Button>
    </div>
  );
};

export default UpgradePrompt;
