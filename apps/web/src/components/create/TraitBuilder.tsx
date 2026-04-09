type TraitBuilderRow = {
  id: string;
  trait_type: string;
  value: string;
};

type TraitBuilderProps = {
  rows: TraitBuilderRow[];
  rawJson: string;
  rawError: string;
  showRawEditor: boolean;
  onToggleRawEditor: () => void;
  onAddTrait: () => void;
  onUpdateTrait: (id: string, patch: Partial<Omit<TraitBuilderRow, "id">>) => void;
  onRemoveTrait: (id: string) => void;
  onRawJsonChange: (value: string) => void;
};

export default function TraitBuilder({
  rows,
  rawJson,
  rawError,
  showRawEditor,
  onToggleRawEditor,
  onAddTrait,
  onUpdateTrait,
  onRemoveTrait,
  onRawJsonChange
}: TraitBuilderProps) {
  const filledTraits = rows.filter((row) => row.trait_type.trim() || row.value.trim());

  return (
    <section className="traitBuilder">
      <div className="traitBuilderHeader">
        <div>
          <span className="metaLabel">Traits</span>
          <strong>Add attributes collectors can filter by</strong>
          <p>Use simple rows for common NFT traits like background, rarity, or edition.</p>
        </div>
        <div className="traitBuilderToolbar">
          <button className="chip" type="button" onClick={onAddTrait}>
            Add trait
          </button>
          <button className="chip" type="button" onClick={onToggleRawEditor}>
            {showRawEditor ? "Hide raw JSON" : "Edit raw JSON"}
          </button>
        </div>
      </div>

      <div className="traitBuilderRows">
        {rows.map((row, index) => (
          <article key={row.id} className="traitBuilderRow">
            <label className="traitBuilderField">
              <span>Trait type</span>
              <input
                className="textInput"
                value={row.trait_type}
                onChange={(event) => onUpdateTrait(row.id, { trait_type: event.target.value })}
                placeholder={index === 0 ? "Background" : "Trait type"}
              />
            </label>
            <label className="traitBuilderField">
              <span>Value</span>
              <input
                className="textInput"
                value={row.value}
                onChange={(event) => onUpdateTrait(row.id, { value: event.target.value })}
                placeholder={index === 0 ? "Emerald" : "Trait value"}
              />
            </label>
            <button className="chip traitBuilderRemove" type="button" onClick={() => onRemoveTrait(row.id)}>
              Remove
            </button>
          </article>
        ))}
      </div>

      <div className="traitBuilderPreview">
        {filledTraits.length ? (
          filledTraits.map((row) => (
            <span key={row.id} className="traitPreviewChip">
              <strong>{row.trait_type || "Untitled"}</strong>
              <span>{row.value || "Value"}</span>
            </span>
          ))
        ) : (
          <p className="traitBuilderHint">No traits yet. Add a few attributes to help collectors browse your NFT.</p>
        )}
      </div>

      {showRawEditor ? (
        <label className="traitBuilderRaw">
          <span>Traits JSON</span>
          <textarea
            className="textArea codeArea"
            value={rawJson}
            onChange={(event) => onRawJsonChange(event.target.value)}
          />
          {rawError ? <p className="traitBuilderError">{rawError}</p> : null}
        </label>
      ) : null}
    </section>
  );
}
