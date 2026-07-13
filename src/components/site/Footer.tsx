import { WHATSAPP_LINK, CONTACT_EMAIL } from "@/lib/contact";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-3">
        <div>
          <Logo className="h-9 w-auto" />
          <p className="mt-4 max-w-xs text-sm text-muted">
            Sites profissionais para pequenas e médias empresas, criados com Inteligência Artificial.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-foreground">Navegação</h3>
          <ul className="mt-4 space-y-2 text-sm text-muted">
            <li><a href="#servicos" className="hover:text-foreground">Serviços</a></li>
            <li><a href="#como-funciona" className="hover:text-foreground">Como funciona</a></li>
            <li><a href="#orcamento" className="hover:text-foreground">Orçamento</a></li>
            <li><a href="#contato" className="hover:text-foreground">Contato</a></li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-foreground">Contato</h3>
          <ul className="mt-4 space-y-2 text-sm text-muted">
            <li>
              <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-foreground">{CONTACT_EMAIL}</a>
            </li>
            <li>
              <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
                WhatsApp: (11) 91000-9745
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border py-6 text-center text-xs text-muted">
        © {new Date().getFullYear()} ASTI Tech. Todos os direitos reservados.
      </div>
    </footer>
  );
}
