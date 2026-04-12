import { z } from "zod";
import {
  DURATION_VALUES,
  RESERVED_NAMES,
  SPACE_NAME_MIN,
  SPACE_NAME_MAX,
  MAX_CONTENT_LENGTH,
} from "@/lib/constants";

export const spaceNameSchema = z
  .string()
  .min(SPACE_NAME_MIN, "Name must be at least 3 characters")
  .max(SPACE_NAME_MAX, "Name must be at most 24 characters")
  .regex(
    /^[a-zA-Z][a-zA-Z-]*[a-zA-Z]$/,
    "Only letters and hyphens allowed, must start and end with a letter"
  )
  .refine(
    (name) => !RESERVED_NAMES.includes(name.toLowerCase()),
    "This name is reserved"
  );

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
});

export const updateSpaceSchema = z.object({
  content: z.string().max(MAX_CONTENT_LENGTH).optional(),
  duration: z
    .number()
    .refine((v) => DURATION_VALUES.includes(v as number))
    .optional(),
});

export type CreateSpaceInput = z.infer<typeof createSpaceSchema>;
export type UpdateSpaceInput = z.infer<typeof updateSpaceSchema>;
