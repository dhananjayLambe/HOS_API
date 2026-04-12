import type { EncounterInstructionRow } from "@/lib/consultation-schema-types";
import { isUuidLike } from "@/lib/utils";

export type EndConsultationInstructionsPayload = {
  template_instructions: Array<{
    instruction_template_id: string;
    input_data: Record<string, unknown>;
    custom_note: string | null;
    is_active: boolean;
  }>;
  custom_instructions: Array<{
    label: string;
    custom_note: string | null;
    is_active: boolean;
  }>;
};

export function buildInstructionsPayload(
  instructionsList: EncounterInstructionRow[]
): EndConsultationInstructionsPayload {
  const template_instructions: EndConsultationInstructionsPayload["template_instructions"] = [];
  const custom_instructions: EndConsultationInstructionsPayload["custom_instructions"] = [];

  for (const inst of instructionsList) {
    if (isUuidLike(inst.instruction_template_id)) {
      template_instructions.push({
        instruction_template_id: inst.instruction_template_id,
        input_data: inst.input_data || {},
        custom_note: inst.custom_note ?? null,
        is_active: inst.is_active ?? true,
      });
    } else {
      custom_instructions.push({
        label: inst.label,
        custom_note: inst.custom_note ?? null,
        is_active: inst.is_active ?? true,
      });
    }
  }

  return {
    template_instructions,
    custom_instructions,
  };
}
