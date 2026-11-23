import { type HealthResponse, healthResponseSchema } from "@miplata/shared";

export async function fetchHealth(request: typeof fetch = fetch): Promise<HealthResponse> {
  const response = await request("/api/health");
  if (!response.ok) throw new Error(`Health check failed with status ${response.status}`);
  return healthResponseSchema.parse(await response.json());
}
