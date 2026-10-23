# Renda em dólar: convertida pela PTAX de compra, menos spread e IOF

Há quem receba o salário em dólar, por exemplo nos dias 15 e 30, e o converta para real a cada pagamento. Por isso uma Fonte de Renda pode ser em dólar (`currency`). O valor é informado por pagamento, e o total do mês, guardado em `monthlyNetCents` na moeda da Fonte, é repartido igualmente entre os dias de pagamento.

Cada pagamento vira real pela **PTAX de compra** do Banco Central daquele dia. É a cotação de referência quando um banco compra os dólares de alguém. Num fim de semana ou feriado, vale a PTAX do último dia útil antes; num dia futuro, a última PTAX que houver. Do valor convertido saem o spread do banco ou do app (opcional, aplicado sobre a cotação) e o **IOF de câmbio de entrada para pessoa física, 0,38%**. O IOF fica editável por Fonte, caso a lei mude. A conta é de `foreignToBrlCents` (`@zapbots/finance`), em `decimal.js` e em centavos (ADR 0004).

A PTAX vem dos dados abertos do Bacen (Olinda, sem chave nem dado pessoal). Uma vez buscada, fica guardada em `exchange_rate`: os meses passados não mudam, e o app não depende do Bacen para mostrá-los. Quando o Usuário sabe a cotação que o banco realmente usou, ele a informa para aquele pagamento (`income_rate_override`), e ela prevalece sobre a PTAX daquele dia.

A renda mensal que entra na Avaliação, no Plano e no contexto do Caishen converte o mês pela PTAX de hoje. Assim, o Score acompanha a renda em reais que a pessoa teria agora.
