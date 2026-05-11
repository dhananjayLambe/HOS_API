/** Human-readable labels for `lab_user.role` (LabUserRole). */

const OPERATIONAL_ROLE_LABELS: Record<string, string> = {
  ADMIN: "Lab administrator",
  MANAGER: "Lab manager",
  RECEPTIONIST: "Receptionist",
  TECHNICIAN: "Technician",
  PATHOLOGIST: "Pathologist",
  RADIOLOGIST: "Radiologist",
  PHLEBOTOMIST: "Phlebotomist",
  ACCOUNTANT: "Accountant",
};

export function labOperationalRoleLabel(role: string | null | undefined): string {
  if (!role) return "—";
  const upper = role.trim().toUpperCase();
  if (OPERATIONAL_ROLE_LABELS[upper]) return OPERATIONAL_ROLE_LABELS[upper];
  return upper
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
