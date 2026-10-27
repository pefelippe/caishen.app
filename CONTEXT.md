# zapbots

Uma equipe de Bots de IA a quem se dá trabalho de verdade: eles entram nas
ferramentas que o Usuário conecta, leem o que precisam e voltam com o trabalho
pronto. O primeiro é o Caishen, o assistente financeiro: ele acompanha as
obrigações de crédito (cartões, empréstimos, financiamentos), calcula juros e
amortização e produz uma avaliação de risco no estilo de um rating bancário.

## Language

### Equipe

**Bot** (`Bot`):
Um colega de IA do catálogo do zapbots, com nome, personalidade e um campo de
trabalho fixos. O Usuário escolhe só o Modelo dele. O Caishen é o Bot de
finanças.
_Avoid_: Buddy, agente, assistente, teammate (só no marketing)

**Caishen** (`FINANCE`, código `finance`):
O Bot de finanças. Lê as Finanças do Titular e os arquivos que recebe, conversa
e faz Workflows sobre elas.
_Avoid_: Cifra (o antigo Buddy de Finanças)

**Equipe**:
Os Bots que um Usuário tem. Hoje é o catálogo inteiro.
_Avoid_: time, workspace

**Workflow** (`Job`):
Um pedido feito a um Bot, que ele faz sozinho e em segundo plano até chegar a
uma Entrega. Está na fila, trabalhando, pronto ou falhou. Um Workflow
interrompido termina como falho e precisa ser pedido de novo.
_Avoid_: tarefa, pedido (como entidade)

**Rotina** (`Routine`):
O mesmo Workflow pedido a um Bot de novo toda semana ou todo mês, com os dados
do dia. A primeira Entrega sai na hora; parar a Rotina não apaga os Workflows
que ela já pediu. Uma Rotina pausada não roda até ser retomada.
_Avoid_: agendamento, recorrência, cron

**Entrega** (`Deliverable`):
O resultado pronto de um Workflow: um texto (um plano, uma análise, um resumo).
O Usuário pode ajustá-lo; a versão que o Bot escreveu fica guardada e pode ser
restaurada. Seu nome é a primeira linha do texto.
_Avoid_: resposta, relatório, output

**Aviso** (`Alert`):
Algo que um Bot aponta sozinho, sem que ninguém peça: uma Parcela em atraso, o
que vence nos próximos 7 dias, uma Fatura que usa 80% ou mais do limite, uma
taxa bem acima da Taxa Média de Mercado, uma Avaliação com mais de 30 dias, uma
Rotina que falhou na última semana. É
calculado a partir dos dados, não escrito por um Modelo.
Cada Usuário pode marcá-lo como lido ou removê-lo do sino; um Aviso que passa a
dizer outra coisa (outra data, outro valor) volta como novo.
_Avoid_: notificação, alerta (como termo do código em pt-BR), Insight

**Conversa** (`Conversation`):
Uma troca salva de Mensagens entre o Usuário e um Bot. Começa e é reaberta no
chat: a página Chat ou o painel ao lado de qualquer tela. Cada Organização tem
também uma Conversa "WhatsApp", que começa na primeira mensagem de um número
ligado e aparece no Agente como as outras.
_Avoid_: chat (é a página e o painel), thread

**Mensagem** (`Message`):
Uma fala do Usuário ou do Bot dentro de uma Conversa.

**Proposta** (`Proposal`):
Um registro (Operação de Crédito, Fonte de Renda, Receita avulsa ou Gasto) que
um Bot oferece criar, ou um já gravado que ele oferece corrigir ou apagar, a partir de uma
Conversa. Fica pendente até o Usuário confirmar ou cancelar; dá para corrigir os
valores no cartão antes, e só a confirmação grava. Uma Proposta nova na mesma
Conversa cancela a pendente.
_Avoid_: ação, sugestão, rascunho

**Modelo** (`Model`):
O modelo de linguagem que um Bot usa.
_Avoid_: IA (como sinônimo de modelo), LLM

### Integrações

**Integração** (`Connection`):
O vínculo, autorizado pelo Usuário, com uma ferramenta de fora em que os Bots
entram por ele. Cada Integração é de uma categoria: Provedores de IA (de onde vêm
os Modelos, hoje o OpenRouter), Armazenamento de arquivos (Google Drive),
Comunicação (WhatsApp), E-mail, Agenda ou Bancos. Os Bots só leem por uma
Integração; o WhatsApp é um canal da Conversa e só responde, nunca inicia.
_Avoid_: conexão, plugin, Fonte (essa é financeira)

