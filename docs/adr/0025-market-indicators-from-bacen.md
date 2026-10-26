# Dólar, Selic, CDI e IPCA na página inicial, lidos do Banco Central

A página inicial só mostrava os vencimentos e as Conversas. Quem cuida do próprio dinheiro quer ver também o dólar do dia, a Selic, o CDI e a inflação, que mudam o que vale a pena: pagar uma dívida antes ou investir, uma renda em dólar, um financiamento corrigido.

**Tudo vem dos dados abertos do Banco Central**, sem chave e sem nada da pessoa enviado (`services/indicators.ts`, `Query.indicators`, só para quem entrou):
- o dólar é a PTAX de compra que o app já guarda em `exchange_rate` (ADR 0015, `dollarRate`), com a variação desde o dia útil anterior;
- a Selic (meta do Copom, série 432), o CDI anualizado (série 4389) e o IPCA de 12 meses (série 13522) vêm do SGS (`https://api.bcb.gov.br/dados/serie/bcdata.sgs.{série}/dados/ultimos/20`). A série da Selic é publicada à frente, até a próxima reunião, então vale o último valor até hoje.

**As taxas são frações ao ano** (0,1375 = 13,75% a.a.), como o resto do app guarda taxas em frações; o SGS as publica em %.

**Cada série fica em memória por uma hora**, porque muda no máximo uma vez por dia. Se o SGS não responde, vale o último valor guardado; sem nenhum, o indicador volta `null` e a tela diz que o Banco Central não respondeu, sem derrubar o resto da página. Nada disso vai para o banco: só a PTAX, que já ia.

**A página inicial também mostra o Fluxo de caixa do mês** (`Holder.month` do mês corrente, no `MonthSummary` de Lançamentos): Entrou − Compromissos − Gastos = Sobra.

Ninguém aconselha investimento aqui: os números são mostrados como o Banco Central os publica.
