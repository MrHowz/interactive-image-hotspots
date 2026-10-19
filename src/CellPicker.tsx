import {
  MAX_CELLS,
  connected,
  toggleCell,
  type Cell,
  type Region,
} from "./model";
export function CellPicker({
  region,
  onChange,
}: {
  region: Region;
  onChange: (value: Region) => void;
}) {
  const selected = new Set(region.cells.map((c) => c.join(",")));
  const candidates = new Map<string, Cell>();
  for (const [x, y] of region.cells.length
    ? region.cells
    : ([[0, 0]] as Cell[])) {
    for (const cell of [
      [x, y],
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ] as Cell[])
      candidates.set(cell.join(","), cell);
  }
  const values = [...candidates.values()],
    minX = Math.min(...values.map((c) => c[0])),
    minY = Math.min(...values.map((c) => c[1]));
  const maxX = Math.max(...values.map((c) => c[0])),
    maxY = Math.max(...values.map((c) => c[1]));
  return (
    <section className="cell-picker">
      <div className="list-heading">
        <h2>Selected cells</h2>
        <span>
          {region.cells.length} / {MAX_CELLS}
        </span>
      </div>
      <p>
        Click a filled cell to remove it, or + to extend the region. Each cell
        opens the same image.
      </p>
      <div className="cell-scroll">
        <div
          className="cell-board"
          style={{
            gridTemplateColumns: `repeat(${maxX - minX + 1},32px)`,
            gridTemplateRows: `repeat(${maxY - minY + 1},32px)`,
          }}
        >
          {values.map((cell) => {
            const key = cell.join(","),
              active = selected.has(key);
            return (
              <button
                key={key}
                type="button"
                className={active ? "selected" : ""}
                aria-pressed={active}
                aria-label={`${active ? "Remove" : "Add"} cell ${cell[0]}, ${cell[1]}`}
                disabled={!active && region.cells.length >= MAX_CELLS}
                style={{
                  gridColumn: cell[0] - minX + 1,
                  gridRow: cell[1] - minY + 1,
                }}
                onClick={() =>
                  onChange({ ...region, cells: toggleCell(region.cells, cell) })
                }
              >
                {active ? "■" : "+"}
              </button>
            );
          })}
        </div>
      </div>
      {!connected(region.cells) && (
        <p role="status" className="error">
          Select at least one cell and connect all cells along an edge before
          saving.
        </p>
      )}
    </section>
  );
}
