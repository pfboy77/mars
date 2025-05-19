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

const buttonStyle = {
  width: "32px",
  height: "32px",
  fontSize: "16px",
  lineHeight: "1",
  textAlign: "center" as const,
};

const ResourceCard: React.FC<Props> = ({
  resource,
  delta,
  setDelta,
  addAmount,
  subtractAmount,
  updateProduction
}) => {
  return (
    <div
      style={{
        border: "1px solid #ccc",
        borderRadius: 8,
        padding: 8,
        minHeight: 120,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between"
      }}
    >
      <h4>{resource.name}: {resource.amount}</h4>

      {/* − 入力 ＋ の並び */}
      <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: 8 }}>
        <button onClick={subtractAmount} style={buttonStyle}>−</button>
        <input
          type="number"
          value={delta === 0 ? "" : delta}
          onChange={e => {
            const val = e.target.value;
            setDelta(val === "" ? 0 : Number(val));
          }}
          style={{ width: "60px", textAlign: "center", fontSize: "16px" }}
        />
        <button onClick={addAmount} style={buttonStyle}>＋</button>
      </div>

      {/* 生産: − x ＋ */}
      <div>
        <span>生産: </span>
        <button
          onClick={() =>
            updateProduction(
              Math.max(resource.production - 1, resource.isMegaCredit ? -10 : 0)
            )
          }
          style={{ ...buttonStyle, marginRight: 4 }}
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
          style={{ ...buttonStyle, marginLeft: 4 }}
        >
          ＋
        </button>
      </div>
    </div>
  );
};

export default ResourceCard;
