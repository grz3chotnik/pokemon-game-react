import "./App.css";
import { useEffect, useRef, useState } from "react";
import BattleScreen from "./components/BattleScreen.tsx";

export default function App() {
  const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8080";
  const [gameState, setGameState] = useState();


  const handleExit = () => {
    wsRef.current?.send(JSON.stringify({ id: "exit" }));
    setGameState(null);
  };

  const wsRef = useRef<WebSocket | null>(null);
  useEffect(() => {
    const wsClient = new WebSocket(WS_URL);
    wsRef.current = wsClient;

    wsClient.onopen = () => {
      const sessionId = localStorage.getItem("sessionID");

      wsClient.send(
        JSON.stringify({
          id: "join",
          clientSessionID: sessionId ? sessionId : undefined,
        }),
      );
    };

    wsClient.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.id === "gameOver") {
        console.log(data.gameOver);
        return;
      }
      if (data.id === "sessionID") {
        localStorage.setItem("sessionID", data.sessionID);
      }

      if (data.id === "gameupdate") {
        console.log(data);
        setGameState((prevState) => ({ ...prevState, ...data }));
      }

      if (data.id === "attackupdate") {
        setGameState((prevState) => ({ ...prevState, ...data }));
      }

      if (data.id === "exit") {
        console.log("quit");
        localStorage.removeItem("sessionID");
        return;
      }
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
        sessionID: localStorage.getItem("sessionID"),
        moveName,
      }),
    );
  };
  return (
    <div className="maindiv">

      <BattleScreen
        gameState={gameState}
        attackEnemy={attackEnemy}
        handleExit={handleExit}
      />
    </div>
  );
}
