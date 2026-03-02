import React from 'react';

interface GoalCompletionDonutProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
}

const GoalCompletionDonut: React.FC<GoalCompletionDonutProps> = ({ 
  percentage, 
  size = 50, 
  strokeWidth = 5 
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;
  
  // Color based on completion
  const getColor = () => {
    if (percentage === 100) return '#10b981'; // green
    if (percentage >= 75) return '#3b82f6'; // blue
    if (percentage >= 50) return '#f59e0b'; // amber
    if (percentage >= 25) return '#f97316'; // orange
    return 'var(--primary-link)'; // gray
  };

  return (
    <div className="inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-30 dark:text-brand-70"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-300"
        />
      </svg>
      {/* Percentage text */}
      <div 
        className="absolute text-xs font-semibold text-secondary-text"
        style={{ fontSize: size / 3 }}
      >
        {percentage}<span className='text-[.55em]'>%</span>
      </div>
    </div>
  );
};

export default GoalCompletionDonut;
