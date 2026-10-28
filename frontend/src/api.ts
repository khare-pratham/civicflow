
import type { Issue, IssueCreate, IssueStatus } from "./types";

const API_BASE_URL = (
  (
    import.meta as ImportMeta & {
      env?: Record<string, string | undefined>;
    }
  ).env?.VITE_API_BASE_URL ?? ""
).replace(/\/$/, "");

async function request<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
  } catch {
    throw new Error(
      "Can't reach CivicFlow API. Check that the backend is running and retry."
    );
  }

  if (!response.ok) {
    let message = `Request failed (${response.status}).`;

    try {
      const body = await response.json();

      if (typeof body.detail === "string") {
        message = body.detail;
      } else if (Array.isArray(body.detail)) {
        message = body.detail
          .map((error: { msg?: string }) => error.msg)
          .filter(Boolean)
          .join(" ");
      }
    } catch {
      // Keep the generic status message if the response isn't JSON.
    }

    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export function getIssues(
  filters: {
    status?: string;
    category?: string;
    q?: string;
  } = {}
) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });

  const suffix = params.size ? `?${params.toString()}` : "";

  return request<Issue[]>(`/api/issues${suffix}`);
}

export function createIssue(payload: IssueCreate) {
  return request<Issue>("/api/issues", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateIssueStatus(
  id: number,
  status: IssueStatus,
  assigned_team?: string
) {
  return request<Issue>(`/api/issues/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({
      status,
      ...(assigned_team ? { assigned_team } : {}),
    }),
  });
}
