# Chaves de IA por Organização, coladas em Integrações

Até aqui as chaves dos provedores de Modelo (`OPENROUTER_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `OPENAI_API_KEY`) ficavam no `.env` do servidor e serviam a todo mundo (ADR 0009, 0021). Isso prende a conta de IA ao dono do servidor e obriga a mexer no deploy para trocar uma chave.

**Cada Organização cola as suas chaves no card Modelos de IA de Integrações (`#ai`).** Uma por provedor: OpenRouter, Anthropic, Google e OpenAI. Só donos e administradores trocam ou removem (`setAiKey`, `removeAiKey`, `requireAdmin`); qualquer membro vê quais estão salvas. Sem chave nenhuma, os Bots não respondem e as telas mandam para Integrações; as Rotinas da Organização esperam.

**A exceção é o Modelo gratuito.** Se o servidor tem `OPENROUTER_API_KEY`, uma Organização sem chave do OpenRouter usa essa chave, mas só para os Modelos gratuitos do OpenRouter (o roteador `openrouter/free`, ids `:free` e os de preço zero na lista pública): assim o Caishen funciona de saída, sem o dono do servidor pagar Modelo de ninguém. A lista, o Modelo padrão e o do Bot só oferecem gratuitos nesse caso, e `talk` recusa um pago. Quando a Organização cola a própria chave do OpenRouter, ela vale para tudo. As chaves da Anthropic, do Google e da OpenAI continuam só por Organização.

**As chaves ficam na tabela `ai_key`, seladas com AES-256-GCM**, com um IV aleatório por chave. A chave de cifra sai de `BETTER_AUTH_SECRET` por HKDF (`services/aiKeys.ts`), então não há variável nova. Trocar esse segredo perde as chaves salvas: elas passam a contar como ausentes e precisam ser coladas de novo. Só os quatro últimos caracteres (`last4`) saem do servidor; a chave não vai para a API, os logs nem o Sentry.

`@zapbots/ai` continua sem banco: recebe as chaves (`ProviderKeys`) de quem chama. O server as busca por Organização em `services/models.ts` (`aiConfigured`, `listModels`, `defaultModel` e `talk` recebem o `organizationId`). `OPENROUTER_DEFAULT_MODEL` não é chave e fica no ambiente, valendo quando a Organização tem chave do OpenRouter.

Como a conta é da Organização, o seletor de Modelos mostra também os Modelos diretos, que não são gratuitos. Do OpenRouter seguem só os gratuitos, porque os pagos são centenas.

Isto substitui a parte do ADR 0021 sobre as variáveis de cada provedor.
