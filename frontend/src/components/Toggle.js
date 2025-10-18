import React from 'react';

export default function Toggle({ checked, onChange, label, id, className = '' }) {
  const _id = id || `tgl-${Math.random().toString(36).slice(2)}`;
  return (
    <label htmlFor={_id} className={`inline-flex items-center gap-2 cursor-pointer ${className}`}>
      {/* wrapper is relative so the thumb can be absolutely positioned */}
      <span className="relative inline-block">
        <input
          id={_id}
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          role="switch"
          aria-checked={checked}
        />
        {/* track */}
        <span className="block w-11 h-6 rounded-full bg-gray-300 transition-colors peer-checked:bg-primary-600" />
        {/* thumb */}
        <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
      </span>
      {label ? <span className="text-sm select-none">{label}</span> : null}
    </label>
  );
}
