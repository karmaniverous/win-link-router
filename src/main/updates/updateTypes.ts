/**
 * Requirements addressed:
 * - About window must show update status and controls (check/update now).
 * - Keep types small and serializable for IPC.
 */
export type UpdateStage =
  | 'disabled'
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'upToDate'
  | 'error';

export interface UpdateStatus {
  stage: UpdateStage;
  currentVersion: string;
  autoUpdatesEnabled: boolean;
  lastCheckedAt?: string;

  availableVersion?: string;
  downloadedVersion?: string;

  progressPercent?: number;
  message?: string;
}

export interface UpdateStatusResponse {
  status: UpdateStatus;
}
