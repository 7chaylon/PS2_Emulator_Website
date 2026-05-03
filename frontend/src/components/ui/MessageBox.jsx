import React from 'react';

export function MessageBox({ children, variant = 'info' }) {
  const className = variant === 'success' ? 'success' : 'info-box';

  return (
    <div className={className}>
      {children}
    </div>
  );
}