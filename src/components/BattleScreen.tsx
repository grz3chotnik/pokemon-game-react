import "../App.css";
import PokemonInfo from "./PokemonInfo.tsx";
import { useState } from "react";
import { motion } from "motion/react";
import { MOVE_ANIMATION } from "../../config/moveAnimationMap.ts";
import { FILTER_EFFECT } from "../../config/filterEffectMap.ts";

interface Move {
  name: string;
  power: number;
  type: string;
}

interface BattleScreenProps {
  gameState: {
    gameOver: boolean;
    winner: boolean;
    opponent: {
      name: string;
      pokemonHp: number;
      pokemonMaxHp: number;
      pokemonBackImageURL: string;
      pokemonImageURL: string;
      gameOver: boolean;
      winner: boolean;
    };
    player: {
      name: string;
      pokemonHp: number;
      pokemonMaxHp: number;
      pokemonBackImageURL: string;
      pokemonImageURL: string;
      pokemonMoves: Move[];
      isPlayerTurn: boolean;
      whoseTurn: string;
    };
  };
  attackEnemy: (moveName: string) => void;
  handleExit: () => void;
  animateAttack: () => void;
  isAnimationActive: boolean;
  isGameOver: boolean;
  moveType: string;
}

enum MenuState {
  Main = "main",
  Moves = "moves"
}



const BattleScreen = ({
  gameState,
  attackEnemy,
  handleExit,
  animateAttack,
  isAnimationActive,
  isGameOver,
  moveType,
}: BattleScreenProps) => {
  const [menuState, setMenuState] = useState<MenuState>(MenuState.Main);
  const [hoveredMove, setHoveredMove] = useState<number>(0);

  if (!gameState) {
    return <p>loading...</p>;
  }

  if (isGameOver) {
    return <p>game over</p>;
  }

  return (
    <div className="maindiv">
      <button
        className="endgamebutton"
        onClick={() => {
          handleExit();
        }}
      >
        end game
      </button>
      {gameState.gameOver && <h2>winner: {gameState.winner}</h2>}
      <div className="gamediv">
        <div className="playerLeft">
          <PokemonInfo
            pokemonName={gameState?.opponent?.name ?? ""}
            pokemonHP={gameState?.opponent?.pokemonHp ?? "-"}
            maxHP={gameState?.opponent?.pokemonMaxHp ?? "-"}
          />
          <div>
            <motion.div
              animate={
                isAnimationActive &&
                gameState?.player.whoseTurn ===
                  localStorage.getItem("sessionID")
                  ? { y: [0, -50, 0] }
                  : isAnimationActive &&
                      gameState?.player.whoseTurn !==
                        localStorage.getItem("sessionID")
                    ? { y: [0, -50, 0], rotate: [0, 10, -10, 0] }
                    : { x: 0, y: 0, rotate: 0, opacity: 1 }
              }
              transition={{ duration: 0.3, delay: 0, ease: "easeInOut" }}
            >
              <div className="playerLeftImage">
                <img
                  src={gameState?.player.pokemonBackImageURL}
                  height="350px"
                  width="350px"
                  alt="pokemon1"
                  style={
                    isAnimationActive &&
                    gameState.player.whoseTurn ===
                      localStorage.getItem("sessionID")
                      ? { filter: FILTER_EFFECT[moveType] }
                      : undefined
                  }
                />

                {gameState.player.whoseTurn ===
                  localStorage.getItem("sessionID") && (
                  <img
                    src={isAnimationActive ? MOVE_ANIMATION[moveType] : ""}
                    height="200px"
                    className="attackImageLeft"
                  />
                )}
              </div>
            </motion.div>
          </div>
        </div>

        <div className="playerRight">
          <div>
            <motion.div
              animate={
                isAnimationActive &&
                gameState?.player.whoseTurn ===
                  localStorage.getItem("sessionID")
                  ? { y: [0, -50, 0], rotate: [0, 10, -10, 0] }
                  : isAnimationActive &&
                      gameState?.player.whoseTurn !==
                        localStorage.getItem("sessionID")
                    ? { y: [0, -50, 0] }
                    : { x: 0, y: 0, rotate: 0, opacity: 1 }
              }
              transition={{ duration: 0.3, delay: 0, ease: "easeInOut" }}
            >
              <div className="playerRightImage">
                {!gameState?.opponent ? (
                  <p>player2 joining..</p>
                ) : (
                  <img
                    src={gameState?.opponent.pokemonImageURL}
                    height="350px"
                    width="350px"
                    alt="pokemon2"
                    style={
                      isAnimationActive &&
                      gameState.player.whoseTurn !==
                        localStorage.getItem("sessionID")
                        ? { filter: FILTER_EFFECT[moveType] }
                        : undefined
                    }
                  />
                )}
                {gameState.player.whoseTurn !==
                  localStorage.getItem("sessionID") && (
                  <img
                    src={isAnimationActive ? MOVE_ANIMATION[moveType] : ""}
                    height="200px"
                    className="attackImageLeft"
                  />
                )}
              </div>
            </motion.div>
          </div>

          <PokemonInfo
            pokemonName={gameState?.player.name}
            pokemonHP={gameState?.player.pokemonHp}
            maxHP={gameState?.player.pokemonMaxHp}
          />
        </div>
      </div>

      <div className="infodiv">
        {menuState === "main" && (
          <>
            <div className="text">text here</div>
            <div className="menu">
              <button
                onClick={() => setMenuState(MenuState.Moves)}
                className="attackbutton"
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
          </>
        )}

        {menuState === "moves" && (
          <>
            <div className="moves">
              {gameState.player.pokemonMoves.map((move, index) => (
                <button
                  key={move.name}
                  disabled={gameState.player.isPlayerTurn === false}
                  className="attackbutton"
                  onClick={() => {
                    setMenuState(MenuState.Main);
                    attackEnemy(move.name);
                    animateAttack();

                  }}
                  onMouseEnter={() => {
                    setHoveredMove(index);
                  }}
                >
                  {move.name.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="movesstats">
              <p>PP: {gameState.player.pokemonMoves[hoveredMove]?.power}</p>
              <p>
                TYPE/
                {gameState.player.pokemonMoves[hoveredMove]?.type.toUpperCase()}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BattleScreen;
