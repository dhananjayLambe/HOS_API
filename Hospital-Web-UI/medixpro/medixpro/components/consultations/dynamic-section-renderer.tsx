"use client";

import { memo, useState, useCallback, useMemo } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { DynamicFieldRenderer } from "./dynamic-field-renderer";
import {
  Section,
  SectionItem,
  usePreConsultationTemplateStore,
} from "@/store/preConsultationTemplateStore";

interface DynamicSectionRendererProps {
  section: Section;
  sectionData: Record<string, any>;
  onSectionDataChange: (itemCode: string, fieldKey: string, value: any) => void;
  isMobile?: boolean;
}

export const DynamicSectionRenderer = memo<DynamicSectionRendererProps>(
  ({ section, sectionData, onSectionDataChange, isMobile = false }) => {
    const { getSectionConfig, getDefaultRequiredFields, getDefaultOptionalFields } =
      usePreConsultationTemplateStore();

    const sectionConfig = getSectionConfig(section.section);
    const defaultRequired = getDefaultRequiredFields(section.section);
    const defaultOptional = getDefaultOptionalFields(section.section);

    // Separate items into required, optional, and hidden
    const { requiredItems, optionalItems, hiddenItems } = useMemo(() => {
      const required: SectionItem[] = [];
      const optional: SectionItem[] = [];
      const hidden: SectionItem[] = [];

      section.items.forEach((item) => {
        if (defaultRequired.includes(item.code)) {
          required.push(item);
        } else if (defaultOptional.includes(item.code)) {
          optional.push(item);
        } else {
          hidden.push(item);
        }
      });

      return { requiredItems: required, optionalItems: optional, hiddenItems: hidden };
    }, [section.items, defaultRequired, defaultOptional]);

    const [expandedHidden, setExpandedHidden] = useState(false);

    const handleFieldChange = useCallback(
      (itemCode: string, fieldKey: string, value: any) => {
        onSectionDataChange(itemCode, fieldKey, value);
      },
      [onSectionDataChange]
    );

    const renderItem = useCallback(
      (item: SectionItem) => {
        const itemData = sectionData[item.code] || {};

        return (
          <Card key={item.code} className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">{item.label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {item.fields.map((field) => (
                <DynamicFieldRenderer
                  key={field.key}
                  field={field}
                  value={itemData[field.key]}
                  onChange={(value) => handleFieldChange(item.code, field.key, value)}
                  sectionData={sectionData}
                  itemCode={item.code}
                />
              ))}
            </CardContent>
          </Card>
        );
      },
      [sectionData, handleFieldChange]
    );

    // Mobile: Accordion UI (one section open at a time)
    if (isMobile) {
      return (
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value={section.section} className="border-none">
            <AccordionTrigger className="text-left font-semibold py-4">
              {section.section
                .split("_")
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join(" ")}
            </AccordionTrigger>
            <AccordionContent className="pt-4">
              <div className="space-y-4">
                {/* Required items - always visible */}
                {requiredItems.map(renderItem)}

                {/* Default optional items - visible by default */}
                {optionalItems.map(renderItem)}

                {/* Hidden items - under "+ Add more" */}
                {hiddenItems.length > 0 && (
                  <div>
                    <Button
                      variant="outline"
                      onClick={() => setExpandedHidden(!expandedHidden)}
                      className="w-full justify-center mb-2"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add More Fields
                    </Button>
                    {expandedHidden && (
                      <div className="space-y-4">{hiddenItems.map(renderItem)}</div>
                    )}
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      );
    }

    // Desktop: Card-based layout
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">
            {section.section
              .split("_")
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(" ")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Required items - always visible */}
          {requiredItems.map(renderItem)}

          {/* Default optional items - visible by default */}
          {optionalItems.map(renderItem)}

          {/* Hidden items - under "+ Add more" */}
          {hiddenItems.length > 0 && (
            <div>
              <Button
                variant="outline"
                onClick={() => setExpandedHidden(!expandedHidden)}
                className="w-full justify-center mb-2"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add More Fields
              </Button>
              {expandedHidden && (
                <div className="space-y-4">{hiddenItems.map(renderItem)}</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
);

DynamicSectionRenderer.displayName = "DynamicSectionRenderer";
