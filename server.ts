import { WebSocketServer } from "ws";
import { v4 as uuidv4 } from "uuid";
import { ATTACK_TO_OPPONENT } from "./config/attackToOpponentMap";
const wss = new WebSocketServer({ port: 8080 });
const BALANCE = 10;
const INACTIVITY_TIMER_VALUE = 120000;
let whoseTurn;
const enum WSMessage {
  Join = "join",
  Attack = "attack",
  Exit = "exit",
}

const getRandomPokemonId = () => Math.floor(Math.random() * (1000 - 1 + 1) + 1);

const fetchJson = async (url) => {
  const res = await fetch(url);
  return res.json();
};
const fetchPokemon = () =>
  fetchJson(`https://pokeapi.co/api/v2/pokemon/${getRandomPokemonId()}`);

const fetchPokemonMoves = async (moves) =>
  Promise.all(moves.map((move) => fetchJson(move.move.url).catch(() => null)));

const getFilteredMoves = (moves) => {
  const filtered = moves.filter(
    (move) =>
      move && move.power !== null && move.damage_class.name !== "status",
  );

  const indices = [...Array(filtered.length).keys()]
    .sort(() => Math.random() - 0.5)
    .slice(0, 4);
  return indices.map((i) => ({
    name: filtered[i].name,
    type: filtered[i].type.name,
    power: filtered[i].power,
    accuracy: filtered[i].accuracy,
    damage_class: filtered[i].damage_class.name,
  }));
};

let gameState = {};
const clients = new Map();
let inactivityTimer = null;

const resetInactivityTimer = () => {
  clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(() => {
    gameState = {};
  }, INACTIVITY_TIMER_VALUE);
};

