# WhatsApp pelo Twilio, um número do Caishen e só sobre as finanças

> Substituído pelo ADR 0019 na parte do Twilio: vamos direto na Cloud API da Meta, só respondendo.

O Caishen atende pelo WhatsApp com a API oficial do WhatsApp Business, através do Twilio. O Twilio tem sandbox para testar no mesmo dia, enquanto a verificação da conta Meta Business corre, e cuida do cadastro do número (WhatsApp Sender). Em troca, cobra uma taxa por mensagem além da tarifa da Meta. Descartamos as APIs não oficiais (Z-API, Evolution e outras, que entram por QR code num WhatsApp comum): violam os termos do WhatsApp, o número pode ser banido e é o tipo de acesso que o ADR 0009 recusa. Falamos com o Twilio por REST, sem SDK, como fazemos com o Stripe (ADR 0011).

Há um número só, o do Caishen, para todos os Usuários. O Usuário conecta o WhatsApp em Integrações: o botão abre `wa.me` com um código de uso único, e a primeira mensagem com esse código liga o número de telefone ao Usuário e à Organização. Como a conversa começa pelo Usuário, não há template pago nem SMS. A partir daí, cada mensagem que chega de um número ligado é uma Mensagem numa Conversa "WhatsApp" do Usuário, que também aparece no app. Ela passa pelo mesmo `replyInConversation`, pelos mesmos Limites do Plano e pelas mesmas Propostas (ADR 0013). Os botões de resposta rápida do WhatsApp confirmam ou cancelam uma Proposta, e "sim" ou "não" por texto também funcionam. Esses botões não precisam de aprovação dentro da janela de 24 horas aberta pelo Usuário.

O webhook confere a assinatura do Twilio, responde na hora e processa depois da resposta (`waitUntil` na Vercel, ADR 0012). Ignora mensagens repetidas pelo `MessageSid`.

Desde janeiro de 2026, a Meta não aceita chatbots de IA "de propósito geral" na API, só bots de uma tarefa. No WhatsApp, o Caishen é o financeiro do Usuário: registra lançamentos, confirma Propostas, responde sobre as finanças dele e manda Avisos. Recusa o resto. Essa regra fica no prompt do canal.

Áudio e foto viram texto ou Proposta antes de chegar ao Bot. O áudio é transcrito por um Modelo de transcrição do OpenRouter. A foto de um comprovante vai a um Modelo com visão, que propõe o Gasto. O arquivo não é guardado; fica só o registro confirmado. Os Avisos proativos (parcela vencendo, fatura alta) saem da conversa iniciada pelo Usuário: são templates de utilidade aprovados pela Meta, pagos por mensagem, mandados só a quem aceitou recebê-los ao conectar, no Cron diário.
