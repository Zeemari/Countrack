import "server-only";
import fixtures from "./fixtures.json";
import { VisionExtraction } from "../schemas";

/**
 * DEMO_MODE only: a cached reading for a known demo photo (keyed by SHA-256), so the stage
 * demo doesn't depend on venue Wi-Fi or model latency. Record with `npm run fixture -- <photoId>`.
 */
export function demoFixture(sha256: string): VisionExtraction | null {
  if (process.env.DEMO_MODE !== "true") return null;
  const hit = (fixtures as Record<string, unknown>)[sha256];
  if (!hit) return null;
  const parsed = VisionExtraction.safeParse(hit);
  return parsed.success ? parsed.data : null;
}
