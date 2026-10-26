# Impostos da Empresa lidos da Adaflow, não calculados

A ADR 0016 fazia o Caishen calcular as guias da Empresa (DAS, DARF do pró-labore, Presumido) a partir do faturamento e do regime. Na prática errava: sem faturamento lançado o DAS sumia, e o Anexo, o Fator R e as exportações dependem de detalhes que a contabilidade já resolve. A guia certa é a que a contabilidade emite.

**O Caishen não calcula mais imposto de empresa.** As guias viriam da Adaflow, a contabilidade do Titular, e ficariam na tabela `company_guide` (competência, nome, valor, vencimento, se foi paga, e o id da guia na origem, para ler de novo sem duplicar). O cálculo saiu de `@zapbots/finance` e do server, com os seus tipos no GraphQL e o cadastro da Empresa na tela. As tabelas `company` e `company_revenue` ficam no banco, sem uso, porque as migrações são só aditivas.

**A página Impostos saiu**, para o app ficar enxuto. Os impostos do próprio Titular (IPVA, IPTU) seguem em Gastos `#taxes`, para onde `/caishen/taxes` leva. Antes ela tinha duas abas, Pessoa física e Pessoa jurídica.

**A Adaflow foi abandonada.** O plano era ler da Adaflow as guias, as notas fiscais, o faturamento e o regime, com o token colado em Integrações. A API pública dela (`https://app.adaflow.com/api/v1`) só emite, importa e cancela NFSe e lê uma nota pelo id; não lista notas nem tem guias, faturamento ou regime. Emitir nota seria escrever fora do zapbots (ADR 0009). Saíram o card de Integrações, o token (`adaflow_link`, cuja migração nunca chegou à produção), as guias na tela, no GraphQL e nos Compromissos (`COMPANY_TAX`). A tabela `company_guide` fica no banco, sem uso, porque as migrações são só aditivas. Se as guias voltarem, virão de outra fonte que as leia, nunca de um cálculo.

Isto substitui a ADR 0016.
