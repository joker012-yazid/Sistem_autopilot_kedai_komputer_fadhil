const localOrigins = [
  "http://127.0.0.1:3000",
  "http://localhost:3000",
  "http://127.0.0.1:3001",
  "http://localhost:3001",
  "http://127.0.0.1:3101",
  "http://localhost:3101"
];

export function getCaredeskAllowedOrigins(): string[] {
  const configured = process.env.CAREDESK_WEB_ORIGIN
    ?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? [];
  return [...new Set([...configured, ...localOrigins])];
}
