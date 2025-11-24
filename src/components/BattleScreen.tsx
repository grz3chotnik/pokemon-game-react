import "../App.css";
import PokemonInfo from "./PokemonInfo.tsx";
import { useState } from "react";

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
    };
  };
  attackEnemy: (move: string) => void;
  handleExit: () => void
}

const BattleScreen = ({ gameState, attackEnemy, handleExit}: BattleScreenProps) => {
  const [menuState, setMenuState] = useState<string>("main");
  const [hoveredMove, setHoveredMove] = useState<number>(0);

  if (!gameState) {
    return <p>loading...</p>;
  }

  return (
    <div className="maindiv">
      <button className="endgamebutton"
              onClick={() => {
                handleExit()
              }}
      >
        end game
      </button>
      {gameState.gameOver && <h2>winner: {gameState.winner}</h2>}
      <div className="gamediv">
        <div className="player1">
          <PokemonInfo
            pokemon={gameState?.opponent?.name ?? ""}
            pokemonHP={gameState?.opponent?.pokemonHp ?? "-"}
            maxHP={gameState?.opponent?.pokemonMaxHp ?? "-"}
          />
          <div>
            <div className="pokemon1img">
              <img
                src={gameState?.player.pokemonBackImageURL}
                height="350px"
                width="350px"
                alt="pokemon1"
              />
            </div>
          </div>
        </div>

        <div className="player2">
          <div>
            <div className="pokemon2img">
              {!gameState?.opponent ? (
                <p>player2 joining..</p>
              ) : (
                <img
                  src={gameState?.opponent.pokemonImageURL}
                  height="350px"
                  width="350px"
                  alt="pokemon2"
                />
              )}
            </div>
          </div>

          <PokemonInfo
            pokemon={gameState?.player.name}
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
                onClick={() => setMenuState("moves")}
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
                  disabled={gameState.player.isPlayerTurn === false}
                  className="attackbutton"
                  onClick={() => {
                    setMenuState("main");
                    attackEnemy(move.name);
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
