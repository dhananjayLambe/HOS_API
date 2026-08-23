import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { authState, nav } = vi.hoisted(() => ({
  authState: {
    sessionChecked: true,
    isAuthenticated: false,
    role: null as string | null,
  },
  nav: {
    pathname: "/consultations/pre-consultation",
    replace: vi.fn(),
  },
}));

vi.mock("@/lib/authContext", () => ({
  useAuth: () => authState,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: nav.replace }),
  usePathname: () => nav.pathname,
}));

import { DashboardRoleGate } from "./DashboardRoleGate";

describe("DashboardRoleGate", () => {
  beforeEach(() => {
    authState.sessionChecked = true;
    authState.isAuthenticated = false;
    authState.role = null;
    nav.pathname = "/consultations/pre-consultation";
    nav.replace.mockClear();
  });

  it("redirects unauthenticated users away from consultation URLs and does not render children", () => {
    render(
      createElement(DashboardRoleGate, null, createElement("div", null, "consultation-page")),
    );

    expect(nav.replace).toHaveBeenCalledWith("/auth/login");
    expect(screen.queryByText("consultation-page")).not.toBeInTheDocument();
  });

  it("redirects unauthenticated users away from /doctor-dashboard", () => {
    nav.pathname = "/doctor-dashboard";

    render(
      createElement(DashboardRoleGate, null, createElement("div", null, "doctor-dashboard")),
    );

    expect(nav.replace).toHaveBeenCalledWith("/auth/login");
    expect(screen.queryByText("doctor-dashboard")).not.toBeInTheDocument();
  });

  it("renders children when the session is authenticated", () => {
    authState.isAuthenticated = true;
    authState.role = "doctor";

    render(
      createElement(DashboardRoleGate, null, createElement("div", null, "consultation-page")),
    );

    expect(nav.replace).not.toHaveBeenCalled();
    expect(screen.getByText("consultation-page")).toBeInTheDocument();
  });

  it("shows a loading placeholder until session check finishes", () => {
    authState.sessionChecked = false;

    render(
      createElement(DashboardRoleGate, null, createElement("div", null, "consultation-page")),
    );

    expect(nav.replace).not.toHaveBeenCalled();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(screen.queryByText("consultation-page")).not.toBeInTheDocument();
  });
});
