# Google Tarefas copiadas, num sentido só, para as Tarefas

Quem usa o Gmail e o Google Agenda guarda tarefas no Google Tarefas. Para elas aparecerem com as outras (na Agenda, no Hoje, no Agente), viram Tarefas daqui.

**A conta Google do User, com mais um escopo**: `tasks.readonly`, pedido em Integrações por `linkSocial`, como o Drive pede o `drive.file`. Só leitura, porque os Bots não escrevem fora do zapbots (ADR 0009). O token vem de Better Auth (`services/google.ts`, que o Drive também usa), que o renova.

**Num sentido só** (`services/personal/googleTasks.ts`, `syncGoogleTasks`): cada lista de lá vira uma Lista (`task_list.external_id = google:<id>`) e cada tarefa aberta uma Tarefa (`task.external_id`). Num novo ler, as que já estão aqui seguem o título, as notas e o dia de lá, ficam feitas quando são feitas lá e saem quando são apagadas lá. O que o User faz aqui fica aqui: marcar como feita aqui não reabre nem fecha nada lá, e uma feita aqui nunca é reaberta por lá. As que já estavam feitas antes da primeira leitura não entram.

**Quando lê**: ao abrir Tarefas, se a última leitura tem mais de 10 minutos, e no botão Ler agora. Não há relógio no servidor para isso; uma falha (o acesso retirado no Google) fica em `integration_sync` e aparece no card.

O escopo de tarefas é sensível para o Google: em produção, o app precisa passar pela verificação dele; até lá só os usuários de teste do projeto conseguem conectar.
