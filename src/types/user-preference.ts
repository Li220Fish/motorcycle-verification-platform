/**
 * The user's CURRENT usage mode, not a permanent account type — the same
 * person may buy today and sell in six months, so this must stay switchable
 * at any time rather than fixed at signup.
 */
export type UserUsageRole = 'buyer' | 'seller' | 'professional_seller'
