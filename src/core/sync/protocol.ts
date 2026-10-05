// Wire format between the app and the sync Worker (cloud/). Both sides import
// this file, so limits and shapes cannot drift apart.
import type { StoredEvent } from '../storage/schema';

export const SYNC_PROTOCOL = {
  /** Events per upload */
  maxBatch: 100,
  /** Request body limit, bytes */
  maxBody: 64 * 1024,
  /** Events per download page */
  pageSize: 500,
  /** Events stored per key */
  maxEventsPerKey: 50_000,
} as const;

/** POST /v1/events */
export interface UploadRequest {
  events: StoredEvent[];
}

/** Both lists are final: the client stops resending them. */
export interface UploadResponse {
  accepted: string[];
  /** Failed validation on the server; resending would not help */
  rejected: string[];
}

/** GET /v1/events?after=<cursor> */
export interface DownloadResponse {
  events: StoredEvent[];
  cursor: number;
  more: boolean;
}

/** DELETE /v1/account */
export interface DeleteResponse {
  deleted: number;
}
