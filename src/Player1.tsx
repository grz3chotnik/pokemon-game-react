import "./App.css";
import React, { useEffect, useRef, useState } from "react";
import PokemonInfo from "./components/PokemonInfo";
import * as motion from "motion/react-client";

const WS_URL = "ws://192.168.1.53:8080";

export default function Player1({chosenPokemon}) {
  const wsRef = useRef<WebSocket>(null);
  const reconnectTimerRef = useRef(null);
  const mountedRef = useRef(true);

  const [pokemon1Stats, setPokemon1Stats] = useState(null);
  const [pokemon2Stats, setPokemon2Stats] = useState(null);
  const [pokemon1HP, setPokemon1HP] = useState(null);
  const [pokemon2HP, setPokemon2HP] = useState(null);
  const [pokemon1MaxHp, setPokemon1MaxHp] = useState(null);
  const [pokemon2MaxHp, setPokemon2MaxHp] = useState(null);
  const [pokemonImg, setPokemonImg] = useState(null);
  const [pokemonImg2, setPokemonImg2] = useState(null);
  const [cry1, setCry1] = useState(null);

  const [pokemonMoves, setPokemonMoves] = useState([]);

  const [whoseTurn, setWhoseTurn] = useState("Player1");
  const [attackMsg, setAttackMsg] = useState("");
  const [effectivenessMsg, setEffectivenessMsg] = useState("");
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [buttonsDisabled, setButtonsDisabled] = useState(false);
  const [selectedMove, setSelectedMove] = useState(0);
  const [hoveredMove, setHoveredMove] = useState(null);
  const [isAttacking, setIsAttacking] = useState(false);

  const triggerAttackAnimation = () => {
    setIsAttacking(true);
    setTimeout(() => setIsAttacking(false), 500);
  };

  useEffect(() => {
    mountedRef.current = true;
    let reconnectDelay = 1000;

    function connect() {
      if (!mountedRef.current) return;
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("conneccted");
        ws.send(JSON.stringify({ id: "join", role: "Player1" }));
      };

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);

          if (msg.id === "init") {
            setPokemon1Stats(msg.pokemon1Stats);
            setPokemon2Stats(msg.pokemon2Stats);

            setPokemon1HP(msg.hp1);
            setPokemon2HP(msg.hp2);

            setPokemon1MaxHp(
              msg.pokemon1Stats?.hpBase ? msg.pokemon1Stats.hpBase * 2 : null,
            );
            setPokemon2MaxHp(
              msg.pokemon2Stats?.hpBase ? msg.pokemon2Stats.hpBase * 2 : null,
            );

            setPokemonImg(msg.pokemon1Stats?.sprites?.back_default);
            setPokemonImg2(msg.pokemon2Stats?.sprites?.front_default);

            setPokemonMoves(msg.moves1);

            setWhoseTurn(msg.whoseTurn ?? "Player1");
            setGameOver(!!msg.gameOver);
            setAttackMsg("");
            setEffectivenessMsg("");
            setWinner(null);
            setButtonsDisabled(false);
            setIsLoading(false);

            const cryUrl = msg.pokemon1Stats?.cries?.legacy;
            if (cryUrl) setCry1(cryUrl);

            return;
          }

          if (msg.id === "hp1") setPokemon1HP(msg.data);
          else if (msg.id === "hp2") setPokemon2HP(msg.data);
          else if (msg.id === "turn") setWhoseTurn(msg.turn);
          else if (msg.id === "attackMsg") {
            setEffectivenessMsg("");
            setAttackMsg(msg.msg);
          } else if (msg.id === "effectiveness") {
            setButtonsDisabled(true);
            setTimeout(() => {
              if (msg.lvl === 0) setEffectivenessMsg("It had no effect");
              else if (msg.lvl > 1)
                setEffectivenessMsg("It’s super effective!");
              else if (msg.lvl < 1)
                setEffectivenessMsg("It’s not very effective...");
              else setEffectivenessMsg("");
              setButtonsDisabled(false);
            }, 900);
          } else if (msg.id === "defender") {
            console.log(msg.defender);
          } else if (msg.id === "gameOver") {
            setGameOver(true);
            setWinner(msg.winner);
            setButtonsDisabled(true);
          } else if (msg.id === "error") {
            console.warn("server error:", msg);
          }
        } catch (error) {
          console.error(" error", error);
        }
      };

      ws.onerror = (error) => {
        console.error("error ", error);
        try {
          ws.close();
        } catch {}
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        if (reconnectTimerRef.current)
          window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = window.setTimeout(() => {
          reconnectDelay = Math.min(5000, reconnectDelay + 1000);
          connect();
        }, reconnectDelay);
      };
    }

    connect();

    return () => {
      mountedRef.current = false;
      if (reconnectTimerRef.current)
        window.clearTimeout(reconnectTimerRef.current);
      if (wsRef.current)
        try {
          wsRef.current.close();
        } catch {}
    };
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (pokemonMoves.length < 1 || gameOver) return;

      if (e.key === "ArrowRight") {
        if (selectedMove === 0) setSelectedMove(1);
        else if (selectedMove === 2) setSelectedMove(3);
      } else if (e.key === "ArrowLeft") {
        if (selectedMove === 1) setSelectedMove(0);
        else if (selectedMove === 3) setSelectedMove(2);
      } else if (e.key === "ArrowDown") {
        if (selectedMove === 0) setSelectedMove(2);
        else if (selectedMove === 1) setSelectedMove(3);
      } else if (e.key === "ArrowUp") {
        if (selectedMove === 2) setSelectedMove(0);
        else if (selectedMove === 3) setSelectedMove(1);
      } else if (
        e.key === "Enter" &&
        !buttonsDisabled &&
        whoseTurn === "Player1"
      ) {
        const move = pokemonMoves[selectedMove];
        if (move) attackEnemy(move);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [pokemonMoves, selectedMove, buttonsDisabled, gameOver, whoseTurn]);

  const attackEnemy = (move: string) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (gameOver) return;

    if (cry1) {
      try {
        const audio = new Audio(cry1);
        audio.play().catch(() => {});
      } catch {}
    }
    triggerAttackAnimation();
    setButtonsDisabled(true);

    ws.send(
      JSON.stringify({ type: "move", attacker: "pokemon1", movename: move }),
    );
  };

  if (isLoading) {
    return (
      <div className="maindiv">
        <p>loading...</p>
      </div>
    );
  }

  return (
    <div className="maindiv">
      {gameOver && <h2>winner: {winner}</h2>}
      <div className="gamediv">
        <div className="player1">
          <PokemonInfo
            pokemon={pokemon2Stats?.name}
            pokemonHP={pokemon2HP ?? 0}
            maxHP={pokemon2MaxHp ?? 100}
          />
          <motion.div
            animate={
              winner === "Player 2"
                ? { y: [0, 100], opacity: [1, 0.5, 0] }
                : winner === "Player 1"
                  ? { x: 0, y: 0, rotate: 0, opacity: 1 }
                  : isAttacking
                    ? { y: [0, -50, 0], rotate: [0, 10, -10, 0] }
                    : { x: 0, y: 0, rotate: 0, opacity: 1 }
            }
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="pokemon1img">
              {pokemonImg ? (
                <img
                  src={pokemonImg}
                  height="350px"
                  width="350px"
                  alt="pokemon1"
                />
              ) : (
                <div>no img</div>
              )}
            </div>
          </motion.div>
        </div>

        <div className="player2">
          <motion.div
            animate={
              winner === "Player 1"
                ? { y: [0, 100], opacity: [1, 0.5, 0] }
                : winner === "Player 2"
                  ? { x: 0, y: 0, rotate: 0, opacity: 1 }
                  : isAttacking
                    ? { x: [0, 25, 0, 25, 0] }
                    : null
            }
            transition={{ duration: 0.3, delay: 0.1, ease: "easeInOut" }}
          >
            <div className="pokemon2img">
              {pokemonImg2 ? (
                <img
                  src={pokemonImg2}
                  height="350px"
                  width="350px"
                  alt="pokemon2"
                />
              ) : (
                <div>no img</div>
              )}
            </div>
          </motion.div>

          <PokemonInfo
            pokemon={pokemon1Stats?.name}
            pokemonHP={pokemon1HP ?? 0}
            maxHP={pokemon1MaxHp ?? 100}
          />
        </div>
      </div>

      <div className="infodiv">
        <div className="text">
          {gameOver ? (
            <p>{(pokemon1Stats?.name ?? "Pokemon").toUpperCase()} fainted...</p>
          ) : attackMsg && !effectivenessMsg ? (
            <p>{attackMsg}</p>
          ) : effectivenessMsg ? (
            <p>{effectivenessMsg}</p>
          ) : (
            <p>what will {whoseTurn.toUpperCase()} do?</p>
          )}
        </div>

        <div className="moves">
          {pokemonMoves.map((move, index) => (
            <button
              className="attackbutton"
              key={`${move}-${index}`}
              onClick={() => attackEnemy(move)}
              disabled={whoseTurn === "Player2" || gameOver || buttonsDisabled}
              onMouseEnter={() => setHoveredMove(index)}
              onMouseLeave={() => setHoveredMove(null)}
            >
              {hoveredMove === null && index === selectedMove && (
                <img src="./select.svg" height="20px" alt="select" />
              )}
              {hoveredMove === index && (
                <img src="./select.svg" height="20px" alt="select" />
              )}
              {move.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
