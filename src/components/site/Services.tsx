const SERVICES = [
  {
    title: "Sites institucionais",
    description:
      "Apresente sua empresa com um site rápido, responsivo e otimizado, projetado sob medida a partir do seu negócio real.",
    icon: "🏢",
  },
  {
    title: "Landing pages de conversão",
    description:
      "Páginas focadas em transformar visitantes em clientes, com copy e estrutura pensadas para o seu público.",
    icon: "🚀",
  },
  {
    title: "Lojas virtuais",
    description:
      "E-commerce enxuto para pequenos negócios começarem a vender online sem complicação.",
    icon: "🛒",
  },
  {
    title: "Redesign de site",
    description:
      "Site antigo, parado no tempo? A gente analisa e recria com visual moderno e melhor performance.",
    icon: "♻️",
  },
  {
    title: "SEO e performance",
    description:
      "Sites otimizados para aparecer no Google e carregar rápido, essencial para quem depende de busca local.",
    icon: "📈",
  },
  {
    title: "Manutenção contínua",
    description:
      "Cuidamos da hospedagem, atualizações e pequenas mudanças para o seu site nunca sair do ar.",
    icon: "🛠️",
  },
];

export function Services() {
  return (
    <section id="servicos" className="mx-auto max-w-6xl px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold md:text-4xl">O que a gente cria para o seu negócio</h2>
        <p className="mt-4 text-muted">
          Combinamos tecnologia própria com curadoria humana para entregar sites que
          realmente representam pequenas e médias empresas.
        </p>
      </div>

      <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {SERVICES.map((service) => (
          <div key={service.title} className="glow-card rounded-2xl p-6 transition-colors hover:border-primary">
            <span className="text-3xl">{service.icon}</span>
            <h3 className="mt-4 text-lg font-semibold text-foreground">{service.title}</h3>
            <p className="mt-2 text-sm text-muted">{service.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
