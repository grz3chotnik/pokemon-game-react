import "../App.css";
import PokemonInfo from "./PokemonInfo.tsx";
import { useState } from "react";
import { motion } from "motion/react";
import { MOVE_ANIMATION } from "../../config/moveAnimationMap.ts";
import { FILTER_EFFECT } from "../../config/filterEffectMap.ts";
import type { GameState, Move } from "../types/gameState.ts";

interface BattleScreenProps {
  gameState: GameState;
  onAttackEnemy: (moveName: string) => void;
  handleExit: () => void;
  moveType: string;
  onAnimateAttack: () => void;
  isAnimationActive: boolean;
}

enum MenuState {
  Main = "main",
  Moves = "moves",
}

const attackAnimation = { y: [0, -50, 0], rotate: [0, 10, -10, 0] };
const defenseAnimation = { y: [0, -50, 0] };

const BattleScreen = ({
  gameState,
  onAttackEnemy,
  handleExit,
  moveType,
  onAnimateAttack,
  isAnimationActive,
}: BattleScreenProps) => {
  const [menuState, setMenuState] = useState<MenuState>(MenuState.Main);
  const [hoveredMove, setHoveredMove] = useState<number>(0);
  const animationTransition = { duration: 0.3, delay: 0, ease: "easeInOut" };

  const getAttackAnimationConfig = () => {
    if (!isAnimationActive) {
      return { x: 0, y: 0, rotate: 0, opacity: 1 };
    }

    if (!gameState.isPlayerTurn) {
      return attackAnimation;
    }

    if (gameState.isPlayerTurn) {
      return defenseAnimation;
    }
  };

  const handleAttack = (moveName: Move["name"]) => {
    setMenuState(MenuState.Main);
    onAttackEnemy(moveName);
    onAnimateAttack();
  };

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
      {gameState.winnerPokemonName &&
        (localStorage.removeItem("sessionID"),
        (<h2>winner: {gameState.winnerPokemonName}</h2>),
        (
          <button
            onClick={() => {
              window.location.reload();
            }}
          >
            restart game
          </button>
        ))}
      <div className="gamediv">
        <div className="playerArea">
          <PokemonInfo
            name={gameState?.opponent?.name}
            hp={gameState?.opponent?.pokemonHp}
            maxHP={gameState?.opponent?.pokemonMaxHp}
          />
          <div>
            <motion.div
              animate={getAttackAnimationConfig()}
              transition={animationTransition}
            >
              <div className="playerLeftImage">
                <img
                  src={gameState?.player.pokemonBackImageURL}
                  height="350px"
                  width="350px"
                  alt="pokemon1"
                  style={{
                    filter:
                      isAnimationActive && !gameState.isPlayerTurn
                        ? FILTER_EFFECT[moveType]
                        : undefined,
                  }}
                />

                {!gameState.isPlayerTurn && (
                  <img
                    src={
                      isAnimationActive ? MOVE_ANIMATION[moveType] : undefined
                    }
                    height="200px"
                    className="playerAttackAnimation"
                  />
                )}
              </div>
            </motion.div>
          </div>
        </div>

        <div className="opponentArea">
          <div>
            <motion.div
              animate={getAttackAnimationConfig()}
              transition={animationTransition}
            >
              <div className="opponentImageContainer">
                {!gameState?.opponent ? (
                  <p>loading...</p>
                ) : (
                  <img
                    src={gameState?.opponent.pokemonImageURL}
                    height="350px"
                    width="350px"
                    alt="Opponent Image"
                    style={
                      isAnimationActive && gameState.isPlayerTurn
                        ? { filter: FILTER_EFFECT[moveType] }
                        : undefined
                    }
                  />
                )}
                {gameState.isPlayerTurn && (
                  <img
                    src={
                      isAnimationActive ? MOVE_ANIMATION[moveType] : undefined
                    }
                    height="200px"
                    className="playerAttackAnimation"
                  />
                )}
              </div>
            </motion.div>
          </div>

          <PokemonInfo
            name={gameState?.player.name}
            hp={gameState?.player.pokemonHp}
            maxHP={gameState?.player.pokemonMaxHp}
          />
        </div>
      </div>

      <div className="infodiv">
        {menuState === MenuState.Main && (
          <>
            <div className="text">what will {gameState.player.name} do? </div>
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

        {menuState === MenuState.Moves && (
          <>
            <div className="moves">
              {gameState.player.pokemonMoves.map((move, index) => (
                <button
                  key={move.name}
                  disabled={gameState.isPlayerTurn}
                  className="attackbutton"
                  onClick={() => handleAttack(move.name)}
                  onMouseEnter={() => {
                    setHoveredMove(index);
                  }}
                >
                  {move.name.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="movesstats">
              <p>Power: {gameState.player.pokemonMoves[hoveredMove]?.power}</p>
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
