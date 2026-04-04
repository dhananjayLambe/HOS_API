import { useConsultationStore } from "@/store/consultationStore";
import type { ConsultationTabSectionKey } from "@/lib/consultation-chip-ux";
import type {
  ConsultationSectionItem,
  ConsultationSymptom,
  DraftConsultationFinding,
} from "@/lib/consultation-types";

const STORAGE_PREFIX = "medixpro-consultation-autosave:";
const DEBOUNCE_MS = 800;
const SAVED_BADGE_MS = 2200;

export type ConsultationAutosavePayloadV1 = {
  v: 1;
  savedAt: string;
  encounterId: string;
  symptoms: ConsultationSymptom[];
  draftFindings: DraftConsultationFinding[];
  diagnosisItems: ConsultationSectionItem[];
  medicinesItems: ConsultationSectionItem[];
};

type AutosaveListener = (state: ConsultationAutosaveUIState) => void;

export type ConsultationAutosaveUIState =
  | { phase: "idle" }
  | { phase: "saving" }
  | { phase: "saved"; at: number };

let uiState: ConsultationAutosaveUIState = { phase: "idle" };
const listeners = new Set<AutosaveListener>();

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let savedHideTimer: ReturnType<typeof setTimeout> | null = null;

function emit() {
  for (const cb of listeners) cb(uiState);
}

function setUi(next: ConsultationAutosaveUIState) {
  uiState = next;
  emit();
}

export function getConsultationAutosaveUISnapshot(): ConsultationAutosaveUIState {
  return uiState;
}

export function subscribeConsultationAutosaveUI(cb: AutosaveListener): () => void {
  listeners.add(cb);
  cb(uiState);
  return () => {
    listeners.delete(cb);
  };
}

function storageKey(encounterId: string) {
  return `${STORAGE_PREFIX}${encounterId}`;
}

function pickAutosaveSlice(state: ReturnType<typeof useConsultationStore.getState>) {
  return {
    symptoms: state.symptoms,
    draftFindings: state.draftFindings,
    diagnosis: state.sectionItems.diagnosis,
    medicines: state.sectionItems.medicines,
  };
}

function stableStringify(slice: ReturnType<typeof pickAutosaveSlice>) {
  return JSON.stringify(slice);
}

export function buildConsultationAutosavePayload(
  encounterId: string
): ConsultationAutosavePayloadV1 {
  const s = useConsultationStore.getState();
  return {
    v: 1,
    savedAt: new Date().toISOString(),
    encounterId,
    symptoms: s.symptoms,
    draftFindings: s.draftFindings,
    diagnosisItems: s.sectionItems.diagnosis ?? [],
    medicinesItems: s.sectionItems.medicines ?? [],
  };
}

function clearDebounce() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
}

/**
 * Debounced snapshot to localStorage (recovery if the tab crashes).
 * Server persistence for in-progress consult is submitted on End Consultation today.
 */
export function scheduleConsultationDebouncedAutosave(
  encounterId: string | null | undefined
) {
  if (!encounterId || typeof window === "undefined") return;
  clearDebounce();
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void persistConsultationDraft(encounterId, "debounced");
  }, DEBOUNCE_MS);
}

export async function flushConsultationAutosave(opts?: {
  reason?: string;
  fromSection?: ConsultationTabSectionKey;
}) {
  void opts;
  clearDebounce();
  const encounterId = useConsultationStore.getState().encounterId;
  if (!encounterId || typeof window === "undefined") {
    setUi({ phase: "idle" });
    return;
  }
  await persistConsultationDraft(encounterId, "flush");
}

async function persistConsultationDraft(
  encounterId: string,
  _source: "debounced" | "flush"
) {
  if (savedHideTimer) {
    clearTimeout(savedHideTimer);
    savedHideTimer = null;
  }

  setUi({ phase: "saving" });
  try {
    const payload = buildConsultationAutosavePayload(encounterId);
    localStorage.setItem(storageKey(encounterId), JSON.stringify(payload));
    useConsultationStore.getState().setDraftStatus({
      savedAt: new Date(),
      message: null,
    });
    setUi({ phase: "saved", at: Date.now() });
    savedHideTimer = setTimeout(() => {
      savedHideTimer = null;
      if (uiState.phase === "saved") setUi({ phase: "idle" });
    }, SAVED_BADGE_MS);
  } catch {
    setUi({ phase: "idle" });
  }
}

/** Call from ConsultationSectionScrollProvider: subscribe to store changes. */
export function initConsultationAutosaveStoreSubscription(): () => void {
  if (typeof window === "undefined") return () => {};

  let prevJson = stableStringify(pickAutosaveSlice(useConsultationStore.getState()));

  return useConsultationStore.subscribe((state) => {
    const slice = pickAutosaveSlice(state);
    const json = stableStringify(slice);
    if (json === prevJson) return;
    prevJson = json;
    scheduleConsultationDebouncedAutosave(state.encounterId);
  });
}
