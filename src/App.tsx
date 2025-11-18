import "./App.css";
import { useEffect, useRef, useState } from "react";
import BattleScreen from "./components/BattleScreen.tsx";

export default function App() {
  const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8080";
  const [gameState, setGameState] = useState();

  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const wsClient = new WebSocket(WS_URL);
    wsRef.current = wsClient;

    wsClient.onopen = () => {
      console.log("connected");
      wsClient.send(JSON.stringify({ id: "join" }));
    };

    wsClient.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setGameState((prevState) => ({ ...prevState, ...data }));
    };

    wsClient.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    return () => {
      if (wsClient.readyState === WebSocket.OPEN) {
        wsClient.close();
      }
    };
  }, []);
  console.log(gameState);

  const attackEnemy = (moveName) => {
    wsRef.current?.send(
      JSON.stringify({
        id: "attack",
        sessionID: gameState.sessionID,
        moveName,
      }),
    );
  };
  return (
    <div className="maindiv">
      <BattleScreen gameState={gameState} attackEnemy={attackEnemy} />
    </div>
  );
}
