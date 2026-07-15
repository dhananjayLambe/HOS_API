import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const username = searchParams.get("username")?.trim() || ""

  try {
    const base = process.env.DJANGO_API_URL || "http://localhost:8000/api/"
    const res = await fetch(`${base}auth/check-user-status/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone_number: username }),
    })

    const data = await res.json()

    return NextResponse.json(
      {
        status: data.status || "error",
        message: data.message || "Something went wrong.",
        login_allowed: data.login_allowed,
        onboarding_state: data.onboarding_state,
        registration_status: data.registration_status,
      },
      { status: res.status },
    )
  } catch (error) {
    console.error("Error checking user status:", error)
    return NextResponse.json(
      { status: "error", message: "Unable to connect to server. Please try again later." },
      { status: 500 },
    )
  }
}
