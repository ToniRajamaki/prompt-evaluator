import type { ReactNode } from 'react'

export interface Crumb {
  label: string
  onClick?: () => void
}

interface LayoutProps {
  crumbs: Crumb[]
  children: ReactNode
}

export default function Layout({ crumbs, children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-300 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-3">
          <h1 className="text-lg font-semibold">Prompt Evaluator</h1>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-6">
        <nav className="mb-6 text-sm text-gray-500">
          {crumbs.map((c, i) => (
            <span key={i}>
              {i > 0 && <span className="mx-1">/</span>}
              {c.onClick ? (
                <button
                  type="button"
                  onClick={c.onClick}
                  className="hover:underline text-gray-700"
                >
                  {c.label}
                </button>
              ) : (
                <span className="text-gray-900">{c.label}</span>
              )}
            </span>
          ))}
        </nav>

        {children}
      </div>
    </div>
  )
}