**Código de conexão do WhatsApp** (`whatsapp_link_code`):
Seis letras e números, de uso único e válidos por 15 minutos, que o Usuário
gera em Integrações e manda do celular para ligar aquele número a ele.
_Avoid_: token, senha, PIN

**Vínculo bancário** (`BankLink`):
Um banco que o Titular autorizou pelo Open Finance, lido por um provedor (hoje o
Meu Pluggy, só para o dono do servidor, ADR 0020). Os débitos das contas dele
entram como Gastos importados; desconectar leva junto as contas e esses Gastos.
_Avoid_: conexão bancária, conta (essa é uma conta do banco)

**Importação** (`ExpenseImport`):
Um arquivo de Gastos (.csv, .xlsx, .ofx ou o extrato em .pdf) trazido de uma vez, com o banco e o
tipo de conta de onde veio, corrigíveis depois. Apagar a Importação leva junto os
Gastos dela. Uma linha que já entrou (o mesmo arquivo, ou outro que cobre os
mesmos dias) não entra de novo. Não viram Gastos: aplicações em investimentos e
caixinhas, transferências para contas do próprio Titular e pagamentos de Fatura.
_Avoid_: upload, lote

**Anexo** (`Attachment`):
Um arquivo entregue a um Bot: de uma Integração, junto com um Workflow, ou do
computador, numa Mensagem do chat (planilha, texto, imagem ou PDF). O do chat vai
ao Modelo uma vez e não fica guardado; a Mensagem guarda só o nome.
_Avoid_: documento (como entidade), link

**Documentos**:
A biblioteca da Organização com as Entregas dos Workflows prontos e os Anexos
que os Bots receberam. Não é uma entidade: é o lugar onde as duas aparecem
juntas. Uma Entrega abre na sua própria página; um Anexo abre na Integração de
onde veio.
_Avoid_: arquivos, biblioteca (como nome da tela)

**Card da Página inicial** (`HomeCard`, chave `HomeCardKey`):
Um quadro da Página inicial vindo de uma área (Finanças, Pessoal, Geral). Cada
Usuário escolhe quais aparecem e em que ordem (Personalizar); sem escolha, vale o
padrão, e um Card novo entra no lugar dele no padrão.
_Avoid_: widget, bloco

### Pessoal

**Tarefa** (`Task`):
Algo a fazer, talvez com dia e hora, prioridade e uma Lista. Uma Tarefa que se
repete, quando feita, fica feita e dá lugar a uma nova na próxima data da série.
_Avoid_: to-do, pendência

**Lista** (`TaskList`):
Um grupo de Tarefas com nome (Casa, Trabalho, Mercado). Apagar uma Lista deixa
as Tarefas dela sem Lista.

**Nota** (`Note`):
Texto livre em Markdown, salvo enquanto se digita; as fixadas vêm primeiro e
aparecem na Página inicial.

**Evento** (`Event`):
Um compromisso na Agenda: o dia todo ou numa hora, talvez por vários dias,
talvez se repetindo. Mudar um Evento que se repete muda a série inteira.
_Avoid_: compromisso (que em Finanças é outra coisa)

**Agenda**:
Os Eventos, os prazos das Tarefas e as contas de Finanças (Parcelas, Faturas,
Gastos recorrentes) nos seus dias. Não é uma entidade; as contas só levam à tela
delas.

**Link de agendamento** (`BookingType`):
Um link (`/book/<slug>`) que o Usuário manda para alguém marcar um horário com
ele, como no Cal.com: as horas de cada dia da semana no relógio do Usuário, a
duração, a antecedência e quantos dias à frente. Os horários livres são essas
horas menos os Eventos com hora. Desativado, ninguém marca.
_Avoid_: tipo de evento, calendly

**Agendamento** (`Booking`):
Um horário marcado por um link, com o nome, o e-mail e a mensagem de quem
marcou. Vira um Evento na Agenda do Usuário; cancelado por qualquer lado (o
convidado pelo link do e-mail, o Usuário na tela dos links, ou apagando o
Evento), o Evento sai e o Agendamento fica como cancelado.

**Meta** (`Goal`):
Aonde o Usuário quer chegar: juntar um valor (MONEY, em centavos), chegar a uma
contagem (COUNT, com unidade) ou fazer algo uma vez (CHECK). Pode agrupar
Tarefas. Arquivada, sai da lista sem ser apagada.

