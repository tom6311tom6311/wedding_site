export function normalizePhone(input: string) {
  const compact = input.trim().replace(/[\s().-]/g, "");

  if (/^09\d{8}$/.test(compact)) {
    return compact;
  }

  throw new Error("Invalid cellphone number");
}

export function maskPhone(normalizedPhone: string) {
  return `${normalizedPhone.slice(0, 4)}***${normalizedPhone.slice(-4)}`;
}
