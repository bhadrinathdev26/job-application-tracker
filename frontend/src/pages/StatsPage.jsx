import React, { useState, useEffect } from 'react';
import { applicationsAPI } from '../api/applications';
import StatusBadge from '../components/StatusBadge';
import ApplicationModal from '../components/ApplicationModal';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  Briefcase,
  CheckCircle2,
  Clock,
  Award,
  Layers,
  Calendar,
  AlertCircle,
  ExternalLink,
  Edit2,
} from 'lucide-react';

const STATUS_COLORS = {
  wishlist: '#94a3b8', // slate-400
  applied: '#3b82f6',  // blue-500
  interview: '#f59e0b',// amber-500
  offer: '#10b981',    // emerald-500
  rejected: '#f43f5e', // rose-500
};

const StatsPage = () => {
  const [stats, setStats] = useState(null);
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal for editing follow-up date
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError('');
      const [statsData, followUpsData] = await Promise.all([
        applicationsAPI.getStats(),
        applicationsAPI.getFollowUps(),
      ]);
      setStats(statsData);
      setFollowUps(followUpsData);
    } catch (err) {
      console.error('Error loading stats:', err);
      setError('Could not load analytics data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleSaveApp = async (payload, id) => {
    await applicationsAPI.update(id, payload);
    fetchStats();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-3">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-slate-500 font-medium">Computing pipeline metrics...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl flex items-center gap-3">
        <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
        <span>{error || 'No analytics data available.'}</span>
      </div>
    );
  }

  // Format status counts for Bar Chart
  const statusChartData = [
    { name: 'Wishlist', count: stats.status_counts.wishlist || 0, key: 'wishlist' },
    { name: 'Applied', count: stats.status_counts.applied || 0, key: 'applied' },
    { name: 'Interview', count: stats.status_counts.interview || 0, key: 'interview' },
    { name: 'Offer', count: stats.status_counts.offer || 0, key: 'offer' },
    { name: 'Rejected', count: stats.status_counts.rejected || 0, key: 'rejected' },
  ];

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Application Analytics
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          High-level metrics, conversion rates, and weekly application velocity.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Applications */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Applications
            </span>
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{stats.total_applications}</span>
            <span className="text-xs text-slate-500">recorded</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {stats.active_applications} active in pipeline
          </p>
        </div>

        {/* Response Rate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Response Rate
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-indigo-600">
              {stats.response_rate_percent}%
            </span>
            <span className="text-xs text-slate-500">interview/offer</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {stats.positive_responses} positive response{stats.positive_responses === 1 ? '' : 's'}
          </p>
        </div>

        {/* Interviews Active */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Interviews
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-600">
              {stats.status_counts.interview || 0}
            </span>
            <span className="text-xs text-slate-500">in progress</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Active interview stages</p>
        </div>

        {/* Offers Received */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Offers Received
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-600">
              {stats.status_counts.offer || 0}
            </span>
            <span className="text-xs text-slate-500">secured</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Congratulations on the offers!</p>
        </div>
      </div>

      {/* Visual Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-900">Applications by Status</h3>
            <p className="text-xs text-slate-500">Distribution across all stages of your search</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    borderRadius: '0.75rem',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {statusChartData.map((entry) => (
                    <Cell key={`cell-${entry.key}`} fill={STATUS_COLORS[entry.key]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weekly Submissions Trend Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-900">Applications per Week</h3>
            <p className="text-xs text-slate-500">Weekly velocity over the last 8 weeks</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.weekly_trend || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    borderRadius: '0.75rem',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#4f46e5"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorTrend)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Follow-up Reminders Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Needs Follow-up</h3>
              <p className="text-xs text-slate-500">
                Applications whose follow-up date is today or past, and awaiting your outreach.
              </p>
            </div>
          </div>

          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
            {followUps.length} Pending
          </span>
        </div>

        {followUps.length === 0 ? (
          <div className="text-center py-12 px-4">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-800">All caught up!</p>
            <p className="text-xs text-slate-500 mt-0.5">
              You have no overdue follow-ups right now. Great job staying organized!
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {followUps.map((app) => (
              <div
                key={app.id}
                className="p-5 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{app.company}</span>
                    <StatusBadge status={app.status} />
                    {app.job_url && (
                      <a
                        href={app.job_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-indigo-600"
                        title="Open posting"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-slate-600">{app.role}</p>
                  {app.notes && (
                    <p className="text-xs text-slate-500 italic line-clamp-1">"{app.notes}"</p>
                  )}
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                      <Clock className="w-3 h-3 text-amber-600" />
                      Due: {app.follow_up_date}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedApp(app);
                      setModalOpen(true);
                    }}
                    className="flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-indigo-600 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-white transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Update</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Follow-up Modal */}
      <ApplicationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveApp}
        application={selectedApp}
      />
    </div>
  );
};

export default StatsPage;
