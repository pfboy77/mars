import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { Player, Resource } from "./types";

const API_URL = "https://mars-api-server.onrender.com"; // ここをあなたのURLに置き換えてください

const initialResources = (): Resource[] => [
  { id: uuidv4(), name: "MC", amount: 0, production: 0, isMegaCredit: true },
  { id: uuidv4(), name: "建材", amount: 0, production: 0 },
  { id: uuidv4(), name: "チタン", amount: 0, production: 0 },
  { id: uuidv4(), name: "植物", amount: 0, production: 0 },
  { id: uuidv4(), name: "電力", amount: 0, production: 0, isEnergy: true },
  { id: uuidv4(), name: "発熱", amount: 0, production: 0, isHeat: true }
];

function Home() {
  const navigate = useNavigate();

  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [newPlayerName, setNewPlayerName] = useState<string>("");

  // データの取得
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

  // データの保存
  useEffect(() => {
    const saveState = async () => {
      try {
        await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ players, currentPlayerId })
        });
      } catch (err) {
        console.error("状態の保存に失敗しました", err);
      }
    };
    if (players.length > 0) saveState();
  }, [players, currentPlayerId]);

  const handleAddPlayer = () => {
    if (!newPlayerName.trim()) return;
    const newPlayer: Player = {
      id: uuidv4(),
      name: newPlayerName.trim(),
      tr: 20,
      resources: initialResources()
    };
    setPlayers(prev => [...prev, newPlayer]);
    setCurrentPlayerId(newPlayer.id);
    setNewPlayerName("");
  };

  const handleSelectPlayer = (id: string) => {
    setCurrentPlayerId(id);
  };

  const handleDeletePlayer = (id: string) => {
    const updated = players.filter(p => p.id !== id);
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
    if (currentPlayerId) navigate("/play");
  };

  return (
    <div style={{ padding: 32, textAlign: "center" }}>
      <h1>Terraforming Resource Manager</h1>
      <p>プレイヤーの状態を管理したり、全体をモニターできます。</p>

      <div style={{ marginTop: 24 }}>
        <input
          type="text"
          placeholder="プレイヤー名を入力"
          value={newPlayerName}
          onChange={(e) => setNewPlayerName(e.target.value)}
          style={{ padding: "8px", fontSize: "16px", width: "200px", marginRight: "8px" }}
        />
        <button onClick={handleAddPlayer} style={{ padding: "8px 16px", fontSize: "16px" }}>追加</button>
      </div>

      {players.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3>プレイヤーを選択:</h3>
          <select
            value={currentPlayerId || ""}
            onChange={e => handleSelectPlayer(e.target.value)}
            style={{ padding: "8px", fontSize: "16px" }}
          >
            <option value="" disabled>選択してください</option>
            {players.map(player => (
              <option key={player.id} value={player.id}>{player.name}</option>
            ))}
          </select>

          <div style={{ marginTop: 16 }}>
            {players.map(player => (
              <div key={player.id} style={{ marginBottom: 8 }}>
                <span>{player.name}</span>
                <button onClick={() => handleDeletePlayer(player.id)} style={{ marginLeft: 8 }}>削除</button>
              </div>
            ))}
          </div>

          <button onClick={handleResetAll} style={{ marginTop: 16, backgroundColor: "red", color: "white", padding: "8px 16px", borderRadius: 4 }}>
            全てリセット（プレイヤー削除）
          </button>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 32 }}>
        <button onClick={goToPlayerView} disabled={!currentPlayerId} style={{ padding: "12px 24px", fontSize: "16px" }}>
          プレイヤー操作画面へ
        </button>
        <button onClick={() => navigate("/monitor")} style={{ padding: "12px 24px", fontSize: "16px" }}>
          モニター画面へ
        </button>
      </div>
    </div>
  );
}

export default Home;
