const COLOMBIAN_MOBILE_PATTERN = /^3\d{9}$/;

export function isColombianMobilePhone(value: string): boolean {
  return COLOMBIAN_MOBILE_PATTERN.test(value);
}
