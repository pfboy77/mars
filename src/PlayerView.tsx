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

  const urlRoomId = searchParams.get("roomId");
  const storedRoomId = typeof window !== "undefined" ? localStorage.getItem("roomId") : null;
  const roomId = urlRoomId || storedRoomId || "default";

  const urlPlayerId = searchParams.get("playerId");
  const storedPlayerId =
    typeof window !== "undefined"
      ? localStorage.getItem(`currentPlayerId_${roomId}`)
      : null;

  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);

  const [deltaValues, setDeltaValues] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const [undoStack, setUndoStack] = useState<Player[][]>([]);
  const [redoStack, setRedoStack] = useState<Player[][]>([]);

  // ★ これを追加：読み込み中フラグ
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchState = async () => {
      try {
        const res = await fetch(`${API_URL}/?roomId=${encodeURIComponent(roomId)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        const serverPlayers: Player[] = data.players || [];
        setPlayers(serverPlayers);

        if (serverPlayers.length === 0) {
          setCurrentPlayerId(null);
          setLoading(false);
          return;
        }

        const candidate =
          (urlPlayerId && serverPlayers.some((p) => p.id === urlPlayerId) && urlPlayerId) ||
          (storedPlayerId && serverPlayers.some((p) => p.id === storedPlayerId) && storedPlayerId) ||
          serverPlayers[0].id;

        setCurrentPlayerId(candidate);
        setLoading(false);
      } catch (e: any) {
        console.error("状態の取得に失敗", e);
        setGlobalError("プレイヤー情報の取得に失敗しました。ホームに戻ってやり直してください。");
        setLoading(false);
      }
    };

    fetchState();
  }, [roomId, urlPlayerId, storedPlayerId]);

  useEffect(() => {
    if (!roomId || players.length === 0) return;

    const saveState = async () => {
      try {
        await fetch(`${API_URL}/?roomId=${encodeURIComponent(roomId)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId, players }),
        });
      } catch (err) {
        console.error("状態の保存に失敗", err);
      }
    };

    saveState();
  }, [players, roomId]);


  useEffect(() => {
    if (!roomId) return;
    if (currentPlayerId) {
      localStorage.setItem(`currentPlayerId_${roomId}`, currentPlayerId);
    }
  }, [currentPlayerId, roomId]);


  // ===== 表示切り替え部分 =====

  // ① 読み込み中
  if (loading) {
    return (
      <div style={{ padding: 16 }}>
        <p>読み込み中...</p>
      </div>
    );
  }

  // ② API エラー
  if (globalError) {
    return (
      <div style={{ padding: 16 }}>
        <p>{globalError}</p>
        <button onClick={() => navigate("/")}>ホームに戻る</button>
      </div>
    );
  }

  // ③ プレイヤーが本当にいない
  if (players.length === 0 || !currentPlayerId) {
    return (
      <div style={{ padding: 16 }}>
        <p>プレイヤーが見つかりません。ホームで作成してください。</p>
        <button onClick={() => navigate("/")}>ホームへ戻る</button>
      </div>
    );
  }

  // ④ ここから本来のプレイヤー画面
  const currentPlayer = players.find((p) => p.id === currentPlayerId);

  if (!currentPlayer) {
    return (
      <div style={{ padding: 16 }}>
        <p>プレイヤーが見つかりません。</p>
        <button onClick={() => navigate("/")}>ホームへ戻る</button>
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>{currentPlayer.name}</h2>
      {/* ここにプレイヤー操作UI…（省略） */}
      <button onClick={() => navigate("/")}>ホーム</button>
    </div>
  );
}

export default PlayerView;
