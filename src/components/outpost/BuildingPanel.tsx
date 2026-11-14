import { useState } from 'react'
import {
  OUTPOST_BUILDINGS,
  type BuildingId,
} from '../../game/data/outpostBuildings'

type BuildingPanelProps = {
  buildingId: BuildingId
  onClose: () => void
}

const statusLabels = {
  operational: 'Operational',
  standby: 'Standby',
  'not-activated': 'Not activated',
}

function BuildingPanel({ buildingId, onClose }: BuildingPanelProps) {
  const building = OUTPOST_BUILDINGS.find((item) => item.id === buildingId)
  const [activeInteraction, setActiveInteraction] = useState<string | null>(null)

  if (!building) return null

  const activeItem = building.interactions.find(
    (item) => item.id === activeInteraction,
  )

  return (
    <aside className="building-panel" aria-label={`${building.name} information`}>
      <header className="building-panel__header">
        <div>
          <p className="panel-eyebrow">OUTPOST STRUCTURE</p>
          <h2>{building.name}</h2>
        </div>
        <button
          className="panel-close"
          type="button"
          onClick={onClose}
          aria-label="Close building panel"
        >
          ×
        </button>
      </header>

      <p className="building-panel__purpose">{building.purpose}</p>

      <div className="building-condition">
        <span className={`condition-dot condition-dot--${building.status}`} />
        <span>
          <small>CURRENT STATUS</small>
          <strong>{statusLabels[building.status]}</strong>
        </span>
        <span className="inspection-chip">UNDER INSPECTION</span>
      </div>

      <div className="building-panel__facts">
        <div>
          <small>CONDITION</small>
          <strong>{building.condition}</strong>
        </div>
        {building.id === 'habitat' && (
          <div>
            <small>OCCUPANCY</small>
            <strong>4 crew assigned</strong>
          </div>
        )}
        {building.id === 'greenhouse' && (
          <div>
            <small>RESEARCH STATUS</small>
            <strong>Not commissioned</strong>
          </div>
        )}
      </div>

      <p className="building-panel__description">{building.description}</p>

      <div className="building-panel__interactions">
        <p className="panel-eyebrow">AVAILABLE INTERACTIONS</p>
        {building.interactions.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`interaction-button${activeInteraction === item.id ? ' active' : ''}`}
            onClick={() => setActiveInteraction(item.id)}
          >
            <span>{item.label}</span>
            {item.status === 'future' ? (
              <small>{item.futurePart} · COMING SOON</small>
            ) : (
              <span className="interaction-arrow" aria-hidden="true">→</span>
            )}
          </button>
        ))}
      </div>

      {activeItem && (
        <div className={`interaction-response${activeItem.status === 'future' ? ' interaction-response--future' : ''}`} aria-live="polite">
          <strong>
            {activeItem.status === 'future'
              ? `FEATURE IN DEVELOPMENT`
              : 'INSPECTION NOTE'}
          </strong>
          <p>{activeItem.detail}</p>
        </div>
      )}
    </aside>
  )
}

export default BuildingPanel