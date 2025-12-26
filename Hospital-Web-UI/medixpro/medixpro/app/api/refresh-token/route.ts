import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const refreshToken = body.refresh_token || body.refresh;

    if (!refreshToken) {
      return NextResponse.json(
        { error: "Refresh token is required" },
        { status: 400 }
      );
    }

    const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000/api/";
    
    try {
      const backendRes = await fetch(`${BACKEND_URL}auth/refresh-token/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      // Read response as text first (can only read once)
      const responseText = await backendRes.text();
      const contentType = backendRes.headers.get("content-type");
      let data;

      // Try to parse as JSON if content-type suggests it
      if (contentType && contentType.includes("application/json")) {
        try {
          data = JSON.parse(responseText);
        } catch (jsonError) {
          console.error("Failed to parse JSON response:", responseText.substring(0, 500));
          return NextResponse.json(
            { 
              error: "Backend returned invalid JSON response",
              details: responseText.substring(0, 200) // First 200 chars for debugging
            },
            { status: 500 }
          );
        }
      } else {
        // Non-JSON response (likely HTML error page)
        console.error("Backend returned non-JSON response:", responseText.substring(0, 500));
        return NextResponse.json(
          { 
            error: "Backend server error",
            message: `Backend returned ${backendRes.status} with non-JSON response`
          },
          { status: backendRes.status || 500 }
        );
      }

      if (!backendRes.ok) {
        return NextResponse.json(data, { status: backendRes.status });
      }

      // Return tokens in response body
      return NextResponse.json(data, { status: 200 });
    } catch (fetchError: any) {
      // Network or connection errors
      console.error("Error connecting to backend:", fetchError);
      return NextResponse.json(
        { 
          error: "Failed to connect to backend server",
          message: fetchError.message || "Please check if the backend server is running"
        },
        { status: 503 }
      );
    }
  } catch (err: any) {
    console.error("Error in refresh-token route:", err);
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: err.message || "Refresh failed"
      },
      { status: 500 }
    );
  }
}