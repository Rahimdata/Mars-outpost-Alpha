type PartThreeEntryProps = {
  onBack: () => void
}

function PartThreeEntry({ onBack }: PartThreeEntryProps) {
  return (
    <main className="part-three-entry">
      <div className="part-three-entry__backdrop" aria-hidden="true">
        <div className="part-three-entry__mars" />
        <div className="part-three-entry__terrain" />
      </div>

      <div className="part-three-entry__content">
        <p className="part-three-entry__eyebrow">MARS ARRIVAL · LANDING SEQUENCE</p>
        <h1>
          Mars is
          <br />
          <span>within reach.</span>
        </h1>
        <p>
          The crew is prepared for atmospheric entry. Landing-site selection and
          the playable descent sequence are the next development part.
        </p>
        <button type="button" onClick={onBack}>
          Return to Main Menu
        </button>
      </div>
    </main>
  )
}

export default PartThreeEntry