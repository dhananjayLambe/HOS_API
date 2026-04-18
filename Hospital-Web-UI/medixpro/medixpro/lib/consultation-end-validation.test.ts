import type { ConsultationWorkflowType } from "@/lib/consultation-types";
import {
  formatEndConsultationErrorToast,
  getFirstSectionErrorKey,
  validateConsultationForEnd,
  validateMedicineLinesInPayload,
  type EndConsultationPayloadLike,
} from "@/lib/consultation-end-validation";

type StoreArg = Parameters<typeof validateConsultationForEnd>[0];

function emptyItems() {
  return {
    symptoms: [],
    findings: [],
    diagnosis: [],
    medicines: [],
    investigations: [],
    instructions: [],
    follow_up: [],
  };
}

function makeStore(
  overrides: Partial<StoreArg> & { consultationType?: ConsultationWorkflowType }
): StoreArg {
  const sectionItems = { ...emptyItems(), ...(overrides.sectionItems ?? {}) };
  return {
    symptoms: [],
    vitals: {},
    vitalsLoaded: true,
    consultationType: "FULL",
    ...overrides,
    sectionItems,
  } as StoreArg;
}

function emptyPayload(): EndConsultationPayloadLike {
  return { store: { sectionItems: { medicines: [] } } };
}

describe("validateMedicineLinesInPayload", () => {
  it("returns null for empty medicines", () => {
    expect(validateMedicineLinesInPayload({ store: { sectionItems: { medicines: [] } } })).toBeNull();
  });

  it("returns error when dose missing", () => {
    const msg = validateMedicineLinesInPayload({
      store: {
        sectionItems: {
          medicines: [
            {
              label: "Paracetamol",
              detail: {
                medicine: {
                  name: "Paracetamol",
                  dose_unit_id: "tablet",
                  route_id: "oral",
                  frequency_id: "BD",
                  duration_value: 3,
                  duration_unit: "days",
                },
              },
            },
          ],
        },
      },
    });
    expect(msg).toContain("dose");
  });
});

describe("validateConsultationForEnd", () => {
  it("FULL requires symptoms, diagnosis, medicines", () => {
    const store = makeStore({ consultationType: "FULL" });
    const { errors } = validateConsultationForEnd(store, emptyPayload(), "FULL");
    expect(errors.symptoms).toBeDefined();
    expect(errors.diagnosis).toBeDefined();
    expect(errors.medicines).toBeDefined();
  });

  it("FULL passes when sections populated and medicines valid in payload", () => {
    const store = makeStore({
      consultationType: "FULL",
      sectionItems: {
        ...emptyItems(),
        symptoms: [{ id: "1", label: "Headache", name: "Headache" } as any],
        diagnosis: [{ id: "d1", label: "X", diagnosisKey: "k" } as any],
        medicines: [{ id: "m1", label: "Med", detail: {} } as any],
      },
      symptoms: [{ id: "1", name: "Headache" }],
    });
    const payload: EndConsultationPayloadLike = {
      store: {
        sectionItems: {
          medicines: [
            {
              detail: {
                medicine: {
                  name: "Med",
                  dose_value: 1,
                  dose_unit_id: "tablet",
                  route_id: "oral",
                  frequency_id: "BD",
                  duration_value: 3,
                  duration_unit: "days",
                },
              },
            },
          ],
        },
      },
    };
    const { errors } = validateConsultationForEnd(store, payload, "FULL");
    expect(Object.keys(errors)).toHaveLength(0);
  });

  it("QUICK_RX requires medicines only", () => {
    const store = makeStore({ consultationType: "QUICK_RX" });
    const { errors } = validateConsultationForEnd(store, emptyPayload(), "QUICK_RX");
    expect(errors.medicines).toMatch(/medicine/i);
    expect(errors.symptoms).toBeUndefined();
    expect(errors.diagnosis).toBeUndefined();
  });

  it("TEST_ONLY requires investigations", () => {
    const store = makeStore({ consultationType: "TEST_ONLY" });
    const { errors } = validateConsultationForEnd(store, emptyPayload(), "TEST_ONLY");
    expect(errors.investigations).toBeDefined();
  });

  it("getFirstSectionErrorKey follows order", () => {
    const first = getFirstSectionErrorKey({
      diagnosis: "x",
      symptoms: "y",
    });
    expect(first).toBe("symptoms");
  });

  it("formatEndConsultationErrorToast lists labels", () => {
    const t = formatEndConsultationErrorToast({ medicines: "bad", diagnosis: "bad" });
    expect(t).toContain("Diagnosis");
    expect(t).toContain("Medicines");
  });
});
