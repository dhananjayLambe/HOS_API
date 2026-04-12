import type {
  EncounterInstructionRow,
  InstructionFieldSchema,
  InstructionItemSchema,
} from "@/lib/consultation-schema-types";

function instructionFieldValuePresent(value: unknown, fieldType?: string): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "number") return !Number.isNaN(value);
  if (typeof value === "boolean") return true;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (fieldType === "number" && value === "") return false;
  return true;
}

/**
 * True when the instruction row has everything required by its template schema.
 * - If there is no template, or nothing is required, or the schema has no fields → complete.
 * - If the template has input_schema fields and requires_input, every field must have a non-empty value in input_data.
 */
export function isInstructionInputComplete(
  template: InstructionItemSchema | undefined,
  input_data: Record<string, unknown> | null | undefined
): boolean {
  if (!template) return true;
  const fields = template.input_schema?.fields ?? [];
  const needsSchemaInput = template.requires_input === true && fields.length > 0;
  if (!needsSchemaInput) return true;

  const data =
    input_data != null && typeof input_data === "object" && !Array.isArray(input_data)
      ? input_data
      : {};

  for (const field of fields as InstructionFieldSchema[]) {
    const v = data[field.key];
    if (!instructionFieldValuePresent(v, field.type)) return false;
  }
  return true;
}

/**
 * Resolve API template or synthesize a minimal template for local/custom rows (e.g. custom_* ids).
 */
export function resolveInstructionItemTemplate(
  instructionTemplateId: string,
  label: string,
  getInstructionTemplateByKeyOrId: (id: string) => InstructionItemSchema | undefined
): InstructionItemSchema | undefined {
  return (
    getInstructionTemplateByKeyOrId(instructionTemplateId) ?? {
      key: instructionTemplateId,
      label,
      category_code: "",
      requires_input: false,
      input_schema: { fields: [] },
    }
  );
}

/** True when a draft row still needs required template input_data (custom rows are always complete). */
export function isEncounterInstructionIncomplete(
  inst: Pick<EncounterInstructionRow, "instruction_template_id" | "label"> & {
    input_data?: Record<string, unknown> | null;
  },
  getInstructionTemplateByKeyOrId: (id: string) => InstructionItemSchema | undefined
): boolean {
  const template = resolveInstructionItemTemplate(
    inst.instruction_template_id,
    inst.label,
    getInstructionTemplateByKeyOrId
  );
  return !isInstructionInputComplete(template, inst.input_data);
}
