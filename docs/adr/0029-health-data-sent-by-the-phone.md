# Os dados de saúde chegam do celular, por um endereço secreto

O Apple Health e o Health Connect (onde o Samsung Health, o Garmin Connect, o Fitbit, a Withings e o Oura gravam no Android) não têm API na web: só um app instalado no celular lê os dados. O Samsung Health não tem API pública, e a da Garmin pede aprovação comercial.

**O celular manda; o Caishen recebe** (`health_inbox`, `services/fitness/health.ts`). Cada User cria em Integrações um endereço secreto, `POST /api/health/<token>`, e o cola num app que já envia esses dados a uma URL:
- no iPhone, o **Health Auto Export** (automação REST API, JSON);
- no Android, o **HC Webhook** (código aberto), que lê o Health Connect.

Os dois formatos são lidos por `readHealthPayload` em `@zapbots/fitness`, e o do HC Webhook serve também para um Atalho do iPhone. Não fizemos um app nosso: seria publicar e manter dois apps nas lojas antes de saber se alguém usa.

**O que entra vira o que Fitness já tem**: passos (o total do dia, `activity_day`, novo), peso e gordura corporal (Medidas, um por dia), a noite (Sono, uma por manhã) e os treinos (Treinos, com distância e kcal nas observações). Batimentos e o resto ficam de fora até terem tela. Cada leitura guarda como se chama lá (`external_id`, único por Organização), então mandar de novo o mesmo dia corrige em vez de duplicar; os passos nunca diminuem num reenvio, porque um envio pode contar só parte do dia. Os números chegam em JSON com casas decimais e passam a inteiros pelo texto (`parseDecimal`), como os digitados.

**O endereço só recebe**: quem o tiver pode mandar dados para a conta, nunca ler. Trocar o endereço desliga o antigo; desligar não apaga o que já chegou. O corpo vai até 4 MB (a Vercel corta em 4,5 MB), por isso os apps mandam um dia ou uma semana por vez, agrupados por dia.

Dados de saúde são sensíveis (LGPD, art. 11): ficam só com o User, não vão a nenhum modelo de IA e saem com a conta.
