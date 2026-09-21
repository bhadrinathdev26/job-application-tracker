import React from 'react';

const STATUS_CONFIG = {
  wishlist: {
    label: 'Wishlist',
    classes: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
  },
  applied: {
    label: 'Applied',
    classes: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
  },
  interview: {
    label: 'Interview',
    classes: 'bg-amber-50 text-amber-800 border-amber-200',
    dot: 'bg-amber-500',
  },
  offer: {
    label: 'Offer',
    classes: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  rejected: {
    label: 'Rejected',
    classes: 'bg-rose-50 text-rose-700 border-rose-200',
    dot: 'bg-rose-500',
  },
};

const StatusBadge = ({ status, className = '' }) => {
  const config = STATUS_CONFIG[status?.toLowerCase()] || STATUS_CONFIG.wishlist;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.classes} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`}></span>
      {config.label}
    </span>
  );
};

export default StatusBadge;
