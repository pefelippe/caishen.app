# Autenticação com Better Auth (plugin organization)

Usamos Better Auth, self-hosted e persistido no nosso Postgres via adapter do Drizzle, porque o plugin `organization` já entrega Organização, Membro, Papel (`admin`/`member`) e convites — exatamente o modelo de acesso do domínio. Descartamos auth própria (reimplementar sessão/convites) e providers hospedados (Clerk/Auth0: vendor lock-in e dados de usuário fora do nosso banco, sensível para dados financeiros).

O login é com e-mail e senha, e com Google quando o servidor tem o cliente OAuth. Quem esquece a senha recebe um link por e-mail (vale 1 hora) e escolhe outra; trocar a senha encerra as sessões de todos os navegadores. Quem não tinha senha (entrou pelo Google, ou pelos antigos links de acesso por e-mail) cria uma pelo mesmo caminho.

O cadastro com senha não prova que a pessoa é dona do e-mail. Por isso, quando o Google é ligado a um Usuário cujo e-mail nunca foi verificado, a senha dele é apagada: quem cadastrou um e-mail alheio não continua entrando depois que o dono chega pelo Google.
