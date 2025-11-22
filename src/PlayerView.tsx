import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import ResourceCard from "./components/ResourceCard";
import { Resource, Player } from "./types";

const API_URL = "https://mars-api-server.onrender.com";

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
  const [searchParams] = useSearchParams();

  // roomId: URL > localStorage > default
  const urlRoomId = searchParams.get("roomId");
  const storedRoomId =
    typeof window !== "undefined" ? localStorage.getItem("roomId") : null;
  const roomId = urlRoomId || storedRoomId || "default";

  // playerId: URL > 後で players を見て決める
  const urlPlayerId = searchParams.get("playerId");

  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);

  const [deltaValues, setDeltaValues] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [undoStack, setUndoStack] = useState<Player[][]>([]);
  const [redoStack, setRedoStack] = useState<Player[][]>([]);

  // 🔹 初期化：サーバーからは一切読まず、localStorage だけを見る
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`gameState_${roomId}`);
      if (!raw) {
        setPlayers([]);
        setCurrentPlayerId(null);
        setLoading(false);
        return;
      }

      const parsed = JSON.parse(raw) as {
        players?: Player[];
        currentPlayerId?: string | null;
      };

      const localPlayers = parsed.players || [];
      if (localPlayers.length === 0) {
        setPlayers([]);
        setCurrentPlayerId(null);
        setLoading(false);
        return;
      }

      setPlayers(localPlayers);

      // currentPlayerId の決定：URL > localStorage > 先頭
      const storedCurrent =
        typeof window !== "undefined"
          ? localStorage.getItem(`currentPlayerId_${roomId}`)
          : null;

      const candidate =
        (urlPlayerId &&
          localPlayers.some((p) => p.id === urlPlayerId) &&
          urlPlayerId) ||
        (storedCurrent &&
          localPlayers.some((p) => p.id === storedCurrent) &&
          storedCurrent) ||
        localPlayers[0].id;

      setCurrentPlayerId(candidate);
      setLoading(false);
    } catch (e) {
      console.error("ローカル状態の復元に失敗しました", e);
      setGlobalError(
        "ローカルのデータが壊れている可能性があります。ホームから作り直してください。"
      );
      setLoading(false);
    }
  }, [roomId, urlPlayerId]);

  // 🔹 変更があったら localStorage に保存 ＋ サーバーへは 1秒デバウンスで送信
  useEffect(() => {
    if (loading) return;

    // localStorage に保存（ここが“本物のDB”扱い）
    localStorage.setItem(
      `gameState_${roomId}`,
      JSON.stringify({ players, currentPlayerId })
    );
    if (currentPlayerId) {
      localStorage.setItem(`currentPlayerId_${roomId}`, currentPlayerId);
    } else {
      localStorage.removeItem(`currentPlayerId_${roomId}`);
    }

    // サーバーには 1秒後にまとめて送る（その間に変更があればタイマーをクリア）
    const timerId = setTimeout(() => {
      const sync = async () => {
        try {
          await fetch(`${API_URL}/?roomId=${encodeURIComponent(roomId)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ roomId, players }),
          });
        } catch (err) {
          console.error(
            "状態のサーバー同期に失敗しました（モニター側にだけ影響）",
            err
          );
        }
      };
      sync();
    }, 1000); // ← 「ある程度の頻度」：最後の変更から1秒後

    return () => clearTimeout(timerId);
  }, [players, currentPlayerId, roomId, loading]);

  const currentPlayer =
    (currentPlayerId && players.find((p) => p.id === currentPlayerId)) || null;

  const saveStateForUndo = () => {
    setUndoStack((prev) => [
      ...prev,
      players.map((p) => ({ ...p, resources: [...p.resources] })),
    ]);
    setRedoStack([]);
  };

  const updateCurrentPlayer = (updater: (player: Player) => Player) => {
    if (!currentPlayerId) return;
    saveStateForUndo();
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

  // ===== 表示切り替え =====

  if (loading) {
    return (
      <div style={{ padding: 16 }}>
        <p>読み込み中...</p>
      </div>
    );
  }

  if (globalError) {
    return (
      <div style={{ padding: 16 }}>
        <p>{globalError}</p>
        <button onClick={() => navigate("/")}>ホームへ戻る</button>
      </div>
    );
  }

  if (players.length === 0 || !currentPlayer) {
    return (
      <div style={{ padding: 16 }}>
        <p>プレイヤーが見つかりません。ホームで作成してください。</p>
        <button onClick={() => navigate("/")}>ホームへ戻る</button>
      </div>
    );
  }

  return (
    <div style={{ padding: 16, maxWidth: 600, margin: "0 auto" }}>
      <div
        style={{
          fontSize: 12,
          color: "#666",
          marginBottom: 8,
          textAlign: "center",
        }}
      >
        <div>
          roomId: <code>{roomId}</code>
        </div>
        <div>
          currentPlayerId: <code>{currentPlayerId}</code>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          gap: 8,
          marginBottom: 16,
        }}
      >
        <button onClick={handleUndo} disabled={undoStack.length === 0}>
          ↩︎
        </button>
        <button onClick={handleRedo} disabled={redoStack.length === 0}>
          ↪︎
        </button>

        <span
          style={{
            fontWeight: "bold",
            fontSize: "14px",
            padding: "4px 8px",
            minWidth: "80px",
            textAlign: "center",
          }}
        >
          {currentPlayer.name}
        </span>

        <button
          onClick={() => navigate("/")}
          style={{ padding: "4px 12px", fontSize: "14px" }}
        >
          ホーム
        </button>

        <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <span>TR:</span>
          <button
            onClick={() =>
              updateCurrentPlayer((p) => ({
                ...p,
                tr: Math.max(p.tr - 1, 0),
              }))
            }
            style={{ width: "32px", height: "32px", fontSize: "16px" }}
          >
            −
          </button>
          <span style={{ margin: "0 4px" }}>{currentPlayer.tr}</span>
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
        </div>

        <button
          onClick={handleProduction}
          style={{
            backgroundColor: "#007bff",
            color: "white",
            padding: "4px 8px",
            borderRadius: 4,
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
          }}
        >
          リセット
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
                resources: player.resources.map((r) => {
                  if (r.id === resource.id) {
                    const min = r.isMegaCredit ? -5 : 0;
                    const max = 100;
                    const clampedVal = Math.max(min, Math.min(val, max));
                    return { ...r, production: clampedVal };
                  }
                  return r;
                }),
              }))
            }
          />
        ))}
      </div>
    </div>
  );
}

export default PlayerView;
