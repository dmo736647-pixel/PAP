export type PrivateAlphaInviteStatus = 'invited' | 'accepted' | 'revoked';

export type PrivateAlphaInviteLike = {
  status: PrivateAlphaInviteStatus;
};

export type PapSession = {
  userId: string;
  email: string;
};

export type GoogleConnectionState =
  | 'logged_out'
  | 'not_invited'
  | 'connected_not_synced'
  | 'syncing'
  | 'synced'
  | 'sync_failed'
  | 'reauthorization_required';
