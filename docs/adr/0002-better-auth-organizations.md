# Autenticação com Better Auth (plugin organization)

Usamos Better Auth, self-hosted e persistido no nosso Postgres via adapter do Drizzle, porque o plugin `organization` já entrega Organização, Membro, Papel (`admin`/`member`) e convites — exatamente o modelo de acesso do domínio. Descartamos auth própria (reimplementar sessão/convites) e providers hospedados (Clerk/Auth0: vendor lock-in e dados de usuário fora do nosso banco, sensível para dados financeiros).
