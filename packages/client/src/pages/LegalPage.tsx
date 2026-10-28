import { ArrowLeftIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { Logo } from '@zapbots/ui/blocks/logo';
import { Button } from '@zapbots/ui/components/button';

import { COMPANY, LEGAL_UPDATED } from '../lib/legal';

interface Clause {
  body: ReactNode;
  id: string;
  title: string;
}

const mail = (
  <a className="text-primary underline-offset-4 hover:underline" href={`mailto:${COMPANY.email}`}>
    {COMPANY.email}
  </a>
);

const to = (path: string, label: string) => (
  <Link className="text-primary underline-offset-4 hover:underline" to={path}>
    {label}
  </Link>
);

/**
 * A legal text (docs/adr/0027): readable signed in or out, light like the sign-in, with its
 * sections listed at the top. pt-BR only, as the law it answers to.
 */
function LegalDocument({
  clauses,
  intro,
  title,
}: {
  clauses: Clause[];
  intro: ReactNode;
  title: string;
}) {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link className="flex items-center gap-2.5 text-header" to="/">
            <Logo size={24} />
            <span className="text-lg font-semibold tracking-tight text-foreground">Caishen</span>
          </Link>
          <Button asChild size="sm" variant="ghost">
            <Link to="/">
              <ArrowLeftIcon />
              Voltar
            </Link>
          </Button>
        </div>
      </header>
      <main className="page-enter mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Em vigor desde {LEGAL_UPDATED}.</p>
        <div className="mt-6 text-base leading-relaxed">{intro}</div>
        <nav aria-label="Seções" className="mt-8 rounded-2xl bg-card p-6 shadow-sm">
          <ol className="grid gap-1.5 text-sm sm:grid-cols-2">
            {clauses.map((clause, index) => (
              <li key={clause.id}>
                <a className="hover:text-primary" href={`#${clause.id}`}>
                  {index + 1}. {clause.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <div className="mt-10 flex flex-col gap-10">
          {clauses.map((clause, index) => (
            <section className="scroll-mt-6" id={clause.id} key={clause.id}>
              <h2 className="text-xl font-semibold tracking-tight">
                {index + 1}. {clause.title}
              </h2>
              <div className="mt-3 flex flex-col gap-3 leading-relaxed [&_li]:ml-5 [&_li]:list-disc [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5">
                {clause.body}
              </div>
            </section>
          ))}
        </div>
        <footer className="mt-14 border-t pt-6 text-sm text-muted-foreground">
          {COMPANY.name} · CNPJ {COMPANY.cnpj} · {COMPANY.city} · {mail}
          <div className="mt-2 flex gap-4">
            {to('/terms', 'Termos de Uso')}
            {to('/privacy', 'Política de Privacidade')}
          </div>
        </footer>
      </main>
    </div>
  );
}

const TERMS: Clause[] = [
  {
    body: (
      <>
        <p>
          O Caishen é um assistente de finanças pessoais: você registra ou importa receitas, gastos,
          dívidas, cartões e impostos, vê o fluxo de caixa do mês, simula pagamentos e conversa com
          um agente de inteligência artificial (o Caishen) sobre os seus dados.
        </p>
        <p>
          O serviço é oferecido por {COMPANY.name}, CNPJ {COMPANY.cnpj}, com sede em {COMPANY.city}{' '}
          (“nós”). Ao criar uma conta ou usar o Caishen, você aceita estes Termos e a{' '}
          {to('/privacy', 'Política de Privacidade')}. Se não concordar, não use o serviço.
        </p>
      </>
    ),
    id: 'servico',
    title: 'O que é o Caishen',
  },
  {
    body: (
      <ul>
        <li>
          O Caishen <strong>não é instituição financeira</strong>, não oferece crédito, não
          intermedeia investimentos e <strong>nunca movimenta o seu dinheiro</strong>.
        </li>
        <li>
          As respostas, cálculos, planos e simulações servem para você entender e planejar. Não são
          consultoria financeira, de investimentos, contábil, tributária ou jurídica, nem
          recomendação de produto específico.
        </li>
        <li>
          Os cálculos partem dos dados que você informa ou importa. Confira sempre os valores com o
          seu banco, a sua administradora de cartão ou o órgão responsável antes de decidir.
        </li>
        <li>
          O Fitness (fichas de treino, dieta, macros, sono e medidas) é um caderno para você anotar
          e acompanhar. <strong>Não é orientação médica, nutricional ou de educação física</strong>:
          procure um profissional antes de mudar treino ou alimentação.
        </li>
      </ul>
    ),
    id: 'nao-e',
    title: 'O que o Caishen não é',
  },
  {
    body: (
      <>
        <p>
          O agente do Caishen é uma <strong>inteligência artificial</strong>: um modelo de linguagem
          de terceiros que responde com base nos seus dados e no que você escreve. Ele pode errar,
          entender mal ou apresentar uma informação desatualizada. Confira as respostas importantes.
        </p>
        <p>
          O agente só lê. Quando ele sugere criar, corrigir ou apagar um registro, nada é gravado
          até você confirmar a proposta. Workflows também só leem os seus dados.
        </p>
        <p>
          Se você estiver passando por um momento difícil, procure ajuda: o CVV atende de graça, a
          qualquer hora, pelo telefone 188 ou em cvv.org.br. Em emergência, ligue 192 (SAMU).
        </p>
      </>
    ),
    id: 'ia',
    title: 'Inteligência artificial',
  },
  {
    body: (
      <ul>
        <li>Você precisa ter 18 anos ou mais para criar uma conta.</li>
        <li>
          Mantenha a sua senha em segredo e, se puder, ligue a verificação em duas etapas no Perfil.
          Você responde pelo que for feito com a sua conta.
        </li>
        <li>
          Informe dados verdadeiros e cadastre só dados seus ou de quem autorizou você a fazê-lo.
        </li>
        <li>
          Não use o Caishen para atividades ilegais, para tentar acessar dados de outras pessoas,
          sobrecarregar ou atacar o serviço, ou para extrair as respostas da IA em massa.
        </li>
      </ul>
    ),
    id: 'conta',
    title: 'Sua conta e o uso permitido',
  },
  {
    body: (
      <>
        <p>
          O plano <strong>Gratuito</strong> tem limites mensais de mensagens e Workflows. O plano{' '}
          <strong>Pro</strong> custa o valor mostrado na página Plano no momento da assinatura
          (hoje, R$ 49,00 por mês) e amplia esses limites. Os pagamentos são processados pelo
          Stripe; não guardamos os dados do seu cartão.
        </p>
        <ul>
          <li>
            <strong>Renovação automática:</strong> a assinatura do Pro se renova sozinha a cada mês,
            na mesma data, no mesmo valor, até você cancelar. A data da próxima cobrança fica sempre
            visível na página Plano. Se o preço mudar, avisamos por e-mail com pelo menos 30 dias de
            antecedência, e você pode cancelar antes de a mudança valer.
          </li>
          <li>
            <strong>Cancelar é tão simples quanto assinar:</strong> em Plano, “Gerenciar
            assinatura”, “Cancelar”. Não pedimos motivo nem contato com atendimento. O Pro continua
            até o fim do mês já pago e não há nova cobrança.
          </li>
          <li>
            <strong>Direito de arrependimento:</strong> na primeira assinatura, você pode desistir
            em até 7 dias e receber de volta todo o valor pago (art. 49 do Código de Defesa do
            Consumidor). Basta cancelar e escrever para {mail}.
          </li>
          <li>Excluir a conta cancela a assinatura na hora, sem novas cobranças.</li>
        </ul>
      </>
    ),
    id: 'planos',
    title: 'Planos, pagamento, renovação e cancelamento',
  },
  {
    body: (
      <>
        <p>
          Os dados que você cadastra são seus. Você nos autoriza a tratá-los apenas para prestar o
          serviço, como descreve a {to('/privacy', 'Política de Privacidade')}.
        </p>
        <p>
          O software, a marca e o conteúdo do Caishen são nossos ou licenciados para nós. Você pode
          usá-los enquanto tiver uma conta, para uso pessoal, sem copiar, revender ou desmontar o
          serviço.
        </p>
      </>
    ),
    id: 'dados',
    title: 'Seus dados e nossa propriedade',
  },
  {
    body: (
      <>
        <p>
          Integrações (WhatsApp, Open Finance, Google, provedores de IA) dependem de serviços de
          terceiros, com os seus próprios termos. Se um deles mudar ou sair do ar, a integração pode
          parar de funcionar.
        </p>
        <p>
          Trabalhamos para manter o Caishen disponível e correto, mas ele é oferecido como está:
          pode haver interrupções, erros e mudanças de funcionalidades. Na medida permitida pela
          lei, não respondemos por decisões financeiras tomadas com base nas respostas ou cálculos
          do serviço, nem por perdas indiretas. Nada nestes Termos limita os direitos que o Código
          de Defesa do Consumidor garante a você.
        </p>
      </>
    ),
    id: 'responsabilidade',
    title: 'Disponibilidade e responsabilidade',
  },
  {
    body: (
      <>
        <p>
          Você pode encerrar a conta a qualquer momento em Perfil, “Excluir conta”. Podemos
          suspender ou encerrar contas que violem estes Termos ou a lei, avisando antes sempre que
          possível.
        </p>
        <p>
          Podemos mudar estes Termos. Mudanças relevantes são avisadas por e-mail ou no aplicativo
          com antecedência; continuar usando o Caishen depois delas significa aceitá-las.
        </p>
      </>
    ),
    id: 'encerramento',
    title: 'Encerramento e mudanças',
  },
  {
    body: (
      <p>
        Estes Termos seguem as leis do Brasil. Fica eleito o foro do seu domicílio para qualquer
        disputa. Dúvidas, reclamações ou pedidos: {mail}.
      </p>
    ),
    id: 'lei',
    title: 'Lei, foro e contato',
  },
];

export function TermsPage() {
  return (
    <LegalDocument
      clauses={TERMS}
      intro={
        <p>
          Estes Termos explicam as regras de uso do Caishen: o que o serviço faz e não faz, como
          funcionam os planos e como cancelar.
        </p>
      }
      title="Termos de Uso"
    />
  );
}

const PRIVACY: Clause[] = [
  {
    body: (
      <p>
        O controlador dos seus dados pessoais é {COMPANY.name}, CNPJ {COMPANY.cnpj}, {COMPANY.city}.
        O encarregado pelo tratamento de dados (DPO) pode ser contatado em {mail}.
      </p>
    ),
    id: 'controlador',
    title: 'Quem cuida dos seus dados',
  },
  {
    body: (
      <ul>
        <li>
          <strong>Conta:</strong> nome, e-mail, senha (guardada só como hash), foto (o endereço que
          você informar ou a do Google), idioma, fuso horário, e o segredo e os códigos da
          verificação em duas etapas, se você ligar.
        </li>
        <li>
          <strong>Login com o Google:</strong> nome, e-mail e foto do seu perfil Google.
        </li>
        <li>
          <strong>Finanças:</strong> o que você cadastra ou importa: receitas, gastos, dívidas,
          financiamentos, cartões, faturas, impostos, orçamentos e categorias. De arquivos
          importados (.csv, .xlsx, .ofx, .pdf) guardamos as linhas lidas e o nome do arquivo, não o
          arquivo.
        </li>
        <li>
          <strong>Pessoal:</strong> o que você anota: tarefas e listas, notas, eventos da agenda,
          metas e o progresso delas, e como você arrumou os cards da página inicial.
        </li>
        <li>
          <strong>Fitness (dados de saúde):</strong> fichas de treino e os treinos feitos, refeições
          com calorias e macros, as suas metas de macros, as noites de sono e medidas do corpo
          (peso, gordura, circunferências). São dados pessoais sensíveis (art. 11 da LGPD): você os
          informa por vontade própria, eles servem só para mostrar a você o seu próprio
          acompanhamento, não são compartilhados com ninguém nem usados para publicidade ou perfil,
          e saem junto com a sua conta. Você pode apagar cada registro quando quiser.
        </li>
        <li>
          <strong>Fichas para outras pessoas:</strong> se você monta fichas para alunos ou clientes,
          guardamos o nome que você der a cada um e as fichas deles. Você é responsável por ter a
          autorização dessas pessoas. Ao compartilhar uma ficha, quem tiver o link vê a ficha, o
          nome para quem ela é e o seu nome; parar de compartilhar desliga o link na hora. Ao gerar
          fichas com IA, o que você preencher (para quem, objetivo, nível, dias, tempo, equipamento
          e observações) vai ao provedor do modelo de IA só para escrever aquela resposta.
        </li>
        <li>
          <strong>Links de agendamento:</strong> quando alguém marca um horário pelo seu link,
          guardamos o nome, o e-mail, o fuso horário e a mensagem dessa pessoa, mostramos esses
          dados a você e mandamos a ela um e-mail de confirmação com um link para cancelar. Quem tem
          o link vê seu nome e seus horários livres, nunca o que está na sua agenda.
        </li>
        <li>
          <strong>Agenda no celular:</strong> se você criar o link da sua agenda, quem o tiver lê os
          seus eventos, as tarefas com prazo e os vencimentos das contas (com o valor), de um mês
          atrás a um ano à frente, como faz o calendário em que você o colou. Trocar o link desliga
          o antigo na hora; desligar apaga o link.
        </li>
        <li>
          <strong>Agendas de fora:</strong> se você ligar uma agenda do iCloud, do Google ou do
          Outlook pelo link dela, guardamos o link cifrado e lemos dele os seus compromissos para
          mostrar na sua Agenda e ocupar os horários dos seus links de agendamento. Os compromissos
          ficam só na memória do servidor por alguns minutos e nada é escrito na agenda de lá.
          Remover a agenda apaga o link.
        </li>
        <li>
          <strong>Saúde do celular:</strong> se você criar o endereço de envio e colá-lo num app do
          celular (Health Auto Export no iPhone, HC Webhook no Android), recebemos dele passos,
          peso, gordura corporal, sono e treinos do Apple Health ou do Health Connect, e guardamos
          como os dados de Fitness acima, com o mesmo cuidado de dado sensível. O endereço só
          recebe; trocar ou desligar o endereço não apaga o que já chegou, e você apaga cada
          registro quando quiser.
        </li>
        <li>
          <strong>Google Tarefas:</strong> se você conectar, o Google nos deixa só ler as suas
          tarefas. Copiamos as abertas para as suas Tarefas (título, notas e data) e lemos de novo
          quando você abre as Tarefas. Nada é escrito no Google; você retira o acesso na sua conta
          Google quando quiser.
        </li>
        <li>
          <strong>Conversas com o agente:</strong> as mensagens e respostas. Anexos (imagens, PDFs,
          planilhas) são enviados ao modelo de IA para aquela resposta e não ficam guardados;
          guardamos só os nomes.
        </li>
        <li>
          <strong>Integrações que você ligar:</strong> o número de WhatsApp vinculado e as mensagens
          trocadas por ele; contas e transações do Open Finance (Pluggy), quando disponível; chaves
          de provedores de IA que você colar (guardadas cifradas).
        </li>
        <li>
          <strong>Pagamento:</strong> o identificador de cliente e de assinatura no Stripe e o
          status do plano. Os dados do cartão ficam só com o Stripe.
        </li>
        <li>
          <strong>Dados técnicos:</strong> endereço IP e navegador de cada sessão, para segurança, e
          o uso mensal (quantas mensagens e Workflows), para os limites do plano.
        </li>
      </ul>
    ),
    id: 'coletamos',
    title: 'Que dados coletamos',
  },
  {
    body: (
      <ul>
        <li>
          Prestar o serviço que você contratou: mostrar e calcular as suas finanças, responder no
          chat, rodar Workflows e cobrar o plano (execução de contrato, art. 7º, V, da LGPD).
        </li>
        <li>
          Proteger a sua conta e o serviço contra fraude e abuso, e corrigir erros (legítimo
          interesse, art. 7º, IX).
        </li>
        <li>
          Cumprir obrigações legais e fiscais, como guardar registros de cobrança (art. 7º, II).
        </li>
        <li>
          Integrações como Open Finance e WhatsApp só funcionam depois de você autorizar, e você
          pode desligá-las quando quiser (consentimento, art. 7º, I).
        </li>
      </ul>
    ),
    id: 'finalidades',
    title: 'Para que usamos e com que base legal',
  },
  {
    body: (
      <>
        <p>
          Para responder no chat e nos Workflows, o Caishen envia a um provedor de modelo de
          linguagem a sua mensagem, os anexos e um resumo dos seus dados financeiros necessários
          para aquela resposta. Os provedores possíveis são OpenRouter (que encaminha ao modelo
          escolhido), Anthropic, Google e OpenAI, conforme o modelo configurado em Integrações.
        </p>
        <p>
          Modelos gratuitos oferecidos pelo OpenRouter podem ter políticas próprias, inclusive
          registrar as mensagens ou usá-las para melhorar os seus modelos. Se isso importa para
          você, escolha um modelo pago ou use a chave de um provedor direto.
        </p>
        <p>
          Não usamos os seus dados para treinar modelos nossos e não vendemos dados. As respostas da
          IA são informativas e não tomam decisões por você; se quiser, peça revisão de qualquer
          resultado automatizado pelo e-mail {mail} (art. 20 da LGPD).
        </p>
      </>
    ),
    id: 'ia',
    title: 'Uso de inteligência artificial',
  },
  {
    body: (
      <>
        <p>Compartilhamos dados só com os operadores necessários para o serviço funcionar:</p>
        <ul>
          <li>Vercel: hospedagem do aplicativo e do servidor.</li>
          <li>Provedor do banco de dados PostgreSQL onde ficam os dados.</li>
          <li>OpenRouter, Anthropic, Google e OpenAI: modelos de IA (veja a seção anterior).</li>
          <li>Stripe: pagamentos e assinaturas.</li>
          <li>
            Resend: envio de e-mails, como o link para trocar a senha e as confirmações de
            agendamento.
          </li>
          <li>Google: login com o Google e, se você ligar, o Google Drive e o Google Tarefas.</li>
          <li>Meta (WhatsApp Cloud API): mensagens, se você vincular um número.</li>
          <li>Pluggy: Open Finance, se você vincular um banco.</li>
          <li>
            Apple (iCloud), Google ou Microsoft (Outlook): só lemos o link da agenda que você ligar;
            nada seu é enviado a eles.
          </li>
          <li>
            Sentry: registro de erros técnicos, configurado para não receber cookies, mensagens,
            valores nem dados da sua conta.
          </li>
          <li>
            BrasilAPI e Banco Central: consultas públicas (CNPJ, câmbio, Selic), sem dados seus.
          </li>
        </ul>
        <p>
          Alguns desses operadores ficam fora do Brasil, principalmente nos Estados Unidos. Essas
          transferências seguem o art. 33 da LGPD, com contratos e salvaguardas dos próprios
          operadores. Também podemos compartilhar dados quando a lei ou uma autoridade exigir.
        </p>
      </>
    ),
    id: 'terceiros',
    title: 'Com quem compartilhamos',
  },
  {
    body: (
      <p>
        Usamos só cookies essenciais: o da sessão, que mantém você conectado, e, se você marcar “Não
        pedir de novo neste navegador”, o da verificação em duas etapas. Preferências como tema,
        idioma e menu ficam no armazenamento local do navegador. Não usamos cookies de publicidade,
        nem ferramentas de análise ou rastreamento de terceiros.
      </p>
    ),
    id: 'cookies',
    title: 'Cookies',
  },
  {
    body: (
      <>
        <p>
          Guardamos os seus dados enquanto a conta existir. Ao excluir a conta (Perfil, “Excluir
          conta”), apagamos na hora a conta, as sessões e todos os dados financeiros, conversas e
          integrações das organizações em que você é o único membro, e cancelamos a assinatura.
        </p>
        <p>
          Cópias de segurança do banco de dados podem manter esses dados por um período limitado,
          até serem substituídas no ciclo normal. Registros de cobrança ficam com o Stripe pelo
          prazo exigido pela legislação fiscal.
        </p>
      </>
    ),
    id: 'retencao',
    title: 'Por quanto tempo guardamos',
  },
  {
    body: (
      <>
        <p>Pela LGPD (art. 18), você pode, a qualquer momento:</p>
        <ul>
          <li>confirmar se tratamos os seus dados e acessá-los;</li>
          <li>corrigir dados incompletos, inexatos ou desatualizados;</li>
          <li>pedir anonimização, bloqueio ou eliminação de dados desnecessários;</li>
          <li>pedir a portabilidade dos dados;</li>
          <li>saber com quem os compartilhamos;</li>
          <li>revogar consentimentos e excluir a conta.</li>
        </ul>
        <p>
          Boa parte disso você faz no próprio aplicativo: editar e apagar registros, exportar o
          fluxo de caixa, desligar integrações e excluir a conta. Para o resto, escreva para {mail};
          respondemos em até 15 dias. Você também pode reclamar à Autoridade Nacional de Proteção de
          Dados (ANPD).
        </p>
      </>
    ),
    id: 'direitos',
    title: 'Seus direitos',
  },
  {
    body: (
      <p>
        As conexões são cifradas (HTTPS). Senhas ficam só como hash, e chaves de integração são
        cifradas com AES-256-GCM. Você pode ligar a verificação em duas etapas. Se houver um
        incidente de segurança que possa causar risco ou dano relevante, avisamos você e a ANPD.
      </p>
    ),
    id: 'seguranca',
    title: 'Segurança',
  },
  {
    body: (
      <p>
        O Caishen não é destinado a menores de 18 anos e não coleta de propósito dados de crianças
        ou adolescentes.
      </p>
    ),
    id: 'menores',
    title: 'Menores de idade',
  },
  {
    body: (
      <p>
        Podemos atualizar esta Política. Mudanças relevantes são avisadas por e-mail ou no
        aplicativo antes de valer. A data no topo indica a versão em vigor.
      </p>
    ),
    id: 'mudancas',
    title: 'Mudanças nesta Política',
  },
];

export function PrivacyPage() {
  return (
    <LegalDocument
      clauses={PRIVACY}
      intro={
        <p>
          Esta Política explica quais dados pessoais o Caishen coleta, para quê, com quem
          compartilha e como você exerce os seus direitos, conforme a Lei Geral de Proteção de Dados
          (Lei nº 13.709/2018). Veja também os {to('/terms', 'Termos de Uso')}.
        </p>
      }
      title="Política de Privacidade"
    />
  );
}
