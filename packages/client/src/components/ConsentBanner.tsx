import { useMutation } from '@apollo/client/react';
import {
  GrantConsentDocument,
  HolderDocument,
  type DataSource,
  type HolderQuery,
} from '@mny/graphql/client';
import { InfoIcon } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

type Holder = NonNullable<HolderQuery['holder']>;

const SOURCES: { description: string; label: string; source: DataSource }[] = [
  {
    description:
      'Relatório do SCR que você baixa gratuitamente em gov.br/registrato. Mostra todas as operações de crédito em seu nome; autorizando, você pode registrar o Retrato SCR aqui.',
    label: 'Registrato (Bacen)',
    source: 'BACEN_REGISTRATO',
  },
];

/**
 * Asks the user to provide more data and to authorize lookups. Recording a Consent is what makes
 * a future integration with a Data Source legitimate.
 */
export function ConsentBanner({ holder }: { holder: Holder }) {
  const [grant] = useMutation(GrantConsentDocument, { refetchQueries: [HolderDocument] });
  const active = new Set(
    holder.consents.filter(consent => !consent.revokedAt).map(consent => consent.source)
  );
  const pending = SOURCES.filter(item => !active.has(item.source));

  const missing = [
    holder.incomeSources.length === 0 && 'Fontes de Renda',
    holder.creditOperations.length === 0 && 'Operações de Crédito',
    holder.creditCards.length === 0 && 'Cartões',
  ].filter(Boolean);

  if (missing.length === 0 && pending.length === 0) return null;

  return (
    <Alert className="border-warning/50">
      <InfoIcon />
      <AlertTitle>Quanto mais dados, mais precisa a Avaliação</AlertTitle>
      <AlertDescription className="gap-3">
        {missing.length > 0 && <p>Ainda faltam: {missing.join(', ')}.</p>}
        {pending.map(item => (
          <div className="flex flex-wrap items-center justify-between gap-2" key={item.source}>
            <p>
              <strong>{item.label}:</strong> {item.description}
            </p>
            <Button
              onClick={() =>
                void grant({ variables: { holderId: holder.id, source: item.source } })
              }
              size="sm"
              variant="outline"
            >
              Autorizar consulta
            </Button>
          </div>
        ))}
      </AlertDescription>
    </Alert>
  );
}
