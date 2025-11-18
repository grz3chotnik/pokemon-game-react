import { WebSocketServer } from "ws";
import { v4 as uuidv4 } from "uuid";
import { ATTACK_TO_OPPONENT } from "./config/attackToOpponentMap";
const wss = new WebSocketServer({ port: 8080 });
const BALANCE = 10;
const RANDOM_FACTOR = Math.random() * (1 - 0.85) + 0.85;
let whoseTurn;
let isPlayerTurn;

const enum WSMessage {
  Join = "join",
  Attack = "attack",
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

const gameState = {};
const clients = new Map();

wss.on("connection", (ws) => {
  const handleJoin = async () => {
    if (Object.keys(gameState).length > 1) {
      console.log("error, 2 players already here");
      return;
    }
    const pokemon = await fetchPokemon();
    const pokemonMoves = await fetchPokemonMoves(pokemon.moves);

    const sessionID = uuidv4();
    const filteredPokemonMoves = getFilteredMoves(pokemonMoves);
    if (!whoseTurn) {
      whoseTurn = sessionID;
    }

    clients.set(sessionID, ws);
    // ws._sessionID = sessionID;
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

      gameOver: false,
      winner: null,
    };

    const opponentID = Object.keys(gameState).filter(
      (element) => element !== sessionID,
    )[0];

    if (opponentID) {
      ws.send(
        JSON.stringify({
          sessionID,
          player: {
            name: gameState[sessionID].name,
            pokemonImageURL: gameState[sessionID].pokemonImageURL,
            pokemonBackImageURL: gameState[sessionID].pokemonBackImageURL,
            pokemonHp: gameState[sessionID].pokemonHp,
            pokemonMaxHp: gameState[sessionID].pokemonMaxHp,
            pokemonMoves: gameState[sessionID].pokemonMoves.map(
              ({ name, type }) => ({
                name,
                type,
              }),
            ),
            pokemonType: gameState[sessionID].pokemonType,
            isPlayerTurn: whoseTurn === sessionID ? true : false,
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
    } else {
      ws.send(
        JSON.stringify({
          sessionID,
          player: {
            name: gameState[sessionID].name,
            pokemonImageURL: gameState[sessionID].pokemonImageURL,
            pokemonBackImageURL: gameState[sessionID].pokemonBackImageURL,
            pokemonHp: gameState[sessionID].pokemonHp,
            pokemonMaxHp: gameState[sessionID].pokemonMaxHp,
            pokemonMoves: gameState[sessionID].pokemonMoves.map(
              ({ name, type }) => ({
                name,
                type,
              }),
            ),
            pokemonType: gameState[sessionID].pokemonType,
          },
          opponent: null,
        }),
      );
    }

    if (clients.size !== 2) {
      return;
    }

    const opponentWs = clients.get(opponentID);

    opponentWs.send(
      JSON.stringify({
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
    const opponentID = Object.keys(gameState).find((id) => id !== sessionID);
    const opponentType = gameState[opponentID]?.pokemonType;
    const { power: movePower, type: attackType } = gameState[
      sessionID
    ].pokemonMoves.find((move) => move.name === attackName);
    const playerAttack = gameState[sessionID].pokemonAttack;
    const opponentDefense = gameState[opponentID].pokemonDefense;
    const stab = attackType === gameState[sessionID].pokemonType ? 1.5 : 1;
    const effectiveness = ATTACK_TO_OPPONENT[attackType][opponentType];
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
        RANDOM_FACTOR) /
        BALANCE,
    );

    if (whoseTurn === sessionID) {
      whoseTurn = opponentID;
      isPlayerTurn = true;
    } else {
      isPlayerTurn = false;
    }

    console.log(whoseTurn);
    console.log(isPlayerTurn);

    //applying the dmg
    gameState[opponentID].pokemonHp = gameState[opponentID].pokemonHp - damage;
    //sending the update
    ws.send(
      JSON.stringify({
        player: {
          name: gameState[sessionID].name,
          pokemonImageURL: gameState[sessionID].pokemonImageURL,
          pokemonBackImageURL: gameState[sessionID].pokemonBackImageURL,
          pokemonHp: gameState[sessionID].pokemonHp,
          pokemonMaxHp: gameState[sessionID].pokemonMaxHp,
          pokemonMoves: gameState[sessionID].pokemonMoves.map(
            ({ name, type }) => ({
              name,
              type,
            }),
          ),
          pokemonType: gameState[sessionID].pokemonType,
          isPlayerTurn: whoseTurn === sessionID ? true : false,
        },
        opponent: {
          name: gameState[opponentID].name,
          pokemonImageURL: gameState[opponentID].pokemonImageURL,
          pokemonBackImageURL: gameState[opponentID].pokemonBackImageURL,
          pokemonHp: gameState[opponentID].pokemonHp,
          pokemonMaxHp: gameState[opponentID].pokemonMaxHp,
          pokemonType: gameState[opponentID].pokemonType,
        },
      }),
    );

    const opponentWs = clients.get(opponentID);
    opponentWs.send(
      JSON.stringify({
        player: {
          name: gameState[opponentID].name,
          pokemonImageURL: gameState[opponentID].pokemonImageURL,
          pokemonBackImageURL: gameState[opponentID].pokemonBackImageURL,
          pokemonHp: gameState[opponentID].pokemonHp,
          pokemonMaxHp: gameState[opponentID].pokemonMaxHp,
          pokemonType: gameState[opponentID].pokemonType,
          pokemonMoves: gameState[opponentID].pokemonMoves.map(
            ({ name, type }) => ({
              name,
              type,
            }),
          ),
          isPlayerTurn: whoseTurn === opponentID ? true : false,
        },
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

  ws.on("message", async (message) => {
    const msg = JSON.parse(message.toString());

    if (msg.id === WSMessage.Join) {
      await handleJoin();
    }
    if (msg.id === WSMessage.Attack) {
      handleAttack(msg.moveName, msg.sessionID);
    }
  });
});

console.log("WebSocket server is running on port 8080");
