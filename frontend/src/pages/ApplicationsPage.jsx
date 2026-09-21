import React, { useState, useEffect } from 'react';
import { applicationsAPI } from '../api/applications';
import StatusBadge from '../components/StatusBadge';
import ApplicationModal from '../components/ApplicationModal';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import {
  Search,
  Plus,
  Filter,
  ArrowUpDown,
  Calendar,
  MapPin,
  ExternalLink,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Briefcase,
} from 'lucide-react';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'wishlist', label: 'Wishlist' },
  { value: 'applied', label: 'Applied' },
  { value: 'interview', label: 'Interview' },
  { value: 'offer', label: 'Offer' },
  { value: 'rejected', label: 'Rejected' },
];

const ORDERING_OPTIONS = [
  { value: '-created_at', label: 'Newest First' },
  { value: 'created_at', label: 'Oldest First' },
  { value: '-applied_date', label: 'Applied Date (Recent)' },
  { value: 'company', label: 'Company (A-Z)' },
];

const ApplicationsPage = () => {
  const [applications, setApplications] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [ordering, setOrdering] = useState('-created_at');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [appToDelete, setAppToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {
        page,
        ordering,
      };
      if (search.trim()) params.search = search.trim();
      if (statusFilter) params.status = statusFilter;

      const data = await applicationsAPI.getAll(params);
      setApplications(data.results || []);
      setTotalCount(data.count || 0);
    } catch (err) {
      console.error('Error loading applications list:', err);
      setError('Failed to load applications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [page, statusFilter, ordering]);

  // Handle search with enter or delay
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchApplications();
  };

  const handleSave = async (payload, id) => {
    if (id) {
      await applicationsAPI.update(id, payload);
    } else {
      await applicationsAPI.create(payload);
    }
    fetchApplications();
  };

  const handleDeleteConfirm = async (id) => {
    try {
      setDeleting(true);
      await applicationsAPI.delete(id);
      setDeleteModalOpen(false);
      setAppToDelete(null);
      fetchApplications();
    } catch (err) {
      console.error('Failed to delete:', err);
      setError('Could not delete application.');
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            All Applications
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Browse, search, filter, and manage your full application catalog.
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedApp(null);
            setModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-xs hover:shadow-md transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Application</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center gap-3">
        {/* Search input */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by company or role..."
            className="w-full pl-10 pr-20 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-lg hover:bg-indigo-100 transition-colors cursor-pointer"
          >
            Search
          </button>
        </form>

        {/* Status Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="w-full md:w-44 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <ArrowUpDown className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />
          <select
            value={ordering}
            onChange={(e) => {
              setOrdering(e.target.value);
              setPage(1);
            }}
            className="w-full md:w-48 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all"
          >
            {ORDERING_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table Content */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="w-9 h-9 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-slate-500 font-medium">Loading applications...</p>
          </div>
        ) : applications.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
              <Briefcase className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">No applications found</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto mb-4">
              {search || statusFilter
                ? 'Try adjusting your search query or status filter.'
                : 'You have not added any job applications yet.'}
            </p>
            {search || statusFilter ? (
              <button
                onClick={() => {
                  setSearch('');
                  setStatusFilter('');
                  setPage(1);
                }}
                className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
              >
                Clear all filters
              </button>
            ) : null}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50/75">
                  <tr>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Company & Role
                    </th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Applied Date
                    </th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Location & Salary
                    </th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Follow-up
                    </th>
                    <th scope="col" className="px-6 py-3.5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {applications.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{app.company}</span>
                          {app.job_url && (
                            <a
                              href={app.job_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-400 hover:text-indigo-600"
                              title="Open link"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">{app.role}</div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={app.status} />
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {app.applied_date ? (
                          <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {app.applied_date}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600">
                        <div>{app.location || '—'}</div>
                        {app.salary_range && (
                          <div className="text-slate-400 mt-0.5">{app.salary_range}</div>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        {app.follow_up_date ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/70">
                            <Clock className="w-3 h-3 text-amber-500" />
                            {app.follow_up_date}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedApp(app);
                              setModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setAppToDelete(app);
                              setDeleteModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Card View */}
            <div className="md:hidden divide-y divide-slate-100 p-2">
              {applications.map((app) => (
                <div key={app.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-base">{app.company}</h4>
                      <p className="text-sm text-slate-600 font-medium">{app.role}</p>
                    </div>
                    <StatusBadge status={app.status} />
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                    {app.applied_date && (
                      <span className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {app.applied_date}
                      </span>
                    )}
                    {app.location && (
                      <span className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {app.location}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                    {app.follow_up_date ? (
                      <span className="text-xs text-amber-700 font-medium">
                        Follow-up: {app.follow_up_date}
                      </span>
                    ) : (
                      <span />
                    )}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedApp(app);
                          setModalOpen(true);
                        }}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 rounded"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setAppToDelete(app);
                          setDeleteModalOpen(true);
                        }}
                        className="p-1.5 text-slate-500 hover:text-rose-600 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
              <div className="text-xs text-slate-500">
                Showing{' '}
                <span className="font-semibold text-slate-700">
                  {totalCount === 0 ? 0 : (page - 1) * pageSize + 1}
                </span>{' '}
                to{' '}
                <span className="font-semibold text-slate-700">
                  {Math.min(page * pageSize, totalCount)}
                </span>{' '}
                of <span className="font-semibold text-slate-700">{totalCount}</span> applications
              </div>

              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  title="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-medium text-slate-600 px-2">
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  title="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add / Edit Modal */}
      <ApplicationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        application={selectedApp}
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

export default ApplicationsPage;