wss.on("connection", (ws) => {
  const handleJoin = async (clientSessionID: string) => {
    if (Object.keys(gameState).length > 1 && !gameState[clientSessionID]) {
      return;
    }
    resetInactivityTimer();

    const pokemon = await fetchPokemon();
    const pokemonMoves = await fetchPokemonMoves(pokemon.moves);
    const sessionID = uuidv4();
    const filteredPokemonMoves = getFilteredMoves(pokemonMoves);
    if (!whoseTurn) {
      whoseTurn = sessionID;
    }
    const opponentID = Object.keys(gameState).filter(
      (element) => element !== clientSessionID,
    )[0];
    if (clientSessionID) {
      clients.set(clientSessionID, ws);
      clients.get(clientSessionID).send(
        JSON.stringify({
          id: "gameStateUpdate",
          clientSessionID,
          isPlayerTurn: whoseTurn === opponentID,
          player: {
            name: gameState[clientSessionID].name,
            pokemonImageURL: gameState[clientSessionID].pokemonImageURL,
            pokemonBackImageURL: gameState[clientSessionID].pokemonBackImageURL,
            pokemonHp: gameState[clientSessionID].pokemonHp,
            pokemonMaxHp: gameState[clientSessionID].pokemonMaxHp,
            pokemonMoves: gameState[clientSessionID].pokemonMoves.map(
              ({ name, type, power }) => ({
                name,
                type,
                power,
              }),
            ),
            pokemonType: gameState[clientSessionID].pokemonType,
          },
          opponent: {
            name: gameState[opponentID].name,
            pokemonImageURL: gameState[opponentID]?.pokemonImageURL,
            pokemonBackImageURL: gameState[opponentID].pokemonBackImageURL,
            pokemonHp: gameState[opponentID]?.pokemonHp,
            pokemonMaxHp: gameState[opponentID].pokemonMaxHp,
            pokemonType: gameState[opponentID].pokemonType,
          },
        }),
      );
      return;
    }
    if (!clientSessionID) {
      clients.set(sessionID, ws);

      gameState[sessionID] = {
        name: pokemon.name,
        pokemonHp: pokemon.stats[0].base_stat, // 0 is pokemon's HP
        pokemonMaxHp: pokemon.stats[0].base_stat,
        pokemonImageURL: pokemon.sprites.front_default,
        pokemonBackImageURL: pokemon.sprites.back_default,
        pokemonMoves: filteredPokemonMoves,
        pokemonType: pokemon.types[0].type.name,
        pokemonAttack: pokemon.stats[1].base_stat, // 1 is the pokemons attack power
        pokemonDefense: pokemon.stats[2].base_stat, // 2 is the pokemons attack power
      };

      clients
        .get(sessionID)
        .send(JSON.stringify({ id: "sessionID", sessionID: sessionID }));
      clients.get(sessionID).send(
        JSON.stringify(
          !opponentID
            ? {
                id: "gameStateUpdate",
                sessionID,
                isPlayerTurn: whoseTurn === opponentID,
                player: {
                  name: gameState[sessionID].name,
                  pokemonBackImageURL: gameState[sessionID].pokemonBackImageURL,
                  pokemonHp: gameState[sessionID].pokemonHp,
                  pokemonMaxHp: gameState[sessionID].pokemonMaxHp,
                  pokemonMoves: gameState[sessionID].pokemonMoves.map(
                    ({ name, type, power }) => ({
                      name,
                      type,
                      power,
                    }),
                  ),
                  pokemonType: gameState[sessionID].pokemonType,
                },
              }
            : {
                id: "gameStateUpdate",
                sessionID,
                isPlayerTurn: whoseTurn === opponentID,
                player: {
                  name: gameState[sessionID].name,
                  pokemonBackImageURL: gameState[sessionID].pokemonBackImageURL,
                  pokemonHp: gameState[sessionID].pokemonHp,
                  pokemonMaxHp: gameState[sessionID].pokemonMaxHp,
                  pokemonMoves: gameState[sessionID].pokemonMoves.map(
                    ({ name, type, power }) => ({
                      name,
                      type,
                      power,
                    }),
                  ),
                  pokemonType: gameState[sessionID].pokemonType,
                },
                opponent: {
                  name: gameState[opponentID].name,
                  pokemonImageURL: gameState[opponentID]?.pokemonImageURL,
                  pokemonHp: gameState[opponentID]?.pokemonHp,
                  pokemonMaxHp: gameState[opponentID].pokemonMaxHp,
                  pokemonType: gameState[opponentID].pokemonType,
                },
              },
        ),
      );
    }

    if (clients.size !== 2) {
      return;
    }

    const opponentWs = clients.get(opponentID);

    opponentWs.send(
      JSON.stringify({
        id: "gameStateUpdate",
        isPlayerTurn: whoseTurn === sessionID,
        opponent: {
          name: gameState[sessionID].name,
          pokemonImageURL: gameState[sessionID].pokemonImageURL,
          pokemonBackImageURL: gameState[sessionID].pokemonBackImageURL,
          pokemonHp: gameState[sessionID].pokemonHp,
          pokemonMaxHp: gameState[sessionID].pokemonMaxHp,
          pokemonType: gameState[sessionID].pokemonType,
        },
      }),
    );
  };

  const handleAttack = (attackName, sessionID) => {
    resetInactivityTimer();
    const opponentID = Object.keys(gameState).find((id) => id !== sessionID);
    const opponentType = gameState[opponentID]?.pokemonType;
    const { power: movePower, type: attackType } = gameState[
      sessionID
    ].pokemonMoves.find((move) => move.name === attackName);
    const playerAttack = gameState[sessionID].pokemonAttack;
    const opponentDefense = gameState[opponentID].pokemonDefense;
    const stab = attackType === gameState[sessionID].pokemonType ? 1.5 : 1;
    const effectiveness = ATTACK_TO_OPPONENT[attackType][opponentType];
    const randomFactor = Math.random() * (1 - 0.85) + 0.85;

    const effectivenessToMultiplier = {
      noEffect: 0,
      effective: 2,
      notEffective: 0.5,
      default: 1,
    };
    const multiplier =
      effectiveness === undefined
        ? effectivenessToMultiplier["default"]
        : effectivenessToMultiplier[effectiveness];
    const damage = Math.floor(
      (((movePower * playerAttack) / opponentDefense) *
        stab *
        multiplier *
        randomFactor) /
        BALANCE,
    );

    if (whoseTurn === sessionID) {
      whoseTurn = opponentID;
    }

    //applying the dmg
    const updatedPokemonHp = Math.max(
      0,
      gameState[opponentID].pokemonHp - damage,
    );

    gameState[opponentID].pokemonHp = updatedPokemonHp;

    console.log("[updatedPokemonHp]", updatedPokemonHp);

    wss.clients.forEach((client) => {
      client.send(JSON.stringify({ id: "moveType", type: attackType }));
    });

    const updateUsersData = (clientsSessionID: string) => {
      return clientsSessionID === sessionID
        ? {
            id: "attackUpdate",
            isPlayerTurn: whoseTurn === opponentID,
            opponent: {
              pokemonHp: gameState[opponentID].pokemonHp,
            },
          }
        : {
            id: "attackUpdate",
            isPlayerTurn: whoseTurn !== opponentID,
            player: {
              pokemonHp: gameState[opponentID].pokemonHp,
            },
          };
    };

    //sending the update for each client
    clients.get(sessionID).send(JSON.stringify(updateUsersData(sessionID)));
    clients.get(opponentID).send(JSON.stringify(updateUsersData(opponentID)));

    //if someone loses, send gameOver
    if (
      gameState[sessionID].pokemonHp === 0 ||
      gameState[opponentID].pokemonHp === 0
    ) {
      wss.clients.forEach((client) => {
        client.send(
          JSON.stringify({
            id: "gameStateUpdate",
            winnerPokemonName: gameState[sessionID].name,
          }),
        );
      });
      gameState = {};
      clients.clear();
      return;
    }
  };

  const handleExit = () => {
    gameState = {};
    clients.clear();
    whoseTurn = null;

    wss.clients.forEach((client) => {
      client.send(
        JSON.stringify({
          id: "exit",
        }),
      );
    });
  };

  ws.on("message", async (message) => {
    const msg = JSON.parse(message.toString());

    if (msg.id === WSMessage.Join) {
      await handleJoin(msg.clientSessionID);
    }
    if (msg.id === WSMessage.Attack) {
      handleAttack(msg.moveName, msg.sessionID);
    }

    if (msg.id === WSMessage.Exit) {
      handleExit();
    }
  });
});

console.log("WebSocket server is running on port 8080");
