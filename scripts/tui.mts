// `pnpm tui`: prepares the machine (.env, Docker, install, Postgres, migrations, codegen) and
// runs the server and the client in one screen. Runs on plain Node 24, no dependencies.
// Flags: --skip-install skips `pnpm install`.
import { type ChildProcess, spawn, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync } from 'node:fs';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { stripVTControlCharacters } from 'node:util';

const root = fileURLToPath(new URL('..', import.meta.url));
const args = new Set(process.argv.slice(2));
const isWindows = process.platform === 'win32';
const DOCKER_DESKTOP = `${process.env.LOCALAPPDATA}\\Programs\\DockerDesktop\\Docker Desktop.exe`;
const DOCKER_DESKTOP_GLOBAL = 'C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe';

const c = {
  bold: (s: string) => `\x1b[1m${s}\x1b[22m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[22m`,
  red: (s: string) => `\x1b[31m${s}\x1b[39m`,
  green: (s: string) => `\x1b[32m${s}\x1b[39m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[39m`,
  blue: (s: string) => `\x1b[34m${s}\x1b[39m`,
  magenta: (s: string) => `\x1b[35m${s}\x1b[39m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[39m`,
};
const stripAnsi = stripVTControlCharacters;

// ---------------------------------------------------------------- preparation

class StepError extends Error {
  output: string;
  constructor(message: string, output = '') {
    super(message);
    this.output = output;
  }
}

/** Runs a command to the end, keeping its output for when it fails. */
function run(command: string, commandArgs: string[], onLine?: (line: string) => void) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(`${command} ${commandArgs.join(' ')}`, { cwd: root, shell: true });
    let output = '';
    const collect = (chunk: Buffer) => {
      output += chunk.toString();
      if (onLine) for (const line of chunk.toString().split(/\r?\n/)) if (line.trim()) onLine(line);
    };
    child.stdout.on('data', collect);
    child.stderr.on('data', collect);
    child.on('error', error => reject(new StepError(error.message, output)));
    child.on('close', code =>
      code === 0
        ? resolve(output)
        : reject(
            new StepError(`${command} ${commandArgs.join(' ')} saiu com código ${code}`, output)
          )
    );
  });
}

const dockerIsUp = () => spawnSync('docker info', { stdio: 'ignore', shell: true }).status === 0;
const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

function portIsFree(port: number) {
  return new Promise<boolean>(resolve => {
    const server = createServer()
      .once('error', () => resolve(false))
      .once('listening', () => server.close(() => resolve(true)))
      .listen(port);
  });
}

type Step = { title: string; run: (note: (text: string) => void) => Promise<string | void> };

const steps: Step[] = [
  {
    title: '.env',
    run: async () => {
      const env = `${root}.env`;
      if (existsSync(env)) return 'já existe';
      copyFileSync(`${root}.env.example`, env);
      return 'criado a partir do .env.example';
    },
  },
  {
    title: 'Docker',
    run: async note => {
      if (dockerIsUp()) return 'rodando';
      const desktop = [DOCKER_DESKTOP, DOCKER_DESKTOP_GLOBAL].find(p => isWindows && existsSync(p));
      if (!desktop) throw new StepError('Docker não está rodando. Abra o Docker e rode de novo.');
      spawn(desktop, [], { detached: true, stdio: 'ignore' }).unref();
      for (let s = 0; s < 180; s += 2) {
        note(`abrindo o Docker Desktop… ${s}s`);
        await wait(2000);
        if (dockerIsUp()) return 'Docker Desktop aberto';
      }
      throw new StepError('O Docker Desktop não respondeu em 3 minutos.');
    },
  },
  {
    title: 'Dependências',
    run: async note => {
      if (args.has('--skip-install')) return 'puladas (--skip-install)';
      await run('pnpm', ['install'], note);
    },
  },
  {
    title: 'Postgres',
    run: async note => {
      await run('docker', ['compose', 'up', '-d', '--wait', 'postgres'], note);
      return 'localhost:5433';
    },
  },
  { title: 'Migrações', run: async note => void (await run('pnpm', ['db:migrate'], note)) },
  { title: 'GraphQL codegen', run: async note => void (await run('pnpm', ['codegen'], note)) },
  {
    title: 'Portas 4000 e 5173',
    run: async () => {
      const busy = [];
      for (const port of [4000, 5173]) if (!(await portIsFree(port))) busy.push(port);
      if (busy.length) {
        throw new StepError(
          `Porta ocupada: ${busy.join(', ')}. Pare o outro \`pnpm dev\`/\`pnpm tui\` ou o \`docker compose\` completo.`
        );
      }
      return 'livres';
    },
  },
];

