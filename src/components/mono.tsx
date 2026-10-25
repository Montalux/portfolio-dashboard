import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

// Shared building blocks of the design system "Montalux Mono" (design/README.md)

const focus = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mono-accent'
const focusDark = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mono-accent-dark'
const field = `box-border w-full min-h-12 rounded-xl border border-mono-line bg-white text-base text-mono-ink placeholder:text-mono-muted ${focus}`

export const inputCls = `${field} px-4`
export const selectCls = `${field} px-3`
export const textareaCls = `${field} px-4 py-3 leading-normal`

const btn = `inline-flex items-center justify-center gap-2 rounded-xl border text-base cursor-pointer disabled:cursor-default disabled:opacity-50 ${focus}`
export const btnSolid = `${btn} min-h-12 px-7 border-mono-ink bg-mono-ink font-bold text-white`
export const btnOutline = `${btn} min-h-12 px-7 border-mono-line bg-white font-medium text-mono-ink`
export const btnSmall = `${btn} min-h-12 px-[22px] border-mono-line bg-white font-medium text-mono-ink`
export const btnText = `${btn} min-h-11 px-1 border-0 bg-transparent font-medium text-mono-muted`

// Buttons on the navy band
const dark = `inline-flex items-center gap-2 min-h-11 rounded-xl border text-[15px] cursor-pointer disabled:cursor-default disabled:opacity-50 ${focusDark}`
export const btnDarkGhost = `${dark} px-[18px] border-mono-tile-line bg-transparent font-medium text-mono-bg`
export const btnDarkSolid = `${dark} px-[22px] border-mono-accent-dark bg-mono-accent-dark font-bold text-mono-ink`

export function Page({ children }: { children: React.ReactNode }) {
  return <div className="min-h-svh bg-mono-bg text-mono-ink">{children}</div>
}

const gutter = 'px-[clamp(16px,4vw,40px)]'

// Content column below the band; the start page is wider than detail and edit
export function Content({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={`mx-auto box-border flex w-full flex-col ${gutter} ${wide ? 'max-w-[1328px] gap-24 pt-20 pb-30' : 'max-w-[1152px] gap-12 pt-18 pb-30'}`}>
      {children}
    </div>
  )
}

export function BandInner({ children, wide, className = '' }: { children: React.ReactNode; wide?: boolean; className?: string }) {
  return (
    <header className="bg-mono-ink text-mono-bg">
      <div className={`mx-auto box-border flex w-full flex-col ${gutter} ${wide ? 'max-w-[1328px]' : 'max-w-[1152px]'} ${className}`}>{children}</div>
    </header>
  )
}

// Navy band of the detail, edit and new screens
export function PageHeader({
  back,
  eyebrow,
  title,
  subtitle,
  right,
}: {
  back: { to: string; label: string }
  eyebrow?: string
  title: string
  subtitle?: string
  right?: React.ReactNode
}) {
  return (
    <BandInner className="gap-5 pt-10 pb-16">
      <Link to={back.to} className={`inline-flex min-h-11 items-center gap-2 self-start text-base text-mono-muted-dark no-underline ${focusDark}`}>
        <ArrowLeft className="size-[18px] text-mono-accent-dark" aria-hidden />
        {back.label}
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-[1_1_360px] flex-col gap-2">
          {eyebrow && <span className="text-[15px] text-mono-muted-dark">{eyebrow}</span>}
          <h1 className="m-0 text-[clamp(32px,6vw,44px)] leading-[1.05] font-bold">{title}</h1>
          {subtitle && <span className="text-[17px] font-medium text-mono-accent-dark">{subtitle}</span>}
        </div>
        {right && <div className="flex items-center gap-4">{right}</div>}
      </div>
    </BandInner>
  )
}

export function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-5 rounded-xl border border-mono-line bg-white px-9 py-8">
      <h2 className="m-0 text-2xl leading-[1.15] font-bold">{title}</h2>
      {children}
    </section>
  )
}

export function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="m-0 rounded-xl border border-mono-ink bg-white px-4 py-3 text-base font-medium">
      {children}
    </p>
  )
}
