const STEPS = [
  {
    step: "01",
    title: "Você conta sobre seu negócio",
    description:
      "Fale com a gente pelo formulário, e-mail ou WhatsApp e conte um pouco sobre a sua empresa.",
  },
  {
    step: "02",
    title: "Geração do site",
    description:
      "A partir dos dados que você passou, projetamos e desenvolvemos um mockup completo do site do seu negócio.",
  },
  {
    step: "03",
    title: "Publicação do mockup",
    description:
      "O mockup é publicado em um endereço próprio, para você ver o resultado real antes de decidir qualquer coisa.",
  },
  {
    step: "04",
    title: "Proposta com ideias e valor",
    description:
      "Você recebe o link do mockup, sugestões de conteúdo para o seu site e uma estimativa do custo mensal.",
  },
  {
    step: "05",
    title: "Você decide",
    description: "Gostou? A gente dá continuidade ao projeto com você a partir daí.",
  },
  {
    step: "06",
    title: "Código-fonte é seu",
    description:
      "Todo o código do seu site fica versionado em um repositório Git, pronto para evoluir com ou sem a gente.",
  },
];

export function HowItWorks() {
  return (
    <section id="como-funciona" className="border-y border-border bg-surface">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold md:text-4xl">Como funciona</h2>
          <p className="mt-4 text-muted">
            Um processo pensado para pequenas e médias empresas: rápido, transparente e sem
            burocracia.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((item) => (
            <div key={item.step} className="relative rounded-2xl border border-border bg-background p-6">
              <span className="gradient-text text-4xl font-bold">{item.step}</span>
              <h3 className="mt-3 text-lg font-semibold text-foreground">{item.title}</h3>
              <p className="mt-2 text-sm text-muted">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
