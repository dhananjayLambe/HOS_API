import { afterEach, describe, expect, it, vi } from "vitest";

import axiosClient from "@/lib/axiosClient";
import { loadStaffClinicSelection } from "@/lib/doctorClinicsClient";
import {
  clearDoctorContextCache,
  resolveDoctorContext,
} from "./resolveDoctorContext";

vi.mock("@/lib/axiosClient", () => ({
  default: {
    get: vi.fn(),
  },
}));

vi.mock("@/lib/doctorClinicsClient", () => ({
  loadStaffClinicSelection: vi.fn(),
}));

describe("resolveDoctorContext", () => {
  afterEach(() => {
    clearDoctorContextCache();
    vi.clearAllMocks();
  });

  it("coalesces concurrent callers into a single profile fetch", async () => {
    vi.mocked(axiosClient.get).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              data: {
                doctor_profile: { personal_info: { id: "doc-1" } },
              },
            });
          }, 20);
        }) as never
    );
    vi.mocked(loadStaffClinicSelection).mockResolvedValue({ clinicId: "clinic-1" } as never);

    const [a, b] = await Promise.all([resolveDoctorContext(), resolveDoctorContext()]);

    expect(a).toEqual(b);
    expect(a.isReady).toBe(true);
    expect(a.doctorId).toBe("doc-1");
    expect(a.clinicId).toBe("clinic-1");
    expect(axiosClient.get).toHaveBeenCalledTimes(1);
    expect(loadStaffClinicSelection).toHaveBeenCalledTimes(1);
  });

  it("reuses short-lived cache for subsequent callers", async () => {
    vi.mocked(axiosClient.get).mockResolvedValue({
      data: { doctor_profile: { personal_info: { id: "doc-2" } } },
    } as never);
    vi.mocked(loadStaffClinicSelection).mockResolvedValue({ clinicId: "clinic-2" } as never);

    await resolveDoctorContext();
    await resolveDoctorContext();

    expect(axiosClient.get).toHaveBeenCalledTimes(1);
    expect(loadStaffClinicSelection).toHaveBeenCalledTimes(1);
  });
});
