import {
  pickDefaultSectionItemId,
  shouldIgnoreSectionActivationClick,
} from "@/lib/consultation-section-activation";

describe("consultation-section-activation", () => {
  describe("pickDefaultSectionItemId", () => {
    it("returns null for empty sections", () => {
      const itemId = pickDefaultSectionItemId([], () => false);
      expect(itemId).toBeNull();
    });

    it("picks first incomplete item when available", () => {
      const items = [
        { id: "a", is_complete: true },
        { id: "b", is_complete: false },
        { id: "c", is_complete: false },
      ];
      const itemId = pickDefaultSectionItemId(items, (item) => !item.is_complete);
      expect(itemId).toBe("b");
    });

    it("falls back to first item when no incomplete item exists", () => {
      const items = [
        { id: "a", is_complete: true },
        { id: "b", is_complete: true },
      ];
      const itemId = pickDefaultSectionItemId(items, (item) => !item.is_complete);
      expect(itemId).toBe("a");
    });
  });

  describe("shouldIgnoreSectionActivationClick", () => {
    it("returns false for click on section container", () => {
      const container = document.createElement("div");
      container.setAttribute("role", "button");
      document.body.appendChild(container);

      expect(shouldIgnoreSectionActivationClick(container, container)).toBe(false);

      container.remove();
    });

    it("returns true for click on input inside container", () => {
      const container = document.createElement("div");
      const input = document.createElement("input");
      container.appendChild(input);
      document.body.appendChild(container);

      expect(shouldIgnoreSectionActivationClick(input, container)).toBe(true);

      container.remove();
    });

    it("returns true for click on nested button", () => {
      const container = document.createElement("div");
      const wrapper = document.createElement("div");
      const button = document.createElement("button");
      wrapper.appendChild(button);
      container.appendChild(wrapper);
      document.body.appendChild(container);

      expect(shouldIgnoreSectionActivationClick(button, container)).toBe(true);

      container.remove();
    });

    it("returns false for non-interactive target inside container", () => {
      const container = document.createElement("div");
      const text = document.createElement("span");
      container.appendChild(text);
      document.body.appendChild(container);

      expect(shouldIgnoreSectionActivationClick(text, container)).toBe(false);

      container.remove();
    });
  });
});
