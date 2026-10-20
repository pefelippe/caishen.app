# Autenticação com Better Auth (plugin organization)

Usamos Better Auth, self-hosted e persistido no nosso Postgres via adapter do Drizzle, porque o plugin `organization` já entrega Organização, Membro, Papel (`admin`/`member`) e convites — exatamente o modelo de acesso do domínio. Descartamos auth própria (reimplementar sessão/convites) e providers hospedados (Clerk/Auth0: vendor lock-in e dados de usuário fora do nosso banco, sensível para dados financeiros).

O login é só com Google (social provider do Better Auth): sem senha e sem cadastro manual. O primeiro login cria o Usuário. Não guardamos credenciais, e o e-mail já vem verificado pelo Google. Usuários antigos, criados com senha, são ligados automaticamente pelo mesmo e-mail (`accountLinking`).
