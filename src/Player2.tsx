import "./App.css";
import React, { useEffect, useRef, useState } from "react";
import PokemonInfo from "./components/PokemonInfo";
import * as motion from "motion/react-client";

const WS_URL = "ws://192.168.1.53:8080";
// const WS_URL = "ws://localhost:8080";

export default function Player2() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  const [pokemon1Stats, setPokemon1Stats] = useState<any | null>(null);
  const [pokemon2Stats, setPokemon2Stats] = useState<any | null>(null);
  const [pokemon1HP, setPokemon1HP] = useState<number | null>(null);
  const [pokemon2HP, setPokemon2HP] = useState<number | null>(null);
  const [pokemon1MaxHp, setPokemon1MaxHp] = useState<number | null>(null);
  const [pokemon2MaxHp, setPokemon2MaxHp] = useState<number | null>(null);
  const [pokemonImg, setPokemonImg] = useState<string | null>(null);
  const [pokemonImg2, setPokemonImg2] = useState<string | null>(null);
  const [cry2, setCry2] = useState<string | null>(null);

  const [pokemonMoves, setPokemonMoves] = useState<string[]>([]);

  const [whoseTurn, setWhoseTurn] = useState<"Player1" | "Player2">("Player1");
  const [attackMsg, setAttackMsg] = useState<string>("");
  const [effectivenessMsg, setEffectivenessMsg] = useState<string>("");
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [buttonsDisabled, setButtonsDisabled] = useState(false);
  const [selectedMove, setSelectedMove] = useState(0);
  const [hoveredMove, setHoveredMove] = useState<number | null>(null);
  const [isAttacking, setIsAttacking] = useState(false);
  const [isEnemyAttacking, setIsEnemyAttacking] = useState(false);
  const [attackAnimation, setAttackAnimation] = useState();
  const [menuState, setMenuState] = useState("main");

  const [flash, setFlash] = useState(false);

  const triggerAttackAnimation = () => {
    setIsAttacking(true);
    setTimeout(() => setIsAttacking(false), 500);
  };

  const triggerEnemyAttackAnimation = () => {
    setIsEnemyAttacking(true);
    setTimeout(() => setIsEnemyAttacking(false), 500);
  };

  useEffect(() => {
    mountedRef.current = true;
    let reconnectDelay = 1000;

    function connect() {
      if (!mountedRef.current) return;
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("connected");
        ws.send(JSON.stringify({ id: "join", role: "Player2" }));
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

            setPokemonImg(msg.pokemon2Stats?.sprites?.back_default);
            setPokemonImg2(msg.pokemon1Stats?.sprites?.front_default);

            setPokemonMoves(msg.moves2 ?? []);

            setWhoseTurn(msg.whoseTurn ?? "Player1");
            setGameOver(!!msg.gameOver);
            setAttackMsg("");
            setEffectivenessMsg("");
            setWinner(null);
            setButtonsDisabled(false);
            setIsLoading(false);

            const cryUrl = msg.pokemon2Stats?.cries?.legacy;
            if (cryUrl) setCry2(cryUrl);
            return;
          }

          if (msg.id === "hp1") setPokemon1HP(msg.data);
          else if (msg.id === "hp2") setPokemon2HP(msg.data);
          else if (msg.id === "turn") {
            setWhoseTurn(msg.turn);
            setMenuState("main");
            triggerAttackAnimation();
            if (msg.turn === "Player1") {
              triggerEnemyAttackAnimation();
            } else {
              triggerAttackAnimation();
            }
          } else if (msg.id === "attackMsg") {
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
          } else if (msg.id === "gameOver") {
            setGameOver(true);
            setWinner(msg.winner ?? null);
            setButtonsDisabled(true);
          } else if (msg.id === "reset") {
            setIsLoading(true);
            setGameOver(false);
            setWinner(null);
            setPokemonMoves([]);
          } else if (msg.id === "error") {
            console.warn("[P2] server error:", msg);
          } else if (msg.id === "movedata") {
            setAttackAnimation(msg.movetype);
            setTimeout(() => {
              setAttackAnimation("");
            }, 600);
          }
        } catch (e) {
          console.error("[P2] ws message parse error", e);
        }
      };

      ws.onerror = (err) => {
        console.error("[P2] ws error", err);
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
        whoseTurn === "Player2"
      ) {
        const move = pokemonMoves[selectedMove];
        if (move) attackEnemy(move);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [pokemonMoves, selectedMove, buttonsDisabled, gameOver, whoseTurn]);

  useEffect(() => {
    if (attackAnimation === "dark") {
      const interval = setInterval(() => {
        setFlash((currentFlash) => !currentFlash);
      }, 100);

      setTimeout(() => {
        clearInterval(interval);
        setFlash(false);
      }, 1000);
    }
  }, [attackAnimation]);

  const attackEnemy = (move: string) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (gameOver) return;

    if (cry2) {
      try {
        const audio = new Audio(cry2);
        audio.play().catch(() => {});
      } catch {}
    }
    triggerAttackAnimation();
    setButtonsDisabled(true);

    ws.send(
      JSON.stringify({
        type: "move",
        attacker: "pokemon2",
        movename: move.name,
      }),
    );
  };

  if (isLoading) {
    return (
      <div className="maindiv">
        <p>loading...</p>
      </div>
    );
  }
  const moveAnimationMap = {
    normal: "src/assets/Sprite-0001.gif",
    fire: "src/assets/Sprite-0002.gif",
    electric: "src/assets/Sprite-0003.gif",
    water: "src/assets/Sprite-0004.gif",
    ice: "src/assets/Sprite-0006.gif",
    ground: "src/assets/Sprite-0013.gif",
    fighting: "",
    flying: "src/assets/Sprite-0007.gif",
    ghost: "",
    dark: "src/assets/Sprite-0009.gif",
    rock: "src/assets/Sprite-0011.gif",
    steel: "src/assets/Sprite-0008.gif",
    grass: "src/assets/Sprite-0010.gif",
  };

  const filterEffect = {
    dark: "invert(100%)",
    fire: "brightness(70%) saturate(000%) sepia(100%) hue-rotate(309deg) contrast(270%)",
    water:
      "bfrightness(80%) saturate(100%) sepia(100%) hue-rotate(176deg) contrast(150%)",
    electric: " saturate(120%) ",
    ice: "brightness(100%) saturate(100%) sepia(100%) hue-rotate(150deg) contrast(150%)",
    normal: "brightness(90%)",
  };

  return (
    <div className="maindiv">
      {gameOver && <h2>winner : {winner}</h2>}

      <div
        className="gamediv"
        style={{
          filter:
            attackAnimation === "dark"
              ? flash
                ? filterEffect["dark"]
                : ""
              : attackAnimation === "electric"
                ? filterEffect[attackAnimation]
                : "",
        }}
      >
        <div className="player1">
          <PokemonInfo
            pokemon={pokemon1Stats?.name}
            pokemonHP={pokemon1HP ?? 0}
            maxHP={pokemon1MaxHp ?? 100}
          />
          <motion.div
            animate={
              winner === "Player 1"
                ? { y: [0, 100], opacity: [1, 0.5, 0] }
                : winner === "Player 2"
                  ? { x: 0, y: 0, rotate: 0, opacity: 1 }
                  : isEnemyAttacking
                    ? { y: [0, -50, 0], rotate: [0, 10, -10, 0] }
                    : isAttacking
                      ? { x: [0, 25, 0, 25, 0] }
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
                  alt="opponent"
                  style={
                    attackAnimation && whoseTurn === "Player2"
                      ? { filter: filterEffect[attackAnimation] }
                      : null
                  }
                />
              ) : (
                <div>no img</div>
              )}

              {whoseTurn === "Player2" && (
                <img
                  src={attackAnimation ? moveAnimationMap[attackAnimation] : ""}
                  height="200px"
                  className="attackimg2"
                />
              )}
            </div>
          </motion.div>
        </div>

        <div className="player2">
          <motion.div
            animate={
              winner === "Player 2"
                ? { y: [0, 100], opacity: [1, 0.5, 0] }
                : winner === "Player 1"
                  ? { x: 0, y: 0, rotate: 0, opacity: 1 }
                  : isEnemyAttacking
                    ? { x: [0, 25, 0, 25, 0] }
                    : isAttacking
                      ? { y: [0, -50, 0], rotate: [0, 10, -10, 0] }
                      : { x: 0, y: 0, rotate: 0, opacity: 1 }
            }
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="pokemon2img">
              {pokemonImg2 ? (
                <img
                  src={pokemonImg2}
                  height="350px"
                  width="350px"
                  alt="you"
                  style={
                    attackAnimation && whoseTurn === "Player1"
                      ? { filter: filterEffect[attackAnimation] }
                      : null
                  }
                />
              ) : (
                <div>no img</div>
              )}
              {whoseTurn === "Player1" && (
                <img
                  src={attackAnimation ? moveAnimationMap[attackAnimation] : ""}
                  height="200px"
                  className="attackimg2"
                />
              )}
            </div>
          </motion.div>

          <PokemonInfo
            pokemon={pokemon2Stats?.name}
            pokemonHP={pokemon2HP ?? 0}
            maxHP={pokemon2MaxHp ?? 100}
          />
        </div>
      </div>

      <div className="infodiv">
        {menuState === "main" && (
          <div className="text">
            {gameOver ? (
              <p>{(whoseTurn ?? "Pokemon").toUpperCase()} fainted...</p>
            ) : attackMsg && !effectivenessMsg ? (
              <p>{attackMsg}</p>
            ) : effectivenessMsg ? (
              <p>{effectivenessMsg}</p>
            ) : (
              <p>what will {whoseTurn.toUpperCase()} do?</p>
            )}
          </div>
        )}

        {menuState === "main" ? (
          whoseTurn === "Player2" && <div className="menu">
            <button
              onClick={() => setMenuState("moves")}
              className="attackbutton"
              disabled={whoseTurn === "Player1" || gameOver || buttonsDisabled}
            >
              FIGHT
            </button>
            <button disabled className="attackbutton">
              BAG
            </button>
            <button disabled className="attackbutton">
              POKEMON
            </button>
            <button disabled className="attackbutton">
              RUN
            </button>
          </div>
        ) : (
          <>
            <div className="moves">
              {pokemonMoves.map((move, index) => (
                <button
                  className="attackbutton"
                  key={`${move}-${index}`}
                  onClick={() => {
                    attackEnemy(move);
                    setMenuState("menu");
                  }}
                  disabled={
                    whoseTurn === "Player1" || gameOver || buttonsDisabled
                  }
                  onMouseEnter={() => setHoveredMove(index)}
                  onMouseLeave={() => setHoveredMove(null)}
                >
                  {hoveredMove === null && index === selectedMove && (
                    <img src="./select.svg" height="20px" alt="select" />
                  )}
                  {hoveredMove === index && (
                    <img src="./select.svg" height="20px" alt="select" />
                  )}
                  {move.name.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="movesstats">
              <p>PP:{pokemonMoves[hoveredMove || selectedMove]?.power}</p>
              <p>
                TYPE/
                {pokemonMoves[hoveredMove || selectedMove]?.type.toUpperCase()}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
