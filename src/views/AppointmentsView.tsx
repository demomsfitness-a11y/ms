import React, { useState, useMemo } from 'react';
import {
  CalendarCheck,
  Search,
  Filter,
  Plus,
  Phone,
  Mail,
  Clock,
  Calendar,
  CheckCircle2,
  Clock3,
  XCircle,
  MessageSquare,
  UserPlus,
  Trash2,
  RefreshCw,
  Database,
  ExternalLink,
  ChevronDown,
  Sparkles,
  Share2,
  Copy,
  Check,
  AlertCircle
} from 'lucide-react';
import {
  Appointment,
  AppointmentStatus,
  AppointmentServiceType,
  Member
} from '../types';
import {
  updateAppointmentStatus,
  deleteAppointment,
  syncAppointmentsToSupabase
} from '../lib/db';
import {
  DEFAULT_SUPABASE_PROJECT_ID,
  SUPABASE_DASHBOARD_SQL_URL,
  isSupabaseConfigured
} from '../lib/supabase';

interface Props {
  appointments: Appointment[];
  onRefresh: () => Promise<void>;
  onOpenBookingModal: () => void;
  onOpenAddMemberWithData?: (leadData: Partial<Member>) => void;
  adminEmail: string;
  onOpenSqlSetup: () => void;
}

