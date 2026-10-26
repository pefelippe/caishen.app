# O CNPJ da Empresa consultado na Receita pela BrasilAPI

A aba Pessoa jurídica de Impostos só mostrava as guias (ADR 0023). Faltava saber de que empresa se trata: se ela está ativa, se é do Simples ou MEI, qual a atividade. Isso está no cadastro público da Receita, e a BrasilAPI o serve sem chave (é a mesma fonte do servidor MCP Fiscal Brasil).

**O Titular informa o CNPJ uma vez** (`holder.company_cnpj`, `setCompanyCnpj`), e o Caishen consulta o resto: razão social, nome fantasia, situação cadastral, CNAE principal, cidade, abertura e as opções pelo Simples e pelo MEI com as datas. O CNPJ é validado pelos dígitos verificadores antes de sair do servidor (`isValidCnpj` em `@zapbots/finance`).

**A consulta é direta, do Node** (`services/cnpj.ts`, `lookupCnpj`): `GET https://brasilapi.com.br/api/cnpj/v1/{cnpj}`, 15 s de limite, e o resultado guardado em memória por 24 horas, porque um cadastro muda devagar. Nada é gravado no banco além do CNPJ. Os erros chegam em português ao User e ao Modelo (`CnpjError`): CNPJ inválido, não registrado ou consulta fora do ar. Não usamos o servidor MCP em si: seria mais um processo para rodar só para fazer o mesmo GET.

**O Agente também consulta** (`company_lookup`, uma ferramenta de leitura). Sem argumento, lê o CNPJ do Titular da sessão; com um, consulta o CNPJ que a pessoa citou (um fornecedor, um cliente). São duas exceções conscientes:
- à ADR 0009, que só deixa o Bot sair do zapbots por Conexões: aqui é um dado público, sem chave, sem dado da pessoa enviado e sem nada escrito lá fora;
- à ADR 0021, que limita as ferramentas de leitura ao Titular: um CNPJ de terceiros é cadastro público, não dado de outra Organização.

**Nada é calculado.** O regime aparece como a Receita o registra; o Caishen não deduz dele nenhum imposto (ADR 0023). A página Impostos, com o card "Sua empresa", saiu depois (ADR 0023); a consulta ficou para o Agente, e um CNPJ já guardado em `companyCnpj` continua valendo para ele.
