import { MISSION_REPORT_STORAGE_KEY } from '../campaign/missionReport'

const ARCHIVE_KEY = 'mars-outpost-alpha-campaign-archive-v1'

const ACTIVE_SAVE_KEYS = [
  'mars-outpost-alpha-campaign-v1',
  'mars-outpost-alpha-part1',
  'mars-outpost-alpha-survival-v1',
  'mars-outpost-alpha-colony-v1',
  'mars-outpost-alpha-gameplay-v1',
  'mars-outpost-alpha-science-v1',
  MISSION_REPORT_STORAGE_KEY,
] as const

type CampaignArchive = {
  version: 1
  id: string
  archivedAt: string
  saves: Record<string, string>
}

type ArchiveResult =
  | { ok: true; archived: boolean }
  | { ok: false; message: string }

function readArchives(): CampaignArchive[] {
  const raw = localStorage.getItem(ARCHIVE_KEY)
  if (!raw) return []

  const parsed: unknown = JSON.parse(raw)
  if (!Array.isArray(parsed)) {
    throw new Error('The campaign archive is not a valid list.')
  }

  return parsed.filter(
    (item): item is CampaignArchive =>
      typeof item === 'object' &&
      item !== null &&
      'version' in item &&
      item.version === 1 &&
      'id' in item &&
      typeof item.id === 'string' &&
      'archivedAt' in item &&
      typeof item.archivedAt === 'string' &&
      'saves' in item &&
      typeof item.saves === 'object' &&
      item.saves !== null,
  )
}

export function archiveAndResetActiveSaves(): ArchiveResult {
  try {
    const saves: Record<string, string> = {}

    for (const key of ACTIVE_SAVE_KEYS) {
      const value = localStorage.getItem(key)
      if (value !== null) saves[key] = value
    }

    const keysToRemove = Object.keys(saves)
    if (keysToRemove.length === 0) {
      return { ok: true, archived: false }
    }

    const archives = readArchives()
    const snapshot = JSON.stringify(saves)
    const alreadyArchived = archives.some(
      (archive) => JSON.stringify(archive.saves) === snapshot,
    )

    if (!alreadyArchived) {
      archives.push({
        version: 1,
        id: `campaign-${Date.now()}`,
        archivedAt: new Date().toISOString(),
        saves,
      })

      // Save the archive first. If this fails, the active saves remain intact.
      localStorage.setItem(ARCHIVE_KEY, JSON.stringify(archives))
    }

    try {
      for (const key of keysToRemove) {
        localStorage.removeItem(key)
      }
    } catch {
      // Restore the active saves if clearing them fails partway through.
      for (const [key, value] of Object.entries(saves)) {
        localStorage.setItem(key, value)
      }
      return {
        ok: false,
        message: 'Could not safely start a fresh campaign. Your previous saves were restored.',
      }
    }

    return { ok: true, archived: keysToRemove.length > 0 }
  } catch {
    return {
      ok: false,
      message: 'Could not archive the previous campaign. Your existing saves were left in place.',
    }
  }
}

export function readCampaignArchives(): CampaignArchive[] {
  try {
    return readArchives()
  } catch {
    return []
  }
}
