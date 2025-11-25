export default function PokemonInfo({
  pokemonName,
  pokemonHP,
  maxHP,
}: {
  pokemonName: string;
  pokemonHP: number;
  maxHP: number;
}) {
  const hpPercent = (pokemonHP / maxHP) * 100;

  return (
    <div className="playerInfo">
      <div className="pokemonname">
        <p>{pokemonName}</p>
      </div>

      <div className="healthbardiv">
        <div className="outerhealthbar">
          <p>HP</p>
          <div className="healthbar">
            <div className="health" style={{ width: hpPercent + "%" }}></div>
          </div>
        </div>
      </div>
      <p>
        {pokemonHP}/{maxHP}{" "}
      </p>
    </div>
  );
}
