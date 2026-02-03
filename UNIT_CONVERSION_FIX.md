# Unit Conversion Fix - Values Not Changing Unexpectedly ✅

## Problem

When users entered values and switched units, values were being converted incorrectly, causing unexpected changes. For example:
- User enters `1.2` in `cm` → Value stored as `1.2`
- User switches to `ft` → Code converts `1.2 cm` to `ft` → Shows `0.039 ft` (correct)
- But if user meant `1.2 ft`, the conversion was wrong

## Root Cause

The issue was that values were being stored in **display units** instead of **canonical units**, causing confusion when:
1. User enters a value in one unit
2. User switches to another unit
3. Code tries to convert, but doesn't know what unit the stored value is in

## Solution

**Always store values in canonical unit, convert only for display:**

### Architecture

```
User Input (Display Unit)
    ↓
Convert to Canonical Unit
    ↓
Store in State (Canonical Unit)
    ↓
Convert to Display Unit (for showing)
    ↓
Display in Input Field
```

### Implementation

1. **Storage**: Values are ALWAYS stored in canonical unit (e.g., `cm`, `kg`, `°C`)
2. **Display**: Convert from canonical to display unit when showing in input
3. **Input**: Convert from display to canonical unit when user enters/changes value
4. **Unit Switch**: Just update display unit - no conversion needed (value already in canonical)

## Code Changes

### `dynamic-field-renderer.tsx`

**Before:**
```typescript
// Value stored in whatever unit user selected
value={value ?? ""}
onChange={(value) => onChange(value)} // Stores directly

// Unit switch converts value
onClick={() => {
  const convertedValue = convertUnit(value, activeUnit, unit, field);
  onChange(convertedValue); // Converts and stores
}}
```

**After:**
```typescript
// Convert canonical value to display unit for showing
const displayValue = useMemo(() => {
  if (!hasUnitSwitcher || canonicalUnit === activeUnit) return value;
  return convertValue(value, canonicalUnit, activeUnit);
}, [value, canonicalUnit, activeUnit, hasUnitSwitcher]);

// Show display value
value={displayValue}

// Convert display input to canonical before storing
onChange={(e) => {
  const numValue = parseFloat(e.target.value);
  let valueToStore = numValue;
  if (hasUnitSwitcher && canonicalUnit !== activeUnit) {
    valueToStore = convertValueForValidation(numValue, activeUnit, canonicalUnit);
  }
  onChange(valueToStore); // Store in canonical unit
}}

// Unit switch just updates display unit
onClick={() => {
  onUnitChange?.(unit); // No conversion needed!
}}
```

## Example Flow

### Scenario: User enters height

1. **User selects `cm` unit**
   - Display unit: `cm`
   - Canonical unit: `cm` (same)

2. **User enters `180`**
   - Input: `180` (in cm)
   - Convert to canonical: `180 cm` → `180 cm` (no conversion needed)
   - Store: `180` (in canonical unit `cm`)

3. **User switches to `ft`**
   - Display unit changes to `ft`
   - Stored value: `180` (still in canonical `cm`)
   - Convert for display: `180 cm` → `5.9 ft`
   - Show: `5.9` in input field
   - **No value conversion needed** - just display conversion!

4. **User edits to `6.0`**
   - Input: `6.0` (in ft)
   - Convert to canonical: `6.0 ft` → `182.88 cm`
   - Store: `182.88` (in canonical unit `cm`)

5. **User switches back to `cm`**
   - Display unit changes to `cm`
   - Stored value: `182.88` (in canonical `cm`)
   - Convert for display: `182.88 cm` → `182.88 cm` (no conversion)
   - Show: `182.88` in input field

## Benefits

✅ **Consistent Storage**: All values stored in one unit (canonical)
✅ **No Double Conversion**: Values never converted twice
✅ **Predictable Behavior**: User knows what unit they're entering
✅ **Accurate Validation**: Validation always in canonical unit
✅ **Smooth Unit Switching**: Instant unit changes without value loss

## Testing

### Test Case 1: Enter value, switch units
1. Enter `180` in `cm`
2. Switch to `ft` → Should show `5.9 ft`
3. Switch back to `cm` → Should show `180 cm` ✅

### Test Case 2: Edit value in different unit
1. Enter `180` in `cm`
2. Switch to `ft` → Shows `5.9 ft`
3. Edit to `6.0 ft`
4. Switch back to `cm` → Should show `182.88 cm` ✅

### Test Case 3: Multiple unit switches
1. Enter `100` in `cm`
2. Switch to `ft` → `3.3 ft`
3. Switch to `cm` → `100 cm`
4. Switch to `ft` → `3.3 ft` ✅ (no drift)

## Files Modified

- ✅ `components/consultations/dynamic-field-renderer.tsx`
  - Added `displayValue` calculation
  - Updated `onChange` to convert to canonical
  - Removed conversion from unit switch handler

## Status

✅ **Fixed** - Values now stored consistently in canonical unit, converted only for display.

---

**Key Insight**: Store in canonical unit, convert only for display. This ensures values never get "lost in translation" between units.
