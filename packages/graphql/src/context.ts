import type { Viewer } from '@zapbots/auth';

export interface Context {
  viewer: Viewer | null;
}
