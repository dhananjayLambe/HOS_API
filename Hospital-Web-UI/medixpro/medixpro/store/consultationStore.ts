"use client";

import { create } from "zustand";
import type {
  ConsultationState,
  ConsultationSymptom,
  ConsultationMedicine,
  SymptomDetail,
  ConsultationVitals,
  ConsultationSectionType,
  ConsultationSectionItem,
  SectionItemDetail,
} from "@/lib/consultation-types";
import { DEFAULT_CONSULTATION_STATE } from "@/lib/consultation-types";

type DraftStatus = {
  savedAt: Date | null;
  message: string | null;
};

/** Selected item for right-side detail panel (any section). */
export type SelectedDetailPayload = {
  section: ConsultationSectionType;
  itemId: string;
} | null;

type ConsultationStore = ConsultationState & {
  draftStatus: DraftStatus;
  selectedSymptomId: string | null;
  /** Reusable section pattern: items per section (local, backend-agnostic). */
  sectionItems: Record<ConsultationSectionType, ConsultationSectionItem[]>;
  selectedDetail: SelectedDetailPayload;
  setSymptoms: (symptoms: ConsultationSymptom[]) => void;
  addSymptom: (symptom: ConsultationSymptom) => void;
  removeSymptom: (id: string) => void;
  updateSymptomDetail: (id: string, detail: Partial<SymptomDetail>) => void;
  setFindings: (value: string) => void;
  setDiagnosis: (value: string) => void;
  setMedicines: (medicines: ConsultationMedicine[]) => void;
  addMedicine: (medicine: Omit<ConsultationMedicine, "id">) => void;
  updateMedicine: (id: string, patch: Partial<ConsultationMedicine>) => void;
  removeMedicine: (id: string) => void;
  setInvestigations: (value: string) => void;
  setInstructions: (value: string) => void;
  setProcedures: (value: string) => void;
  setDraftStatus: (status: DraftStatus) => void;
  setSelectedSymptomId: (id: string | null) => void;
  setMedicalHistory: (value: string) => void;
  setVitals: (vitals: Partial<ConsultationVitals>) => void;
  setPrescriptionNotes: (value: string) => void;
  setDoctorNotes: (value: string) => void;
  reset: () => void;
  // Section items (reusable pattern)
  getSectionItems: (section: ConsultationSectionType) => ConsultationSectionItem[];
  addSectionItem: (section: ConsultationSectionType, item: ConsultationSectionItem) => void;
  removeSectionItem: (section: ConsultationSectionType, id: string) => void;
  updateSectionItemDetail: (
    section: ConsultationSectionType,
    id: string,
    detail: Partial<SectionItemDetail>
  ) => void;
  setSelectedDetail: (payload: SelectedDetailPayload) => void;
};

const SECTION_TYPES: ConsultationSectionType[] = [
  "symptoms",
  "findings",
  "diagnosis",
  "medicines",
  "investigations",
  "instructions",
];

const emptySectionItems = () =>
  SECTION_TYPES.reduce(
    (acc, t) => {
      acc[t] = [];
      return acc;
    },
    {} as Record<ConsultationSectionType, ConsultationSectionItem[]>
  );

export const useConsultationStore = create<ConsultationStore>((set, get) => ({
  ...DEFAULT_CONSULTATION_STATE,
  draftStatus: { savedAt: null, message: null },
  selectedSymptomId: null,
  sectionItems: emptySectionItems(),
  selectedDetail: null,

  setSymptoms: (symptoms) => set({ symptoms }),
  addSymptom: (symptom) =>
    set((s) => ({ symptoms: [...s.symptoms, symptom] })),
  removeSymptom: (id) =>
    set((s) => ({
      symptoms: s.symptoms.filter((x) => x.id !== id),
      selectedSymptomId: s.selectedSymptomId === id ? null : s.selectedSymptomId,
    })),
  updateSymptomDetail: (id, detail) =>
    set((s) => ({
      symptoms: s.symptoms.map((x) =>
        x.id === id
          ? { ...x, detail: { ...(x.detail ?? {}), ...detail } }
          : x
      ),
    })),

  setFindings: (value) => set({ findings: value }),
  setDiagnosis: (value) => set({ diagnosis: value }),

  setMedicines: (medicines) => set({ medicines }),
  addMedicine: (medicine) =>
    set((s) => ({
      medicines: [
        ...s.medicines,
        { ...medicine, id: `med-${Date.now()}-${Math.random().toString(36).slice(2)}` },
      ],
    })),
  updateMedicine: (id, patch) =>
    set((s) => ({
      medicines: s.medicines.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    })),
  removeMedicine: (id) =>
    set((s) => ({ medicines: s.medicines.filter((m) => m.id !== id) })),

  setInvestigations: (value) => set({ investigations: value }),
  setInstructions: (value) => set({ instructions: value }),
  setProcedures: (value) => set({ procedures: value }),

  setDraftStatus: (draftStatus) => set({ draftStatus }),
  setSelectedSymptomId: (selectedSymptomId) => set({ selectedSymptomId }),
  setMedicalHistory: (medicalHistory) => set({ medicalHistory }),
  setVitals: (patch) =>
    set((s) => ({ vitals: { ...s.vitals, ...patch } })),
  setPrescriptionNotes: (prescriptionNotes) => set({ prescriptionNotes }),
  setDoctorNotes: (doctorNotes) => set({ doctorNotes }),

  getSectionItems: (section) => get().sectionItems[section] ?? [],
  addSectionItem: (section, item) =>
    set((s) => {
      const current = s.sectionItems[section] ?? [];
      if (current.some((i) => i.id === item.id)) return s;
      return {
        sectionItems: {
          ...s.sectionItems,
          [section]: [...current, item],
        },
      };
    }),
  removeSectionItem: (section, id) =>
    set((s) => {
      const next = (s.sectionItems[section] ?? []).filter((i) => i.id !== id);
      const selectedDetail =
        s.selectedDetail?.section === section && s.selectedDetail?.itemId === id
          ? null
          : s.selectedDetail;
      return {
        sectionItems: { ...s.sectionItems, [section]: next },
        selectedDetail,
      };
    }),
  updateSectionItemDetail: (section, id, detail) =>
    set((s) => ({
      sectionItems: {
        ...s.sectionItems,
        [section]: (s.sectionItems[section] ?? []).map((i) =>
          i.id === id
            ? { ...i, detail: { ...(i.detail ?? {}), ...detail } }
            : i
        ),
      },
    })),
  setSelectedDetail: (payload) => set({ selectedDetail: payload }),

  reset: () =>
    set({
      ...DEFAULT_CONSULTATION_STATE,
      draftStatus: { savedAt: null, message: null },
      selectedSymptomId: null,
      sectionItems: emptySectionItems(),
      selectedDetail: null,
    }),
}));
