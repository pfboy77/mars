import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Player } from "./types";

const API_URL = "https://mars-api-server.onrender.com";

const MonitorView: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const navigate = useNavigate();

  // ★ URL から roomId を取得（なければ default）
  const [searchParams] = useSearchParams();
  const roomId = searchParams.get("roomId") ?? "default";

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const res = await fetch(
          `${API_URL}/?roomId=${encodeURIComponent(roomId)}`
        );
        const data = await res.json();
        setPlayers(data.players || []);
      } catch (err) {
        console.error("モニター情報の取得に失敗しました", err);
      }
    };

    fetchPlayers();
    const interval = setInterval(fetchPlayers, 2000);
    return () => clearInterval(interval);
  }, [roomId]); // ★ roomId が変わったら監視対象を切り替える

  // 2x2レイアウト（最大4人）のスタイル設定
  const gridStyle =
    players.length <= 4
      ? {
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 24,
          maxWidth: 1200,
          margin: "0 auto",
          padding: 16,
        }
      : {
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 24,
          maxWidth: 1200,
          margin: "0 auto",
          padding: 16,
        };

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <h2 style={{ textAlign: "center", marginBottom: 16 }}>モニター</h2>

      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <button
          onClick={() => navigate("/")}
          style={{ padding: "8px 16px", fontSize: "16px" }}
        >
          ホーム
        </button>
      </div>

      <div style={gridStyle}>
        {players.map((player) => (
          <div
            key={player.id}
            style={{
              border: "1px solid #ccc",
              borderRadius: 8,
              padding: 12,
              backgroundColor: "#f4f4f4",
              fontSize: 20,
              lineHeight: 1.4,
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <div style={{ textAlign: "left", fontWeight: "bold" }}>
                {player.name}
              </div>
              <div style={{ textAlign: "center", fontWeight: "bold" }}>
                TR: {player.tr}
              </div>
              <div />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 8,
              }}
            >
              {player.resources.map((resource) => (
                <div
                  key={resource.id}
                  style={{
                    backgroundColor: "#fff",
                    border: "1px solid #ddd",
                    borderRadius: 4,
                    padding: 8,
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    fontSize: 16,
                  }}
                >
                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <strong>{resource.name}</strong>
                    <span style={{ fontWeight: "bold" }}>
                      {resource.amount}
                    </span>
                  </div>
                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <span>産出量</span>
                    <span style={{ fontWeight: "bold" }}>
                      {Math.max(
                        resource.production,
                        resource.isMegaCredit ? -5 : 0
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MonitorView;
