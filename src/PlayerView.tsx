import React, { useCallback, useEffect, useRef, useState } from "react";
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

const arePlayersEqual = (a: Player[], b: Player[]) =>
  JSON.stringify(a) === JSON.stringify(b);

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
  const currentPlayerIdRef = useRef<string | null>(null);

  const [deltaValues, setDeltaValues] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [undoStack, setUndoStack] = useState<Player[][]>([]);
  const [redoStack, setRedoStack] = useState<Player[][]>([]);
  const lastLocalChangeRef = useRef<number>(0);

  const playersRef = useRef<Player[]>([]);
  const roomIdRef = useRef<string>(roomId);

  const selectCurrentPlayerId = (list: Player[]) => {
    const storedCurrent =
      typeof window !== "undefined"
        ? localStorage.getItem(`currentPlayerId_${roomId}`)
        : null;

    return (
      (urlPlayerId && list.some((p) => p.id === urlPlayerId) && urlPlayerId) ||
      (storedCurrent && list.some((p) => p.id === storedCurrent) && storedCurrent) ||
      list[0]?.id ||
      null
    );
  };

  const persistLocal = useCallback(
    (nextPlayers: Player[], nextCurrentId: string | null) => {
      playersRef.current = nextPlayers;
      currentPlayerIdRef.current = nextCurrentId;

      const room = roomIdRef.current;
      localStorage.setItem(
        `gameState_${room}`,
        JSON.stringify({ players: nextPlayers, currentPlayerId: nextCurrentId })
      );
      if (nextCurrentId) {
        localStorage.setItem(`currentPlayerId_${room}`, nextCurrentId);
      } else {
        localStorage.removeItem(`currentPlayerId_${room}`);
      }
    },
    []
  );

  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);

  const mergeServerAndLocal = (
    serverPlayers: Player[],
    localPlayers: Player[],
    currentId: string | null
  ) => {
    const merged: Player[] = [];

    serverPlayers.forEach((serverPlayer) => {
      const localMatch = localPlayers.find((p) => p.id === serverPlayer.id);
      if (localMatch) {
        // 自分が操作しているプレイヤーだけはローカルを優先（同時編集の上書きを防ぐ）
        merged.push(
          currentId && localMatch.id === currentId ? localMatch : serverPlayer
        );
      } else {
        merged.push(serverPlayer);
      }
    });

    // サーバーにまだ存在しないローカルのプレイヤー（新規追加など）は残す
    localPlayers.forEach((localPlayer) => {
      if (!merged.some((p) => p.id === localPlayer.id)) {
        merged.push(localPlayer);
      }
    });

    return merged;
  };

  const syncWithServer = useCallback(
    async (applyToState: boolean, opts?: { useBeacon?: boolean }) => {
      const fetchStartedAt = Date.now();
      const room = roomIdRef.current;

      // 変更が一度もない場合は無駄なPOSTを避ける
      if (lastLocalChangeRef.current === 0) {
        return;
      }

      try {
        const res = await fetch(`${API_URL}/?roomId=${encodeURIComponent(room)}`);
        const data = res.ok ? await res.json() : { players: [] };
        if (lastLocalChangeRef.current > fetchStartedAt) {
          return;
        }
        const serverPlayers: Player[] = data.players || [];
        const merged = mergeServerAndLocal(
          serverPlayers,
          playersRef.current,
          currentPlayerIdRef.current
        );
        if (lastLocalChangeRef.current > fetchStartedAt) {
          return;
        }

        if (applyToState) {
          setPlayers((prev) => (arePlayersEqual(prev, merged) ? prev : merged));
        }

        if (
          opts?.useBeacon &&
          typeof navigator !== "undefined" &&
          typeof navigator.sendBeacon === "function"
        ) {
          const blob = new Blob(
            [JSON.stringify({ roomId: room, players: merged })],
            { type: "application/json" }
          );
          navigator.sendBeacon(
            `${API_URL}/?roomId=${encodeURIComponent(room)}`,
            blob
          );
          return;
        }

        await fetch(`${API_URL}/?roomId=${encodeURIComponent(room)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId: room, players: merged }),
        });
      } catch (err) {
        console.error(
          "状態のサーバー同期に失敗しました（モニター側にだけ影響）",
          err
        );
      }
    },
    []
  );

  // 🔹 初期化：まずサーバーを読む。空 or 失敗時は localStorage を見る
  useEffect(() => {
    let cancelled = false;

    const hydrateFromLocal = () => {
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
        const candidate = selectCurrentPlayerId(localPlayers);
        setCurrentPlayerId(candidate);
        persistLocal(localPlayers, candidate);
        setLoading(false);
      } catch (e) {
        console.error("ローカル状態の復元に失敗しました", e);
        setGlobalError(
          "ローカルのデータが壊れている可能性があります。ホームから作り直してください。"
        );
        setLoading(false);
      }
    };

    const hydrateFromServer = async () => {
      try {
        const res = await fetch(`${API_URL}/?roomId=${encodeURIComponent(roomId)}`);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        const serverPlayers: Player[] = data.players || [];

        if (serverPlayers.length > 0) {
          if (cancelled) return;
          const candidate = selectCurrentPlayerId(serverPlayers);
          setPlayers(serverPlayers);
          setCurrentPlayerId(candidate);
          persistLocal(serverPlayers, candidate);

          setLoading(false);
          return;
        }
      } catch (err) {
        console.error("サーバー状態の取得に失敗しました", err);
      }

      if (!cancelled) {
        hydrateFromLocal();
      }
    };

    hydrateFromServer();

    return () => {
      cancelled = true;
    };
  }, [roomId, urlPlayerId]);

  // 🔹 サーバーの最新情報を定期取得（最近ローカル更新した直後はスキップ）
  useEffect(() => {
    if (loading) return;

    let cancelled = false;

    const fetchLatest = async () => {
      if (Date.now() - lastLocalChangeRef.current < 1500) {
        return;
      }

      const fetchStartedAt = Date.now();

      try {
        const res = await fetch(`${API_URL}/?roomId=${encodeURIComponent(roomId)}`);
        if (!res.ok) return;
        const data = await res.json();
        const serverPlayers: Player[] = data.players || [];
        let updatedPlayers: Player[] | null = null;

        setPlayers((prev) => {
          if (lastLocalChangeRef.current > fetchStartedAt) {
            return prev;
          }
          const merged = mergeServerAndLocal(
            serverPlayers,
            prev,
            currentPlayerIdRef.current
          );
          if (arePlayersEqual(prev, merged)) return prev;
          updatedPlayers = merged;
          return merged;
        });

        if (updatedPlayers && !cancelled) {
          const candidate = selectCurrentPlayerId(updatedPlayers);
          setCurrentPlayerId(candidate);
          persistLocal(updatedPlayers, candidate);
        }
      } catch (err) {
        console.error("最新状態の取得に失敗しました", err);
      }
    };

    const interval = setInterval(fetchLatest, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [roomId, urlPlayerId, loading]);

  // 🔹 変更があったら localStorage に保存 ＋ サーバーへは 1秒デバウンスで送信
  useEffect(() => {
    if (loading) return;

    // localStorage に保存（ここが“本物のDB”扱い）
    persistLocal(players, currentPlayerId);

    // サーバーには 1秒後にまとめて送る（その間に変更があればタイマーをクリア）
    const timerId = setTimeout(() => {
      syncWithServer(true);
    }, 1000); // ← 「ある程度の頻度」：最後の変更から1秒後

    return () => {
      clearTimeout(timerId);
    };
  }, [players, currentPlayerId, roomId, loading, persistLocal, syncWithServer]);

  // 画面離脱時にデバウンス前の変更を送る保険
  useEffect(() => {
    return () => {
      if (lastLocalChangeRef.current > 0) {
        syncWithServer(false, { useBeacon: true });
      }
    };
  }, [syncWithServer]);

  // リロード時にもローカル保存 + サーバー送信を試みる
  useEffect(() => {
    const handleBeforeUnload = () => {
      const effectiveId = currentPlayerIdRef.current || currentPlayerId;
      persistLocal(playersRef.current, effectiveId ?? null);
      if (lastLocalChangeRef.current > 0) {
        syncWithServer(false, { useBeacon: true });
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [currentPlayerId, persistLocal, syncWithServer]);

  const currentPlayer =
    (currentPlayerId && players.find((p) => p.id === currentPlayerId)) || null;

  useEffect(() => {
    currentPlayerIdRef.current = currentPlayerId;
  }, [currentPlayerId]);

  const saveStateForUndo = () => {
    setUndoStack((prev) => [
      ...prev,
      players.map((p) => ({ ...p, resources: [...p.resources] })),
    ]);
    setRedoStack([]);
  };

  const updateCurrentPlayer = (updater: (player: Player) => Player) => {
    const effectiveId = currentPlayerIdRef.current || currentPlayerId;
    if (!effectiveId) return;
    saveStateForUndo();
    const now = Date.now();
    setPlayers((prev) => {
      const next = prev.map((p) => (p.id === effectiveId ? updater(p) : p));
      persistLocal(next, effectiveId);
      lastLocalChangeRef.current = now;
      return next;
    });
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
      const now = Date.now();
      setPlayers(() => {
        persistLocal(previous, currentPlayerIdRef.current || currentPlayerId);
        lastLocalChangeRef.current = now;
        return previous;
      });
    }
  };

  const handleRedo = () => {
    const next = redoStack.pop();
    if (next) {
      setUndoStack((prev) => [...prev, players]);
      const now = Date.now();
      setPlayers(() => {
        persistLocal(next, currentPlayerIdRef.current || currentPlayerId);
        lastLocalChangeRef.current = now;
        return next;
      });
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
        <button onClick={() => syncWithServer(false).finally(() => navigate("/"))}>
          ホームへ戻る
        </button>
      </div>
    );
  }

  if (players.length === 0 || !currentPlayer) {
    return (
      <div style={{ padding: 16 }}>
        <p>プレイヤーが見つかりません。ホームで作成してください。</p>
        <button onClick={() => syncWithServer(false).finally(() => navigate("/"))}>
          ホームへ戻る
        </button>
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
          onClick={() => syncWithServer(false).finally(() => navigate("/"))}
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
