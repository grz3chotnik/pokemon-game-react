import { WebSocketServer } from "ws";
import { TYPE_CHART } from "./src/typeChart.js";

const wss = new WebSocketServer({ port: 8080 });

const game = {
  pokemon1Stats: null,
  pokemon2Stats: null,
  pokemon1HP: null,
  pokemon2HP: null,
  moves1: null,
  moves2: null,
  whoseTurn: "Player1",
  gameOver: false,
};

const clients = {
  Player1: null,
  Player2: null,
};


const RANDOM_VARIANCE = 0.15;
const RANDOM_MIN = 0.85;
const DAMAGE_BALANCE = 10;
const STAB_MULTIPLIER = 1.5;

async function fetchJson(url) {
  const res = await fetch(url);
  return res.json();
}

async function initGame(player1Name = "rayquaza", player2Name = "charizard") {
  if (game.pokemon1Stats && game.pokemon2Stats) return;

  const [p1, p2] = await Promise.all([
    fetchJson(`https://pokeapi.co/api/v2/pokemon/${player1Name}`),
    fetchJson(`https://pokeapi.co/api/v2/pokemon/${player2Name}`),
  ]);

  game.pokemon1Stats = {
    name: p1.name,
    type: p1.types[0].type.name,
    hpBase: p1.stats[0].base_stat,
    attack: p1.stats[1].base_stat,
    defense: p1.stats[2].base_stat,
    special_attack: p1.stats[3].base_stat,
    special_defense: p1.stats[4].base_stat,
    sprites: p1.sprites,
    cries: p1.cries,
  };

  game.pokemon2Stats = {
    name: p2.name,
    type: p2.types[0].type.name,
    hpBase: p2.stats[0].base_stat,
    attack: p2.stats[1].base_stat,
    defense: p2.stats[2].base_stat,
    special_attack: p2.stats[3].base_stat,
    special_defense: p2.stats[4].base_stat,
    sprites: p2.sprites,
    cries: p2.cries,
  };

  game.pokemon1HP = game.pokemon1Stats.hpBase * 2;
  game.pokemon2HP = game.pokemon2Stats.hpBase * 2;
  game.whoseTurn = "Player1";
  game.gameOver = false;

  const movesFor = async (poke) => {
    const moveDetails = await Promise.all(
      poke.moves.map((move) => fetchJson(move.move.url).catch(() => null)),
    );
    const filtered = moveDetails.filter(
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

  game.moves1 = await movesFor(p1);
  game.moves2 = await movesFor(p2);
}

async function getMoveData(moveName) {
  const res = await fetch(`https://pokeapi.co/api/v2/move/${moveName}`);
  return res.json();
}

function broadcast(obj) {
  const str = JSON.stringify(obj);
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) client.send(str);
  });
}

wss.on("connection", function connection(ws) {
  ws.on("error", console.error);

  ws.on("message", async function message(data) {
    try {
      const message = JSON.parse(data.toString());
      if (message.id === "join") {
        const role = message.role;
        if (role !== "Player1" && role !== "Player2") return;

        clients[role] = ws;
        ws.role = role;

        await initGame();

        ws.send(
          JSON.stringify({
            id: "init",
            pokemon1Stats: game.pokemon1Stats,
            pokemon2Stats: game.pokemon2Stats,
            hp1: game.pokemon1HP,
            hp2: game.pokemon2HP,
            moves1: game.moves1,
            moves2: game.moves2,
            whoseTurn: game.whoseTurn,
            gameOver: game.gameOver,
          }),
        );
        return;
      }

      if (message.type === "move") {
        if (game.gameOver) return;
        const moveData = await getMoveData(message.movename).catch((e) => {
          console.log("failed to fetch move", message.movename, e);
          return null;
        });
        if (!moveData) return;

        const attackerStats =
          message.attacker === "pokemon1"
            ? game.pokemon1Stats
            : game.pokemon2Stats;
        const defenderStats =
          message.attacker === "pokemon1"
            ? game.pokemon2Stats
            : game.pokemon1Stats;

        const effectiveness =
          TYPE_CHART[moveData.type.name]?.[defenderStats.type] ?? 1;
        const attackerStat =
          moveData.damage_class.name === "physical"
            ? attackerStats.attack
            : attackerStats.special_attack;
        const defenderStat =
          moveData.damage_class.name === "physical"
            ? defenderStats.defense
            : defenderStats.special_defense;

        const STAB =
          moveData.type.name === attackerStats.type ? STAB_MULTIPLIER : 1;
        const randomFactor = Math.random() * RANDOM_VARIANCE + RANDOM_MIN;
        const damage = Math.floor(
          (((moveData.power * attackerStat) / defenderStat) *
            STAB *
            effectiveness *
            randomFactor) /
            DAMAGE_BALANCE,
        );

        if (message.attacker === "pokemon1") {
          game.pokemon2HP = Math.max(0, (game.pokemon2HP || 0) - damage);
        } else {
          game.pokemon1HP = Math.max(0, (game.pokemon1HP || 0) - damage);
        }

        game.whoseTurn = game.whoseTurn === "Player1" ? "Player2" : "Player1";

        broadcast({ id: "hp1", data: game.pokemon1HP });
        broadcast({ id: "hp2", data: game.pokemon2HP });
        broadcast({ id: "turn", turn: game.whoseTurn });
        broadcast({ id: "effectiveness", lvl: effectiveness });
        broadcast({
          id: "attackMsg",
          msg: `${attackerStats.name.toUpperCase()} used ${moveData.name.toUpperCase()}`,
        });
        broadcast({ id: "defender", defender: defenderStats });
        broadcast({ id: "movedata", movetype: moveData.type.name });

        if (game.pokemon1HP <= 0 || game.pokemon2HP <= 0) {
          game.gameOver = true;
          const winner = game.pokemon1HP <= 0 ? "Player 2" : "Player 1";
          broadcast({ id: "gameOver", data: true, winner });
        }
      }
    } catch (err) {
      console.error("message handling err", err);
    }
  });

  ws.on("close", () => {
    if (ws.role && clients[ws.role] === ws) {
      clients[ws.role] = null;
    }
  });
});

console.log("server started");
