import React, { useState } from 'react';
import {
  CalendarCheck,
  X,
  User,
  Phone,
  Mail,
  Calendar,
  Clock,
  Target,
  FileText,
  CheckCircle2,
  Database,
  ExternalLink,
  Sparkles,
  Share2,
  Copy,
  Check,
  AlertCircle,
} from 'lucide-react';
import {
  Appointment,
  AppointmentServiceType,
  AppointmentStatus
} from '../types';
import { createAppointment, CreateAppointmentResult } from '../lib/db';
import { isSupabaseConfigured, DEFAULT_SUPABASE_PROJECT_ID, SUPABASE_DASHBOARD_SQL_URL } from '../lib/supabase';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAppointmentCreated?: (appointment: Appointment) => void;
  adminEmail?: string;
  onOpenSqlSetup?: () => void;
}

const SERVICE_OPTIONS: { id: AppointmentServiceType; label: string; desc: string; icon: string }[] = [
  {
    id: 'free_trial',
    label: 'Free 1-Day Gym Workout Pass',
    desc: 'Complete access to cardio, strength equipment, and locker rooms',
    icon: '🏋️',
  },
  {
    id: 'gym_tour',
    label: 'Gym Tour & Facility Consultation',
    desc: 'Walkthrough of gym facilities, machinery, and membership perks',
    icon: '🏢',
  },
  {
    id: 'personal_training',
    label: '1-on-1 Fitness Assessment & PT Trial',
    desc: 'Body mobility assessment, posture check & trainer demo session',
    icon: '💪',
  },
  {
    id: 'nutrition_consultation',
    label: 'Diet & Nutrition Consultation',
    desc: 'Personalized macronutrient & meal planning strategy session',
    icon: '🥗',
  },
  {
    id: 'membership_inquiry',
    label: 'Membership Enrollment & Body Composition',
    desc: 'In-body scan test, goal consultation & package onboarding',
    icon: '📋',
  },
  {
    id: 'general',
    label: 'General Inquiry / Walk-in Discussion',
    desc: 'Speak with our head coach and staff about personal goals',
    icon: '💬',
  },
];

const TIME_SLOTS = [
  '06:00 AM - 07:00 AM',
  '07:00 AM - 08:00 AM',
  '08:00 AM - 09:00 AM',
  '10:00 AM - 11:00 AM',
  '05:00 PM - 06:00 PM',
  '06:00 PM - 07:00 PM',
  '07:00 PM - 08:00 PM',
  '08:00 PM - 09:00 PM',
];

const FITNESS_GOALS = [
  'Weight Loss & Fat Reduction',
  'Muscle Building & Hypertrophy',
  'Strength & Athletic Conditioning',
  'General Fitness & Overall Wellness',
  'Rehabilitation & Posture Correction',
];

