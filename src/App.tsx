import React, { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import ResourceCard from "./components/ResourceCard";
import { Resource, GameState } from "./types";

const initialResources: Resource[] = [
  { id: uuidv4(), name: "メガクレジット", amount: 20, production: 0, isMegaCredit: true },
  { id: uuidv4(), name: "鋼鉄", amount: 5, production: 0 },
  { id: uuidv4(), name: "チタン", amount: 3, production: 0 },
  { id: uuidv4(), name: "植物", amount: 4, production: 2 },
  { id: uuidv4(), name: "エネルギー", amount: 2, production: 1, isEnergy: true },
  { id: uuidv4(), name: "熱", amount: 0, production: 0, isHeat: true }
];

function App() {
  const [resources, setResources] = useState<Resource[]>(initialResources);
  const [tr, setTr] = useState(20);
  const [deltaValues, setDeltaValues] = useState<Record<string, number>>({});
  const [undoStack, setUndoStack] = useState<GameState[]>([]);
  const [redoStack, setRedoStack] = useState<GameState[]>([]);
  const [error, setError] = useState<string | null>(null);

  const saveState = () => {
    setUndoStack([...undoStack, { resources: [...resources], tr }]);
    setRedoStack([]);
  };

  const handleAdd = (id: string) => {
    saveState();
    const delta = deltaValues[id] || 0;
    setResources(prev =>
      prev.map(r => r.id === id ? { ...r, amount: r.amount + delta } : r)
    );
    setDeltaValues({ ...deltaValues, [id]: 0 });
  };

  const handleSubtract = (id: string) => {
    const resource = resources.find(r => r.id === id);
    const delta = deltaValues[id] || 0;
    if (resource && delta > resource.amount) {
      setError(`${resource.name} は ${resource.amount} 以下しか引けません`);
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
    let newResources = [...resources];
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
    const last = undoStack.pop();
    if (last) {
      setRedoStack([...redoStack, { resources: [...resources], tr }]);
      setResources(last.resources);
      setTr(last.tr);
    }
  };

  const handleRedo = () => {
    const next = redoStack.pop();
    if (next) {
      setUndoStack([...undoStack, { resources: [...resources], tr }]);
      setResources(next.resources);
      setTr(next.tr);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <div>
        <button onClick={handleUndo} disabled={undoStack.length === 0}>↩︎ アンドゥ</button>
        <button onClick={handleRedo} disabled={redoStack.length === 0}>↪︎ リドゥ</button>
        <span style={{ marginLeft: 20 }}>TR: {tr}</span>
        <input
          type="range"
          value={tr}
          min={0}
          max={100}
          onChange={e => setTr(Number(e.target.value))}
        />
        <button onClick={handleProduction} style={{ marginLeft: 10 }}>▶︎ 生産</button>
        <button onClick={handleReset} style={{ marginLeft: 10, backgroundColor: "red", color: "white" }}>リセット</button>
      </div>
      {error && <div style={{ color: "red" }}>{error}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 16 }}>
        {resources.map(resource => (
          <ResourceCard
            key={resource.id}
            resource={resource}
            delta={deltaValues[resource.id] || 0}
            setDelta={val => setDeltaValues({ ...deltaValues, [resource.id]: val })}
            addAmount={() => handleAdd(resource.id)}
            subtractAmount={() => handleSubtract(resource.id)}
            updateProduction={val => setResources(
              resources.map(r => r.id === resource.id ? { ...r, production: val } : r)
            )}
          />
        ))}
      </div>
    </div>
  );
}

export default App;
