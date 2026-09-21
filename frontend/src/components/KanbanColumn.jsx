import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import ApplicationCard from './ApplicationCard';
import { Plus } from 'lucide-react';

const COLUMN_THEMES = {
  wishlist: {
    label: 'Wishlist',
    borderTop: 'border-t-slate-400',
    countBadge: 'bg-slate-200 text-slate-700',
    bgLight: 'bg-slate-50/70',
  },
  applied: {
    label: 'Applied',
    borderTop: 'border-t-blue-500',
    countBadge: 'bg-blue-100 text-blue-800',
    bgLight: 'bg-blue-50/40',
  },
  interview: {
    label: 'Interview',
    borderTop: 'border-t-amber-500',
    countBadge: 'bg-amber-100 text-amber-800',
    bgLight: 'bg-amber-50/40',
  },
  offer: {
    label: 'Offer',
    borderTop: 'border-t-emerald-500',
    countBadge: 'bg-emerald-100 text-emerald-800',
    bgLight: 'bg-emerald-50/40',
  },
  rejected: {
    label: 'Rejected',
    borderTop: 'border-t-rose-400',
    countBadge: 'bg-rose-100 text-rose-800',
    bgLight: 'bg-rose-50/40',
  },
};

const KanbanColumn = ({ status, applications = [], onAddInStatus, onEdit, onDelete }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: status,
  });

  const theme = COLUMN_THEMES[status] || COLUMN_THEMES.wishlist;

  return (
    <div
      className={`flex flex-col w-72 sm:w-80 shrink-0 bg-slate-100/90 rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden transition-colors ${
        theme.borderTop
      } border-t-4 ${isOver ? 'bg-indigo-50/60 ring-2 ring-indigo-400/50' : ''}`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-200/70 bg-white/60">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-slate-800 text-sm tracking-tight">{theme.label}</h3>
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${theme.countBadge}`}>
            {applications.length}
          </span>
        </div>

        <button
          onClick={() => onAddInStatus(status)}
          className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          title={`Add application to ${theme.label}`}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Droppable Card Area */}
      <div
        ref={setNodeRef}
        className="flex-1 p-3 space-y-3 min-h-[480px] max-h-[calc(100vh-210px)] overflow-y-auto"
      >
        {applications.length === 0 ? (
          <div className="h-40 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-center p-4 text-slate-400">
            <p className="text-xs font-medium">No applications</p>
            <button
              onClick={() => onAddInStatus(status)}
              className="mt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
            >
              + Add first one
            </button>
          </div>
        ) : (
          applications.map((app) => (
            <ApplicationCard
              key={app.id}
              application={app}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default KanbanColumn;
