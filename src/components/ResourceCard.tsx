import React from "react";
import { Resource } from "../types";

interface Props {
  resource: Resource;
  delta: number;
  setDelta: (value: number) => void;
  addAmount: () => void;
  subtractAmount: () => void;
  updateProduction: (value: number) => void;
}

const ResourceCard: React.FC<Props> = ({
  resource,
  delta,
  setDelta,
  addAmount,
  subtractAmount,
  updateProduction
}) => {
  return (
    <div style={{ border: "1px solid #ccc", borderRadius: 8, padding: 8, minHeight: 120 }}>
      <h4>{resource.name}: {resource.amount}</h4>
      <input
        type="number"
        value={delta}
        onChange={e => setDelta(Number(e.target.value))}
        style={{ width: 50 }}
      />
      <button onClick={addAmount}>＋</button>
      <button onClick={subtractAmount}>−</button>
      <div>
        <label>
          生産: {resource.production}
          <input
            type="range"
            min={resource.isMegaCredit ? -10 : 0}
            max={resource.isMegaCredit ? 30 : 20}
            value={resource.production}
            onChange={e => updateProduction(Number(e.target.value))}
          />
        </label>
      </div>
    </div>
  );
};

export default ResourceCard;
