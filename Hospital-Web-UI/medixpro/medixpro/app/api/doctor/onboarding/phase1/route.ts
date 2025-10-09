// // app/api/doctor/onboarding/phase1/route.ts

import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    console.log("🚀 API: Doctor onboarding phase1 started")
    const body = await request.json()
    console.log("📤 API: Request body:", body)

    const res = await fetch("http://localhost:8000/api/doctor/onboarding/phase1/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    console.log("📊 API: Django response status:", res.status)
    const responseData = await res.json().catch(() => ({}))
    console.log("📥 API: Django response data:", responseData)

    if (!res.ok) {
      console.log("❌ API: Django returned error")
      console.log("❌ API: Error details:", responseData)
      return NextResponse.json(
        {
          status: "error",
          message: "Doctor onboarding failed",
          errors: responseData,
        },
        { status: res.status },
      )
    }

    console.log("✅ API: Django returned success")
    return NextResponse.json({ status: "success", data: responseData }, { status: 201 })
  } catch (error: any) {
    console.error("💥 API: Error occurred:", error)
    return NextResponse.json(
      {
        status: "error",
        message: error.message || "Something went wrong",
      },
      { status: 500 },
    )
  }
}












// import { NextResponse } from "next/server";

// export async function POST(request: Request) {
//   try {
//     console.log("🚀 API: Doctor onboarding phase1 started");

//     const body = await request.json();
//     console.log("📤 API: Request body:", body);

//     const res = await fetch("http://localhost:8000/api/doctor/onboarding/phase1/", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify(body),
//     });

//     console.log("📊 API: Django response status:", res.status);

//     const responseData = await res.json().catch(() => ({}));
//     console.log("📥 API: Django response data:", responseData);

//     if (!res.ok) {
//       console.log("❌ API: Django returned error");
//       console.log("❌ API: Error details:", responseData);
//       return NextResponse.json(
//         {
//           status: "error",
//           message: "Doctor onboarding failed",
//           errors: responseData,
//         },
//         { status: res.status }
//       );
//     }

//     console.log("✅ API: Django returned success");
//     return NextResponse.json({ status: "success", data: responseData }, { status: 201 });
//   } catch (error: any) {
//     console.error("💥 API: Error occurred:", error);
//     return NextResponse.json(
//       {
//         status: "error",
//         message: error.message || "Something went wrong",
//       },
//       { status: 500 }
//     );
//   }
// }