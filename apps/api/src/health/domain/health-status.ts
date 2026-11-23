export type HealthStatus = {
  status: "ok";
  version: string;
};

export function healthy(version: string): HealthStatus {
  return { status: "ok", version };
}
