import { getCampaignState } from '../game/state/campaignState'
import './OutpostEnvironment.css'

type PartFourEntryProps = {
  onEnter: () => void
  onBackToSite: () => void
}

function PartFourEntry({ onEnter, onBackToSite }: PartFourEntryProps) {
  const state = getCampaignState()
  const site = state.landingSite

  return (
    <main className="part-four-entry">
      <div className="part-four-entry__background" aria-hidden="true">
        <div />
      </div>

      <section className="part-four-entry__content">
        <p className="landing-kicker">OUTPOST ALPHA · SURFACE OPERATIONS</p>

        {site && state.landingSiteConfirmed ? (
          <>
            <h1>Outpost Alpha</h1>
            <p className="part-four-entry__site">
              {site.designation} · {site.name}
            </p>
            <p>{site.briefing}</p>

            <div className="part-four-entry__conditions">
              <span>CONSTRUCTION <b>{site.constructionDifficulty}</b></span>
              <span>ROVER ROUTES <b>{site.explorationDifficulty}</b></span>
              <span>GEOLOGY <b>{site.geologicalResearchOpportunity}</b></span>
            </div>

            <p>Landing coordinates recorded. Initial surface operations are ready to begin.</p>

            <button type="button" onClick={onEnter}>
              Enter Outpost Alpha <span aria-hidden="true">→</span>
            </button>
          </>
        ) : (
          <>
            <h1>Landing site not confirmed</h1>
            <p>Choose and confirm a landing site before entering the outpost environment.</p>
            <button type="button" onClick={onBackToSite}>Return to landing-site selection</button>
          </>
        )}
      </section>
    </main>
  )
}

export default PartFourEntry