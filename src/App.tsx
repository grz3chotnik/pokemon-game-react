import "./App.css";
import { useEffect, useState } from "react";
import Player1 from "./Player1";
import Player2 from "./Player2";

export default function App() {
  const [role, setRole] = useState<"Player1" | "Player2" | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("role");
    if (saved === "Player1" || saved === "Player2") setRole(saved);
  }, []);

  const choose = (role: "Player1" | "Player2") => {
    localStorage.setItem("role", role);
    setRole(role);
  };

  if (!role) {
    return (
      <div className="maindiv">

        <h2>Join</h2>

        <button onClick={() => choose("Player1")}>Join as Player 1</button>
        <button onClick={() => choose("Player2")}>Join as Player 2</button>
        <select>
          <option>choose a pokemon</option>
        </select>
      </div>
    );
  }

  return role === "Player1" ? <Player1/> : <Player2 />;
}
