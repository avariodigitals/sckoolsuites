import { NextResponse } from "next/server";

export type ParsedId =
  | { ok: true; value: number }
  | { ok: false; response: Response };

export function parseNumericId(value: string | undefined, fieldName = "id"): number {
  if (!value || value.trim() === "") {
    throw new Error(`${fieldName} is required`);
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${fieldName} must be a valid positive integer`);
  }

  return parsed;
}

export function parseNumericIdResponse(
  value: string | undefined,
  fieldName = "id",
): ParsedId {
  if (!value || value.trim() === "") {
    return { ok: false, response: NextResponse.json({ error: `${fieldName} is required` }, { status: 400 }) };
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return { ok: false, response: NextResponse.json({ error: `${fieldName} must be a valid positive integer` }, { status: 400 }) };
  }

  return { ok: true, value: parsed };
}

export function parseNumericSearchParam(value: string | null, fieldName = "id"): number | undefined {
  if (value === null || value.trim() === "") {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${fieldName} must be a valid positive integer`);
  }

  return parsed;
}

export function parseRequiredNumericSearchParam(value: string | null, fieldName = "id"): number {
  if (value === null || value.trim() === "") {
    throw new Error(`${fieldName} is required`);
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${fieldName} must be a valid positive integer`);
  }

  return parsed;
}

export function parseNumericSearchParamResponse(
  value: string | null,
  fieldName = "id",
): { ok: true; value: number } | { ok: false; response: Response } {
  if (value === null || value.trim() === "") {
    return { ok: false, response: NextResponse.json({ error: `${fieldName} is required` }, { status: 400 }) };
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return { ok: false, response: NextResponse.json({ error: `${fieldName} must be a valid positive integer` }, { status: 400 }) };
  }

  return { ok: true, value: parsed };
}

export function safeParseInteger(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return undefined;
  }

  return parsed;
}
