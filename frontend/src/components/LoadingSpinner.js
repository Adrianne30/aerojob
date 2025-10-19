// src/components/LoadingSpinner.js
import React from 'react';
const LoadingSpinner = ({ size = 'small', text = '', fullscreen = false }) => {
  const sizeClasses = {
    small: 'w-4 h-4 border-2',
    medium: 'w-8 h-8 border-4',
    large: 'w-12 h-12 border-4',
  };

  const spinner = (
    <div
      className={`animate-spin rounded-full border-t-transparent border-primary-500 ${sizeClasses[size]}`}
    ></div>
  );

  if (!fullscreen) {
    return (
      <div className="flex items-center justify-center space-x-2">
        {spinner}
        {text && <span className="text-sm text-gray-700">{text}</span>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 space-y-4">
      {spinner}
      {text && <p className="text-gray-600 text-sm">{text}</p>}
    </div>
  );
};

export default LoadingSpinner;
