import { WebSocketServer } from "ws";

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

async function fetchJson(url) {
  const res = await fetch(url);
  return res.json();
}

async function initGame(player1Name = "charizard", player2Name = "blastoise") {
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
    return indices.map((i) => filtered[i].name);
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
          console.warn("failed to fetch move", message.movename, e);
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

        const typeChart = {
          normal: {
            rock: 0.5,
            ghost: 0,
            steel: 0.5,
          },
          fire: {
            fire: 0.5,
            water: 0.5,
            grass: 2,
            ice: 2,
            bug: 2,
            rock: 0.5,
            dragon: 0.5,
            steel: 2,
          },
          water: {
            fire: 2,
            water: 0.5,
            grass: 0.5,
            ground: 2,
            rock: 2,
            dragon: 0.5,
          },
          electric: {
            water: 2,
            electric: 0.5,
            grass: 0.5,
            ground: 0,
            flying: 2,
            dragon: 0.5,
          },
          grass: {
            fire: 0.5,
            water: 2,
            grass: 0.5,
            poison: 0.5,
            ground: 2,
            flying: 0.5,
            bug: 0.5,
            rock: 2,
            dragon: 0.5,
            steel: 0.5,
          },
          ice: {
            fire: 0.5,
            water: 0.5,
            grass: 2,
            ground: 2,
            flying: 2,
            dragon: 2,
            steel: 0.5,
          },
          fighting: {
            normal: 2,
            ice: 2,
            rock: 2,
            dark: 2,
            steel: 2,
            poison: 0.5,
            flying: 0.5,
            psychic: 0.5,
            bug: 0.5,
            fairy: 0.5,
            ghost: 0,
          },
          poison: {
            grass: 2,
            poison: 0.5,
            ground: 0.5,
            rock: 0.5,
            ghost: 0.5,
            steel: 0,
            fairy: 2,
          },
          ground: {
            fire: 2,
            electric: 2,
            grass: 0.5,
            poison: 2,
            flying: 0,
            bug: 0.5,
            rock: 2,
            steel: 2,
          },
          flying: {
            electric: 0.5,
            grass: 2,
            fighting: 2,
            bug: 2,
            rock: 0.5,
            steel: 0.5,
          },
          psychic: {
            fighting: 2,
            poison: 2,
            psychic: 0.5,
            dark: 0,
            steel: 0.5,
          },
          bug: {
            fire: 0.5,
            grass: 2,
            fighting: 0.5,
            poison: 0.5,
            flying: 0.5,
            psychic: 2,
            ghost: 0.5,
            dark: 2,
            steel: 0.5,
            fairy: 0.5,
          },
          rock: {
            fire: 2,
            ice: 2,
            fighting: 0.5,
            ground: 0.5,
            flying: 2,
            bug: 2,
            steel: 0.5,
          },
          ghost: {
            normal: 0,
            psychic: 2,
            ghost: 2,
            dark: 0.5,
          },
          dragon: {
            dragon: 2,
            steel: 0.5,
            fairy: 0,
          },
          dark: {
            fighting: 0.5,
            psychic: 2,
            ghost: 2,
            dark: 0.5,
            fairy: 0.5,
          },
          steel: {
            fire: 0.5,
            water: 0.5,
            electric: 0.5,
            ice: 2,
            rock: 2,
            fairy: 2,
            steel: 0.5,
          },
          fairy: {
            fire: 0.5,
            fighting: 2,
            poison: 0.5,
            dragon: 2,
            dark: 2,
            steel: 0.5,
          },
        };

        const effectiveness =
          typeChart[moveData.type.name]?.[defenderStats.type] ?? 1;
        const attackerStat =
          moveData.damage_class.name === "physical"
            ? attackerStats.attack
            : attackerStats.special_attack;
        const defenderStat =
          moveData.damage_class.name === "physical"
            ? defenderStats.defense
            : defenderStats.special_defense;
        const STAB = moveData.type.name === attackerStats.type ? 1.5 : 1;
        const randomFactor = Math.random() * 0.15 + 0.85;
        const balance = 10;
        const damage = Math.floor(
          (((moveData.power * attackerStat) / defenderStat) *
            STAB *
            effectiveness *
            randomFactor) /
            balance,
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
