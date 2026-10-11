# Organizador pessoal sobre o modelo de Organizações

O mny virou um organizador pessoal, mas Organização e Titular continuam no banco. Cada Usuário ganha uma Organização pessoal no primeiro login, e a tela de Finanças usa um Titular implícito: o que já está ligado ao Usuário, senão o mais antigo da Organização, senão um novo. Nenhum dos dois aparece na interface, e não há convite de Membros no MVP.

A alternativa era migrar tudo para pertencer direto ao Usuário. Descartamos porque desfaria os ADRs 0001 e 0002, exigiria reescrever o escopo de toda query (`viewer.organizationId`) e a autorização do collab, e fecharia a porta para compartilhar uma Área com outra pessoa depois. O custo de manter é ter no código um conceito que o usuário não vê; quem ler `organizationId` em Tarefas e Treinos deve entender que é o mesmo isolamento de sempre, não um recurso multiusuário ativo.
