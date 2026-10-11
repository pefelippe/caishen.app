# mny

Organizador pessoal com quatro Áreas, cada uma com um Buddy de IA que conhece os dados dela:

- **Finanças**: Fontes de Renda, Operações de Crédito (empréstimos e financiamentos) e Cartões. O
  mny calcula a tabela de amortização (Price/SAC), a Taxa Implícita e o Saldo Devedor, compara sua
  taxa com a média de mercado do Bacen e gera uma Avaliação de crédito: um Score de 0 a 1000 nas
  faixas do SPC, com cada Operação no Estágio da Resolução CMN 4.966 (ADR 0005).
- **Anotações**: texto rico e colaborativo em tempo real, com Anexos do Google Drive.
- **Trabalho**: Tarefas com prazo, status e Projeto opcional.
- **Fitness**: Treinos e uma Meta Semanal.

A página **Hoje** resume as quatro. No **Chat**, o Buddy geral enxerga todas as Áreas. Os Buddies
leem os dados e executam Ações simples (criar Tarefa, registrar Treino, criar Anotação); nunca
alteram valores (ADR 0008).

Glossário em [`CONTEXT.md`](./CONTEXT.md), decisões em [`docs/adr/`](./docs/adr).

## Rodando

Requisitos: Node 24.13, pnpm 11, Docker.

```sh
cp .env.example .env
pnpm install
pnpm infra:up      # Postgres no Docker (porta 5433)
pnpm db:migrate
pnpm db:seed       # opcional: dados realistas para o usuário demo
pnpm dev           # server :4000 · collab :4001 · client http://localhost:5173
```

O login é só com Google. Antes do primeiro `pnpm dev`, crie um OAuth Client do tipo "Web
application" no [Google Cloud Console](https://console.cloud.google.com/apis/credentials) com a
origem `http://localhost:5173` e a redirect URI `http://localhost:5173/api/auth/callback/google`,
e preencha `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` no `.env`.

Sem credenciais do Google, use o **modo demo**: com `DEMO_MODE=true` no `.env`, a tela de login
mostra "Entrar na demo", que entra como um Usuário compartilhado (`demo@mny.local`, na
"Organização Demo", criada no primeiro uso). O Postgres continua necessário. Nunca ative em produção.

Os Buddies usam o [OpenRouter](https://openrouter.ai/keys): uma chave em `OPENROUTER_API_KEY` dá
acesso a Modelos de vários fornecedores, inclusive gratuitos, e o Modelo de cada Buddy é escolhido
na página Buddies. Sem a chave, no modo demo os Buddies usam um Modelo de demonstração, sem IA: ele resume os dados
e executa Ações em pedidos diretos ("crie uma tarefa para…"). Fora do modo demo ficam em silêncio. Modelos gratuitos têm
limite diário de uso.

A Conexão com o Google Drive exige login com Google (não funciona no modo demo), a Google Drive API
e a Google Picker API habilitadas no projeto, e `VITE_GOOGLE_API_KEY` e `VITE_GOOGLE_APP_ID` no
`.env`. O mny pede só o escopo `drive.file`: enxerga apenas os arquivos escolhidos no seletor.

Para subir tudo em containers: `docker compose up --build` e acesse http://localhost:5173.

## Estrutura

| Pacote | O que é |
| --- | --- |
| `apps/server` | API GraphQL, autenticação (Better Auth) e o chat dos Buddies |
| `apps/collab` | Servidor Hocuspocus das Anotações (Yjs) |
| `packages/client` | Web app React + shadcn/ui + Tiptap |
| `packages/finance` | Matemática financeira pura, com testes |
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
- Interface para Amortização Extraordinária (o cálculo já suporta).
- Compras parceladas no Cartão.
- Operações pós-fixadas (IPCA/TR) e CET.
- Conexão com o Spotify.
- Compartilhar uma Área com outra pessoa (a Organização já existe por baixo, ADR 0007).
- Hábitos e peso em Fitness; quadro kanban em Trabalho.
