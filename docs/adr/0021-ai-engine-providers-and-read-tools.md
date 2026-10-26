# Um motor de IA próprio, vários provedores e ferramentas de leitura

O Caishen respondia "não sei" a quase tudo que não estivesse pronto no prompt. Três motivos:
- O prompt mandava usar só os dados e não fazer contas, sem dar ferramenta nenhuma para ler ou simular.
- Os Gastos nem estavam nos dados.
- O padrão era o `openrouter/free`, que troca de Modelo a cada chamada.

Além disso, o cliente do OpenRouter era código nosso, preso a um provedor só.

**O motor vira um package, `@zapbots/ai`.** Ele guarda os provedores, o catálogo dos Modelos diretos, os erros em pt-BR e o loop do agente (`runAgent`). Usa o AI SDK por baixo. Não conhece banco nem domínio: recebe as chaves, as mensagens e as ferramentas, e devolve o texto. O server continua falando com ele só por `services/models.ts` (`talk`, `listModels`, `defaultModel`). O loop é nosso, uma chamada por rodada, para manter três comportamentos:
- a última rodada vai sem ferramentas, para o Modelo terminar em texto;
- um Modelo que recusa ferramentas responde de novo só lendo;
- o segundo Modelo dos Workflows tenta outra vez.

O AI SDK não faz retentativas (`maxRetries: 0`), porque a decisão é nossa.

**Os Modelos podem vir de quatro provedores.** O OpenRouter segue como padrão, e os outros entram quando o servidor tem a chave:

| Provedor | Variável |
| --- | --- |
| Anthropic | `ANTHROPIC_API_KEY` |
| Google | `GEMINI_API_KEY` |
| OpenAI | `OPENAI_API_KEY` |

A tabela `bot` guarda o Modelo como antes. Um id com prefixo (`anthropic:claude-haiku-5-5`) vai direto ao provedor. Qualquer outro é do OpenRouter, então os ids já salvos continuam valendo.

Os Modelos diretos não têm lista pública, por isso ficam num catálogo no código (`packages/ai/src/catalog.ts`): nome, ferramentas e visão. Cada provedor trata dois casos do seu jeito:
- **PDF:** vai como arquivo nativo do provedor. O `file-parser` do OpenRouter (ADR 0017) só vale lá.
- **Nota do app no meio da Conversa:** segue como mensagem de sistema só no OpenRouter, como sempre foi. Nos provedores diretos ela vira uma fala do usuário (`forProvider`): o Gemini recusa system depois do começo, e nos outros isso não foi testado com chave de verdade.

Isto substitui a parte do ADR 0009 que dizia "uma única chave no servidor (`OPENROUTER_API_KEY`)". As variáveis da tabela acima deram lugar às chaves de cada Organização, coladas em Integrações (ADR 0022).

**O Bot ganha ferramentas de leitura e simulação.** São quatro:
- `period_summary`: o período, por categoria;
- `list_expenses`: os Gastos filtrados;
- `simulate_prepayment`: uma Amortização Extraordinária;
- `payoff_plan`: o Plano de Quitação.

A descrição e os argumentos de cada uma ficam em `@zapbots/finance` (`tools.ts`), sem I/O. O que elas fazem fica no server (`services/bots/tools.ts`). Leem só o Titular da sessão (`viewerHolder`), nunca um id que venha do Modelo, e respondem com o dinheiro já formatado, calculado por `@zapbots/finance`. Continua valendo o ADR 0004: o Modelo cita, não calcula. O ADR 0009 dizia que não há ferramenta de Modelo, e o 0013 abriu só as de propor. As de leitura são a terceira categoria e não gravam nada.

Os Workflows passam a usar o mesmo prompt e as mesmas ferramentas de leitura do chat, mas não propõem: uma Proposta precisa de uma Conversa para ser confirmada.

**O prompt sai do server.** Ele vai para `@zapbots/finance` (`prompt.ts`), em seções:
- como falar;
- o tamanho da resposta pelo tipo de pergunta;
- o que é dado da pessoa e o que é conceito, que o Bot explica com o que sabe, sem recomendar produto de investimento;
- as contas;
- as ferramentas;
- erros comuns com o certo;
- exemplos.

O server só junta os dados e chama `caishenInstructions`.
