const API_BASE = "https://apis.viggle.ai/v1";

function authHeaders(apiKey) {
  return { Authorization: `Bearer ${apiKey}` };
}

async function parseResponse(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      payload?.error?.message ||
      payload?.message ||
      `MotionMint generation request failed (${response.status})`;
    throw new Error(String(message).replace(/viggle/gi, "MotionMint"));
  }
  return payload;
}

function appendFile(form, field, file) {
  if (!file) return;
  form.append(
    field,
    new Blob([file.buffer], { type: file.mimetype || "application/octet-stream" }),
    file.originalname || field
  );
}

export async function createViggleJob({ apiKey, workflow, prompt, fields, files }) {
  const form = new FormData();

  if (workflow === "image") {
    if (!prompt?.trim()) throw new Error("A prompt is required.");
    form.append("prompt", prompt.trim());
    form.append("aspect_ratio", fields.aspect || "16:9");
    form.append("resolution", fields.resolution || "1K");
    form.append("n", String(fields.count || 1));
    for (const file of files.reference || []) appendFile(form, "reference_image", file);

    const response = await fetch(`${API_BASE}/images`, {
      method: "POST",
      headers: authHeaders(apiKey),
      body: form
    });
    return { ...(await parseResponse(response)), kind: "images" };
  }

  if (workflow === "video") {
    if (!prompt?.trim()) throw new Error("A prompt is required.");
    form.append("prompt", prompt.trim());
    form.append("quality", fields.quality === "high" ? "high" : "low");
    form.append("duration_s", String(fields.duration || 5));
    form.append("resolution", fields.resolution || "768p");
    form.append("aspect_ratio", fields.aspect || "16:9");
    for (const file of files.reference || []) appendFile(form, "reference_image", file);

    const response = await fetch(`${API_BASE}/videos`, {
      method: "POST",
      headers: authHeaders(apiKey),
      body: form
    });
    return { ...(await parseResponse(response)), kind: "video" };
  }

  const character = files.image?.[0] || files.reference?.[0];
  const motion = files.motion?.[0];
  if (!character) throw new Error("Add a character image to continue.");
  if (workflow !== "character" && !motion) {
    throw new Error("Add a motion or driving video to continue.");
  }

  if (workflow === "character") {
    appendFile(form, "image", character);
    const response = await fetch(`${API_BASE}/characters`, {
      method: "POST",
      headers: authHeaders(apiKey),
      body: form
    });
    return { ...(await parseResponse(response)), kind: "character" };
  }

  appendFile(form, "image", character);
  appendFile(form, "motion_video", motion);
  form.append("background_mode", fields.background || "original");

  const response = await fetch(`${API_BASE}/renders`, {
    method: "POST",
    headers: authHeaders(apiKey),
    body: form
  });
  return { ...(await parseResponse(response)), kind: "video" };
}

export async function readViggleJob({ apiKey, providerId, kind }) {
  const path = kind === "images" ? "images" : "videos";
  const response = await fetch(`${API_BASE}/${path}/${providerId}`, {
    headers: authHeaders(apiKey)
  });
  return parseResponse(response);
}
