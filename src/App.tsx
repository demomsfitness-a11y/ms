import React, { useState, useEffect, useCallback } from 'react';
import {
  Member,
  MembershipPlan,
  Payment,
  GymSettings,
  ActivityLog,
  Appointment,
  AdminAccount,
  AdminRole,
  AdminStatus,
  PermissionKey,
  ALL_PERMISSIONS,
} from './types';
import {
  getMembers,
  createMember,
  updateMember,
  deleteMember,
  getPlans,
  createPlan,
  updatePlan,
  deletePlan,
  getPayments,
  createPayment,
  getSettings,
  updateSettings,
  getActivityLogs,
  getAppointments,
  generateNextMemberId,
  generateNextPaymentId,
  generateNextReceiptNumber,
  subscribeToSchemaPending,
  getAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  fetchAdminByEmail,
} from './lib/db';
import { hasPermission, isSuperAdmin } from './lib/permissions';
import { supabase, isSupabaseConfigured, DEFAULT_SUPABASE_PROJECT_ID } from './lib/supabase';
import { Sidebar, TabType } from './components/Sidebar';
import { Header } from './components/Header';
import { LoginView } from './views/LoginView';
import { DashboardView } from './views/DashboardView';
import { MembersView } from './views/MembersView';
import { PlansView } from './views/PlansView';
import { PaymentsView } from './views/PaymentsView';
import { ExpiryView } from './views/ExpiryView';
import { ReportsView } from './views/ReportsView';
import { ActivityLogsView } from './views/ActivityLogsView';
import { AdminManagementView } from './views/AdminManagementView';
import { SettingsView } from './views/SettingsView';
import { AppointmentsView } from './views/AppointmentsView';
import { AppointmentBookingModal } from './components/AppointmentBookingModal';
import { ReceiptModal } from './components/ReceiptModal';
import { SupabaseConfigModal } from './components/SupabaseConfigModal';
import { SqlSetupModal } from './components/SqlSetupModal';
import { MemberProfileModal } from './components/MemberProfileModal';
import { RefreshCw, AlertTriangle, Database, ShieldAlert, Lock } from 'lucide-react';

