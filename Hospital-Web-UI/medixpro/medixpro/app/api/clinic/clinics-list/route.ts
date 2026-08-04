import { NextResponse } from "next/server"

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
