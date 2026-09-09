export interface Member {
  id: string;
  member_id: string; // e.g. MS-0001
  name: string;
  mobile: string;
  email: string;
  dob?: string;
  gender: 'male' | 'female' | 'other' | '';
  address?: string;
  join_date: string;
  plan_id?: string;
  plan_amount: number;
  discount: number;
  emergency_contact?: string;
  notes?: string;
  membership_start: string;
  membership_expiry: string;
  status: 'active' | 'expired' | 'inactive';
  created_at?: string;
  updated_at?: string;
  // Computed or cached financial stats for the member
  remaining_balance?: number;
}

export interface MembershipPlan {
  id: string;
  name: string;
  duration_months: number;
  price: number;
  discount: number;
  description: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Payment {
  id: string;
  payment_id: string; // e.g. MSF-FEE-260905-0001
  receipt_number?: string; // e.g. MSF-RCPT-260905-001
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
  created_at?: string;
  // Joined member details for display
  member_name?: string;
  member_code?: string;
  member_mobile?: string;
  member_email?: string;
  membership_start?: string;
  membership_expiry?: string;
  join_date?: string;
  plan_name?: string;
  admin_email?: string;
}

export interface GymSettings {
  id?: string;
  gym_name: string;
  tagline: string;
  phone: string;
  email: string;
  address: string;
  upi_id: string;
  logo_url: string;
  created_at?: string;
  updated_at?: string;
}

export interface ActivityLog {
  id: string;
  admin_id?: string;
  admin_name?: string;
  admin_email: string;
  role?: string;
  action: string;
  module?: string;
  description: string;
  target_type?: string;
  target_id?: string;
  ip_address?: string;
  status?: 'success' | 'failed' | 'warning';
  timestamp: string;
}

export type AdminRole = 'super_admin' | 'admin' | 'staff';
export type AdminStatus = 'active' | 'inactive';

export type PermissionKey =
  | 'dashboard.view'
  | 'members.view'
  | 'members.create'
  | 'members.edit'
  | 'members.delete'
  | 'members.view_profile'
  | 'payments.view'
  | 'payments.create'
  | 'payments.edit'
  | 'payments.delete'
  | 'receipts.view'
  | 'receipts.download'
  | 'receipts.email'
  | 'plans.view'
  | 'plans.create'
  | 'plans.edit'
  | 'plans.delete'
  | 'gallery.view'
  | 'gallery.manage'
  | 'announcements.view'
  | 'announcements.manage'
  | 'admins.view'
  | 'admins.create'
  | 'admins.edit'
  | 'admins.delete'
  | 'roles.view'
  | 'roles.manage'
  | 'activity_logs.view'
  | 'reports.view'
  | 'reports.export'
  | 'settings.view'
  | 'settings.manage'
  | 'appointments.view'
  | 'appointments.manage';

export interface AdminAccount {
  id: string;
  admin_id: string; // e.g. ADM-0001
  full_name: string;
  email: string;
  role: AdminRole;
  status: AdminStatus;
  permissions: PermissionKey[];
  last_login?: string;
  created_at?: string;
  updated_at?: string;
}

export const ALL_PERMISSIONS: { key: PermissionKey; label: string; module: string; description: string }[] = [
  { key: 'dashboard.view', label: 'View Dashboard', module: 'Dashboard', description: 'Access main statistics and key performance cards' },
  { key: 'members.view', label: 'View Members', module: 'Members', description: 'Browse and search registered gym members' },
  { key: 'members.view_profile', label: 'View Member Profile', module: 'Members', description: 'Inspect full profile, contact info, and payment ledger' },
  { key: 'members.create', label: 'Add Members', module: 'Members', description: 'Register new gym members into the system' },
  { key: 'members.edit', label: 'Edit Members', module: 'Members', description: 'Update member info, plans, and contact details' },
  { key: 'members.delete', label: 'Delete Members', module: 'Members', description: 'Permanently remove member records' },
  { key: 'payments.view', label: 'View Payments', module: 'Payments', description: 'Access payment records and ledger history' },
  { key: 'payments.create', label: 'Record Payments', module: 'Payments', description: 'Accept cash/UPI payments and generate receipts' },
  { key: 'payments.edit', label: 'Edit Payments', module: 'Payments', description: 'Update existing fee entries' },
  { key: 'payments.delete', label: 'Delete Payments', module: 'Payments', description: 'Delete payment transactions' },
  { key: 'receipts.view', label: 'View Receipts', module: 'Receipts', description: 'Preview official receipts on screen' },
  { key: 'receipts.download', label: 'Download PDF', module: 'Receipts', description: 'Export printable PDF receipts' },
  { key: 'receipts.email', label: 'Send Receipt Email', module: 'Receipts', description: 'Dispatch receipts directly to athletes via SMTP' },
  { key: 'plans.view', label: 'View Plans', module: 'Plans', description: 'Browse available membership plans' },
  { key: 'plans.create', label: 'Add Plans', module: 'Plans', description: 'Create new gym packages and pricing' },
  { key: 'plans.edit', label: 'Edit Plans', module: 'Plans', description: 'Modify pricing, discounts, and duration' },
  { key: 'plans.delete', label: 'Delete Plans', module: 'Plans', description: 'Remove inactive membership plans' },
  { key: 'appointments.view', label: 'View Appointments', module: 'Appointments', description: 'Browse booking submissions and visits' },
  { key: 'appointments.manage', label: 'Manage Appointments', module: 'Appointments', description: 'Update status or remove appointments' },
  { key: 'activity_logs.view', label: 'View Activity Logs', module: 'Audit', description: 'View system and admin audit trail' },
  { key: 'reports.view', label: 'View Reports', module: 'Reports', description: 'Access revenue and membership reporting' },
  { key: 'reports.export', label: 'Export Reports', module: 'Reports', description: 'Download CSV and PDF financial reports' },
  { key: 'admins.view', label: 'View Admins', module: 'Admin Management', description: 'See registered admin accounts and status' },
  { key: 'admins.create', label: 'Add Admins', module: 'Admin Management', description: 'Create new admin or staff accounts' },
  { key: 'admins.edit', label: 'Edit Admins', module: 'Admin Management', description: 'Modify admin details and active status' },
  { key: 'admins.delete', label: 'Delete Admins', module: 'Admin Management', description: 'Remove admin accounts from system' },
  { key: 'roles.view', label: 'View Roles', module: 'Roles & Permissions', description: 'Inspect role permission structures' },
  { key: 'roles.manage', label: 'Configure Permissions', module: 'Roles & Permissions', description: 'Customize granular permissions per user' },
  { key: 'settings.view', label: 'View Settings', module: 'Settings', description: 'See gym branding, UPI, and address details' },
  { key: 'settings.manage', label: 'Update Settings', module: 'Settings', description: 'Update branding, logo, UPI ID, and contact details' },
];

export const DEFAULT_ROLE_PERMISSIONS: Record<AdminRole, PermissionKey[]> = {
  super_admin: ALL_PERMISSIONS.map((p) => p.key),
  admin: [
    'dashboard.view',
    'members.view',
    'members.view_profile',
    'members.create',
    'members.edit',
    'members.delete',
    'payments.view',
    'payments.create',
    'payments.edit',
    'payments.delete',
    'receipts.view',
    'receipts.download',
    'receipts.email',
    'plans.view',
    'plans.create',
    'plans.edit',
    'plans.delete',
    'appointments.view',
    'appointments.manage',
    'activity_logs.view',
    'reports.view',
    'reports.export',
    'settings.view',
  ],
  staff: [
    'dashboard.view',
    'members.view',
    'members.view_profile',
    'members.create',
    'payments.view',
    'payments.create',
    'receipts.view',
    'receipts.download',
    'receipts.email',
    'appointments.view',
    'plans.view',
  ],
};

export interface DashboardStats {
  totalMembers: number;
  activeMembers: number;
  expiredMembers: number;
  expiringSoon: number; // expiring within 30 days
  totalPaymentsCount: number;
  todayCollection: number;
  thisMonthCollection: number;
  totalOutstandingBalance: number;
}

export type AppointmentServiceType =
  | 'free_trial'
  | 'gym_tour'
  | 'personal_training'
  | 'nutrition_consultation'
  | 'membership_inquiry'
  | 'general';

export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface Appointment {
  id: string;
  appointment_code: string; // e.g. MSF-APT-260905-001
  name: string;
  mobile: string;
  email?: string;
  service_type: AppointmentServiceType;
  appointment_date: string; // YYYY-MM-DD
  time_slot: string;
  fitness_goal?: string;
  notes?: string;
  status: AppointmentStatus;
  created_at?: string;
  updated_at?: string;
}
