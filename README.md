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
- **Workflows**: você pede um plano ou uma análise e pode entregar arquivos do Google Drive (Google
  Docs, PDFs com texto, arquivos de texto). Ele trabalha em segundo plano, a Entrega aparece
  enquanto é escrita, dá para cancelar no meio, e um Workflow que falhou pode ser pedido de novo
  (ADR 0010). Se o Modelo escolhido falhar do lado dele, o Workflow tenta uma vez com o Modelo
  padrão. Cada Organização tem no máximo 3 Workflows em andamento.
- **Rotinas**: o mesmo Workflow toda semana ou todo mês, com os dados do dia; podem ser pausadas.
- **Avisos**: o que está em atraso, o que vence em 7 dias, Cartão perto do limite, taxas bem acima
  do mercado e Avaliação desatualizada, calculados sem IA.
- **Simulação**: na tela de cada Operação, quanto uma Amortização Extraordinária economiza em juros
  e Parcelas.
- **Plano de Quitação**: com um valor fixo por mês sempre na Operação de maior taxa, quando você
  fica sem dívidas e quanto economiza.

O Caishen recebe os números já calculados (juros que faltam, efeito de uma Amortização
Extraordinária, comparação com a Taxa Média de Mercado, Faturas, Indicadores e variação do Score,
Plano de Quitação e os próprios Avisos) e
lembra das últimas Entregas que fez.

A página **Equipe** lista os Bots, os Avisos, os últimos Workflows e o Modelo de cada um.

Glossário em [`CONTEXT.md`](./CONTEXT.md), decisões em [`docs/adr/`](./docs/adr).

## Rodando

Requisitos: Node 24.13, pnpm 11, Docker.

O jeito rápido é `pnpm tui`: ele cria o `.env`, abre o Docker, instala, sobe o Postgres, migra e
mostra server e client numa tela só. Detalhes em [`docs/local-development.md`](./docs/local-development.md).
Na mão:

```sh
cp .env.example .env
pnpm install
pnpm infra:up      # Postgres no Docker (porta 5433)
pnpm db:migrate
pnpm dev           # server :4000 · client http://localhost:5173
```

O login não tem senha: você informa o e-mail e recebe um link de acesso. Com `RESEND_API_KEY` no
`.env` o link vai por e-mail (pelo [Resend](https://resend.com)); sem ela, aparece no terminal do
servidor e, rodando em `localhost`, a própria tela de login oferece o botão para entrar.

O login com Google é opcional. Para ligá-lo, crie um OAuth Client do tipo "Web application" no [Google Cloud Console](https://console.cloud.google.com/apis/credentials) com a
origem `http://localhost:5173` e a redirect URI `http://localhost:5173/api/auth/callback/google`,
e preencha `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` no `.env`.

Os Bots usam as chaves de IA que cada Organização cola em Integrações (ADR 0022): OpenRouter
(Modelos de vários fornecedores, inclusive gratuitos), Anthropic, Google ou OpenAI. O Modelo de cada
Bot é escolhido no mesmo card. Sem chave, os Bots ficam em silêncio e as telas explicam o que falta.
Modelos gratuitos têm limite diário de uso.

A Integração com o Google Drive exige login com Google, a Google Drive API
e a Google Picker API habilitadas no projeto, e `VITE_GOOGLE_API_KEY` e `VITE_GOOGLE_APP_ID` no
`.env`. O zapbots pede só o escopo `drive.file`: enxerga apenas os arquivos escolhidos no seletor.

A cobrança do Plano Pro usa o [Stripe](https://dashboard.stripe.com/test/apikeys): preencha
`STRIPE_SECRET_KEY`, `STRIPE_PRICE_PRO` (um Price mensal recorrente) e `STRIPE_WEBHOOK_SECRET`, e
encaminhe os eventos com `stripe listen --forward-to localhost:4000/api/billing/webhook`. Sem as
chaves, tudo roda no Plano Gratuito. Códigos de uso: `pnpm usage-code CODIGO --jobs 20 --messages 200`.

Para subir tudo em containers: `docker compose up --build` e acesse http://localhost:5173.

## Estrutura

| Pacote | O que é |
| --- | --- |
| `apps/server` | API GraphQL, autenticação (Better Auth), chat e Workflows dos Bots |
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
- Uma fila de Workflows fora do processo do servidor, quando eles ficarem longos (ADR 0010).
- Os próximos Bots do catálogo.
