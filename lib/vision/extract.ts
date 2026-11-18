import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { VisionExtraction } from "../schemas";
import { SYSTEM_PROMPT } from "./prompt";

export const VISION_MODEL = "claude-opus-5-5";

export class ExtractionError extends Error {}

let client: Anthropic | undefined;
const anthropic = () => (client ??= new Anthropic({ timeout: 60_000, maxRetries: 1 }));

/** Reads a result-sheet photo into strict, zod-validated JSON. Server only: the API key never reaches the browser. */
export async function extractFromImage(jpegBase64: string): Promise<VisionExtraction> {
  const response = await anthropic().beta.messages.parse({
    model: VISION_MODEL,
    max_tokens: 8000,
    // If the model declines, the API retries on a fallback model inside the same call.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: betaZodOutputFormat(VisionExtraction) },
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: "image/jpeg", data: jpegBase64 } },
          { type: "text", text: "Read this result sheet." },
        ],
      },
    ],
  });

  if (response.stop_reason === "refusal") throw new ExtractionError("The reader declined this photo. Try another photo.");
  if (response.stop_reason === "max_tokens") throw new ExtractionError("The reader ran out of room. Try again.");

  // Re-validate: the API's schema subset drops some constraints (max, regex).
  const parsed = VisionExtraction.safeParse(response.parsed_output);
  if (!parsed.success) throw new ExtractionError("The reader's answer wasn't in the expected format. Try again.");
  return parsed.data;
}