**Progresso** (`GoalProgress`):
Um passo rumo a uma Meta, na unidade dela; negativo desconta.

### Fitness

Dados de saúde, sensíveis pela LGPD: só o Usuário os vê, e saem com a conta.
Só números inteiros: gramas, milímetros, décimos de por cento, kcal.

**Ficha de treino** (`WorkoutPlan`):
Uma lista de Exercícios (séries, repetições, carga, descanso), talvez para
alguns dias da semana. Mudar a Ficha troca os Exercícios dela. É do Usuário ou
de alguém que ele treina (`forName`, só um nome: aluno ou cliente, não um
Usuário). Pode ser gerada pelo Agente a partir de um pedido (objetivo, nível,
dias, tempo, equipamento): vem como rascunho e só é salva quando o Usuário
quiser. Compartilhada, abre para qualquer um num link (`/w/<token>`) até o
Usuário parar de compartilhar.
_Avoid_: rotina (que é outra coisa), programa, treino (que é o feito num dia)

**Treino** (`WorkoutSession`):
Um treino feito num dia, de uma Ficha ou livre ("Corrida, 5 km"). Guarda o
título, então fica no histórico mesmo se a Ficha for apagada.
_Avoid_: sessão, exercício

**Refeição** (`Meal`):
O que se comeu num dia (café da manhã, almoço, lanche, jantar ou outra), com
kcal e macros em gramas. A Dieta é a lista das Refeições de um dia.

**Metas de macros** (`MacroTarget`):
Quanto o Usuário quer comer por dia: kcal, proteínas, carboidratos, gorduras,
cada uma opcional. Digitadas por ele; o app não as calcula. Não é uma Meta.
_Avoid_: meta (que em Pessoal é outra coisa), dieta

**Noite de sono** (`SleepLog`):
Da hora de deitar à de acordar, no dia em que acordou, com a qualidade de 1 a 5.

**Medida** (`Measurement`):
Uma leitura do corpo num dia: peso, gordura corporal, cintura, quadril, peito,
braço ou coxa.

### Acesso

**Organização** (`Organization`):
O espaço que isola dados; todo registro pertence a exatamente uma Organização.
Cada Usuário ganha uma Organização pessoal no primeiro login. Tem página
própria, com o nome e os Usuários; o Plano é dela, mas tem página à parte.
_Avoid_: tenant, workspace, conta

**Usuário** (`User`):
Uma pessoa que faz login. Pode ser Membro de várias Organizações.
_Avoid_: cliente, conta

**Membro** (`Membership`):
O vínculo entre um Usuário e uma Organização, com um Papel.

**Papel** (`Role`):
O nível de permissão de um Membro: `admin` (gerencia Membros e configurações) ou
`member` (uso normal). Quem cria a Organização é `owner`, um `admin` que não pode
ser removido.
_Avoid_: perfil, permissão

### Plano

**Plano** (`Plan`):
O nível de uso que a Organização contrata: Gratuito ou Pro. Cada Plano tem um
Limite mensal de Workflows e de Mensagens.
_Avoid_: pacote, tier

**Assinatura** (`Subscription`):
O pagamento recorrente de um Plano pago, feito pelo Stripe. Sem Assinatura
ativa, a Organização está no Gratuito.
_Avoid_: mensalidade, cobrança (como entidade)

**Limite** (`PlanLimit`):
Quantos Workflows e Mensagens a Organização pode pedir num mês do calendário de
São Paulo: o do Plano mais os Créditos de Códigos de uso do mês.
_Avoid_: cota

**Código de uso** (`UsageCode`):
Um código que um administrador resgata para somar Workflows e Mensagens ao
Limite do mês em que foi resgatado. Cada Organização resgata um código uma vez.
_Avoid_: cupom (esse é desconto no Stripe), voucher

### Finanças

**Titular** (`Holder`):
A pessoa cujas finanças são registradas; toda Obrigação, Renda e Avaliação
pertence a um Titular. No uso pessoal, o Titular é o próprio Usuário e não
aparece como entidade na interface.
_Avoid_: cliente, devedor, pessoa, usuário

**Obrigação** (`Obligation`):
Termo guarda-chuva para qualquer compromisso de crédito de um Titular: uma
Operação de Crédito ou um Cartão.
_Avoid_: dívida, débito, conta

