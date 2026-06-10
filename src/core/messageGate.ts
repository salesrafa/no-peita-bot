/**
 * Decides whether an incoming WhatsApp message should be handled.
 * Pure: only commands (starting with "/") are handled, and outside production
 * only messages from allowed contacts.
 */
export function shouldHandleMessage(
  body: string,
  from: string,
  environment: string,
  allowedContacts: string[],
): boolean {
  if (!body.startsWith('/')) return false;
  if (environment !== 'prod' && !allowedContacts.includes(from)) return false;
  return true;
}
