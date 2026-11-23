import pkg from "../../../package.json" with { type: "json" };

export function readVersion(): string {
  return process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || pkg.version;
}
