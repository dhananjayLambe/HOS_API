// // app/api/doctor/onboarding/phase1/route.ts

import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const res = await fetch("http://localhost:8000/api/doctor/onboarding/phase1/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    const responseData = await res.json().catch(() => ({}))

    if (!res.ok) {
      return NextResponse.json(
        {
          status: "error",
          message: "Doctor onboarding failed",
          errors: responseData,
        },
        { status: res.status },
      )
    }

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
//     

//     const body = await request.json();
//     

//     const res = await fetch("http://localhost:8000/api/doctor/onboarding/phase1/", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify(body),
//     });

//     

//     const responseData = await res.json().catch(() => ({}));
//     

//     if (!res.ok) {
//       
//       
//       return NextResponse.json(
//         {
//           status: "error",
//           message: "Doctor onboarding failed",
//           errors: responseData,
//         },
//         { status: res.status }
//       );
//     }

//     
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