async function prepare() {
  const spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  console.log(`\n  ${c.bold('zapbots')} ${c.dim('· preparando')}\n`);
  for (const step of steps) {
    const started = Date.now();
    let frame = 0;
    let detail = '';
    const draw = (mark: string, text: string) => {
      const line = `  ${mark} ${step.title.padEnd(24)} ${c.dim(text)}`;
      process.stdout.write(`\r\x1b[2K${line.slice(0, (process.stdout.columns || 100) + 20)}`);
    };
    const timer = setInterval(() => draw(c.cyan(spinner[frame++ % spinner.length]), detail), 80);
    try {
      const result = await step.run(text => (detail = stripAnsi(text).trim().slice(0, 70)));
      clearInterval(timer);
      const seconds = ((Date.now() - started) / 1000).toFixed(1);
      draw(c.green('✓'), result || `${seconds}s`);
      process.stdout.write('\n');
    } catch (error) {
      clearInterval(timer);
      draw(c.red('✗'), '');
      process.stdout.write('\n\n');
      const output = error instanceof StepError ? error.output.trim() : '';
      if (output) console.log(c.dim(output.split(/\r?\n/).slice(-30).join('\n')), '\n');
      console.log(`  ${c.red((error as Error).message)}\n`);
      process.exit(1);
    }
  }
}

// ---------------------------------------------------------------- the running screen

type Source = 'server' | 'client' | 'tui';
type Line = { source: Source; text: string };
type Status = 'iniciando' | 'pronto' | 'parado' | 'caiu';

const color: Record<Source, (s: string) => string> = {
  server: c.magenta,
  client: c.blue,
  tui: c.dim,
};

const services = {
  server: {
    filter: '@zapbots/server',
    ready: /server on http/,
    status: 'parado' as Status,
    child: undefined as ChildProcess | undefined,
  },
  client: {
    filter: '@zapbots/client',
    ready: /ready in|Local:/,
    status: 'parado' as Status,
    child: undefined as ChildProcess | undefined,
  },
};
type ServiceName = keyof typeof services;

const views = ['tudo', 'server', 'client'] as const;
let view: (typeof views)[number] = 'tudo';
let scroll = 0; // lines up from the bottom; 0 follows the log
let quitting = false;
const lines: Line[] = [];
const interactive = Boolean(process.stdout.isTTY && process.stdin.isTTY);

function log(source: Source, text: string) {
  lines.push({ source, text: stripAnsi(text).replace(/\t/g, '  ') });
  if (lines.length > 5000) lines.splice(0, lines.length - 5000);
  if (!interactive) console.log(`${color[source](source.padEnd(6))} ${text}`);
  else if (scroll > 0) scroll++;
  render();
}

function pipe(source: Source, child: ChildProcess, onLine?: (line: string) => void) {
  let rest = '';
  const handle = (chunk: Buffer) => {
    const parts = (rest + chunk.toString()).split(/\r?\n/);
    rest = parts.pop() ?? '';
    for (const part of parts) {
      if (!part.trim()) continue;
      onLine?.(part);
      log(source, part);
    }
  };
  child.stdout?.on('data', handle);
  child.stderr?.on('data', handle);
}

/** Kills a child and everything it started (tsx watch, vite and pnpm wrap each other). */
function kill(child: ChildProcess | undefined) {
  if (!child?.pid || child.exitCode !== null) return;
  if (isWindows)
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  else {
    try {
      process.kill(-child.pid, 'SIGTERM');
    } catch {
      child.kill('SIGTERM');
    }
  }
}

function start(name: ServiceName) {
  const service = services[name];
  service.status = 'iniciando';
  const child = spawn(`pnpm --filter ${service.filter} dev`, {
    cwd: root,
    shell: true,
    detached: !isWindows,
    env: { ...process.env, FORCE_COLOR: '0' },
  });
  service.child = child;
  pipe(name, child, line => {
    if (service.status === 'iniciando' && service.ready.test(stripAnsi(line))) {
      service.status = 'pronto';
      render();
    }
  });
  child.on('close', code => {
    if (service.child !== child) return;
    service.status = code === 0 || quitting ? 'parado' : 'caiu';
    if (!quitting) log('tui', `${name} parou (código ${code ?? 'sinal'}). Tecle r para reiniciar.`);
  });
  render();
}