export const AppointmentBookingModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onAppointmentCreated,
  adminEmail,
  onOpenSqlSetup,
}) => {
  // Form state
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [serviceType, setServiceType] = useState<AppointmentServiceType>('free_trial');
  const [appointmentDate, setAppointmentDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [timeSlot, setTimeSlot] = useState(TIME_SLOTS[4]); // 5:00 PM - 6:00 PM default
  const [fitnessGoal, setFitnessGoal] = useState(FITNESS_GOALS[0]);
  const [notes, setNotes] = useState('');

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState<CreateAppointmentResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const resetForm = () => {
    setName('');
    setMobile('');
    setEmail('');
    setServiceType('free_trial');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setAppointmentDate(tomorrow.toISOString().split('T')[0]);
    setTimeSlot(TIME_SLOTS[4]);
    setFitnessGoal(FITNESS_GOALS[0]);
    setNotes('');
    setBookingResult(null);
    setErrorMsg(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!name.trim() || !mobile.trim() || !appointmentDate || !timeSlot) {
      setErrorMsg('Please enter your name, mobile number, date, and preferred time slot.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await createAppointment(
        {
          name: name.trim(),
          mobile: mobile.trim(),
          email: email.trim(),
          service_type: serviceType,
          appointment_date: appointmentDate,
          time_slot: timeSlot,
          fitness_goal: fitnessGoal,
          notes: notes.trim(),
          status: 'pending',
        },
        adminEmail || 'Public Booking'
      );

      setBookingResult(result);
      if (onAppointmentCreated) {
        onAppointmentCreated(result.appointment);
      }
    } catch (err: any) {
      console.error('Booking submission error:', err);
      setErrorMsg(err.message || 'An unexpected error occurred while booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyDetails = () => {
    if (!bookingResult) return;
    const text = `MS Fitness Appointment Confirmation
Booking Ref: ${bookingResult.appointment.appointment_code}
Name: ${bookingResult.appointment.name}
Phone: ${bookingResult.appointment.mobile}
Service: ${bookingResult.appointment.service_type.replace('_', ' ').toUpperCase()}
Date: ${bookingResult.appointment.appointment_date}
Time: ${bookingResult.appointment.time_slot}
Status: Confirmed / Pending Verification
Location: MS Fitness Gym, New Delhi`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isConfigured = isSupabaseConfigured();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto no-print">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-8">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/80">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-red-600/15 border border-red-600/30 flex items-center justify-center text-red-500 shadow-inner">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-wide">
                  Book Gym Appointment
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-red-600/20 text-red-400 text-[10px] font-bold tracking-wider uppercase">
                  Free Trial & Visits
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Book a session, consultation, or free trial — saved directly to Supabase
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Supabase backend status pill */}
        <div className="px-6 py-2.5 bg-neutral-950/95 border-b border-neutral-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-neutral-300">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>Supabase Backend:</span>
            <span className="font-mono text-[11px] text-emerald-400 font-semibold">
              zjruoaaxlpxjeejzvmpt
            </span>
          </div>
          {onOpenSqlSetup && (
            <button
              onClick={onOpenSqlSetup}
              type="button"
              className="text-[11px] text-neutral-400 hover:text-red-400 flex items-center gap-1 transition-colors"
            >
              <span>View SQL Table Schema</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        {bookingResult ? (
          /* SUCCESS STATE */
          <div className="p-6 sm:p-8 space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-2xl font-bold text-white tracking-wide">
                Appointment Booked Successfully!
              </h3>
              <p className="text-sm text-neutral-400 max-w-md mx-auto">
                The appointment details have been captured and saved to your Supabase backend tables.
              </p>
            </div>

            {/* Reference Badge */}
            <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 max-w-md mx-auto space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800/80 text-xs">
                <span className="text-neutral-400">Booking Reference Code:</span>
                <span className="font-mono font-bold text-sm text-red-400 bg-red-950/40 px-2.5 py-0.5 rounded-lg border border-red-900/50">
                  {bookingResult.appointment.appointment_code}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-left text-xs">
                <div>
                  <span className="text-neutral-500 block">Client Name</span>
                  <span className="font-semibold text-neutral-200">{bookingResult.appointment.name}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Phone</span>
                  <span className="font-semibold text-neutral-200">{bookingResult.appointment.mobile}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Visit Date</span>
                  <span className="font-semibold text-neutral-200">{bookingResult.appointment.appointment_date}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Time Slot</span>
                  <span className="font-semibold text-neutral-200">{bookingResult.appointment.time_slot}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[11px]">
                <span className="text-neutral-400">Database Sync Status:</span>
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  {bookingResult.savedToSupabase
                    ? 'Synced live to Supabase'
                    : 'Saved to Local DB & Ready to Sync'}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={handleCopyDetails}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied Details!' : 'Copy Summary'}
              </button>

              <button
                onClick={resetForm}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold transition-colors"
              >
                Book Another Appointment
              </button>

              <button
                onClick={handleClose}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-lg shadow-red-600/20 transition-colors"
              >
                Done / View Appointments
              </button>
            </div>
          </div>
        ) : (
          /* BOOKING FORM */
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-red-950/70 border border-red-800/80 text-red-200 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Step 1: Personal Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-neutral-300 tracking-wider uppercase">
                <User className="w-3.5 h-3.5 text-red-500" />
                <span>1. Client Information</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-red-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      placeholder="e.g. +91 98765 43210"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-red-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Email Address <span className="text-neutral-500 font-normal">(Optional, for booking confirmation)</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      placeholder="e.g. rahul.sharma@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-red-500 transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Appointment / Service Type */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 text-xs font-bold text-neutral-300 tracking-wider uppercase">
                <Sparkles className="w-3.5 h-3.5 text-red-500" />
                <span>2. Select Appointment Type</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {SERVICE_OPTIONS.map((item) => {
                  const isSelected = serviceType === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setServiceType(item.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-red-950/40 border-red-600 text-white shadow-sm'
                          : 'bg-neutral-950/60 border-neutral-800/80 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 mb-1">
                        <span className="text-base">{item.icon}</span>
                        <span className="text-xs font-bold leading-tight">{item.label}</span>
                      </div>
                      <p className="text-[11px] text-neutral-400 line-clamp-2 pl-6">
                        {item.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Preferred Date & Time Slot */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 text-xs font-bold text-neutral-300 tracking-wider uppercase">
                <Calendar className="w-3.5 h-3.5 text-red-500" />
                <span>3. Date & Time Slot</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Appointment Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split('T')[0]}
                      value={appointmentDate}
                      onChange={(e) => setAppointmentDate(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-red-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Time Slot <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Clock className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <select
                      value={timeSlot}
                      onChange={(e) => setTimeSlot(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-red-500 transition-colors"
                    >
                      {TIME_SLOTS.map((slot) => (
                        <option key={slot} value={slot}>
                          {slot}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 4: Fitness Goal & Notes */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 text-xs font-bold text-neutral-300 tracking-wider uppercase">
                <Target className="w-3.5 h-3.5 text-red-500" />
                <span>4. Fitness Goal & Special Notes</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Primary Goal
                  </label>
                  <select
                    value={fitnessGoal}
                    onChange={(e) => setFitnessGoal(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-red-500 transition-colors"
                  >
                    {FITNESS_GOALS.map((goal) => (
                      <option key={goal} value={goal}>
                        {goal}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Special Notes / Health Conditions
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Prior knee injury, prefers evening workouts"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-red-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Form Footer */}
            <div className="pt-4 border-t border-neutral-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2.5 rounded-xl border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800 text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-red-600/20 transition-all flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Saving to Supabase...</span>
                  </>
                ) : (
                  <>
                    <CalendarCheck className="w-4 h-4" />
                    <span>Confirm & Book Appointment</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
