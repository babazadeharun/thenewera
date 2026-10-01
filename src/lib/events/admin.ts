import { requireEventsAdmin } from './authorization';
export async function requireEventsAdminUser() { return requireEventsAdmin(); }
