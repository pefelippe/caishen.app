# zapbots

AI teammates: Bots a quem você dá trabalho de verdade. Eles entram nas ferramentas que você
conecta, leem o que precisam e voltam com o trabalho pronto. Só leem: nunca alteram nada lá fora
nem movimentam dinheiro (ADR 0009).

O primeiro Bot é o **Caishen**, o assistente financeiro:

- **Finanças**: Fontes de Renda, Operações de Crédito (empréstimos e financiamentos) e Cartões. O
  zapbots calcula a tabela de amortização (Price/SAC), a Taxa Implícita e o Saldo Devedor, compara a
  taxa com a média de mercado do Bacen e gera uma Avaliação de crédito: um Score de 0 a 1000 nas
  faixas do SPC, com cada Operação no Estágio da Resolução CMN 4.966 (ADR 0005).
- **Conversa**: o Caishen fica ao lado das telas de Finanças e responde sobre o que está nelas.
- **Trabalhos**: você pede um plano ou uma análise, pode entregar arquivos do Google Drive, e ele
  trabalha em segundo plano até a Entrega ficar pronta (ADR 0010).

A página **Equipe** lista os Bots e o Modelo de cada um.

Glossário em [`CONTEXT.md`](./CONTEXT.md), decisões em [`docs/adr/`](./docs/adr).

## Rodando

Requisitos: Node 24.13, pnpm 11, Docker.

```sh
cp .env.example .env
pnpm install
pnpm infra:up      # Postgres no Docker (porta 5433)
pnpm db:migrate
pnpm db:seed       # opcional: dados realistas para o usuário demo
pnpm dev           # server :4000 · client http://localhost:5173
```

O login é só com Google. Antes do primeiro `pnpm dev`, crie um OAuth Client do tipo "Web
application" no [Google Cloud Console](https://console.cloud.google.com/apis/credentials) com a
origem `http://localhost:5173` e a redirect URI `http://localhost:5173/api/auth/callback/google`,
e preencha `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` no `.env`.

Sem credenciais do Google, use o **modo demo**: com `DEMO_MODE=true` no `.env`, a tela de login
mostra "Entrar na demo", que entra como um Usuário compartilhado (`demo@zapbots.local`, na
"Organização Demo", criada no primeiro uso). O Postgres continua necessário. Nunca ative em produção.

Os Bots usam o [OpenRouter](https://openrouter.ai/keys): uma chave em `OPENROUTER_API_KEY` dá
acesso a Modelos de vários fornecedores, inclusive gratuitos, e o Modelo de cada Bot é escolhido na
página Equipe. Sem a chave, no modo demo os Bots usam um Modelo de demonstração, sem IA: ele
responde e entrega Trabalhos com um resumo dos dados. Fora do modo demo ficam em silêncio. Modelos
gratuitos têm limite diário de uso.

A Conexão com o Google Drive exige login com Google (não funciona no modo demo), a Google Drive API
e a Google Picker API habilitadas no projeto, e `VITE_GOOGLE_API_KEY` e `VITE_GOOGLE_APP_ID` no
`.env`. O zapbots pede só o escopo `drive.file`: enxerga apenas os arquivos escolhidos no seletor.

Para subir tudo em containers: `docker compose up --build` e acesse http://localhost:5173. Para os
dados de demonstração: `docker compose exec server pnpm db:seed`.

## Estrutura

| Pacote | O que é |
| --- | --- |
| `apps/server` | API GraphQL, autenticação (Better Auth), chat e Trabalhos dos Bots |
| `packages/client` | Web app React + shadcn/ui |
| `packages/bots/finance` | O Caishen: entrada no catálogo e matemática financeira pura, com testes |
| `packages/database` | Schema Drizzle e migrations |
| `packages/auth` | Instância do Better Auth compartilhada |
| `packages/graphql` | Schema, operações e tipos gerados |

## Fontes de dados

- **Bacen SGS** (Selic, CDI, IPCA) e **taxas de juros por modalidade** (Olinda): APIs abertas,
  sem chave. Cache de 6h no servidor.
- **Registrato**: vira um Retrato SCR (ADR 0006), com Consentimento obrigatório. Hoje é preenchido
  a partir do relatório; a leitura automática do PDF aguarda uma amostra real do layout.

## Próximos passos

- Ler o PDF do Registrato automaticamente (parser + upload com hash, descartando o arquivo).
- Usar a faixa "a vencer em até 30 dias" do SCR no Comprometimento de Renda.
- Importar Scores Declarados automaticamente (hoje são digitados).
- Compras parceladas no Cartão.
- Operações pós-fixadas (IPCA/TR) e CET.
- Conexões com Gmail e Open Finance, para o Caishen ler extratos e faturas sozinho (só leitura).
- Ler PDFs entregues num Trabalho (hoje só Google Docs e arquivos de texto).
- Uma fila de Trabalhos fora do processo do servidor, quando eles ficarem longos (ADR 0010).
- Os próximos Bots do catálogo.
