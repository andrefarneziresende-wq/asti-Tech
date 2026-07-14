export function Hero() {
  return (
    <section className="relative overflow-hidden bg-grid">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />

      <div className="relative mx-auto flex max-w-6xl flex-col items-center px-6 pb-24 pt-20 text-center md:pt-28">
        <span className="rounded-full border border-border bg-surface px-4 py-1.5 text-xs font-medium text-accent">
          Desenvolvimento de sites rápido e sob medida
        </span>

        <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-tight tracking-tight md:text-6xl">
          Sites profissionais para{" "}
          <span className="gradient-text">pequenas e médias empresas</span>,
          prontos em dias
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-muted">
          A ASTI Tech projeta, desenvolve e publica o site do seu negócio com tecnologia própria,
          em muito menos tempo — com qualidade profissional e um custo sob medida para a sua realidade.
        </p>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <a
            href="#contato"
            className="rounded-full bg-gradient-to-r from-primary to-primary-2 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-transform hover:scale-105"
          >
            Quero um orçamento
          </a>
          <a
            href="#como-funciona"
            className="rounded-full border border-border px-7 py-3 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-accent"
          >
            Ver como funciona
          </a>
        </div>

        <dl className="mt-16 grid w-full max-w-2xl grid-cols-1 gap-6 border-t border-border pt-10 sm:grid-cols-3">
          {[
            { value: "Ágil", label: "Do projeto à publicação" },
            { value: "Dias", label: "Não semanas, para ir ao ar" },
            { value: "100%", label: "Sob medida para o seu negócio" },
          ].map((stat) => (
            <div key={stat.label}>
              <dt className="gradient-text text-3xl font-bold">{stat.value}</dt>
              <dd className="mt-1 text-sm text-muted">{stat.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
