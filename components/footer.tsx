import { Github, Mail } from "lucide-react";
import Link from "next/link";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Sobre */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Via Fidei</h3>
            <p className="text-sm text-muted-foreground">
              Encontre igrejas católicas em Maceió/AL de forma simples e
              objetiva.
            </p>
          </div>

          {/* Links Úteis */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Início
                </Link>
              </li>
              <li>
                <a
                  href="https://arquidiocesedemaceio.org.br"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Arquidiocese de Maceió
                </a>
              </li>
            </ul>
          </div>

          {/* Contato */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Contato</h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="mailto:matheusmczvieira@gmail.com"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  matheusmczvieira@gmail.com
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/matheusmcz/via-fidei"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Github className="h-4 w-4" />
                  GitHub
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://github.com/matheusmcz/via-fidei/blob/main/LICENSE"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Licença MIT
                </a>
              </li>
              <li className="text-muted-foreground">
                Dados fornecidos por Hora da Missa
              </li>
            </ul>
          </div>
        </div>

        {/* Linha de Copyright */}
        <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
          <p className="flex items-center justify-center gap-1">
            © {currentYear} Via Fidei. Desenvolvido e mantido por{" "}
            <a
              href="https://github.com/matheusmcz"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium hover:text-foreground transition-colors"
            >
              Matheus Vieira do Nascimento
            </a>
          </p>
          <p className="mt-2 text-xs">
            Com a Graça de Nosso Senhor e Salvador Jesus Cristo, a intercessão
            de Maria Mãe de Deus, Senhora dos Prazeres e o Glorioso São José.
          </p>
          <p className="mt-2 text-xs">
            Arquediocese de Maceió - Dom. Carlos Alberto Breis - OFM
          </p>
          <p className="mt-2 text-xs">
            Paróquia São Paulo Apóstolo - Salvador Lyra - Pe. Manoel José dos
            Santos
          </p>
        </div>
      </div>
    </footer>
  );
}
