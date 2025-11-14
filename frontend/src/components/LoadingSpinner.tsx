import React from 'react';
import CircularProgress from '@mui/material/CircularProgress';

type LoadingSpinnerProps = {
  variant?: 'svg' | 'mui';
  /** Size in pixels for the spinner (applies to both variants). */
  size?: number;
  /** Optional extra className for the wrapper */
  className?: string;
  /** Optional CSS color string for the MUI spinner or the svg fill/stroke */
  color?: string;
};

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  variant = 'svg',
  size = 32,
  className = '',
  color,
}) => {
  const wrapperClass = `flex justify-center items-center h-full ${className}`.trim();

  if (variant === 'mui') {
    return (
      <div className={wrapperClass}>
        <CircularProgress
          size={size}
          // If a custom color is provided, use sx to set it; otherwise let theme/classes handle color
          sx={color ? { color } : undefined}
        />
      </div>
    );
  }

  // Default: inline SVG spinner (keeps existing styling but accepts size/color overrides)
  const svgStyle = { width: size, height: size } as React.CSSProperties;
  const strokeColor = color ? color : undefined;

  return (
    <div className={wrapperClass}>
      <svg
        style={svgStyle}
        className="animate-spin text-brand-60 dark:text-brand-30"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25 dark:opacity-75"
          cx="12"
          cy="12"
          r="10"
          stroke={strokeColor || 'currentColor'}
          strokeWidth="4"
        ></circle>
        <path
          className="opacity-75 dark:opacity-100"
          fill={strokeColor || 'currentColor'}
          d="M4 12a8 8 0 018-8v8z"
        ></path>
      </svg>
    </div>
  );
};

export default LoadingSpinner;