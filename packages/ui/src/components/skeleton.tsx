import { cn } from '@zapbots/ui/lib/utils';

/**
 * Shown only after 300ms (`.skeleton` in globals.css), so a quick load never flashes grey. `inline`
 * makes it a <span>, to stand in for text inside a heading or a paragraph.
 */
function Skeleton({
  className,
  inline = false,
  ...props
}: React.ComponentProps<'div'> & { inline?: boolean }) {
  const Tag = inline ? 'span' : 'div';
  return (
    <Tag
      data-slot="skeleton"
      className={cn('skeleton rounded-md bg-accent', className)}
      {...props}
    />
  );
}

export { Skeleton };
