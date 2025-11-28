import "./App.css";
import { useEffect, useRef, useState } from "react";
import merge from "lodash.merge";
import BattleScreen from "./components/BattleScreen.tsx";
import type { GameState, Move } from "./types/gameState.ts";

export default function App() {
  const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8080";
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [moveType, setMoveType] = useState<string>("");
  const [isAnimationActive, setIsAnimationActive] = useState(false);

  const handleExit = () => {
    wsRef.current?.send(JSON.stringify({ id: "exit" }));
    setGameState(null);
  };

  const handleAnimateAttack = () => {
    setIsAnimationActive(true);
    setTimeout(() => {
      setIsAnimationActive(false);
    }, 600);
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

      if (data.id === "sessionID") {
        localStorage.setItem("sessionID", data.sessionID);
      }

      if (data.id === "gameStateUpdate") {
        setGameState((prevState) => merge({}, prevState, data));
        console.log(gameState);
      }

      if (data.id === "attackUpdate") {
        setGameState((prevState) => merge({}, prevState, data));

        handleAnimateAttack();
        console.log(gameState);
      }

      if (data.id === "exit") {
        localStorage.removeItem("sessionID");
        setGameState(null);
        return;
      }

      if (data.id === "moveType") {
        setMoveType(data.type);
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

  const handleAttackEnemy = (moveName: Move["name"]) => {
    wsRef.current?.send(
      JSON.stringify({
        id: "attack",
        sessionID: localStorage.getItem("sessionID"),
        moveName,
      }),
    );
  };

  if (!gameState) {
    return "loading state";
  }

  return (
    <div className="maindiv">
      <BattleScreen
        gameState={gameState}
        onAttackEnemy={handleAttackEnemy}
        handleExit={handleExit}
        onAnimateAttack={handleAnimateAttack}
        isAnimationActive={isAnimationActive}
        moveType={moveType}
      />
    </div>
  );
}
