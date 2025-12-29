export const validators = {
  required: (value: any) => {
    if (!value || (typeof value === "string" && !value.trim())) {
      return "This field is required"
    }
    return null
  },

  email: (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value)) {
      return "Please enter a valid email address"
    }
    return null
  },

  phone: (value: string) => {
    const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/
    if (!phoneRegex.test(value)) {
      return "Please enter a valid phone number"
    }
    return null
  },

  pan: (value: string) => {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/
    if (!panRegex.test(value)) {
      return "Please enter a valid PAN number (e.g., ABCDE1234F)"
    }
    return null
  },

  aadhaar: (value: string) => {
    const aadhaarRegex = /^[0-9]{12}$/
    if (!aadhaarRegex.test(value)) {
      return "Please enter a valid 12-digit Aadhaar number"
    }
    return null
  },

  ifsc: (value: string) => {
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/
    if (!ifscRegex.test(value)) {
      return "Please enter a valid IFSC code"
    }
    return null
  },

  minLength: (min: number) => (value: string) => {
    if (value.length < min) {
      return `Must be at least ${min} characters`
    }
    return null
  },

  maxLength: (max: number) => (value: string) => {
    if (value.length > max) {
      return `Must be no more than ${max} characters`
    }
    return null
  },

  number: (value: any) => {
    if (isNaN(Number(value))) {
      return "Please enter a valid number"
    }
    return null
  },

  positiveNumber: (value: any) => {
    const num = Number(value)
    if (isNaN(num) || num <= 0) {
      return "Please enter a positive number"
    }
    return null
  },

  pincode: (value: string) => {
    const pincodeRegex = /^[1-9][0-9]{5}$/
    if (!pincodeRegex.test(value)) {
      return "Please enter a valid 6-digit Pincode"
    }
    return null
  },
}

export function validateForm(
  data: Record<string, any>,
  rules: Record<string, Array<(value: any) => string | null>>,
): Record<string, string> {
  const errors: Record<string, string> = {}

  for (const [field, fieldRules] of Object.entries(rules)) {
    for (const rule of fieldRules) {
      const error = rule(data[field])
      if (error) {
        errors[field] = error
        break
      }
    }
  }

  return errors
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validatePhone(phone: string): boolean {
  const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/
  return phoneRegex.test(phone)
}

export function validatePAN(pan: string): boolean {
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/
  return panRegex.test(pan)
}

export function validateAadhaar(aadhaar: string): boolean {
  const aadhaarRegex = /^[0-9]{12}$/
  return aadhaarRegex.test(aadhaar)
}

export function validateIFSC(ifsc: string): boolean {
  const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/
  return ifscRegex.test(ifsc)
}

export function validatePincode(pincode: string): boolean {
  const pincodeRegex = /^[1-9][0-9]{5}$/
  return pincodeRegex.test(pincode)
}

export function validateUPI(upi: string): boolean {
  const upiRegex = /^[\w.-]+@[\w.-]+$/
  return upiRegex.test(upi)
}
