---
status: superseded by ADR-0009
---

# Buddies pelo OpenRouter, com Ações limitadas

Os Buddies falam com os Modelos pelo OpenRouter, com uma única chave no servidor (`OPENROUTER_API_KEY`). Isso dá vários fornecedores e variantes gratuitas num seletor, sem guardar chaves por Usuário, o que exigiria criptografia de segredos e uma tela de gestão. O Modelo é escolhido por Buddy.

As Ações são só as simples e reversíveis: criar Tarefa, registrar Treino, criar Anotação. Um Buddy nunca cria nem altera Obrigações, Faturas, Fontes de Renda ou qualquer valor: um Modelo gratuito errando um número em Finanças é pior do que não ter a Ação, e a Avaliação depende desses dados. Pelo mesmo motivo o contexto financeiro chega ao Modelo já calculado e formatado por `@zapbots/finance`; o Modelo não faz a conta (ADR 0004).

Modelos que não suportam chamada de ferramentas continuam disponíveis: o Buddy conversa e lê os dados, sem Ações, e a página de Buddies avisa isso ao lado do Modelo.
