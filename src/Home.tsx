import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { Player, Resource } from "./types";

const API_URL = "https://mars-api-server.onrender.com";

const initialResources = (): Resource[] => [
  { id: uuidv4(), name: "MC", amount: 0, production: 0, isMegaCredit: true },
  { id: uuidv4(), name: "建材", amount: 0, production: 0 },
  { id: uuidv4(), name: "チタン", amount: 0, production: 0 },
  { id: uuidv4(), name: "植物", amount: 0, production: 0 },
  { id: uuidv4(), name: "電力", amount: 0, production: 0, isEnergy: true },
  { id: uuidv4(), name: "発熱", amount: 0, production: 0, isHeat: true },
];

function Home() {
  const navigate = useNavigate();

  const [roomId, setRoomId] = useState<string>("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [newPlayerName, setNewPlayerName] = useState<string>("");

  // 初回だけ roomId を決める（localStorage に保存）
  useEffect(() => {
    const stored = localStorage.getItem("roomId");
    if (stored) {
      setRoomId(stored);
    } else {
      const newId = uuidv4();
      localStorage.setItem("roomId", newId);
      setRoomId(newId);
    }
  }, []);

  // roomId が決まったら、その部屋の状態を取得
  useEffect(() => {
    if (!roomId) return;

    const fetchState = async () => {
      try {
        const res = await fetch(
          `${API_URL}/?roomId=${encodeURIComponent(roomId)}`
        );
        const data = await res.json();
        setPlayers(data.players || []);

        // currentPlayerId はローカルで持つ
        const storedCurrent = localStorage.getItem(
          `currentPlayerId_${roomId}`
        );
        if (storedCurrent && data.players?.some((p: Player) => p.id === storedCurrent)) {
          setCurrentPlayerId(storedCurrent);
        } else if (data.players && data.players.length > 0) {
          setCurrentPlayerId(data.players[0].id);
        } else {
          setCurrentPlayerId(null);
        }
      } catch (err) {
        console.error("状態の取得に失敗しました", err);
      }
    };

    fetchState();
  }, [roomId]);

  // players が変わったらサーバーに保存
  useEffect(() => {
    if (!roomId) return;

    const saveState = async () => {
      try {
        await fetch(`${API_URL}/?roomId=${encodeURIComponent(roomId)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId, players }),
        });
      } catch (err) {
        console.error("状態の保存に失敗しました", err);
      }
    };

    if (players.length > 0) {
      saveState();
    }
  }, [players, roomId]);

  // currentPlayerId を localStorage にも保持
  useEffect(() => {
    if (!roomId) return;
    if (currentPlayerId) {
      localStorage.setItem(`currentPlayerId_${roomId}`, currentPlayerId);
    } else {
      localStorage.removeItem(`currentPlayerId_${roomId}`);
    }
  }, [currentPlayerId, roomId]);

  const handleAddPlayer = () => {
    if (!newPlayerName.trim()) return;
    const newPlayer: Player = {
      id: uuidv4(),
      name: newPlayerName.trim(),
      tr: 20,
      resources: initialResources(),
    };
    setPlayers((prev) => [...prev, newPlayer]);
    setCurrentPlayerId(newPlayer.id);
    setNewPlayerName("");
  };

  const handleSelectPlayer = (id: string) => {
    setCurrentPlayerId(id);
  };

  const handleDeletePlayer = (id: string) => {
    const updated = players.filter((p) => p.id !== id);
    setPlayers(updated);
    if (currentPlayerId === id) {
      setCurrentPlayerId(updated[0]?.id || null);
    }
  };

  const handleResetAll = () => {
    setPlayers([]);
    setCurrentPlayerId(null);
  };

  const goToPlayerView = () => {
    if (currentPlayerId) {
      navigate(`/play?roomId=${encodeURIComponent(roomId)}&playerId=${currentPlayerId}`);
    }
  };

  const goToMonitorView = () => {
    navigate(`/monitor?roomId=${encodeURIComponent(roomId)}`);
  };

  const appOrigin =
    typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div style={{ padding: 32, textAlign: "center" }}>
      <h1>Terraforming Resource Manager</h1>
      <p>プレイヤーの状態を管理したり、全体をモニターできます。</p>

      {roomId && (
        <p style={{ fontSize: 12, color: "#666" }}>
          Room ID: <code>{roomId}</code>
        </p>
      )}

      <div style={{ marginTop: 24 }}>
        <input
          type="text"
          placeholder="プレイヤー名を入力"
          value={newPlayerName}
          onChange={(e) => setNewPlayerName(e.target.value)}
          style={{
            padding: "8px",
            fontSize: "16px",
            width: "200px",
            marginRight: "8px",
          }}
        />
        <button
          onClick={handleAddPlayer}
          style={{ padding: "8px 16px", fontSize: "16px" }}
        >
          追加
        </button>
      </div>

      {players.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3>プレイヤーを選択:</h3>
          <select
            value={currentPlayerId || ""}
            onChange={(e) => handleSelectPlayer(e.target.value)}
            style={{ padding: "8px", fontSize: "16px" }}
          >
            <option value="" disabled>
              選択してください
            </option>
            {players.map((player) => (
              <option key={player.id} value={player.id}>
                {player.name}
              </option>
            ))}
          </select>

          <div style={{ marginTop: 16 }}>
            {players.map((player) => {
              const playerUrl = `${appOrigin}/play?roomId=${encodeURIComponent(
                roomId
              )}&playerId=${player.id}`;
              const monitorUrl = `${appOrigin}/monitor?roomId=${encodeURIComponent(
                roomId
              )}`;

              return (
                <div
                  key={player.id}
                  style={{
                    marginBottom: 12,
                    borderBottom: "1px solid #ddd",
                    paddingBottom: 8,
                  }}
                >
                  <div>
                    <span>{player.name}</span>
                    <button
                      onClick={() => handleDeletePlayer(player.id)}
                      style={{ marginLeft: 8 }}
                    >
                      削除
                    </button>
                  </div>
                  <div style={{ fontSize: 12, marginTop: 4, textAlign: "left" }}>
                    <div>
                      プレイヤーURL:{" "}
                      <input
                        type="text"
                        readOnly
                        value={playerUrl}
                        style={{ width: "100%" }}
                      />
                    </div>
                    <div style={{ marginTop: 4 }}>
                      モニターURL:{" "}
                      <input
                        type="text"
                        readOnly
                        value={monitorUrl}
                        style={{ width: "100%" }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={handleResetAll}
            style={{
              marginTop: 16,
              backgroundColor: "red",
              color: "white",
              padding: "8px 16px",
              borderRadius: 4,
            }}
          >
            全てリセット（プレイヤー削除）
          </button>
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 16,
          marginTop: 32,
        }}
      >
        <button
          onClick={goToPlayerView}
          disabled={!currentPlayerId}
          style={{ padding: "12px 24px", fontSize: "16px" }}
        >
          プレイヤー
        </button>
        <button
          onClick={goToMonitorView}
          style={{ padding: "12px 24px", fontSize: "16px" }}
        >
          モニター
        </button>
      </div>
    </div>
  );
}

export default Home;