export default function App() {
  // Session & Auth state
  const [adminEmail, setAdminEmail] = useState<string | null>(() => {
    return localStorage.getItem('msf_admin_email') || null;
  });
  const [currentAdmin, setCurrentAdmin] = useState<AdminAccount | null>(() => {
    try {
      const cached = localStorage.getItem('msf_current_admin');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [isSchemaPending, setIsSchemaPending] = useState<boolean>(false);

  // Active View Tab
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Subscribe to missing tables detection
  useEffect(() => {
    const unsubscribe = subscribeToSchemaPending((pending) => {
      setIsSchemaPending(pending);
    });
    return unsubscribe;
  }, []);

  // Core Data States
  const [members, setMembers] = useState<Member[]>([]);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [settings, setSettings] = useState<GymSettings>({
    gym_name: 'MS Fitness',
    tagline: 'Stronger Body, Stronger You',
    phone: '+91 98765 43210',
    email: 'contact@msfitness.com',
    address: '123 Powerhouse Street, Fitness District, New Delhi, India',
    upi_id: 'msfitness@upi',
    currency: 'INR',
  });
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(false);

  // Modals
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState<Payment | null>(null);
  const [viewingProfileMember, setViewingProfileMember] = useState<Member | null>(null);

  // Quick action cross-view triggers
  const [preselectedPaymentMember, setPreselectedPaymentMember] = useState<Member | null>(null);
  const [openAddMemberDirectly, setOpenAddMemberDirectly] = useState(false);
  const [leadDataForMember, setLeadDataForMember] = useState<Partial<Member> | null>(null);

  const handleOpenMemberProfile = (target: Member | string) => {
    if (typeof target === 'string') {
      const found = members.find(
        (m) =>
          m.id === target ||
          m.member_id === target ||
          m.member_id?.toLowerCase() === target.toLowerCase()
      );
      if (found) setViewingProfileMember(found);
    } else {
      setViewingProfileMember(target);
    }
  };

  // Check Supabase Auth session on mount
  useEffect(() => {
    async function checkAuth() {
      try {
        if (supabase) {
          const { data } = await supabase.auth.getSession();
          if (data?.session?.user?.email) {
            const email = data.session.user.email;
            setAdminEmail(email);
            localStorage.setItem('msf_admin_email', email);
            const verified = await fetchAdminByEmail(email);
            if (verified) {
              if (verified.status === 'inactive') {
                alert('Your administrator account has been deactivated. Please contact Super Admin.');
                handleLogout();
                return;
              }
              setCurrentAdmin(verified);
              localStorage.setItem('msf_current_admin', JSON.stringify(verified));
            }
          }
        }
      } catch (err) {
        console.warn('Auth check fallback:', err);
      } finally {
        setAuthChecking(false);
      }
    }

    checkAuth();

    if (supabase) {
      const { data: authListener } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (session?.user?.email) {
            const email = session.user.email;
            setAdminEmail(email);
            localStorage.setItem('msf_admin_email', email);
            const verified = await fetchAdminByEmail(email);
            if (verified) {
              if (verified.status === 'inactive') {
                alert('Your administrator account has been deactivated. Please contact Super Admin.');
                handleLogout();
                return;
              }
              setCurrentAdmin(verified);
              localStorage.setItem('msf_current_admin', JSON.stringify(verified));
            }
          } else if (event === 'SIGNED_OUT') {
            setAdminEmail(null);
            setCurrentAdmin(null);
            localStorage.removeItem('msf_admin_email');
            localStorage.removeItem('msf_current_admin');
          }
        }
      );

      return () => {
        authListener.subscription.unsubscribe();
      };
    }
  }, []);

  // Fetch all gym data
  const loadGymData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [
        membersRes,
        plansRes,
        paymentsRes,
        settingsRes,
        logsRes,
        appointmentsRes,
        adminsRes,
      ] = await Promise.allSettled([
        getMembers(),
        getPlans(),
        getPayments(),
        getSettings(),
        getActivityLogs(),
        getAppointments(),
        getAdmins(),
      ]);

      if (membersRes.status === 'fulfilled') setMembers(membersRes.value);
      else console.error('Error fetching members from Supabase:', membersRes.reason);

      if (plansRes.status === 'fulfilled') setPlans(plansRes.value);
      else console.error('Error fetching plans from Supabase:', plansRes.reason);

      if (paymentsRes.status === 'fulfilled') setPayments(paymentsRes.value);
      else console.error('Error fetching payments from Supabase:', paymentsRes.reason);

      if (settingsRes.status === 'fulfilled' && settingsRes.value) setSettings(settingsRes.value);
      else if (settingsRes.status === 'rejected') console.error('Error fetching settings from Supabase:', settingsRes.reason);

      if (logsRes.status === 'fulfilled') setActivityLogs(logsRes.value);
      if (appointmentsRes.status === 'fulfilled') setAppointments(appointmentsRes.value);

      if (adminsRes.status === 'fulfilled') {
        setAdmins(adminsRes.value);
        if (adminEmail) {
          const matched = adminsRes.value.find(
            (a) => a.email.toLowerCase() === adminEmail.toLowerCase()
          );
          if (matched) {
            if (matched.status === 'inactive') {
              alert('Your administrator account has been deactivated by Super Admin.');
              handleLogout();
              return;
            }
            setCurrentAdmin(matched);
            localStorage.setItem('msf_current_admin', JSON.stringify(matched));
          }
        }
      }
    } catch (err) {
      console.error('Error fetching gym data:', err);
    } finally {
      setLoadingData(false);
    }
  }, [adminEmail]);

  // Load data when admin is authenticated
  useEffect(() => {
    if (adminEmail) {
      loadGymData();
    }
  }, [adminEmail, loadGymData]);

  // Handle Login
  const handleLoginSuccess = (adminOrEmail: AdminAccount | string) => {
    if (typeof adminOrEmail === 'string') {
      setAdminEmail(adminOrEmail);
      localStorage.setItem('msf_admin_email', adminOrEmail);
      fetchAdminByEmail(adminOrEmail).then((acc) => {
        if (acc) {
          setCurrentAdmin(acc);
          localStorage.setItem('msf_current_admin', JSON.stringify(acc));
        }
      });
    } else {
      setAdminEmail(adminOrEmail.email);
      setCurrentAdmin(adminOrEmail);
      localStorage.setItem('msf_admin_email', adminOrEmail.email);
      localStorage.setItem('msf_current_admin', JSON.stringify(adminOrEmail));
    }
    loadGymData();
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.warn('Sign out warning:', err);
    } finally {
      setAdminEmail(null);
      setCurrentAdmin(null);
      localStorage.removeItem('msf_admin_email');
      localStorage.removeItem('msf_current_admin');
    }
  };

  // ----------------------------------------------------
  // Admin Operations (Super Admin Only)
  // ----------------------------------------------------
  const handleAddAdmin = async (newAdminData: {
    full_name: string;
    email: string;
    role: AdminRole;
    status: AdminStatus;
    permissions?: PermissionKey[];
  }) => {
    if (currentAdmin && !hasPermission(currentAdmin, 'admins.create')) {
      alert('Access Denied: You do not have permission to add administrators.');
      return;
    }
    await createAdmin(newAdminData, currentAdmin || adminEmail || undefined);
    await loadGymData();
  };

  const handleUpdateAdmin = async (id: string, updates: Partial<AdminAccount>) => {
    if (currentAdmin && !hasPermission(currentAdmin, 'admins.edit')) {
      alert('Access Denied: You do not have permission to edit administrators.');
      return;
    }
    await updateAdmin(id, updates, currentAdmin || adminEmail || undefined);
    if (currentAdmin && currentAdmin.id === id) {
      const merged = { ...currentAdmin, ...updates };
      setCurrentAdmin(merged);
      localStorage.setItem('msf_current_admin', JSON.stringify(merged));
    }
    await loadGymData();
  };

  const handleDeleteAdmin = async (id: string, adminId: string, adminName: string) => {
    if (currentAdmin && !hasPermission(currentAdmin, 'admins.delete')) {
      alert('Access Denied: You do not have permission to delete administrators.');
      return;
    }
    if (currentAdmin && currentAdmin.id === id) {
      alert('Action Blocked: You cannot delete your own active administrator account.');
      return;
    }
    const caller: AdminAccount = currentAdmin || {
      id: 'super-admin-root',
      admin_id: 'ADM-0001',
      full_name: 'Super Administrator',
      email: adminEmail || 'admin@msfitness.com',
      role: 'super_admin',
      status: 'active',
      permissions: ALL_PERMISSIONS.map((p) => p.key),
    };
    await deleteAdmin(id, adminId, adminName, caller);
    await loadGymData();
  };

  // ----------------------------------------------------
  // Member Operations
  // ----------------------------------------------------
  const handleAddMember = async (memberData: Omit<Member, 'id'>) => {
    if (currentAdmin && !hasPermission(currentAdmin, 'members.create')) {
      alert('Access Denied: You do not have permission to register members.');
      return;
    }
    const userEmail = currentAdmin || adminEmail || 'admin@msfitness.com';
    const nextCode = await generateNextMemberId();
    await createMember({ ...memberData, member_id: nextCode }, userEmail);
    await loadGymData();
  };

  const handleUpdateMember = async (id: string, updates: Partial<Member>) => {
    if (currentAdmin && !hasPermission(currentAdmin, 'members.edit')) {
      alert('Access Denied: You do not have permission to edit member profiles.');
      return;
    }
    const userEmail = currentAdmin || adminEmail || 'admin@msfitness.com';
    await updateMember(id, updates, userEmail);
    await loadGymData();
  };

  const handleDeleteMember = async (id: string, name: string, code: string) => {
    if (currentAdmin && !hasPermission(currentAdmin, 'members.delete')) {
      alert('Access Denied: You do not have permission to delete member records.');
      return;
    }
    const userEmail = currentAdmin || adminEmail || 'admin@msfitness.com';
    await deleteMember(id, name, code, userEmail);
    await loadGymData();
  };

  // ----------------------------------------------------
  // Plan Operations
  // ----------------------------------------------------
  const handleAddPlan = async (planData: Omit<MembershipPlan, 'id'>) => {
    if (currentAdmin && !hasPermission(currentAdmin, 'plans.create')) {
      alert('Access Denied: You do not have permission to create membership plans.');
      return;
    }
    const userEmail = currentAdmin || adminEmail || 'admin@msfitness.com';
    await createPlan(planData, userEmail);
    await loadGymData();
  };

  const handleUpdatePlan = async (id: string, updates: Partial<MembershipPlan>) => {
    if (currentAdmin && !hasPermission(currentAdmin, 'plans.edit')) {
      alert('Access Denied: You do not have permission to modify membership plans.');
      return;
    }
    const userEmail = currentAdmin || adminEmail || 'admin@msfitness.com';
    await updatePlan(id, updates, userEmail);
    await loadGymData();
  };

  const handleDeletePlan = async (id: string, planName: string) => {
    if (currentAdmin && !hasPermission(currentAdmin, 'plans.delete')) {
      alert('Access Denied: You do not have permission to delete membership plans.');
      return;
    }
    const userEmail = currentAdmin || adminEmail || 'admin@msfitness.com';
    await deletePlan(id, planName, userEmail);
    await loadGymData();
  };

  // ----------------------------------------------------
  // Payment Operations
  // ----------------------------------------------------
  const handleRecordPayment = async (payload: {
    member_id: string;
    amount: number;
    discount: number;
    previous_balance: number;
    total_due: number;
    remaining_balance: number;
    payment_method: 'Cash' | 'UPI';
    transaction_number?: string;
    upi_transaction_number?: string;
    payment_date: string;
    notes?: string;
    plan_name?: string;
    renew_months?: number;
  }): Promise<Payment> => {
    if (currentAdmin && !hasPermission(currentAdmin, 'payments.create')) {
      alert('Access Denied: You do not have permission to record payments or issue receipts.');
      throw new Error('Access Denied: payments.create');
    }
    const userEmail = currentAdmin || adminEmail || 'admin@msfitness.com';
    const member = members.find((m) => m.id === payload.member_id);

    const nextPaymentId = await generateNextPaymentId();
    const nextReceiptNo = await generateNextReceiptNumber();
    const cleanTxn = payload.upi_transaction_number || payload.transaction_number;

    const paymentData: Omit<Payment, 'id'> = {
      payment_id: nextPaymentId,
      receipt_number: nextReceiptNo,
      member_id: payload.member_id,
      member_name: member?.name || 'Member',
      member_code: member?.member_id || '',
      amount: payload.amount,
      discount: payload.discount,
      previous_balance: payload.previous_balance,
      total_due: payload.total_due,
      remaining_balance: payload.remaining_balance,
      payment_method: payload.payment_method,
      transaction_number: cleanTxn,
      upi_transaction_number: cleanTxn,
      payment_date: payload.payment_date,
      notes: payload.notes || '',
      plan_name: payload.plan_name || 'Membership Fee',
    };

    const createdPayment = await createPayment(paymentData, userEmail);

    // If membership renewal is included
    if (payload.renew_months && payload.renew_months > 0 && member) {
      const currentExpiry = new Date(member.membership_expiry);
      const baseDate = currentExpiry.getTime() > Date.now() ? currentExpiry : new Date();
      baseDate.setMonth(baseDate.getMonth() + payload.renew_months);
      const newExpiry = baseDate.toISOString().slice(0, 10);

      await updateMember(
        member.id,
        {
          membership_expiry: newExpiry,
          status: 'active',
        },
        userEmail
      );
    }

    await loadGymData();
    return createdPayment;
  };

  // ----------------------------------------------------
  // Settings Operations
  // ----------------------------------------------------
  const handleUpdateSettings = async (updates: Partial<GymSettings>) => {
    if (currentAdmin && !hasPermission(currentAdmin, 'settings.manage')) {
      alert('Access Denied: You do not have permission to modify gym settings.');
      return;
    }
    const userEmail = currentAdmin || adminEmail || 'admin@msfitness.com';
    await updateSettings(updates, userEmail);
    await loadGymData();
  };

  // ----------------------------------------------------
  // View navigation helpers
  // ----------------------------------------------------
  const handleQuickPaymentForMember = (member: Member) => {
    setPreselectedPaymentMember(member);
    setActiveTab('payments');
  };

  const handleQuickRenewMember = (member: Member) => {
    setPreselectedPaymentMember(member);
    setActiveTab('payments');
  };

  const handleQuickAddMember = () => {
    setOpenAddMemberDirectly(true);
    setActiveTab('members');
  };

  // Page titles mapping
  const titles: Record<TabType, string> = {
    dashboard: 'ADMIN DASHBOARD',
    appointments: 'APPOINTMENTS & VISITS',
    members: 'MEMBERS DIRECTORY',
    plans: 'MEMBERSHIP TIERS',
    payments: 'FEE & RECEIPT ENGINE',
    expiry: 'EXPIRY MANAGEMENT',
    reports: 'ANALYTICS & REPORTS',
    activity: 'AUDIT ACTIVITY LOGS',
    admins: 'ADMINISTRATOR GOVERNANCE & ACCESS CONTROL',
    settings: 'GYM BRANDING & SETUP',
  };

  // Show loading spinner while checking auth
  if (authChecking) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-white">
        <RefreshCw className="w-8 h-8 text-red-500 animate-spin mb-4" />
        <p className="text-sm font-semibold tracking-wider uppercase font-display text-neutral-400">
          Loading MS Fitness Portal...
        </p>
      </div>
    );
  }

  // Not logged in -> Show Login View
  if (!adminEmail) {
    return (
      <>
        <LoginView
          onLoginSuccess={handleLoginSuccess}
          onOpenConfig={() => setIsConfigModalOpen(true)}
          onOpenSql={() => setIsSqlModalOpen(true)}
          onOpenBooking={() => setIsBookingModalOpen(true)}
        />
        <AppointmentBookingModal
          isOpen={isBookingModalOpen}
          onClose={() => setIsBookingModalOpen(false)}
          onAppointmentCreated={(newApt) => {
            setAppointments((prev) => [newApt, ...prev.filter((a) => a.id !== newApt.id)]);
          }}
          onOpenSqlSetup={() => {
            setIsBookingModalOpen(false);
            setIsSqlModalOpen(true);
          }}
        />
        <SupabaseConfigModal
          isOpen={isConfigModalOpen}
          onClose={() => setIsConfigModalOpen(false)}
          onSaved={() => {
            setIsConfigModalOpen(false);
            window.location.reload();
          }}
        />
        <SqlSetupModal
          isOpen={isSqlModalOpen}
          onClose={() => setIsSqlModalOpen(false)}
        />
      </>
    );
  }

  // Find member for viewing receipt modal
  const viewingReceiptMember = viewingReceipt
    ? members.find((m) => m.id === viewingReceipt.member_id || m.member_id === viewingReceipt.member_id || m.member_id === viewingReceipt.member_code)
    : undefined;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex font-sans antialiased selection:bg-red-600 selection:text-white">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        adminEmail={adminEmail}
        currentAdmin={currentAdmin || undefined}
        onLogout={handleLogout}
        isMobileOpen={isMobileSidebarOpen}
        setIsMobileOpen={setIsMobileSidebarOpen}
        onOpenSql={() => setIsSqlModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 md:pl-72 flex flex-col min-w-0">
        {/* Admin Header */}
        <Header
          title={titles[activeTab]}
          adminEmail={adminEmail}
          currentAdmin={currentAdmin || undefined}
          onLogout={handleLogout}
          onOpenConfig={() => setIsConfigModalOpen(true)}
          onOpenSql={() => setIsSqlModalOpen(true)}
          isSchemaPending={isSchemaPending}
          onOpenAddMember={handleQuickAddMember}
          onOpenPayment={() => {
            setPreselectedPaymentMember(null);
            setActiveTab('payments');
          }}
          onOpenBooking={() => setIsBookingModalOpen(true)}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />

        {/* Informative Banner when Supabase schema tables haven't been run yet */}
        {isSchemaPending && (
          <div className="bg-amber-950/40 border-b border-amber-800/60 px-4 md:px-8 py-2.5 text-xs text-amber-200 flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-300">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Supabase Database Tables Pending:</strong> Your database tables (appointments, members, payments) have not been created yet in your Supabase project (<strong>{DEFAULT_SUPABASE_PROJECT_ID}</strong>). The app is operating safely in local storage fallback mode.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsSqlModalOpen(true)}
                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Database className="w-3.5 h-3.5" /> Run SQL Setup Script
              </button>
              <button
                onClick={() => loadGymData()}
                className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors"
              >
                Check Again
              </button>
            </div>
          </div>
        )}

        {/* View Component Switcher */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
          {activeTab === 'dashboard' && (
            <DashboardView
              members={members}
              payments={payments}
              plans={plans}
              onNavigate={(tab) => setActiveTab(tab as TabType)}
              onAddMemberClick={handleQuickAddMember}
              onPaymentClick={() => {
                setPreselectedPaymentMember(null);
                setActiveTab('payments');
              }}
              onViewReceipt={(p) => setViewingReceipt(p)}
              onViewMember={handleOpenMemberProfile}
            />
          )}

          {activeTab === 'appointments' && (
            <AppointmentsView
              appointments={appointments}
              onRefresh={async () => {
                const refreshed = await getAppointments();
                setAppointments(refreshed);
              }}
              onOpenBookingModal={() => setIsBookingModalOpen(true)}
              onOpenAddMemberWithData={(lead) => {
                setLeadDataForMember(lead);
                setActiveTab('members');
              }}
              adminEmail={adminEmail}
              onOpenSqlSetup={() => setIsSqlModalOpen(true)}
            />
          )}

          {activeTab === 'members' && (
            <MembersView
              members={members}
              plans={plans}
              payments={payments}
              adminEmail={adminEmail}
              currentAdmin={currentAdmin || undefined}
              onAddMember={handleAddMember}
              onUpdateMember={handleUpdateMember}
              onDeleteMember={handleDeleteMember}
              onOpenPaymentForMember={handleQuickPaymentForMember}
              onViewReceipt={(p) => setViewingReceipt(p)}
              initialOpenAdd={openAddMemberDirectly}
              initialMemberData={leadDataForMember}
              onClearInitialMemberData={() => setLeadDataForMember(null)}
              onOpenMemberProfile={handleOpenMemberProfile}
            />
          )}

          {activeTab === 'plans' && (
            <PlansView
              plans={plans}
              currentAdmin={currentAdmin || undefined}
              onAddPlan={handleAddPlan}
              onUpdatePlan={handleUpdatePlan}
              onDeletePlan={handleDeletePlan}
            />
          )}

          {activeTab === 'payments' && (
            <PaymentsView
              members={members}
              plans={plans}
              payments={payments}
              settings={settings}
              adminEmail={adminEmail}
              currentAdmin={currentAdmin || undefined}
              onRecordPayment={handleRecordPayment}
              onViewReceipt={(p) => setViewingReceipt(p)}
              preselectedMember={preselectedPaymentMember}
              onClearPreselectedMember={() => setPreselectedPaymentMember(null)}
              onOpenMemberProfile={handleOpenMemberProfile}
            />
          )}

          {activeTab === 'expiry' && (
            <ExpiryView
              members={members}
              plans={plans}
              onRenewMember={handleQuickRenewMember}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView
              members={members}
              payments={payments}
              settings={settings}
              currentAdmin={currentAdmin || undefined}
            />
          )}

          {activeTab === 'activity' && (
            <ActivityLogsView
              logs={activityLogs}
              onOpenMemberProfile={handleOpenMemberProfile}
            />
          )}

          {activeTab === 'admins' && (
            currentAdmin && (isSuperAdmin(currentAdmin) || hasPermission(currentAdmin, 'admins.view')) ? (
              <AdminManagementView
                currentAdmin={currentAdmin}
                admins={admins}
                activityLogs={activityLogs}
                onAddAdmin={handleAddAdmin}
                onUpdateAdmin={handleUpdateAdmin}
                onDeleteAdmin={handleDeleteAdmin}
                onOpenMemberProfile={handleOpenMemberProfile}
              />
            ) : (
              <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-12 text-center max-w-lg mx-auto my-12 shadow-2xl">
                <div className="w-16 h-16 rounded-2xl bg-red-950/60 border border-red-800/40 text-red-500 flex items-center justify-center mx-auto mb-5">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Restricted Security Section</h3>
                <p className="text-sm text-neutral-400 mb-6 leading-relaxed">
                  Access to Administrator Governance and Access Control is reserved exclusively for the Super Administrator.
                </p>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-2xl text-xs transition-all shadow-lg shadow-red-600/20"
                >
                  Return to Dashboard
                </button>
              </div>
            )
          )}

          {activeTab === 'settings' && (
            <SettingsView
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              onOpenConfig={() => setIsConfigModalOpen(true)}
              onOpenSql={() => setIsSqlModalOpen(true)}
              adminEmail={adminEmail}
              currentAdmin={currentAdmin || undefined}
            />
          )}
        </main>
      </div>

      {/* MODAL: VIEW & PRINT RECEIPT */}
      {viewingReceipt && (
        <ReceiptModal
          isOpen={true}
          payment={viewingReceipt}
          member={viewingReceiptMember}
          plans={plans}
          settings={settings}
          adminEmail={adminEmail}
          onClose={() => setViewingReceipt(null)}
          onOpenMemberProfile={handleOpenMemberProfile}
        />
      )}

      {/* MODAL: COMPLETE MEMBER PROFILE */}
      {viewingProfileMember && (
        <MemberProfileModal
          isOpen={true}
          onClose={() => setViewingProfileMember(null)}
          member={viewingProfileMember}
          plans={plans}
          payments={payments}
          settings={settings}
          adminEmail={adminEmail || ''}
          onViewReceipt={(p) => {
            setViewingProfileMember(null);
            setViewingReceipt(p);
          }}
          onRecordPayment={(m) => {
            setViewingProfileMember(null);
            setPreselectedPaymentMember(m);
            setActiveTab('payments');
          }}
          onEditMember={(m) => {
            setViewingProfileMember(null);
            setActiveTab('members');
          }}
        />
      )}

      {/* MODAL: SUPABASE CONFIGURATION */}
      <SupabaseConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        onSaved={() => {
          setIsConfigModalOpen(false);
          loadGymData();
        }}
      />

      {/* MODAL: AUTHORITATIVE SQL SETUP SCRIPT */}
      <SqlSetupModal
        isOpen={isSqlModalOpen}
        onClose={() => setIsSqlModalOpen(false)}
      />

      {/* MODAL: APPOINTMENT BOOKING FORM */}
      <AppointmentBookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        onAppointmentCreated={async (newApt) => {
          setAppointments((prev) => [newApt, ...prev.filter((a) => a.id !== newApt.id)]);
          const refreshed = await getAppointments();
          setAppointments(refreshed);
        }}
        adminEmail={adminEmail}
        onOpenSqlSetup={() => {
          setIsBookingModalOpen(false);
          setIsSqlModalOpen(true);
        }}
      />
    </div>
  );
}
