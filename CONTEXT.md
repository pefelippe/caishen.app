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
e faz Trabalhos sobre elas.
_Avoid_: Cifra (o antigo Buddy de Finanças)

**Equipe**:
Os Bots que um Usuário tem. Hoje é o catálogo inteiro.
_Avoid_: time, workspace

**Trabalho** (`Job`):
Um pedido feito a um Bot, que ele faz sozinho e em segundo plano até chegar a
uma Entrega. Está na fila, trabalhando, pronto ou falhou. Um Trabalho
interrompido termina como falho e precisa ser pedido de novo.
_Avoid_: tarefa, pedido (como entidade)

**Entrega** (`Deliverable`):
O resultado pronto de um Trabalho: um texto para usar como está (um plano, uma
análise, um resumo).
_Avoid_: resposta, relatório, output

**Conversa** (`Conversation`):
Uma troca salva de Mensagens entre o Usuário e um Bot.
_Avoid_: chat (é a tela), thread

**Mensagem** (`Message`):
Uma fala do Usuário ou do Bot dentro de uma Conversa.

**Modelo** (`Model`):
O modelo de linguagem que um Bot usa.
_Avoid_: IA (como sinônimo de modelo), LLM

### Conexões

**Conexão** (`Connection`):
O vínculo, autorizado pelo Usuário, com uma ferramenta de fora em que os Bots
entram por ele. Cada Conexão é de uma categoria: IA (de onde vêm os Modelos,
hoje o OpenRouter) ou Arquivos (Google Drive). Os Bots só leem por uma Conexão.
_Avoid_: integração, plugin, Fonte (essa é financeira)

**Anexo** (`Attachment`):
Um arquivo de uma Conexão entregue a um Bot junto com um Trabalho.
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
