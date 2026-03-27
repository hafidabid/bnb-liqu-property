import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container py-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="font-bold tracking-tight">LiquProp</span>
            <span className="text-sm text-muted-foreground">Real Estate Liquidity</span>
          </div>
          <nav className="flex items-center gap-6">
            <Link
              to="/properties"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Properties
            </Link>
            <Link
              to="/portfolio"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Portfolio
            </Link>
            <a
              href="https://docs.liquprop.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Docs
            </a>
          </nav>
        </div>
        <div className="mt-6 border-t pt-6 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} LiquProp. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
