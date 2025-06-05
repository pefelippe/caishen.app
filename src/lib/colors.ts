export const colors = {
  primary: '#061B78',
  base: {
    100: '#FFFFFF',
    200: '#F3F4F6',
    300: '#E5E7EB',
  },
  content: {
    primary: '#111827',
    secondary: '#6B7280',
  },
} as const

export type ColorKey = keyof typeof colors
export type BaseColorKey = keyof typeof colors.base
export type ContentColorKey = keyof typeof colors.content 