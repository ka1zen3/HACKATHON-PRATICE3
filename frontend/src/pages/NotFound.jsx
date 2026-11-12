import { Link } from 'react-router-dom'
import { RiArmchairLine, RiArrowLeftLine, RiMapPinLine } from 'react-icons/ri'
import { AppLayout } from '../components/AppLayout.jsx'
import { PageContainer } from '../components/PageContainer.jsx'
import { buttonClass } from '../lib/buttonClass.js'

export default function NotFound() {
  return (
    <AppLayout>
      <div className="bg-parchment py-16 sm:py-24">
        <PageContainer>
          <div className="mx-auto max-w-[560px] text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-full border border-ash bg-canvas text-ink-soft">
              <RiArmchairLine size={24} aria-hidden="true" />
            </span>
            <p className="numeric mt-6 text-[clamp(4rem,12vw,7rem)] font-bold leading-none tracking-[-0.04em] text-ash">
              404
            </p>
            <h1 className="mt-4 text-[clamp(1.8rem,4vw,2.6rem)] font-bold leading-[1.05] tracking-[-0.03em]">
              That seat does not exist.
            </h1>
            <p className="mx-auto mt-3 max-w-[44ch] text-sm leading-relaxed text-ink-soft">
              The page may have moved, or the link may be out of date. Head back to the
              live floor to find an open seat.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-2">
              <Link to="/" className={buttonClass({ size: 'md' })}>
                <RiMapPinLine size={16} aria-hidden="true" />
                Live floor
              </Link>
              <Link to="/login" className={buttonClass({ variant: 'outline', size: 'md' })}>
                <RiArrowLeftLine size={16} aria-hidden="true" />
                Time in
              </Link>
            </div>
          </div>
        </PageContainer>
      </div>
    </AppLayout>
  )
}
