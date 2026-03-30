export type RestrictionKey =
  | 'blurProfiles'
  | 'disableMessages'
  | 'blurEventAddress'
  | 'limitEventCreation'
  | 'limitParticipants'
  | 'limitRegistrations'
  | 'disableSearch';

export const DEFAULT_RESTRICTIONS: Record<RestrictionKey, boolean> = {
  blurProfiles: true,
  disableMessages: true,
  blurEventAddress: false,
  limitEventCreation: true,
  limitParticipants: true,
  limitRegistrations: true,
  disableSearch: true,
};
