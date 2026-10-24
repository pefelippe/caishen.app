import { createLucideIcon } from 'lucide-react';

/** The Agente's mark: a four-point star with a small one beside it, filled in the current color. */
export const AgentIcon = createLucideIcon('Agent', [
  [
    'path',
    {
      d: 'M10 5Q11 13 19 14Q11 15 10 23Q9 15 1 14Q9 13 10 5Z',
      fill: 'currentColor',
      key: 'star',
      stroke: 'none',
    },
  ],
  [
    'path',
    {
      d: 'M18.5 1Q19 5 23 5.5Q19 6 18.5 10Q18 6 14 5.5Q18 5 18.5 1Z',
      fill: 'currentColor',
      key: 'mini',
      stroke: 'none',
    },
  ],
]);
