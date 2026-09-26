# mny

Organizador financeiro. Cadastre Titulares, suas Fontes de Renda, Operações de Crédito
(empréstimos e financiamentos) e Cartões. O mny calcula a tabela de amortização (Price/SAC),
a Taxa Implícita e o Saldo Devedor, compara sua taxa com a média de mercado do Bacen e gera uma
Avaliação de crédito: um Score de 0 a 1000 nas faixas do SPC, com cada Operação classificada no
Estágio da Resolução CMN 4.966 pelos dias de Atraso (ADR 0005). Anotações colaborativas em tempo real ficam ao lado de tudo.

Glossário em [`CONTEXT.md`](./CONTEXT.md), decisões em [`docs/adr/`](./docs/adr).

## Rodando

Requisitos: Node 24.13, pnpm 11, Docker.

```sh
cp .env.example .env
pnpm install
pnpm infra:up      # Postgres no Docker (porta 5433)
pnpm db:migrate
pnpm dev           # server :4000 · collab :4001 · client http://localhost:5173
```

Para subir tudo em containers: `docker compose up --build` e acesse http://localhost:5173.

## Estrutura

| Pacote | O que é |
| --- | --- |
| `apps/server` | API GraphQL + autenticação (Better Auth com Organizações) |
| `apps/collab` | Servidor Hocuspocus das Anotações (Yjs) |
| `packages/client` | Web app React + Tiptap |
| `packages/finance` | Matemática financeira pura, com testes |
| `packages/database` | Schema Drizzle e migrations |
| `packages/auth` | Instância do Better Auth compartilhada |
| `packages/graphql` | Schema, operações e tipos gerados |

## Fontes de dados

- **Bacen SGS** (Selic, CDI, IPCA) e **taxas de juros por modalidade** (Olinda): APIs abertas,
  sem chave. Cache de 6h no servidor.
- **Registrato**: modelado como Fonte com Consentimento; importação do relatório ainda não
  implementada.

## Próximos passos

- Importar o relatório do Registrato (SCR) como Fonte.
- Importar Scores Declarados automaticamente (hoje são digitados).
- Interface para Amortização Extraordinária (o cálculo já suporta).
- Compras parceladas no Cartão.
- Operações pós-fixadas (IPCA/TR) e CET.
- Insights com IA sobre as finanças e Anotações de um Titular.