**Operação de Crédito** (`CreditOperation`):
Um contrato com principal, taxa, prazo e Sistema de Amortização, classificado
por uma Modalidade. Empréstimos e financiamentos são Operações de Crédito.
_Avoid_: empréstimo ou financiamento como entidade, contrato, loan

**Modalidade** (`Modality`):
A classificação de uma Operação de Crédito segundo a tabela do SCR (ex.: crédito
pessoal, consignado, financiamento de veículo, imobiliário).
As Modalidades que pagam um bem (veículo, imóvel, outros bens) formam os
Financiamentos; as demais, os Empréstimos. São grupos, não entidades.
_Avoid_: tipo, categoria

**Bem** (`Collateral`):
O ativo financiado que garante uma Operação de Crédito (veículo, imóvel).
Presente em financiamentos, ausente em empréstimos.
_Avoid_: garantia, ativo

**Sistema de Amortização** (`AmortizationSystem`):
A regra que divide cada Parcela entre juros e amortização: `PRICE` (parcela
constante) ou `SAC` (amortização constante).
_Avoid_: tabela

**Parcela** (`Installment`):
Um pagamento programado de uma Operação de Crédito, composto de juros e
amortização.
_Avoid_: prestação

**Saldo Devedor** (`OutstandingBalance`):
O principal ainda não amortizado de uma Operação de Crédito numa data.

**Taxa Implícita** (`ImpliedRate`):
A taxa de juros mensal derivada do principal, prazo e valor da Parcela, quando o
Titular não conhece a taxa contratada.

**Cartão** (`CreditCard`):
Um cartão de crédito de um Titular, com limite, dia de fechamento e dia de
vencimento.

**Fatura** (`Statement`):
O valor cobrado de um Cartão num mês, informado pelo Titular ou lido do OFX da
fatura (as compras menos os estornos, sem o pagamento da anterior). O pagamento
de uma Fatura num extrato não é um Gasto: a Fatura já conta.
_Avoid_: conta, boleto

**Amortização Extraordinária** (`ExtraAmortization`):
Um pagamento fora do cronograma que reduz o Saldo Devedor de uma Operação de
Crédito.
_Avoid_: antecipação, quitação parcial

**Plano de Quitação** (`PayoffPlan`):
Uma simulação de quanto antes o Titular fica sem dívidas pondo um valor fixo por
mês, como Amortização Extraordinária, sempre na Operação de Crédito de maior
taxa (método avalanche).
_Avoid_: plano de pagamento, renegociação

**Atraso** (`LatePayment`):
Uma Parcela que não foi paga no vencimento. Está **em aberto** enquanto não tem
data de pagamento. Toda Parcela vencida sem Atraso registrado é presumida paga
em dia.
_Avoid_: inadimplência (é o estado do Titular, não da Parcela), pendência

**Estágio** (`Stage`):
A classificação de risco de uma Operação de Crédito pelo critério da Resolução
CMN 4.966: 1 (sem Atraso em aberto ou até 30 dias), 2 (31 a 90 dias), 3 (mais de
90 dias).
_Avoid_: nível de risco AA–H (da Resolução 2.682, revogada em 2025)

**Fonte de Renda** (`IncomeSource`):
Uma entrada mensal líquida e recorrente de um Titular (salário, pró-labore,
aluguel), com vigência e os dias do mês em que é paga (`paydays`; quantos dias,
quantas vezes por mês). Na tela, a página se chama Salário.
Pode ser em dólar: cada dia de pagamento recebe a sua parte, convertida pela PTAX de
compra do Banco Central daquele dia (ou do último dia útil), ou pela cotação que o
Usuário informar, menos o spread do banco e o IOF de câmbio (0,38%).
_Avoid_: renda (como entidade), receita, salário (no código)

**Gasto recorrente** (`RecurringExpense`):
O que sai sozinho todo mês ou todo ano, num dia: academia, assinaturas
(Netflix), seguros, aluguel. Basta nome, valor e dia; ciclo, forma de
pagamento, Cartão, categoria, início e cancelamento são opcionais. Entra nos
Compromissos de cada mês, menos quando é pago num Cartão: aí já está na Fatura e
o mês só o mostra, sem somar de novo. A página Assinaturas lista os da
categoria Assinaturas; não é outra entidade.
_Avoid_: assinatura (como entidade; é um exemplo), despesa fixa, débito automático

