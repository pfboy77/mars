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
      <div style={{ marginTop: 8 }}>
  <span>生産: </span>
  <button
    onClick={() =>
      updateProduction(
        Math.max(resource.production - 1, resource.isMegaCredit ? -10 : 0)
      )
    }
    style={{ margin: "0 4px" }}
  >
    −
  </button>
  <span>{resource.production}</span>
  <button
    onClick={() =>
      updateProduction(
        Math.min(resource.production + 1, resource.isMegaCredit ? 30 : 20)
      )
    }
    style={{ margin: "0 4px" }}
  >
    ＋
  </button>
</div>

      </div>
    </div>
  );
};

export default ResourceCard;
