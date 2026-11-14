import {
  LANDING_SITES,
  type LandingSiteData,
  type LandingSiteId,
} from '../data/landingSites'

export const CAMPAIGN_STATE_KEY = 'mars-outpost-alpha-campaign-v1'
const LEGACY_CAMPAIGN_KEY = 'mars-outpost-alpha-part1'

export type CampaignState = {
  version: 1
  campaignStarted: boolean
  landingSequenceCompleted: boolean
  landingSite: LandingSiteData | null
  landingSiteConfirmed: boolean
  seed: number
}

const emptyCampaignState: CampaignState = {
  version: 1,
  campaignStarted: false,
  landingSequenceCompleted: false,
  landingSite: null,
  landingSiteConfirmed: false,
  seed: 0,
}

function isLandingSiteId(value: unknown): value is LandingSiteId {
  return value === 'open-plain' || value === 'rocky-basin'
}

export function getCampaignState(): CampaignState {
  try {
    const saved = localStorage.getItem(CAMPAIGN_STATE_KEY)

    if (saved) {
      const parsed: unknown = JSON.parse(saved)

      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        'version' in parsed &&
        parsed.version === 1
      ) {
        const data = parsed as Partial<CampaignState>
        const siteId = data.landingSite?.id

        return {
          version: 1,
          campaignStarted: Boolean(data.campaignStarted),
          landingSequenceCompleted: Boolean(data.landingSequenceCompleted),
          landingSite: isLandingSiteId(siteId) ? LANDING_SITES[siteId] : null,
          landingSiteConfirmed: Boolean(data.landingSiteConfirmed && isLandingSiteId(siteId)),
          seed: Number.isSafeInteger(data.seed) && Number(data.seed) >= 0 ? Number(data.seed) : 0,
        }
      }
    }

    // Recognize the simple campaign marker created by the Part 1 menu.
    const legacyStarted = localStorage.getItem(LEGACY_CAMPAIGN_KEY) === 'started'
    return { ...emptyCampaignState, campaignStarted: legacyStarted }
  } catch {
    return { ...emptyCampaignState }
  }
}

function saveCampaignState(state: CampaignState): CampaignState {
  try {
    localStorage.setItem(CAMPAIGN_STATE_KEY, JSON.stringify(state))
  } catch {
    // The in-memory game flow still works if browser storage is unavailable.
  }

  return state
}

export function startCampaignState(): CampaignState {
  const seedBytes = new Uint32Array(1)
  const seed = typeof crypto !== 'undefined' && crypto.getRandomValues
    ? crypto.getRandomValues(seedBytes)[0]
    : Math.floor(Date.now() % 0xffffffff)
  return saveCampaignState({
    ...getCampaignState(),
    campaignStarted: true,
    seed,
  })
}

export function completeLandingSequence(): CampaignState {
  return saveCampaignState({
    ...getCampaignState(),
    campaignStarted: true,
    landingSequenceCompleted: true,
  })
}

export function confirmLandingSite(siteId: LandingSiteId): CampaignState {
  return saveCampaignState({
    ...getCampaignState(),
    campaignStarted: true,
    landingSequenceCompleted: true,
    landingSite: LANDING_SITES[siteId],
    landingSiteConfirmed: true,
  })
}
