import { NextResponse } from "next/server"

const BACKEND_API_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000/api"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const page = searchParams.get("page") || 1
  const pageSize = searchParams.get("page_size") || 10

  try {
    const res = await fetch(
      `http://127.0.0.1:8000/api/clinic/clinic-list-ui/?page=${page}&page_size=${pageSize}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      }
    )

    if (!res.ok) {
      throw new Error(`Backend returned ${res.status}`)
    }

    const data = await res.json()
    console.log("Fetched clinics data:", data)
    return NextResponse.json({
      success: true,
      pagination: {
        count: data.count,
        next: data.next,
        previous: data.previous,
      },
      data: data.clinics || [],
    })
  } catch (error) {
    console.error("Error fetching clinics:", error)

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch clinics",
        data: [],
      },
      { status: 500 }
    )
  }
}

// import { NextResponse } from "next/server"

// // Mock clinic data - replace with actual database query
// const clinics = [
//   { id: "1", name: "Apollo Hospital - Mumbai", location: "Mumbai, Maharashtra" },
//   { id: "2", name: "Fortis Healthcare - Delhi", location: "Delhi" },
//   { id: "3", name: "Max Healthcare - Bangalore", location: "Bangalore, Karnataka" },
//   { id: "4", name: "Manipal Hospital - Pune", location: "Pune, Maharashtra" },
//   { id: "5", name: "AIIMS - New Delhi", location: "New Delhi" },
//   { id: "6", name: "Lilavati Hospital - Mumbai", location: "Mumbai, Maharashtra" },
//   { id: "7", name: "Medanta - Gurugram", location: "Gurugram, Haryana" },
//   { id: "8", name: "Narayana Health - Bangalore", location: "Bangalore, Karnataka" },
//   { id: "9", name: "Kokilaben Hospital - Mumbai", location: "Mumbai, Maharashtra" },
//   { id: "10", name: "Columbia Asia - Bangalore", location: "Bangalore, Karnataka" },
// ]

// export async function GET() {
//   try {
//     // TODO: Replace with actual database query
//     // Example: const clinics = await db.query('SELECT id, name, location FROM clinics WHERE status = "approved"')

//     return NextResponse.json({
//       success: true,
//       data: clinics,
//     })
//   } catch (error) {
//     console.error("Error fetching clinics:", error)
//     //return NextResponse.json({ success: false, error: "Failed to fetch clinics" }, { status: 500 })
//     return NextResponse.json({
//       success: true,
//       data: clinics,
//     })
//   }
// }
