export const config = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.API_BASE_URL ?? "http://127.0.0.1:4000",
  storageRoot: process.env.STORAGE_ROOT ?? "./.data/evidence"
};
