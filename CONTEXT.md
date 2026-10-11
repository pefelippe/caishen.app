# mny

Organizador pessoal: reúne as Áreas da vida de uma pessoa (finanças, anotações,
trabalho, fitness), cada uma com um Buddy de IA que conhece os dados dela. Em
Finanças, registra as obrigações de crédito (cartões, empréstimos,
financiamentos), calcula juros e amortização e produz uma avaliação de risco no
estilo de um rating bancário.

## Language

### Organizador

**Área** (`Area`):
Uma parte da vida que o mny organiza: Finanças (`FINANCE`), Anotações (`NOTES`),
Trabalho (`WORK`) ou Fitness (`FITNESS`).
_Avoid_: módulo, workspace, seção

**Tarefa** (`Task`):
Algo a fazer em Trabalho, com status (a fazer, fazendo, feita), prazo opcional e
Projeto opcional.
_Avoid_: todo, item, card

**Projeto** (`Project`):
Um agrupamento de Tarefas.
_Avoid_: lista, quadro

**Treino** (`Workout`):
Uma sessão de exercício registrada em Fitness, com data, tipo e duração.
_Avoid_: exercício, atividade

**Meta Semanal** (`WeeklyGoal`):
Quantos Treinos a pessoa quer fazer por semana. A semana vai de segunda a domingo.
_Avoid_: objetivo, hábito

### IA

**Buddy** (`Buddy`):
O assistente de IA de uma Área, com nome, personalidade e Modelo. O Buddy geral
enxerga todas as Áreas.
_Avoid_: bot, agente, assistente

**Conversa** (`Conversation`):
Uma troca salva de Mensagens entre o Usuário e um Buddy.
_Avoid_: chat (é a tela), thread

**Mensagem** (`Message`):
Uma fala do Usuário ou do Buddy dentro de uma Conversa.

**Ação** (`BuddyAction`):
Algo que o Buddy fez nos dados durante uma Conversa (criar uma Tarefa, registrar
um Treino, criar uma Anotação), registrado na Mensagem. O Buddy nunca altera
Obrigações nem valores.
_Avoid_: comando, tool

**Modelo** (`Model`):
O modelo de linguagem que um Buddy usa.
_Avoid_: IA (como sinônimo de modelo), LLM

**Insight**:
Uma recomendação que um Buddy dá numa Conversa a partir dos dados da sua Área.

### Conexões

**Conexão** (`Connection`):
O vínculo com um serviço externo não financeiro, como o Google Drive.
_Avoid_: integração, plugin, Fonte (essa é financeira)

**Anexo** (`Attachment`):
Um arquivo de uma Conexão ligado a uma Anotação ou a uma Tarefa.
_Avoid_: documento, link

### Acesso

**Organização** (`Organization`):
O espaço que isola dados; todo registro pertence a exatamente uma Organização.
Cada Usuário ganha uma Organização pessoal no primeiro login, e ela não aparece
na interface.
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
Calculada pelo mny; não é o score de nenhum birô.
_Avoid_: nota, rating

**Faixa** (`RiskBand`):
O risco de inadimplência que um Score indica, com os cortes do SPC: alto (0–300),
médio (301–700), baixo (701–1000).
_Avoid_: classificação, nível

**Score Declarado** (`ReportedScore`):
Um score de birô (SPC, Serasa, Boa Vista, Quod) que o Titular consultou e
informou, com a data da consulta. Serve para comparar com o Score do mny.
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

### Anotações

**Anotação** (`Note`):
Um documento de texto rico e colaborativo de uma Organização, opcionalmente
vinculado a um Titular, uma Operação de Crédito, um Cartão ou uma Tarefa.
_Avoid_: nota, documento, memo

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
