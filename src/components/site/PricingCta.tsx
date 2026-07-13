const FACTORS = [
  "Número de páginas e seções do site",
  "Integrações (WhatsApp, pagamentos, agendamento, e-commerce)",
  "Necessidade de conteúdo, fotos e textos exclusivos",
  "Hospedagem, manutenção e suporte contínuo",
];

export function PricingCta() {
  return (
    <section id="orcamento" className="mx-auto max-w-6xl px-6 py-24">
      <div className="glow-card grid gap-10 rounded-3xl p-8 md:grid-cols-2 md:p-14">
        <div>
          <h2 className="text-3xl font-bold md:text-4xl">Cada negócio é único. O preço também.</h2>
          <p className="mt-4 text-muted">
            Não trabalhamos com pacotes fechados. O valor do seu site — e da mensalidade de
            hospedagem e manutenção — é calculado sob medida, de acordo com o que o seu negócio
            realmente precisa.
          </p>
          <a
            href="#contato"
            className="mt-8 inline-block rounded-full bg-gradient-to-r from-primary to-primary-2 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-transform hover:scale-105"
          >
            Solicitar orçamento personalizado
          </a>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-accent">
            O que influencia o valor
          </h3>
          <ul className="mt-4 space-y-3">
            {FACTORS.map((factor) => (
              <li key={factor} className="flex items-start gap-3 text-sm text-muted">
                <span className="mt-0.5 text-accent">✓</span>
                {factor}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
