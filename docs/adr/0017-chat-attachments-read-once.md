# Anexos no chat vão ao Modelo uma vez e não ficam guardados

No chat, o Usuário anexa planilhas (.csv, .tsv, .xlsx), textos (.txt, .md), imagens e PDFs pelo "+" ao lado do campo. Planilhas e textos são lidos no navegador e chegam ao servidor como texto. Imagens e PDFs chegam como data URLs no mesmo `POST /api/chat/:conversationId`. As imagens são reduzidas no navegador (lado maior de 1600px, JPEG). O pedido aceita até 5 arquivos por Mensagem, até 40 mil caracteres por texto e 3 MB de imagens e PDFs somados. Assim, em base64, ele cabe nos 4,5 MB que a Vercel aceita (ADR 0012). Não há upload separado nem armazenamento de arquivos.

O conteúdo vai ao Modelo só na vez daquela Mensagem. A Mensagem guarda apenas o nome e o tipo de cada Anexo (`message.attachments`). Nas vezes seguintes, o histórico diz "Anexou X; o conteúdo não fica guardado". Seguimos o mesmo princípio do WhatsApp (ADR 0014): a foto do comprovante não é guardada, fica só o registro confirmado. Guardar os arquivos traria armazenamento, custo e dados pessoais (LGPD) que ainda não precisamos ter. A desvantagem é que, numa conversa longa, o Usuário anexa de novo se quiser que o Bot volte ao arquivo.

O texto dos arquivos entra cercado e marcado como conteúdo, não instruções. Uma planilha pode trazer texto escrito para mandar no Modelo. O efeito disso fica limitado porque o Modelo só propõe e quem grava é o Usuário, no Confirmar (ADR 0013).

Imagens precisam de um Modelo com visão. A lista do OpenRouter diz isso em `architecture.input_modalities`. Com um Modelo sem visão, o chat recusa a imagem e diz para escolher outro em Integrações, em vez de descartá-la em silêncio. PDFs passam pelo plugin `file-parser` do OpenRouter, com o motor gratuito `cloudflare-ai`, e por isso qualquer Modelo os lê.

Arquivos do Google Drive e de outros armazenamentos ficam para depois. O menu do "+" já os mostra como "Em breve". Quando vierem, o servidor busca o arquivo pela Conexão (OAuth, ADR 0009) e o passa pelo mesmo caminho: texto ou parte multimodal, uma vez, sem guardar.
