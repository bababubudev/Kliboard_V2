import { z } from "zod";
import {
  DURATION_VALUES,
  RESERVED_NAMES,
  SPACE_NAME_MIN,
  SPACE_NAME_MAX,
  MAX_CONTENT_LENGTH,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  MAX_FILES_PER_SPACE,
} from "@/lib/constants";

export const spaceNameSchema = z
  .string()
  .min(SPACE_NAME_MIN, "Name must be at least 3 characters")
  .max(SPACE_NAME_MAX, "Name must be at most 24 characters")
  .regex(
    /^[a-zA-Z][a-zA-Z-]*[a-zA-Z]$/,
    "Only letters and hyphens allowed"
  )
  .refine(
    (name) => !RESERVED_NAMES.includes(name.toLowerCase()),
    "This name is reserved"
  );

const fileMetadataItemSchema = z.object({
  filename: z.string().min(1).max(255),
  storage_path: z.string().min(1),
  mime_type: z
    .string()
    .refine((v) => ALLOWED_MIME_TYPES.includes(v), "File type not allowed"),
  size_bytes: z
    .number()
    .positive()
    .max(MAX_FILE_SIZE_BYTES, "File too large (max 10MB)"),
});

export const createSpaceSchema = z.object({
  name: spaceNameSchema,
  content: z
    .string()
    .max(MAX_CONTENT_LENGTH, "Content too long")
    .optional()
    .default(""),
  duration: z
    .number()
    .optional()
    .default(5)
    .refine((v) => DURATION_VALUES.includes(v as number), "Invalid duration"),
  files: z.array(fileMetadataItemSchema).max(MAX_FILES_PER_SPACE).optional(),
});

export const updateSpaceSchema = z.object({
  content: z.string().max(MAX_CONTENT_LENGTH).optional(),
  duration: z
    .number()
    .refine((v) => DURATION_VALUES.includes(v as number))
    .optional(),
});

export const claimSpaceSchema = z.object({
  token: z.string().min(16).max(256),
});

export type CreateSpaceInput = z.infer<typeof createSpaceSchema>;
export type UpdateSpaceInput = z.infer<typeof updateSpaceSchema>;
export type ClaimSpaceInput = z.infer<typeof claimSpaceSchema>;
