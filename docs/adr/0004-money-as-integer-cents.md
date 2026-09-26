# Dinheiro em centavos inteiros; cálculos com decimal.js

Valores monetários são `bigint` em centavos no banco e taxas são `numeric` (taxa efetiva mensal); `@mny/finance` calcula com `decimal.js` e arredonda para centavos só na saída. `float` acumula erro em tabelas de amortização de centenas de parcelas e faz o Saldo Devedor divergir do contrato. Não "simplifique" para `number`.
