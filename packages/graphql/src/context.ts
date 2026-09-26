import type { Viewer } from '@mny/auth';

export interface Context {
  viewer: Viewer | null;
}
