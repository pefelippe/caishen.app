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
_Avoid_: notificação, alerta (como termo do código em pt-BR), Insight

**Conversa** (`Conversation`):
Uma troca salva de Mensagens entre o Usuário e um Bot. Começa e é reaberta no
chat: a página Chat ou o painel ao lado de qualquer tela.
_Avoid_: chat (é a página e o painel), thread

**Mensagem** (`Message`):
Uma fala do Usuário ou do Bot dentro de uma Conversa.

**Modelo** (`Model`):
O modelo de linguagem que um Bot usa.
_Avoid_: IA (como sinônimo de modelo), LLM

### Integrações

**Integração** (`Connection`):
O vínculo, autorizado pelo Usuário, com uma ferramenta de fora em que os Bots
entram por ele. Cada Integração é de uma categoria: Provedores de IA (de onde vêm
os Modelos, hoje o OpenRouter), Armazenamento de arquivos (Google Drive),
E-mail, Agenda ou Bancos. Os Bots só leem por uma Integração.
_Avoid_: conexão, plugin, Fonte (essa é financeira)

**Anexo** (`Attachment`):
Um arquivo de uma Integração entregue a um Bot junto com um Workflow.
_Avoid_: documento (como entidade), link

**Documentos**:
A biblioteca da Organização com as Entregas dos Workflows prontos e os Anexos
que os Bots receberam. Não é uma entidade: é o lugar onde as duas aparecem
juntas. Uma Entrega abre na sua própria página; um Anexo abre na Integração de
onde veio.
_Avoid_: arquivos, biblioteca (como nome da tela)

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
O valor cobrado de um Cartão num mês, informado pelo Titular.
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
aluguel), com vigência.
_Avoid_: renda (como entidade), receita, salário

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
