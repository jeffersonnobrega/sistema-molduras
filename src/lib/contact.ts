export const CONTACT_ROLES = [
  "Prefeito / Vice",
  "Vereador",
  "Deputado Federal / Estadual",
  "Agência de Marketing / Partido",
  "Outro",
] as const;

export type ContactRole = (typeof CONTACT_ROLES)[number];

export const CONTACT_BODY_LIMIT_BYTES = 4_096;
export const CONTACT_FORM_MINIMUM_AGE_MS = 1_500;
export const CONTACT_FORM_MAXIMUM_AGE_MS = 2 * 60 * 60 * 1_000;

export function isContactRole(value: unknown): value is ContactRole {
  return (
    typeof value === "string" &&
    (CONTACT_ROLES as readonly string[]).includes(value)
  );
}
