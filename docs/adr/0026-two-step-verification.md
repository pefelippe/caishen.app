# Verificação em duas etapas com app autenticador, só para quem entra com senha

Quem guarda as finanças no Caishen pode querer que a senha sozinha não baste. Usamos o plugin `twoFactor` do Better Auth, que já cuida do segredo cifrado, dos códigos de recuperação, do limite de tentativas e do "confiar neste navegador".

**O segundo passo é um código TOTP de app autenticador** (Google Authenticator, 1Password, Authy…), com o emissor "Caishen". Não mandamos código por e-mail: o e-mail é o mesmo canal que já troca a senha ("Esqueci minha senha"), então não seria um segundo fator de verdade. Também não há SMS.

**Ligar é no Perfil** (`TwoFactorCard`): a senha de novo, o QR code (ou a chave para digitar), o primeiro código, que prova que o app tem o segredo, e então os 10 códigos de recuperação, cada um válido uma vez. Até esse primeiro código, nada muda no login (`two_factor.verified`). Desligar e gerar códigos novos também pedem a senha.

**No login** (`LoginPage`), a senha certa de uma conta com o 2FA ligado não abre sessão: o Better Auth responde `twoFactorRedirect` e a página pede o código no mesmo cartão, ou um código de recuperação. Marcar "Não pedir de novo neste navegador" vale por 30 dias.

**Quem entra com o Google não passa por isso**: o plugin só intercepta o login por e-mail e senha, e a verificação fica com o Google. Quem só tem o Google precisa criar uma senha antes de ligar o 2FA, e o card diz isso.

Tabelas: `two_factor` (o segredo e os códigos, cifrados pelo Better Auth sob `BETTER_AUTH_SECRET`) e `user.two_factor_enabled`.
