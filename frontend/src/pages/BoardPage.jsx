import React, { useState, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { applicationsAPI } from '../api/applications';
import KanbanColumn from '../components/KanbanColumn';
import ApplicationCard from '../components/ApplicationCard';
import ApplicationModal from '../components/ApplicationModal';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import { Plus, Clock, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';

const COLUMNS = ['wishlist', 'applied', 'interview', 'offer', 'rejected'];

const BoardPage = () => {
  const [applications, setApplications] = useState([]);
  const [followUpsDue, setFollowUpsDue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCard, setActiveCard] = useState(null);

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [defaultStatus, setDefaultStatus] = useState('applied');

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [appToDelete, setAppToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Sensors for drag-and-drop: activate after moving 5px to distinguish clicks from drags
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const fetchApplications = async () => {
    try {
      setLoading(true);
      setError('');
      // Fetch without pagination limit or with high limit for board view
      const data = await applicationsAPI.getAll({ page_size: 100 });
      const apps = data.results || data;
      setApplications(apps);

      // Also check follow-ups
      const followUps = await applicationsAPI.getFollowUps();
      setFollowUpsDue(followUps);
    } catch (err) {
      console.error('Error fetching applications:', err);
      setError('Could not load applications. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  // Handle Drag Start
  const handleDragStart = (event) => {
    const cardId = event.active.id;
    const card = applications.find((a) => a.id.toString() === cardId.toString());
    setActiveCard(card || null);
  };

  // Handle Drag End
  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over) return;

    const cardId = active.id;
    const newStatus = over.id; // Drop target column id

    const targetApp = applications.find((a) => a.id.toString() === cardId.toString());
    if (!targetApp || targetApp.status === newStatus) return;

    // Optimistic UI update
    const previousApps = [...applications];
    setApplications((prev) =>
      prev.map((app) =>
        app.id.toString() === cardId.toString() ? { ...app, status: newStatus } : app
      )
    );

    try {
      await applicationsAPI.patch(targetApp.id, { status: newStatus });
    } catch (err) {
      console.error('Failed to update status on server:', err);
      // Revert optimistic update on failure
      setApplications(previousApps);
      setError('Failed to update application status. Changes were reverted.');
    }
  };

  // Save / Update application
  const handleSave = async (payload, id) => {
    if (id) {
      const updated = await applicationsAPI.update(id, payload);
      setApplications((prev) => prev.map((a) => (a.id === id ? updated : a)));
    } else {
      const created = await applicationsAPI.create(payload);
      setApplications((prev) => [created, ...prev]);
    }
    // Refresh follow-ups after save
    try {
      const followUps = await applicationsAPI.getFollowUps();
      setFollowUpsDue(followUps);
    } catch (e) {}
  };

  // Delete application
  const handleDeleteConfirm = async (id) => {
    try {
      setDeleting(true);
      await applicationsAPI.delete(id);
      setApplications((prev) => prev.filter((a) => a.id !== id));
      setDeleteModalOpen(false);
      setAppToDelete(null);
    } catch (err) {
      console.error('Error deleting application:', err);
      setError('Failed to delete application.');
    } finally {
      setDeleting(false);
    }
  };

  const openAddModal = (status = 'applied') => {
    setSelectedApp(null);
    setDefaultStatus(status);
    setModalOpen(true);
  };

  const openEditModal = (app) => {
    setSelectedApp(app);
    setModalOpen(true);
  };

  const openDeleteModal = (app) => {
    setAppToDelete(app);
    setDeleteModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            Application Pipeline
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
              {applications.length} Total
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Drag cards across columns to advance your job search stages.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchApplications}
            disabled={loading}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-white border border-slate-200 rounded-xl transition-all shadow-2xs cursor-pointer"
            title="Refresh board"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>

          <button
            onClick={() => openAddModal('applied')}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Application</span>
          </button>
        </div>
      </div>

      {/* Follow-up reminder alert banner */}
      {followUpsDue.length > 0 && (
        <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900">
                {followUpsDue.length} Application{followUpsDue.length > 1 ? 's' : ''} Need{followUpsDue.length === 1 ? 's' : ''} Follow-up
              </h4>
              <p className="text-xs text-amber-700 mt-0.5">
                Send a polite check-in email for:{' '}
                <span className="font-semibold">
                  {followUpsDue.slice(0, 3).map((a) => `${a.company} (${a.role})`).join(', ')}
                  {followUpsDue.length > 3 ? ` and ${followUpsDue.length - 3} more` : ''}
                </span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error alert */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm p-3.5 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Kanban Board Canvas */}
      {loading ? (
        <div className="flex items-center justify-center h-80 bg-white/50 border border-slate-200/60 rounded-2xl">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-slate-500 font-medium">Loading your pipeline...</p>
          </div>
        </div>
      ) : applications.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center max-w-xl mx-auto shadow-2xs my-8">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">No applications yet</h3>
          <p className="text-sm text-slate-500 mb-6">
            Get started by recording your first job application. Track every interview stage and follow-up in one clean dashboard.
          </p>
          <button
            onClick={() => openAddModal('applied')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add your first application
          </button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {/* Horizontal scrollable columns on mobile, full flex on large screens */}
          <div className="flex gap-5 overflow-x-auto pb-6 pt-1 px-1 scroll-smooth">
            {COLUMNS.map((colStatus) => {
              const colApps = applications.filter((app) => app.status === colStatus);
              return (
                <KanbanColumn
                  key={colStatus}
                  status={colStatus}
                  applications={colApps}
                  onAddInStatus={openAddModal}
                  onEdit={openEditModal}
                  onDelete={openDeleteModal}
                />
              );
            })}
          </div>

          {/* Active dragging ghost overlay */}
          <DragOverlay>
            {activeCard ? (
              <div className="w-72 sm:w-80 rotate-2 pointer-events-none">
                <ApplicationCard
                  application={activeCard}
                  onEdit={() => {}}
                  onDelete={() => {}}
                  isDragging={true}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Add / Edit Modal */}
      <ApplicationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        application={selectedApp}
        initialStatus={defaultStatus}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        application={appToDelete}
        deleting={deleting}
      />
    </div>
  );
};

export default BoardPage;
