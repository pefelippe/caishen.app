# Organizador pessoal sobre o modelo de Organizações

O mny virou um organizador pessoal, mas Organização e Titular continuam no banco. Cada Usuário ganha uma Organização pessoal no primeiro login, e a tela de Finanças usa um Titular implícito: o que já está ligado ao Usuário, senão o mais antigo da Organização, senão um novo. Nenhum dos dois aparece na interface, e não há convite de Membros no MVP.

A alternativa era migrar tudo para pertencer direto ao Usuário. Descartamos porque desfaria os ADRs 0001 e 0002, exigiria reescrever o escopo de toda query (`viewer.organizationId`) e a autorização do collab, e fecharia a porta para compartilhar uma Área com outra pessoa depois. O custo de manter é ter no código um conceito que o usuário não vê; quem ler `organizationId` em Tarefas e Treinos deve entender que é o mesmo isolamento de sempre, não um recurso multiusuário ativo.

**Atualização (outubro de 2026):** a Organização passou a aparecer nas Configurações (nome, Usuários, Plano), porque o Plano e a Assinatura pertencem a ela (ADR 0011). Fora das Configurações ela continua invisível, e convidar Membros segue fora do escopo.

**Atualização (outubro de 2026, 2):** as Configurações deixaram de existir. A Organização ganhou página própria no menu (nome e Usuários), e o Plano também. Convidar Membros continua fora do escopo: a página só mostra quem já está na Organização.

**Atualização (outubro de 2026, 3):** Pessoal (Tarefas, Notas, Agenda e Metas) chegou assim: cada linha tem `organization_id`, filtrado por `owned()` como em Finanças, e um `created_by_id` que só diz quem escreveu. Dias e horas são os do relógio do Usuário (`user.timezone`, escolhido em Perfil): a data é um dia simples e a hora um "HH:MM", sem fuso guardado. Só a arrumação da Página inicial (`home_layout`) é de cada Usuário.
