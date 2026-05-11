import { NextResponse } from "next/server";

/** Log-safe base URL (no path/query secrets). */
function backendOriginForLog(baseUrl: string): string {
  try {
    const normalized = baseUrl.includes("://") ? baseUrl : `http://${baseUrl}`;
    const u = new URL(normalized);
    return `${u.protocol}//${u.host}`;
  } catch {
    return "(invalid BACKEND_URL)";
  }
}

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
    const refreshUrl = `${BACKEND_URL}auth/refresh-token/`;

    try {
      const backendRes = await fetch(refreshUrl, {
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
    } catch (fetchError: unknown) {
      // Network or connection errors (e.g. ECONNREFUSED — Django not listening on BACKEND_URL host/port)
      const err = fetchError as { message?: string; cause?: { code?: string } };
      console.error("Error connecting to backend (refresh-token):", {
        backendOrigin: backendOriginForLog(BACKEND_URL),
        authPath: "auth/refresh-token/",
        message: err?.message,
        causeCode: err?.cause && typeof err.cause === "object" && "code" in err.cause ? err.cause.code : undefined,
        hint: "Ensure Django is running and Hospital-Web-UI BACKEND_URL matches (e.g. http://127.0.0.1:8000/api/).",
      });
      return NextResponse.json(
        {
          error: "Failed to connect to backend server",
          message: err?.message || "Please check if the backend server is running",
          backend_origin: backendOriginForLog(BACKEND_URL),
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