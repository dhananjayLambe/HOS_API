// api/clinic/onboarding/route.ts
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    console.log("clinic onboarding request received")
    const payload = await req.json()
    console.log("Incoming Payload:", payload)

    // Transform frontend payload -> backend API payload
    const backendPayload = {
      name: payload?.clinic?.name,
      contact_number_primary: payload?.clinic?.primaryContact,
      contact_number_secondary: payload?.clinic?.secondaryContact || null,
      email_address: payload?.communication?.email,
      registration_number: payload?.registration?.registrationNumber,
      gst_number: payload?.registration?.gstNumber || null,
      address: {
        addressLine1: payload?.address?.addressLine1,
        city: payload?.address?.city,
        state: payload?.address?.state,
        pincode: payload?.address?.pincode,
      },
      specializations: Array.isArray(payload?.clinic?.specializations)
        ? payload.clinic.specializations.map((spec: string) => ({
            specialization_name: spec,
          }))
        : [],
    }

    // Basic validation (backend required fields)
    if (
      !backendPayload.name ||
      !backendPayload.contact_number_primary ||
      !backendPayload.email_address ||
      !backendPayload.registration_number ||
      !backendPayload.address?.addressLine1 ||
      !backendPayload.address?.city ||
      !backendPayload.address?.state ||
      !backendPayload.address?.pincode
    ) {
      return NextResponse.json({ message: "Missing required fields." }, { status: 400 })
    }

    // Backend API URL
    const base = process.env.DJANGO_API_URL || "http://localhost:8000/api/"
    const endpoint = `${base.replace(/\/$/, "")}/clinic/clinics/onboarding/`
    console.log("Backend endpoint:", endpoint)
    console.log("Backend Payload:", backendPayload)

    // Send request to Django
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(backendPayload),
    })

    const text = await upstream.text()
    console.log("Upstream response text:", text)
    let data: any
    try {
      data = JSON.parse(text)
    } catch {
      data = { message: text }
    }

    if (!upstream.ok) {
      return NextResponse.json(
        { message: data?.message || "Backend rejected the request." },
        { status: upstream.status },
      )
    }

    return NextResponse.json(
      {
        message: data?.message || "Clinic created successfully.",
        data: data?.data,
      },
      { status: upstream.status },
    )
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || "Invalid request." }, { status: 400 })
  }
}