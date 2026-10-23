import type { RecordFieldsQuery } from '@zapbots/graphql/client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type RecordField = RecordFieldsQuery['recordFields'][number];

/** One value of a record, as the User corrects it. */
function FieldInput({
  field,
  id,
  onChange,
  value,
}: {
  field: RecordField;
  id: string;
  onChange: (value: string) => void;
  value: string;
}) {
  if (field.kind === 'SELECT') {
    return (
      <Select onValueChange={onChange} value={value}>
        <SelectTrigger className="h-9 w-full" id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {field.options?.map(option => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  return (
    <Input
      className="h-9"
      id={id}
      inputMode={
        field.kind === 'MONEY' || field.kind === 'PERCENT'
          ? 'decimal'
          : field.kind === 'INTEGER'
            ? 'numeric'
            : undefined
      }
      onChange={event => onChange(event.target.value)}
      type={field.kind === 'DATE' ? 'date' : 'text'}
      value={value}
    />
  );
}

/**
 * The fields of a record (proposed or saved) as the server lists them, typed the way people write
 * them ("1.234,56"); the server reads and checks them, the same for a Proposal and a saved record.
 */
export function RecordFields({
  fields,
  idPrefix,
  onChange,
  values,
}: {
  fields: RecordField[];
  idPrefix: string;
  onChange: (key: string, value: string) => void;
  values: Record<string, string>;
}) {
  return fields.map(field => (
    <div className="flex flex-col gap-1.5" key={field.key}>
      <Label className="text-xs text-muted-foreground" htmlFor={`${idPrefix}-${field.key}`}>
        {field.label}
      </Label>
      <FieldInput
        field={field}
        id={`${idPrefix}-${field.key}`}
        onChange={value => onChange(field.key, value)}
        value={values[field.key] ?? ''}
      />
    </div>
  ));
}
