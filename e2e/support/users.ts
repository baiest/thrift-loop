// Not real credentials — match apps/api/scripts/seed-e2e.ts's fixed, local-only test users.
// eslint-disable-next-line sonarjs/no-hardcoded-passwords
export const SELLER = { phone: '3010000001', password: 'Password123' };
// eslint-disable-next-line sonarjs/no-hardcoded-passwords
export const BIDDER = { phone: '3010000002', password: 'Password123' };

export const SELLER_STORAGE_STATE = 'e2e/.auth/seller.json';
export const BIDDER_STORAGE_STATE = 'e2e/.auth/bidder.json';
