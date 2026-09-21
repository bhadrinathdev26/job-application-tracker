import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, MapPin, DollarSign, ExternalLink, Clock, Edit2, Trash2, GripVertical } from 'lucide-react';

const ApplicationCard = ({ application, onEdit, onDelete, isDragging = false }) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: application.id.toString(),
    data: application,
  });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
        zIndex: 50,
      }
    : undefined;

  // Check if follow-up is due today or in the past
  const isFollowUpDue = () => {
    if (!application.follow_up_date) return false;
    if (['offer', 'rejected'].includes(application.status)) return false;
    const today = new Date().toISOString().split('T')[0];
    return application.follow_up_date <= today;
  };

  const followUpDue = isFollowUpDue();

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative bg-white rounded-xl border p-4 shadow-2xs transition-all duration-200 ${
        isDragging
          ? 'opacity-50 ring-2 ring-indigo-500 shadow-xl scale-102 cursor-grabbing'
          : 'border-slate-200/90 hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5'
      }`}
    >
      {/* Top row: Drag Handle, Company & Action buttons */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            {...attributes}
            {...listeners}
            className="text-slate-300 hover:text-slate-500 p-0.5 rounded cursor-grab active:cursor-grabbing shrink-0"
            title="Drag card to move status"
          >
            <GripVertical className="w-4 h-4" />
          </button>
          <h4 className="font-bold text-slate-900 text-base truncate tracking-tight">
            {application.company}
          </h4>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {application.job_url && (
            <a
              href={application.job_url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 text-slate-400 hover:text-indigo-600 rounded-md hover:bg-slate-100 transition-colors"
              title="Open Job Posting"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          <button
            onClick={() => onEdit(application)}
            className="p-1 text-slate-400 hover:text-indigo-600 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
            title="Edit Details"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(application)}
            className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
            title="Delete Application"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Role */}
      <p className="text-sm font-medium text-slate-700 mb-3 line-clamp-1">
        {application.role}
      </p>

      {/* Metadata Badges */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        {application.applied_date && (
          <div className="inline-flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
            <Calendar className="w-3 h-3 text-slate-400" />
            <span>{new Date(application.applied_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
          </div>
        )}

        {application.location && (
          <div className="inline-flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100 max-w-[130px] truncate">
            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="truncate">{application.location}</span>
          </div>
        )}

        {application.salary_range && (
          <div className="inline-flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
            <DollarSign className="w-3 h-3 text-slate-400 shrink-0" />
            <span>{application.salary_range}</span>
          </div>
        )}
      </div>

      {/* Follow-up reminder badge */}
      {followUpDue && (
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md animate-pulse">
            <Clock className="w-3 h-3 text-amber-600" />
            Follow up due ({application.follow_up_date})
          </span>
        </div>
      )}
    </div>
  );
};

export default ApplicationCard;