**Imposto** (`Tax`):
O que um Titular paga ao governo: todo mês (DAS, INSS) ou uma vez por ano, à
vista ou em Parcelas a partir de um mês (IPVA, IPTU). Só registrado; não entra
na Avaliação.
_Avoid_: tributo, taxa (taxa é de juros)

**Orçamento** (`Budget`):
Como um Titular divide a renda do mês em Fatias, por um Método (50/30/20,
70/20/10, as categorias da AUVP ou o seu), e a Fatia de cada categoria de gasto.
Mostra, em cada Fatia, o que saiu contra o que ela permite. Sem um salvo, o
Método vem dos dados: quem tem dívidas começa no 70/20/10. Ver ADR 0018.
_Avoid_: planejamento, meta (meta é outra coisa)

**Fatia** (`BudgetSlice`):
Uma parte da renda no Orçamento, com nome e porcentagem inteira; as Fatias somam
100%. Recebe categorias de gasto; Parcelas, Faturas e Impostos entram como
categorias com o nome do tipo.
_Avoid_: bucket, envelope, pote

**Empresa**:
A empresa de um Titular, pelo CNPJ. O Caishen não calcula os impostos dela
(docs/adr/0023) e não tem tela. O Titular pode ter o CNPJ guardado (`companyCnpj`), e o
cadastro dela na Receita (situação, CNAE, Simples, MEI) é consultado na
BrasilAPI, sem guardar nada além do CNPJ (docs/adr/0024).
_Avoid_: PJ (como entidade), negócio, firma

### Avaliação

**Avaliação** (`Assessment`):
Um retrato, salvo numa data, da saúde de crédito de um Titular: um Score, sua
Faixa e os Indicadores que os produziram.
_Avoid_: rating, relatório

**Score**:
A pontuação de 0 a 1000 de uma Avaliação, na mesma escala dos birôs de crédito.
Calculada pelo zapbots; não é o score de nenhum birô.
_Avoid_: nota, rating

**Faixa** (`RiskBand`):
O risco de inadimplência que um Score indica, com os cortes do SPC: alto (0–300),
médio (301–700), baixo (701–1000).
_Avoid_: classificação, nível

**Score Declarado** (`ReportedScore`):
Um score de birô (SPC, Serasa, Boa Vista, Quod) que o Titular consultou e
informou, com a data da consulta. Serve para comparar com o Score do zapbots.
_Avoid_: score externo, score oficial

**Comprometimento de Renda** (`IncomeCommitment`):
O total a vencer nos próximos 30 dias dividido pela renda mensal líquida.

**Endividamento** (`DebtToIncome`):
O Saldo Devedor total mais as Faturas abertas, dividido pela renda mensal líquida.

**Utilização de Limite** (`CreditUtilization`):
As Faturas abertas divididas pelo limite total dos Cartões.

**Capacidade de Pagamento** (`PaymentCapacity`):
A renda mensal líquida menos os compromissos do mês; nunca negativa.

**Limite Sugerido** (`SuggestedLimit`):
30% da renda mensal líquida.

### Fontes de dados

**Fonte** (`DataSource`):
Uma origem externa de dados financeiros (ex.: Bacen, Registrato, bureau).
_Avoid_: integração, provider

**Consentimento** (`Consent`):
A autorização explícita, registrada com data, para consultar dados de uma Fonte
externa em nome de um Titular.
_Avoid_: permissão, aceite

**Retrato SCR** (`ScrSnapshot`):
A foto das dívidas de um Titular no SCR do Bacen numa data-base (mês), obtida do
relatório do Registrato. Tem saldos agregados por instituição e Modalidade, sem
taxa nem prazo por contrato; por isso não gera Operações de Crédito, serve para
conciliar e como fonte oficial de atraso.
_Avoid_: extrato, consulta SCR, relatório (o relatório é o arquivo; o Retrato é o dado)

**Linha do Retrato** (`ScrEntry`):
Os saldos de uma instituição numa Modalidade dentro de um Retrato SCR: a vencer,
vencido (com a faixa de dias), prejuízo e limite.

**Prejuízo** (`Loss`):
Dívida que a instituição já lançou como perda por falta de pagamento prolongada.
Qualquer Prejuízo no Retrato SCR coloca o Titular no Estágio 3.
_Avoid_: calote, dívida perdida

**Taxa Média de Mercado** (`MarketRate`):
A taxa média de juros publicada pelo Bacen para uma Modalidade num período,
usada como referência de comparação.
