import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const username = searchParams.get("username")?.trim() || ""

  try {
    // Always forward the request to Django backend
    const res = await fetch("http://localhost:8000/api/auth/check-user-status/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone_number: username }),
    })

    const data = await res.json()

    // Frontend only needs: status + message
    return NextResponse.json({
      status: data.status || "error",
      message: data.message || "Something went wrong.",
    }, { status: res.status })
  } catch (error) {
    console.error("Error checking user status:", error)
    return NextResponse.json(
      { status: "error", message: "Unable to connect to server. Please try again later." },
      { status: 500 }
    )
  }
}














// import { NextResponse } from "next/server"

// export async function GET(request: Request) {
//   const { searchParams } = new URL(request.url)
//   const username = searchParams.get("username")?.trim()

//   if (!username) {
//     return NextResponse.json({ message: "Username (mobile number) is required." }, { status: 400 })
//   }

//   // Mock logic: even last digit => approved, 1/3/5/7/9 => rejected, otherwise pending
//   const lastChar = username.charAt(username.length - 1)
//   const lastDigit = /\d/.test(lastChar) ? Number.parseInt(lastChar, 10) : Number.NaN

//   let status: "approved" | "rejected" | "pending" = "pending"
//   if (!Number.isNaN(lastDigit)) {
//     if (lastDigit % 2 === 0) status = "approved"
//     else status = "rejected"
//   }

//   const message =
//     status === "approved"
//       ? "Your registration has been approved by the administrator."
//       : status === "rejected"
//         ? "Your registration request was rejected by the administrator."
//         : "Your registration is pending administrator approval."

//   return NextResponse.json({ status, message })
// }
