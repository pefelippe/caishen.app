# Impostos da Empresa lidos da Adaflow, não calculados

A ADR 0016 fazia o Caishen calcular as guias da Empresa (DAS, DARF do pró-labore, Presumido) a partir do faturamento e do regime. Na prática errava: sem faturamento lançado o DAS sumia, e o Anexo, o Fator R e as exportações dependem de detalhes que a contabilidade já resolve. A guia certa é a que a contabilidade emite.

**O Caishen não calcula mais imposto de empresa.** As guias vêm da Adaflow, a contabilidade do Titular, e ficam na tabela `company_guide` (competência, nome, valor, vencimento, se foi paga, e o id da guia na origem, para ler de novo sem duplicar). O cálculo saiu de `@zapbots/finance` e do server, com os seus tipos no GraphQL e o cadastro da Empresa na tela. As tabelas `company` e `company_revenue` ficam no banco, sem uso, porque as migrações são só aditivas.

**Cada guia conta no mês em que vence**, paga ou não, como `COMPANY_TAX` nos Compromissos (`guidesDueIn` em `services/company.ts`). Assim ela sai da receita do mês antes do que sobra para as dívidas. O Caishen só mostra se a guia foi paga; não marca nem paga nada (ADR 0009).

**Impostos tem duas abas** (`TaxesPage`): Pessoa física, os impostos do próprio Titular (IPVA, IPTU), a mesma lista de Gastos `#taxes`; e Pessoa jurídica (`?tab=pj`), as guias da Empresa por competência, cada uma "Paga" ou "Em aberto". É a exceção à regra de páginas sem abas.

**A ligação com a Adaflow ainda não existe.** A documentação da API (`https://app.adaflow.com/api_docs`) exige login e o token recebido foi recusado. Quando ela chegar, segue o desenho do Open Finance (ADR 0020): uma interface de provedor e um adaptador, o token selado por Organização como as chaves de IA (ADR 0022), uma Integração em Integrações e um "Ler de novo" que grava em `company_guide`.

Isto substitui a ADR 0016.
