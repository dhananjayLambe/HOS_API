/**
 * Root-relative registration URLs with trailing slashes.
 * next.config.mjs sets `trailingSlash: true`; relative `register/...` from `/auth/register/`
 * resolves to `/auth/register/register/...` and 404s.
 */
export const REGISTRATION_ROLE_PATHS = {
  clinic: "/auth/register/clinic-registration/",
  doctor: "/auth/register/doctor-registration/",
  lab: "/auth/register/lab-registration/",
} as const
