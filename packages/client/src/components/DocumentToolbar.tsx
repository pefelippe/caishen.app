import { useEditorState, type Editor } from '@tiptap/react';
import {
  BoldIcon,
  Heading1Icon,
  Heading2Icon,
  ItalicIcon,
  ListIcon,
  ListOrderedIcon,
  PilcrowIcon,
  Redo2Icon,
  Undo2Icon,
  type LucideIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

import { useI18n, type StringKey } from '../lib/i18n';

/** The few marks a plan needs: text, two heading levels, bold, italic and lists. */
export function DocumentToolbar({ editor }: { editor: Editor }) {
  const { t } = useI18n();
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current.isActive('bold'),
      bulletList: current.isActive('bulletList'),
      canRedo: current.can().redo(),
      canUndo: current.can().undo(),
      h1: current.isActive('heading', { level: 1 }),
      h2: current.isActive('heading', { level: 2 }),
      italic: current.isActive('italic'),
      orderedList: current.isActive('orderedList'),
      paragraph: current.isActive('paragraph'),
    }),
  });
  const chain = () => editor.chain().focus();

  return (
    <div
      aria-label={t('document.toolbar')}
      className="flex flex-wrap items-center gap-0.5 border-b bg-card px-4 py-1.5"
      role="toolbar"
    >
      <Tool
        disabled={!state.canUndo}
        icon={Undo2Icon}
        label="document.undo"
        onClick={() => chain().undo().run()}
      />
      <Tool
        disabled={!state.canRedo}
        icon={Redo2Icon}
        label="document.redo"
        onClick={() => chain().redo().run()}
      />
      <Separator className="mx-1 !h-5" orientation="vertical" />
      <Tool
        active={state.paragraph}
        icon={PilcrowIcon}
        label="document.paragraph"
        onClick={() => chain().setParagraph().run()}
      />
      <Tool
        active={state.h1}
        icon={Heading1Icon}
        label="document.heading"
        level={1}
        onClick={() => chain().toggleHeading({ level: 1 }).run()}
      />
      <Tool
        active={state.h2}
        icon={Heading2Icon}
        label="document.heading"
        level={2}
        onClick={() => chain().toggleHeading({ level: 2 }).run()}
      />
      <Separator className="mx-1 !h-5" orientation="vertical" />
      <Tool
        active={state.bold}
        icon={BoldIcon}
        label="document.bold"
        onClick={() => chain().toggleBold().run()}
      />
      <Tool
        active={state.italic}
        icon={ItalicIcon}
        label="document.italic"
        onClick={() => chain().toggleItalic().run()}
      />
      <Separator className="mx-1 !h-5" orientation="vertical" />
      <Tool
        active={state.bulletList}
        icon={ListIcon}
        label="document.bulletList"
        onClick={() => chain().toggleBulletList().run()}
      />
      <Tool
        active={state.orderedList}
        icon={ListOrderedIcon}
        label="document.orderedList"
        onClick={() => chain().toggleOrderedList().run()}
      />
    </div>
  );
}

function Tool({
  active,
  disabled,
  icon: Icon,
  label,
  level,
  onClick,
}: {
  active?: boolean;
  disabled?: boolean;
  icon: LucideIcon;
  label: StringKey;
  level?: number;
  onClick: () => void;
}) {
  const { t } = useI18n();
  const text = t(label, level ? { level } : undefined);
  return (
    <Button
      aria-label={text}
      aria-pressed={active}
      className={cn(active && 'bg-secondary text-foreground')}
      disabled={disabled}
      onClick={onClick}
      size="icon-sm"
      title={text}
      type="button"
      variant="ghost"
    >
      <Icon />
    </Button>
  );
}
