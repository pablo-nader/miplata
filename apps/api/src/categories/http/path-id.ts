import { z } from "zod";

const idSchema = z.guid();

export function isValidId(value: string): boolean {
  return idSchema.safeParse(value).success;
}
