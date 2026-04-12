export const DURATION_OPTIONS = [
  { label: "5 minutes", value: 5 },
  { label: "1 hour", value: 60 },
  { label: "10 hours", value: 600 },
  { label: "1 day", value: 1440 },
  { label: "10 days", value: 14400 },
] as const;

export const DURATION_VALUES: readonly number[] = DURATION_OPTIONS.map((d) => d.value);

export const RESERVED_NAMES = [
  "api",
  "auth",
  "login",
  "register",
  "dashboard",
  "admin",
  "settings",
  "new",
  "space",
  "spaces",
];

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_SPACE_STORAGE_BYTES = 50 * 1024 * 1024;
export const MAX_FILES_PER_SPACE = 5;
export const MAX_CONTENT_LENGTH = 50000;
export const SPACE_NAME_MIN = 3;
export const SPACE_NAME_MAX = 24;
export const POLLING_INTERVAL_MS = 5000;

export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
  "text/plain",
  "text/csv",
  "text/markdown",
  "application/json",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];
