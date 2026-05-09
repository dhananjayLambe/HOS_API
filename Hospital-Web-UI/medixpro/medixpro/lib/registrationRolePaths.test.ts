import { describe, it, expect } from "vitest"
import { REGISTRATION_ROLE_PATHS } from "./registrationRolePaths"

describe("registration role paths", () => {
  it("uses root-relative paths with trailing slash (matches next trailingSlash: true)", () => {
    for (const p of Object.values(REGISTRATION_ROLE_PATHS)) {
      expect(p.startsWith("/")).toBe(true)
      expect(p.endsWith("/")).toBe(true)
      expect(p).not.toContain("/register/register/")
    }
  })

  it("documents why relative register/... from hub URL is wrong", () => {
    const hub = "https://example.com/auth/register/"
    const wronglyResolved = new URL("register/clinic-registration", hub).pathname
    expect(wronglyResolved).toBe("/auth/register/register/clinic-registration")
    expect(new URL(REGISTRATION_ROLE_PATHS.clinic, hub).pathname).toBe(
      "/auth/register/clinic-registration/"
    )
  })
})
