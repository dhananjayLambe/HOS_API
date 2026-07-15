/** Mirrors GET /api/labs/me/ (Django labs.api.serializers.lab_session_serializer). */

export type LabSessionUser = {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  profile_picture: string;
};

export type LabSessionLabUser = {
  id: string;
  role: string;
  employee_code: string;
  is_primary_admin: boolean;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
};

export type LabSessionOrganization = {
  id: string;
  organization_name: string;
  display_name: string;
  organization_code: string;
  slug: string;
  lab_type: string;
  logo: string;
  registration_number: string;
  license_number: string;
  pan_number: string;
  gst_number: string;
  owner_name: string;
  owner_designation: string;
  primary_contact_number: string;
  alternate_contact_number: string;
  support_email: string;
  website: string;
  registration_status: string;
  is_verified: boolean;
  rejection_reason: string;
  approved_at: string | null;
  home_collection_available: boolean;
  walk_in_collection_available: boolean;
  accepts_online_orders: boolean;
  is_active_for_orders: boolean;
  onboarding_completed: boolean;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
};

export type LabSessionBranch = {
  id: string;
  branch_name: string;
  branch_code: string;
  address_line_1: string;
  address_line_2: string;
  landmark: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  latitude: string;
  longitude: string;
  opening_time: string;
  closing_time: string;
  home_collection_radius_km: number;
  home_collection_available: boolean;
  walk_in_collection_available: boolean;
  accepts_online_orders: boolean;
  emergency_collection_available: boolean;
  report_delivery_hours: number;
  is_active_for_orders: boolean;
  is_primary_branch: boolean;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
};

export type LabSessionPermissions = {
  can_access_dashboard?: boolean;
  can_upload_reports: boolean;
  can_manage_orders?: boolean;
  can_assign_collections: boolean;
};

export type LabSession = {
  profile_complete?: boolean;
  onboarding_complete?: boolean;
  registration_status?: string;
  operational_access?: boolean;
  approval_required?: boolean;
  user: LabSessionUser;
  lab_user: LabSessionLabUser;
  organization: LabSessionOrganization;
  branch: LabSessionBranch;
  permissions: LabSessionPermissions;
};

/** True when session allows operational API calls (orders, reports, etc.). */
export function sessionHasOperationalAccess(session: LabSession | undefined | null): boolean {
  if (!session) return false;
  if (typeof session.operational_access === "boolean") return session.operational_access;
  if (typeof session.permissions?.can_access_dashboard === "boolean") {
    return session.permissions.can_access_dashboard;
  }
  return session.organization?.registration_status === "APPROVED";
}