const SERVICE_LABELS: Record<AppointmentServiceType, { label: string; icon: string; color: string }> = {
  free_trial: { label: 'Free 1-Day Trial', icon: '🏋️', color: 'bg-red-950/60 text-red-400 border-red-800/60' },
  gym_tour: { label: 'Gym Tour & Visit', icon: '🏢', color: 'bg-blue-950/60 text-blue-400 border-blue-800/60' },
  personal_training: { label: 'PT Assessment', icon: '💪', color: 'bg-purple-950/60 text-purple-400 border-purple-800/60' },
  nutrition_consultation: { label: 'Diet & Nutrition', icon: '🥗', color: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60' },
  membership_inquiry: { label: 'Membership Inquiry', icon: '📋', color: 'bg-amber-950/60 text-amber-400 border-amber-800/60' },
  general: { label: 'General Walk-in', icon: '💬', color: 'bg-neutral-800 text-neutral-300 border-neutral-700' },
};

export const AppointmentsView: React.FC<Props> = ({
  appointments,
  onRefresh,
  onOpenBookingModal,
  onOpenAddMemberWithData,
  adminEmail,
  onOpenSqlSetup,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AppointmentStatus>('all');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all'); // 'all', 'today', 'upcoming'
  const [syncing, setSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Statistics
  const stats = useMemo(() => {
    const total = appointments.length;
    const pending = appointments.filter((a) => a.status === 'pending').length;
    const confirmed = appointments.filter((a) => a.status === 'confirmed').length;
    const completed = appointments.filter((a) => a.status === 'completed').length;
    return { total, pending, confirmed, completed };
  }, [appointments]);

  // Today's date string YYYY-MM-DD
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Filtered appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter((item) => {
      // Search match
      const query = search.toLowerCase().trim();
      const matchSearch =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.mobile.includes(query) ||
        item.appointment_code.toLowerCase().includes(query) ||
        (item.email && item.email.toLowerCase().includes(query));

      if (!matchSearch) return false;

      // Status filter
      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false;
      }

      // Service filter
      if (serviceFilter !== 'all' && item.service_type !== serviceFilter) {
        return false;
      }

      // Date filter
      if (dateFilter === 'today' && item.appointment_date !== todayStr) {
        return false;
      }
      if (dateFilter === 'upcoming' && item.appointment_date < todayStr) {
        return false;
      }

      return true;
    });
  }, [appointments, search, statusFilter, serviceFilter, dateFilter, todayStr]);

  // Handle status update
  const handleStatusChange = async (id: string, newStatus: AppointmentStatus) => {
    await updateAppointmentStatus(id, newStatus, adminEmail);
    await onRefresh();
  };

  // Handle delete
  const handleDelete = async (id: string, code: string) => {
    if (window.confirm(`Are you sure you want to remove appointment ${code}?`)) {
      await deleteAppointment(id, code, adminEmail);
      await onRefresh();
    }
  };

  // Convert to Member
  const handleConvertToMember = (appointment: Appointment) => {
    if (onOpenAddMemberWithData) {
      onOpenAddMemberWithData({
        name: appointment.name,
        mobile: appointment.mobile,
        email: appointment.email || '',
        notes: `Converted from appointment ${appointment.appointment_code} (${appointment.service_type}). Fitness goal: ${appointment.fitness_goal || 'N/A'}`,
        join_date: appointment.appointment_date || todayStr,
      });
    }
  };

  // Sync to Supabase
  const handleSyncToSupabase = async () => {
    setSyncing(true);
    setSyncFeedback(null);
    try {
      const result = await syncAppointmentsToSupabase();
      if (result.error) {
        setSyncFeedback(`Sync Notice: ${result.error}`);
      } else {
        setSyncFeedback(`Successfully synchronized ${result.syncedCount} appointment(s) to Supabase!`);
        await onRefresh();
      }
    } catch (e: any) {
      setSyncFeedback(e.message || 'Sync failed');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncFeedback(null), 5000);
    }
  };

  const isConnected = isSupabaseConfigured();

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner: Supabase Backend Status */}
      <div className="bg-neutral-900 border border-neutral-800/90 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                Connected Backend:
              </span>
              <span className="text-xs font-mono font-semibold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/50">
                {DEFAULT_SUPABASE_PROJECT_ID}
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <p className="text-xs text-neutral-300 mt-0.5">
              All appointments booked via the form are saved directly to table{' '}
              <code className="text-red-400 font-mono">public.appointments</code>
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2 w-full md:w-auto">
          <button
            onClick={handleSyncToSupabase}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium border border-neutral-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-red-400' : ''}`} />
            <span>{syncing ? 'Syncing...' : 'Sync Supabase'}</span>
          </button>

          <button
            onClick={onOpenSqlSetup}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium border border-neutral-700 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
            <span>SQL Schema Script</span>
          </button>

          <button
            onClick={onOpenBookingModal}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-lg shadow-red-600/20 transition-all ml-auto md:ml-0"
          >
            <Plus className="w-4 h-4" />
            <span>Book Appointment</span>
          </button>
        </div>
      </div>

      {/* Sync feedback notification */}
      {syncFeedback && (
        <div className="p-3 bg-neutral-900 border border-neutral-700 text-neutral-200 rounded-xl text-xs flex items-center justify-between animate-in fade-in">
          <span>{syncFeedback}</span>
          <button
            onClick={() => setSyncFeedback(null)}
            className="text-neutral-400 hover:text-white"
          >
            &times;
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-neutral-400 font-medium">Total Bookings</span>
            <CalendarCheck className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-display">
            {stats.total}
          </div>
          <span className="text-[11px] text-neutral-500 mt-1 block">Captured in database</span>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-neutral-400 font-medium">Pending Follow-up</span>
            <Clock3 className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-display">
            {stats.pending}
          </div>
          <span className="text-[11px] text-neutral-500 mt-1 block">Awaiting confirmation</span>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-neutral-400 font-medium">Confirmed Sessions</span>
            <CheckCircle2 className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-blue-400 font-display">
            {stats.confirmed}
          </div>
          <span className="text-[11px] text-neutral-500 mt-1 block">Scheduled visits</span>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-neutral-400 font-medium">Completed / Enrolled</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-display">
            {stats.completed}
          </div>
          <span className="text-[11px] text-neutral-500 mt-1 block">Attended workouts</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by client name, mobile, booking code (MSF-APT-...)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-red-500 transition-colors"
            />
          </div>

          {/* Service filter */}
          <div className="flex items-center gap-2">
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-500 transition-colors"
            >
              <option value="all">All Service Types</option>
              <option value="free_trial">Free 1-Day Trial</option>
              <option value="gym_tour">Gym Tour & Visit</option>
              <option value="personal_training">PT Assessment</option>
              <option value="nutrition_consultation">Diet & Nutrition</option>
              <option value="membership_inquiry">Membership Inquiry</option>
              <option value="general">General Walk-in</option>
            </select>

            {/* Date filter */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-500 transition-colors"
            >
              <option value="all">All Dates</option>
              <option value="today">Today's Visits</option>
              <option value="upcoming">Upcoming Visits</option>
            </select>
          </div>
        </div>

        {/* Status filter tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-t border-neutral-800/80 pt-3">
          {(
            [
              { id: 'all', label: 'All Statuses' },
              { id: 'pending', label: 'Pending' },
              { id: 'confirmed', label: 'Confirmed' },
              { id: 'completed', label: 'Completed' },
              { id: 'cancelled', label: 'Cancelled' },
            ] as const
          ).map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-neutral-950 text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Appointments List */}
      {filteredAppointments.length === 0 ? (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-neutral-800 text-neutral-400 mx-auto flex items-center justify-center">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">No Appointments Found</h3>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            {search || statusFilter !== 'all' || serviceFilter !== 'all'
              ? 'No bookings matched your search filter criteria. Try adjusting your filters.'
              : 'No appointments recorded yet. Fill the appointment booking form to create the first booking in Supabase!'}
          </p>
          <button
            onClick={onOpenBookingModal}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-lg shadow-red-600/20 inline-flex items-center gap-1.5 mt-2"
          >
            <Plus className="w-3.5 h-3.5" /> Book New Appointment
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAppointments.map((item) => {
            const service =
              SERVICE_LABELS[item.service_type] || SERVICE_LABELS.general;

            return (
              <div
                key={item.id}
                className="bg-neutral-900 border border-neutral-800/90 hover:border-neutral-700 rounded-2xl p-5 flex flex-col justify-between space-y-4 transition-all shadow-sm group"
              >
                {/* Card Top: Code, Service chip, Status badge */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div>
                      <span className="font-mono text-xs font-bold text-red-400 bg-red-950/40 px-2 py-0.5 rounded border border-red-900/50 block w-fit mb-1.5">
                        {item.appointment_code}
                      </span>
                      <h3 className="text-base font-bold text-white group-hover:text-red-400 transition-colors">
                        {item.name}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Status indicator badge */}
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border ${
                          item.status === 'confirmed'
                            ? 'bg-blue-950/40 text-blue-400 border-blue-800/60'
                            : item.status === 'completed'
                            ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60'
                            : item.status === 'cancelled'
                            ? 'bg-neutral-800 text-neutral-400 border-neutral-700'
                            : 'bg-amber-950/40 text-amber-400 border-amber-800/60'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                  </div>

                  {/* Service type pill */}
                  <div className="mb-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${service.color}`}
                    >
                      <span>{service.icon}</span>
                      <span>{service.label}</span>
                    </span>
                  </div>

                  {/* Date & Time slot info */}
                  <div className="grid grid-cols-2 gap-2 bg-neutral-950/70 rounded-xl p-2.5 border border-neutral-800/70 text-xs mb-3">
                    <div className="flex items-center gap-2 text-neutral-300">
                      <Calendar className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span className="truncate">{item.appointment_date}</span>
                    </div>
                    <div className="flex items-center gap-2 text-neutral-300">
                      <Clock className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span className="truncate">{item.time_slot}</span>
                    </div>
                  </div>

                  {/* Contact Info & Notes */}
                  <div className="space-y-1 text-xs text-neutral-400">
                    <div className="flex items-center gap-2 text-neutral-300">
                      <Phone className="w-3.5 h-3.5 text-neutral-500" />
                      <span className="font-mono">{item.mobile}</span>
                    </div>
                    {item.email && (
                      <div className="flex items-center gap-2 text-neutral-400">
                        <Mail className="w-3.5 h-3.5 text-neutral-500" />
                        <span className="truncate">{item.email}</span>
                      </div>
                    )}
                    {item.fitness_goal && (
                      <div className="text-[11px] text-neutral-400 pt-1">
                        <span className="text-neutral-500">Goal:</span> {item.fitness_goal}
                      </div>
                    )}
                    {item.notes && (
                      <div className="text-[11px] text-neutral-400 bg-neutral-950 p-2 rounded-lg border border-neutral-800/50 mt-1 italic">
                        "{item.notes}"
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="pt-3 border-t border-neutral-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                  {/* Quick Contact buttons */}
                  <div className="flex items-center gap-1.5">
                    <a
                      href={`https://wa.me/${item.mobile.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                        `Hello ${item.name}, this is MS Fitness Gym regarding your appointment ${item.appointment_code} on ${item.appointment_date} at ${item.time_slot}.`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-lg bg-emerald-950/40 text-emerald-400 hover:bg-emerald-900/40 border border-emerald-800/50 transition-colors"
                      title="WhatsApp Client"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </a>
                    <a
                      href={`tel:${item.mobile}`}
                      className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors"
                      title="Call Client"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {/* Status update selector & Convert button */}
                  <div className="flex items-center gap-1.5 ml-auto">
                    {/* Quick status dropdown */}
                    <select
                      value={item.status}
                      onChange={(e) => handleStatusChange(item.id, e.target.value as AppointmentStatus)}
                      className="px-2 py-1 bg-neutral-950 border border-neutral-800 rounded-lg text-[11px] text-neutral-200 focus:outline-none focus:border-red-500"
                    >
                      <option value="pending">Mark Pending</option>
                      <option value="confirmed">Mark Confirmed</option>
                      <option value="completed">Mark Completed</option>
                      <option value="cancelled">Mark Cancelled</option>
                    </select>

                    {/* Convert to paying Member */}
                    <button
                      onClick={() => handleConvertToMember(item)}
                      title="Convert to Member (pre-fills registration)"
                      className="px-2.5 py-1 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-800/50 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                    >
                      <UserPlus className="w-3 h-3" />
                      <span>Convert</span>
                    </button>

                    {/* Delete button */}
                    <button
                      onClick={() => handleDelete(item.id, item.appointment_code)}
                      className="p-1.5 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                      title="Delete appointment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
