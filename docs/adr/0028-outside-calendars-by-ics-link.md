# Agendas de fora pelo link .ics, e a Agenda para fora pelo mesmo formato

As pessoas guardam os compromissos no iPhone (iCloud), no Google Agenda ou no Outlook, e o Caishen tem a própria Agenda. Faltava as duas se verem.

**Para dentro, o link secreto de cada agenda** (`external_calendar`, `services/personal/calendars.ts`). Os três serviços dão um endereço .ics que só quem o tem lê: o Calendário Público do iCloud (`webcal://pXX-caldav.icloud.com/published/…`), o "endereço secreto no formato iCal" do Google e o calendário publicado do Outlook. O User cola o link em Integrações; o servidor lê o arquivo (`ical.js`: repetições, exceções e os fusos que o arquivo descreve) e mostra os eventos na Agenda como `EXTERNAL`, no relógio do User, e eles ocupam o horário dos Links de agendamento.

Descartados:
- **CalDAV com senha de app do iCloud**: daria para ler e escrever, mas seria guardar uma senha, o que a ADR 0009 proíbe.
- **OAuth do Google e da Microsoft agora**: escopos de agenda são sensíveis, pedem verificação do app em cada empresa e só cobririam dois dos três. O link cobre os três hoje; o OAuth pode vir depois para o Google, pelo mesmo caminho do Drive.

**O link é um segredo**: fica cifrado (`sealed.ts`, propósito `calendar-url`) e nunca volta ao navegador; a página só vê o nome, o host e quando foi lido. **Só leitura**: nada é escrito lá fora, e os eventos não viram Eventos daqui.

**Ler um link que a pessoa digita é ler a internet a pedido dela** (`services/safeFetch.ts`): só https (webcal:// e http:// viram https://), só endereços públicos, conferidos no endereço a que de fato se conecta, depois do DNS (nada de 127.0.0.1, rede privada ou o serviço de metadados da nuvem), 15 segundos e 5 MB no máximo. Um arquivo lido fica 15 minutos em memória por processo; se o link falhar depois, a última leitura continua aparecendo e o erro fica na agenda para a página mostrar.

**Para fora, a Assinatura da Agenda** (`calendar_feed`, `services/personal/feed.ts`): os Eventos, as Tarefas com prazo e os vencimentos como um .ics num link secreto (`/api/calendar/<token>.ics`), que o iPhone, o Google e o Outlook assinam. As horas vão em UTC, calculadas do fuso do User, para nenhum calendário precisar conhecê-lo. Os eventos que vieram de fora não voltam por ele, para nada aparecer duas vezes nem dar volta. Trocar o link desliga o antigo.