function restart(name: ServiceName) {
  const old = services[name].child;
  services[name].child = undefined;
  kill(old);
  log('tui', `reiniciando ${name}…`);
  start(name);
}

function quit() {
  if (quitting) return;
  quitting = true;
  for (const service of Object.values(services)) kill(service.child);
  if (interactive) process.stdout.write('\x1b[?25h\x1b[?1049l');
  console.log(
    `\n  zapbots parado. O Postgres continua no Docker; ${c.dim('pnpm infra:down')} para desligar.\n`
  );
  process.exit(0);
}

let renderQueued = false;
function render() {
  if (!interactive || quitting || renderQueued) return;
  renderQueued = true;
  setTimeout(draw, 40);
}

function draw() {
  renderQueued = false;
  const width = process.stdout.columns || 100;
  const height = process.stdout.rows || 30;
  const badge = (name: ServiceName, label: string) => {
    const status = services[name].status;
    const dot = {
      iniciando: c.yellow('●'),
      pronto: c.green('●'),
      parado: c.dim('●'),
      caiu: c.red('●'),
    }[status];
    return `${dot} ${color[name](name)} ${c.dim(label)} ${c.dim(`(${status})`)}`;
  };
  const header = ` ${c.bold('zapbots')}   ${badge('server', ':4000')}   ${badge('client', 'http://localhost:5173')}`;
  const tabs = views
    .map((v, i) => (v === view ? c.bold(`[${i + 1} ${v}]`) : c.dim(` ${i + 1} ${v} `)))
    .join(' ');
  const footer = ` ${tabs}   ${c.dim('r reiniciar · o abrir · ↑↓ PgUp PgDn rolar · End seguir · q sair')}`;
  const rule = c.dim('─'.repeat(width));

  const body = height - 4;
  const shown =
    view === 'tudo' ? lines : lines.filter(l => l.source === view || l.source === 'tui');
  scroll = Math.max(0, Math.min(scroll, shown.length - body));
  const end = shown.length - scroll;
  const visible = shown.slice(Math.max(0, end - body), end);

  const out = ['\x1b[H', header, '\x1b[K\n', rule, '\n'];
  for (let i = 0; i < body; i++) {
    const line = visible[i];
    if (line) {
      const prefix = view === 'tudo' ? `${line.source.padEnd(6)} ` : '';
      const text = (prefix + line.text).slice(0, width - 1);
      out.push(color[line.source](text.slice(0, prefix.length)), text.slice(prefix.length));
    }
    out.push('\x1b[K\n');
  }
  out.push(
    rule,
    '\n',
    footer.slice(0, width + 120),
    scroll ? c.yellow(`  ↑${scroll}`) : '',
    '\x1b[K'
  );
  process.stdout.write(out.join(''));
}

function openBrowser() {
  const url = 'http://localhost:5173';
  const [command, commandArgs] = isWindows
    ? ['cmd', ['/c', 'start', '', url]]
    : process.platform === 'darwin'
      ? ['open', [url]]
      : ['xdg-open', [url]];
  spawn(command, commandArgs, { stdio: 'ignore', detached: true }).unref();
}

function listenToKeys() {
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.on('data', data => {
    const key = data.toString();
    const page = Math.max(1, (process.stdout.rows || 30) - 6);
    if (key === 'q' || key === '\u0003') return quit();
    if (key >= '1' && key <= '3') {
      view = views[Number(key) - 1];
      scroll = 0;
    } else if (key === 'r') {
      for (const name of view === 'tudo' ? (['server', 'client'] as const) : [view]) restart(name);
    } else if (key === 'o') openBrowser();
    else if (key === '\x1b[A') scroll++;
    else if (key === '\x1b[B') scroll = Math.max(0, scroll - 1);
    else if (key === '\x1b[5~') scroll += page;
    else if (key === '\x1b[6~') scroll = Math.max(0, scroll - page);
    else if (key === '\x1b[F' || key === '\x1b[4~' || key === '\x1bOF') scroll = 0;
    render();
  });
}

await prepare();
process.on('SIGINT', quit);
process.on('SIGTERM', quit);
if (interactive) {
  process.stdout.write('\x1b[?1049h\x1b[?25l\x1b[2J');
  process.stdout.on('resize', () => (process.stdout.write('\x1b[2J'), render()));
  listenToKeys();
}
start('server');
start('client');
