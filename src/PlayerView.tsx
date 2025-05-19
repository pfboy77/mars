import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import ResourceCard from "./components/ResourceCard";
import { Resource, Player } from "./types";

const initialResources = (): Resource[] => [
  { id: uuidv4(), name: "MC", amount: 0, production: 0, isMegaCredit: true },
  { id: uuidv4(), name: "建材", amount: 0, production: 0 },
  { id: uuidv4(), name: "チタン", amount: 0, production: 0 },
  { id: uuidv4(), name: "植物", amount: 0, production: 0 },
  { id: uuidv4(), name: "電力", amount: 0, production: 0, isEnergy: true },
  { id: uuidv4(), name: "発熱", amount: 0, production: 0, isHeat: true },
];

function PlayerView() {
  const navigate = useNavigate();
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);

  const [deltaValues, setDeltaValues] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [undoStack, setUndoStack] = useState<Player[][]>([]);
  const [redoStack, setRedoStack] = useState<Player[][]>([]);

  const API_URL = "https://mars-api-server.onrender.com";

  useEffect(() => {
    const fetchState = async () => {
      try {
        const res = await fetch(API_URL);
        const data = await res.json();
        setPlayers(data.players || []);
        setCurrentPlayerId(data.currentPlayerId || null);
      } catch (err) {
        console.error("状態の取得に失敗しました", err);
      }
    };
    fetchState();
  }, []);

  useEffect(() => {
    const saveState = async () => {
      try {
        await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ players, currentPlayerId }),
        });
      } catch (err) {
        console.error("状態の保存に失敗しました", err);
      }
    };

    if (players.length > 0) saveState();
  }, [players, currentPlayerId]);

  useEffect(() => {
    localStorage.setItem("gameState", JSON.stringify({ players }));
  }, [players]);

  const currentPlayer = players.find((p) => p.id === currentPlayerId) || null;

  const saveState = () => {
    setUndoStack((prev) => [
      ...prev,
      players.map((p) => ({ ...p, resources: [...p.resources] })),
    ]);
    setRedoStack([]);
  };

  const updateCurrentPlayer = (updater: (player: Player) => Player) => {
    saveState();
    setPlayers((prev) =>
      prev.map((p) => (p.id === currentPlayerId ? updater(p) : p))
    );
  };

  const handleAdd = (id: string) => {
    const delta = deltaValues[id] || 0;
    updateCurrentPlayer((player) => ({
      ...player,
      resources: player.resources.map((r) =>
        r.id === id ? { ...r, amount: r.amount + delta } : r
      ),
    }));
    setDeltaValues({ ...deltaValues, [id]: 0 });
  };

  const handleSubtract = (id: string) => {
    const resource = currentPlayer?.resources.find((r) => r.id === id);
    const delta = deltaValues[id] || 0;
    if (resource && delta > resource.amount) {
      setError(`${resource.name} は ${resource.amount} 以下しか引けません`);
      setTimeout(() => setError(null), 2000);
      return;
    }
    updateCurrentPlayer((player) => ({
      ...player,
      resources: player.resources.map((r) =>
        r.id === id ? { ...r, amount: r.amount - delta } : r
      ),
    }));
    setDeltaValues({ ...deltaValues, [id]: 0 });
  };

  const handleProduction = () => {
    updateCurrentPlayer((player) => {
      const updatedResources = [...player.resources];
      const energy = updatedResources.find((r) => r.isEnergy);
      const heat = updatedResources.find((r) => r.isHeat);
      if (energy && heat) {
        heat.amount += energy.amount;
        energy.amount = 0;
      }

      return {
        ...player,
        resources: updatedResources.map((r) => ({
          ...r,
          amount: r.amount + r.production + (r.isMegaCredit ? player.tr : 0),
        })),
      };
    });
  };

  const handleReset = () => {
    updateCurrentPlayer((player) => ({
      ...player,
      resources: player.resources.map((r) => ({
        ...r,
        amount: 0,
        production: 0,
      })),
      tr: 20,
    }));
  };

  const handleUndo = () => {
    const previous = undoStack.pop();
    if (previous) {
      setRedoStack((prev) => [...prev, players]);
      setPlayers(previous);
    }
  };

  const handleRedo = () => {
    const next = redoStack.pop();
    if (next) {
      setUndoStack((prev) => [...prev, players]);
      setPlayers(next);
    }
  };

  return (
    <div style={{ padding: 16, maxWidth: 600, margin: "0 auto" }}>
      {players.length > 0 && currentPlayer && (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <div>
              <button onClick={handleUndo} disabled={undoStack.length === 0}>
                ↩︎ Undo
              </button>
              <button onClick={handleRedo} disabled={redoStack.length === 0}>
                ↪︎ Redo
              </button>
            </div>
            <div
              style={{
                fontSize: "14px",
                fontWeight: "bold",
                textAlign: "center",
                flex: 1,
              }}
            >
              {currentPlayer.name}
            </div>
            <div style={{ display: "inline-flex", alignItems: "center" }}>
              <span>TR:</span>
              <button
                onClick={() =>
                  updateCurrentPlayer((p) => ({
                    ...p,
                    tr: Math.max(p.tr - 1, 0),
                  }))
                }
                style={{
                  width: "32px",
                  height: "32px",
                  fontSize: "16px",
                  marginLeft: 4,
                }}
              >
                −
              </button>
              <span style={{ margin: "0 8px" }}>{currentPlayer.tr}</span>
              <button
                onClick={() =>
                  updateCurrentPlayer((p) => ({
                    ...p,
                    tr: Math.min(p.tr + 1, 100),
                  }))
                }
                style={{ width: "32px", height: "32px", fontSize: "16px" }}
              >
                ＋
              </button>
              <button
                onClick={handleProduction}
                style={{
                  backgroundColor: "#007bff",
                  color: "white",
                  padding: "4px 8px",
                  borderRadius: 4,
                  marginLeft: 8,
                }}
              >
                ▶︎ 産出
              </button>
              <button
                onClick={handleReset}
                style={{
                  backgroundColor: "red",
                  color: "white",
                  padding: "4px 8px",
                  borderRadius: 4,
                  marginLeft: 4,
                }}
              >
                リセット
              </button>
            </div>
          </div>
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <button
              onClick={() => navigate("/")}
              style={{ padding: "8px 16px", fontSize: "16px" }}
            >
              ホームに戻る
            </button>
          </div>

          {error && (
            <div style={{ color: "red", marginBottom: 8 }}>{error}</div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 8,
              marginTop: 16,
            }}
          >
            {currentPlayer.resources.map((resource) => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                delta={deltaValues[resource.id] || 0}
                setDelta={(val) =>
                  setDeltaValues({ ...deltaValues, [resource.id]: val })
                }
                addAmount={() => handleAdd(resource.id)}
                subtractAmount={() => handleSubtract(resource.id)}
                updateProduction={(val) =>
                  updateCurrentPlayer((player) => ({
                    ...player,
                    resources: player.resources.map((r) =>
                      r.id === resource.id ? { ...r, production: val } : r
                    ),
                  }))
                }
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default PlayerView;
