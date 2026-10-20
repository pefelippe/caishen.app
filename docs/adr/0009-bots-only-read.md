# Bots só leem: entram nas ferramentas pelas Conexões e nunca agem lá fora

No zapbots os Bots "entram nas suas ferramentas", e entram só pelas Conexões que o Usuário autoriza por OAuth (hoje o Google Drive com o escopo `drive.file`; depois Gmail e Open Finance). Nunca guardam senha nem automatizam um navegador com as credenciais do Usuário: senha de banco é risco jurídico e de segurança, e o Open Finance existe para isso.

Lá fora o Bot só lê. Ele não paga, não transfere, não responde e-mail e não grava em arquivo nenhum. Dentro do zapbots ele também não altera nada: não há ferramenta (tool) de Modelo. O Caishen conversa e devolve Entregas em texto, e os números chegam ao Modelo já calculados e formatados por `@zapbots/finance` (ADR 0004). Um Modelo gratuito errando um valor é pior do que não ter a Ação, e a Avaliação depende desses dados.

Os Modelos continuam vindo do OpenRouter com uma única chave no servidor (`OPENROUTER_API_KEY`), escolhidos por Bot. Substitui o ADR 0008, que permitia Ações de criar Tarefa, Treino e Anotação. Essas Áreas saíram do produto (ADR 0010). Uma Ação que grave Obrigações a partir de um documento, se vier, precisa de um novo ADR e passa pelo mesmo serviço e pela mesma validação em centavos das mutations.
