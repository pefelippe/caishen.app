import { useMutation } from '@apollo/client/react';
import {
  GrantConsentDocument,
  HolderDocument,
  type DataSource,
  type HolderQuery,
} from '@mny/graphql/client';

type Holder = NonNullable<HolderQuery['holder']>;

const SOURCES: { description: string; label: string; source: DataSource }[] = [
  {
    description:
      'Relatório do SCR que você baixa gratuitamente em gov.br/registrato. Mostra todas as operações de crédito em seu nome.',
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
    <section className="banner stack">
      <strong>Quanto mais dados, mais precisa a Avaliação</strong>
      {missing.length > 0 && <span>Ainda faltam: {missing.join(', ')}.</span>}
      {pending.map(item => (
        <div className="row between" key={item.source}>
          <span>
            <strong>{item.label}:</strong> {item.description}
          </span>
          <button
            className="secondary"
            onClick={() => void grant({ variables: { holderId: holder.id, source: item.source } })}
            type="button"
          >
            Autorizar consulta
          </button>
        </div>
      ))}
    </section>
  );
}
