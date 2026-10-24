import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/** A figure typed into a calculator: its label, the field on a soft ground, a unit and a hint. */
export function CalcField({
  hint,
  id,
  label,
  onChange,
  suffix,
  value,
}: {
  hint?: string;
  id: string;
  label: string;
  onChange: (value: string) => void;
  suffix?: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2 rounded-xl bg-muted px-3">
        <Input
          className="h-11 border-0 bg-transparent px-0 tabular-nums shadow-none focus-visible:ring-0"
          id={id}
          inputMode="decimal"
          onChange={event => onChange(event.target.value)}
          value={value}
        />
        {suffix && <span className="shrink-0 text-sm text-muted-foreground">{suffix}</span>}
      </div>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}
