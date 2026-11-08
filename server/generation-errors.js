export const GENERATE_UNAVAILABLE_CODE = "GENERATE_UNAVAILABLE";
export const GENERATE_UNAVAILABLE_MESSAGE =
  "Generation is temporarily unavailable. Please try again later.";

const INPUT_VALIDATION_MESSAGES = new Set([
  "A prompt is required.",
  "Add a character image to continue.",
  "Add a motion or driving video to continue."
]);

export function clientGenerationError(error) {
  const message = String(error?.message || "").trim();
  if (INPUT_VALIDATION_MESSAGES.has(message)) {
    return { code: "GENERATE_INPUT_INVALID", message };
  }
  return { code: GENERATE_UNAVAILABLE_CODE, message: GENERATE_UNAVAILABLE_MESSAGE };
}
