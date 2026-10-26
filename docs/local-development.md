# Rodando localmente

## Requisitos

- Node 24.13 (`.nvmrc`)
- pnpm 11
- Docker (no Windows, o Docker Desktop)

## Jeito rápido: `pnpm tui`

```sh
pnpm tui            # prepara tudo e sobe server + client
pnpm tui --skip-install
```

O `pnpm tui` (`scripts/tui.mts`, Node puro, sem dependências) faz, em ordem:

1. **.env**: se não existir, copia o `.env.example`.
2. **Docker**: se não estiver rodando, abre o Docker Desktop no Windows e espera até 3 minutos.
3. **Dependências**: `pnpm install`.
4. **Postgres**: `docker compose up -d --wait postgres`, na porta 5433.
5. **Migrações**: `pnpm db:migrate`.
6. **GraphQL codegen**: `pnpm codegen`.
7. **Portas**: confere se a 4000 e a 5173 estão livres.

Se uma etapa falhar, ele mostra o fim da saída do comando e para. Depois abre uma tela com os logs
do server (http://localhost:4000) e do client (http://localhost:5173):

| Tecla | O que faz |
| --- | --- |
| `1` `2` `3` | logs de tudo, só do server, só do client |
| `r` | reinicia o que está na aba (em "tudo", os dois) |
| `o` | abre http://localhost:5173 no navegador |
| `↑` `↓` `PgUp` `PgDn` | rola o log; `End` volta a seguir |
| `q` ou `Ctrl+C` | para server e client |

Ao sair, o Postgres continua no Docker. Para desligar: `pnpm infra:down`.

## Passo a passo, sem o tui

```sh
cp .env.example .env
pnpm install
pnpm infra:up      # Postgres no Docker (porta 5433)
pnpm db:migrate
pnpm dev           # server :4000 · client http://localhost:5173
```

Tudo em containers: `docker compose up --build`.

## O `.env`

| Variável | Para quê | Sem ela |
| --- | --- | --- |
| `RESEND_API_KEY`, `EMAIL_FROM` | link de acesso enviado por e-mail | o link aparece no terminal do servidor |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | login com Google | sem o botão do Google |
| `OPENROUTER_API_KEY` | Modelos gratuitos do OpenRouter para quem não colou chave em Integrações (ADR 0022) | Bots só com as chaves coladas em Integrações |
| `VITE_GOOGLE_API_KEY`, `VITE_GOOGLE_APP_ID` | seletor de arquivos do Google Drive | Integração com o Drive desligada |
| `STRIPE_SECRET_KEY`, `STRIPE_PRICE_PRO`, `STRIPE_WEBHOOK_SECRET` | Plano Pro | tudo no Plano Gratuito |

Para o Google: crie um OAuth Client do tipo "Web application" no
[Google Cloud Console](https://console.cloud.google.com/apis/credentials), com a origem
`http://localhost:5173` e a redirect URI `http://localhost:5173/api/auth/callback/google`.

Para o Stripe local: `stripe listen --forward-to localhost:4000/api/billing/webhook`.

## Problemas comuns

- **Porta ocupada**: outro `pnpm dev`, `pnpm tui` ou o `docker compose up` completo já está usando a
  4000 ou a 5173. Pare-o antes.
- **Docker não responde**: abra o Docker Desktop
  (`%LOCALAPPDATA%\Programs\DockerDesktop\Docker Desktop.exe`) e rode de novo.
