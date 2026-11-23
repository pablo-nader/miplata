import { type HealthStatus, healthy } from "../domain/health-status";

export type VersionSource = () => string;

export function getHealth(readVersion: VersionSource): HealthStatus {
  return healthy(readVersion());
}
