import { v4 as uuidv4 } from "uuid";
import ResourceCard from "./components/ResourceCard";
import { Resource, GameState } from "./types";
import React, { useState, useEffect } from "react";

const initialResources: Resource[] = [
  { id: uuidv4(), name: "MC", amount: 0, production: 0, isMegaCredit: true },
  { id: uuidv4(), name: "Steel", amount: 0, production: 0 },
  { id: uuidv4(), name: "Titanium", amount: 0, production: 0 },
  { id: uuidv4(), name: "Plants", amount: 0, production: 0 },
  { id: uuidv4(), name: "Energy", amount: 0, production: 0, isEnergy: true },
  { id: uuidv4(), name: "Heat", amount: 0, production: 0, isHeat: true }
];

const buttonStyle = {
  width: "32px",
  height: "32px",
  fontSize: "16px",
  lineHeight: "1",
  textAlign: "center" as const,
};

function App() {
  const savedData = localStorage.getItem("gameState");
  let parsed: Partial<GameState> | null = null;
  if (savedData) {
    try {
      parsed = JSON.parse(savedData);
    } catch {
      localStorage.removeItem("gameState");
    }
  }

  const [resources, setResources] = useState<Resource[]>(
    parsed?.resources || initialResources
  );
  const [tr, setTr] = useState<number>(
    parsed?.tr ?? 20
  );

  const [deltaValues, setDeltaValues] = useState<Record<string, number>>({});
  const [undoStack, setUndoStack] = useState<GameState[]>([]);
  const [redoStack, setRedoStack] = useState<GameState[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const data = JSON.stringify({ resources, tr });
    localStorage.setItem("gameState", data);
  }, [resources, tr]);

  const currentSnapshot = (): GameState => ({
    resources: resources.map(resource => ({ ...resource })),
    tr
  });

  const saveState = () => {
    setUndoStack(previous => [...previous.slice(-19), currentSnapshot()]);
    setRedoStack([]);
  };

  const handleAdd = (id: string) => {
    const delta = deltaValues[id] || 0;
    if (delta <= 0) return;
    saveState();
    setResources(prev =>
      prev.map(r => r.id === id ? { ...r, amount: r.amount + delta } : r)
    );
    setDeltaValues({ ...deltaValues, [id]: 0 });
  };

  const handleSubtract = (id: string) => {
    const resource = resources.find(r => r.id === id);
    const delta = deltaValues[id] || 0;
    if (delta <= 0) return;
    if (resource && delta > resource.amount) {
      setError(`Cannot subtract more than ${resource.amount} ${resource.name}.`);
      setTimeout(() => setError(null), 2000);
      return;
    }
    saveState();
    setResources(prev =>
      prev.map(r => r.id === id ? { ...r, amount: r.amount - delta } : r)
    );
    setDeltaValues({ ...deltaValues, [id]: 0 });
  };

  const handleProduction = () => {
    saveState();
    let newResources = resources.map(resource => ({ ...resource }));
    const energy = newResources.find(r => r.isEnergy);
    const heat = newResources.find(r => r.isHeat);
    if (energy && heat) {
      heat.amount += energy.amount;
      energy.amount = 0;
    }
    newResources = newResources.map(r => ({
      ...r,
      amount: r.amount + r.production + (r.isMegaCredit ? tr : 0)
    }));
    setResources(newResources);
  };

  const handleReset = () => {
    saveState();
    setResources(resources.map(r => ({ ...r, amount: 0, production: 0 })));
    setTr(20);
  };

  const handleUndo = () => {
    const last = undoStack[undoStack.length - 1];
    if (last) {
      setUndoStack(undoStack.slice(0, -1));
      setRedoStack(previous => [...previous.slice(-19), currentSnapshot()]);
      setResources(last.resources.map(resource => ({ ...resource })));
      setTr(last.tr);
    }
  };

  const handleRedo = () => {
    const next = redoStack[redoStack.length - 1];
    if (next) {
      setRedoStack(redoStack.slice(0, -1));
      setUndoStack(previous => [...previous.slice(-19), currentSnapshot()]);
      setResources(next.resources.map(resource => ({ ...resource })));
      setTr(next.tr);
    }
  };

  const handleTRChange = (delta: number) => {
    const nextTR = Math.max(0, Math.min(tr + delta, 100));
    if (nextTR === tr) return;
    saveState();
    setTr(nextTR);
  };

  const handleProductionChange = (id: string, value: number) => {
    const resource = resources.find(item => item.id === id);
    if (!resource || resource.production === value) return;
    saveState();
    setResources(previous =>
      previous.map(item => item.id === id ? { ...item, production: value } : item)
    );
  };

  return (
    <div style={{ padding: 16, maxWidth: 600, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <button onClick={handleUndo} disabled={undoStack.length === 0}>↩︎ Undo</button>
        <button onClick={handleRedo} disabled={redoStack.length === 0}>↪︎ Redo</button>

        <div style={{ display: "inline-flex", alignItems: "center", marginLeft: 8 }}>
          <span>TR:</span>
          <button
            onClick={() => handleTRChange(-1)}
            aria-label="Decrease TR"
            style={{ ...buttonStyle, marginRight: 4 }}
          >
            −
          </button>
          <span>{tr}</span>
          <button
            onClick={() => handleTRChange(1)}
            aria-label="Increase TR"
            style={{ ...buttonStyle, marginLeft: 4 }}
          >
            ＋
          </button>
        </div>

        <button onClick={handleProduction} style={{ backgroundColor: "#007bff", color: "white", padding: "4px 8px", borderRadius: 4 }}>
          ▶︎ Production
        </button>
        <button onClick={handleReset} style={{ backgroundColor: "red", color: "white", padding: "4px 8px", borderRadius: 4 }}>
          Reset
        </button>
      </div>

      {error && <div style={{ color: "red", marginBottom: 8 }}>{error}</div>}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 8,
          marginTop: 16,
        }}
      >
        {resources.map(resource => (
          <ResourceCard
            key={resource.id}
            resource={resource}
            delta={deltaValues[resource.id] || 0}
            setDelta={val => setDeltaValues({ ...deltaValues, [resource.id]: val })}
            addAmount={() => handleAdd(resource.id)}
            subtractAmount={() => handleSubtract(resource.id)}
            updateProduction={val => handleProductionChange(resource.id, val)}
          />
        ))}
      </div>
    </div>
  );
}

export default App;
