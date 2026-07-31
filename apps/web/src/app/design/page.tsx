import type { Metadata } from 'next';
import {
  Button,
  Badge,
  Input,
  Coin,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@caishen/ui';

export const metadata: Metadata = { title: 'Caishen — Design System' };

const COLORS = [
  { name: 'cream', hex: '#FFFBF7', text: 'text-ink' },
  { name: 'ink', hex: '#1C1917', text: 'text-white' },
  { name: 'navy', hex: '#0B3D91', text: 'text-white' },
  { name: 'jade', hex: '#0E7C66', text: 'text-white' },
  { name: 'gold', hex: '#C79A3A', text: 'text-ink' },
  { name: 'sand', hex: '#F3EFE7', text: 'text-ink' },
  { name: 'subtle', hex: '#78716C', text: 'text-white' },
];

const TYPE_SCALE = [
  { cls: 'text-6xl', label: '6xl · 60' },
  { cls: 'text-5xl', label: '5xl · 48' },
  { cls: 'text-4xl', label: '4xl · 36' },
  { cls: 'text-3xl', label: '3xl · 30' },
  { cls: 'text-2xl', label: '2xl · 24' },
  { cls: 'text-xl', label: 'xl · 20' },
  { cls: 'text-base', label: 'base · 16' },
  { cls: 'text-sm', label: 'sm · 14' },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-ink/10 py-14">
      <h2 className="font-mono mb-8 text-xs uppercase tracking-[0.2em] text-gold">{title}</h2>
      {children}
    </section>
  );
}

export default function DesignSystemPage() {
  return (
    <div className="min-h-screen bg-cream">
      <div className="mx-auto max-w-5xl px-5 py-16">
        <header className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy text-gold">
            <Coin size={24} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
              Caishen Design System
            </h1>
            <p className="font-mono text-xs text-subtle">tokens · type · components · never purple</p>
          </div>
        </header>

        {/* Colors */}
        <Section title="Color">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
            {COLORS.map((c) => (
              <div key={c.name} className="overflow-hidden rounded-card border border-ink/10 shadow-card">
                <div
                  className={`flex h-24 items-end p-3 ${c.text}`}
                  style={{ backgroundColor: c.hex }}
                >
                  <span className="font-mono text-[11px]">{c.hex}</span>
                </div>
                <div className="bg-surface px-3 py-2">
                  <span className="font-display text-sm font-semibold text-ink">{c.name}</span>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Typography */}
        <Section title="Typography">
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="space-y-4">
              <div>
                <p className="font-mono mb-1 text-xs text-subtle">display · Space Grotesk</p>
                <p className="font-display text-3xl font-bold tracking-tight text-ink">
                  Your money, finally clear
                </p>
              </div>
              <div>
                <p className="font-mono mb-1 text-xs text-subtle">sans · Inter</p>
                <p className="text-lg text-ink">
                  Caishen reads your statements and builds the picture for you.
                </p>
              </div>
              <div>
                <p className="font-mono mb-1 text-xs text-subtle">mono · JetBrains Mono</p>
                <p className="font-mono text-lg text-ink">$4,200 · 22% · -$340/mo</p>
              </div>
            </div>
            <div className="space-y-1">
              {TYPE_SCALE.map((t) => (
                <div key={t.cls} className="flex items-baseline gap-4">
                  <span className="font-mono w-20 shrink-0 text-[11px] text-subtle">{t.label}</span>
                  <span className={`font-display truncate font-bold tracking-tight text-ink ${t.cls}`}>
                    Caishen
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Radius & shadow */}
        <Section title="Radius & elevation">
          <div className="flex flex-wrap gap-6">
            {[
              { cls: 'rounded-sm', label: 'sm' },
              { cls: 'rounded-md', label: 'md' },
              { cls: 'rounded-card', label: 'card' },
              { cls: 'rounded-xl', label: 'xl' },
              { cls: 'rounded-pill px-6', label: 'pill' },
            ].map((r) => (
              <div key={r.label} className="text-center">
                <div className={`flex h-16 w-16 items-center justify-center border border-ink/15 bg-surface ${r.cls}`}>
                  <span className="font-mono text-[10px] text-subtle">{r.label}</span>
                </div>
              </div>
            ))}
            {[
              { cls: 'shadow-card', label: 'card' },
              { cls: 'shadow-card-lg', label: 'lg' },
              { cls: 'shadow-card-xl', label: 'xl' },
            ].map((s) => (
              <div
                key={s.label}
                className={`flex h-16 w-24 items-center justify-center rounded-card bg-surface ${s.cls}`}
              >
                <span className="font-mono text-[10px] text-subtle">{s.label}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* Buttons */}
        <Section title="Buttons">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <Button>Primary</Button>
              <Button variant="gold">Gold</Button>
              <Button variant="jade">Jade</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="link">Link</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
              <Button size="icon" aria-label="coin"><Coin size={18} /></Button>
              <Button disabled>Disabled</Button>
            </div>
          </div>
        </Section>

        {/* Badges */}
        <Section title="Badges">
          <div className="flex flex-wrap items-center gap-3">
            <Badge>Default</Badge>
            <Badge variant="jade">Jade</Badge>
            <Badge variant="gold">Gold</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="destructive">Destructive</Badge>
          </div>
        </Section>

        {/* Inputs */}
        <Section title="Inputs">
          <div className="grid max-w-md gap-3">
            <Input placeholder="you@example.com" />
            <Input placeholder="Disabled" disabled />
          </div>
        </Section>

        {/* Card */}
        <Section title="Card">
          <Card className="max-w-sm">
            <CardHeader>
              <CardTitle className="font-display">Pro</CardTitle>
              <CardDescription>Everything you need to get ahead.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="font-display text-3xl font-bold text-ink">
                $5<span className="text-sm font-normal text-subtle">/mo</span>
              </p>
            </CardContent>
            <CardFooter>
              <Button className="w-full">Choose Pro</Button>
            </CardFooter>
          </Card>
        </Section>

        {/* Coin */}
        <Section title="Coin — the mark">
          <div className="flex items-end gap-6 text-navy">
            <Coin size={20} />
            <Coin size={28} />
            <Coin size={40} />
            <Coin size={56} className="text-gold" />
            <Coin size={72} className="text-jade" />
          </div>
        </Section>
      </div>
    </div>
  );
}
