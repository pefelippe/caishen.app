import type { Viewer } from '@zapbots/auth';

export interface Context {
  /**
   * The request's `Idempotency-Key` header: one key per action the User started (a payment), kept
   * on every retry of it, so the same action is not done twice.
   */
  idempotencyKey?: string;
  viewer: Viewer | null;
}
