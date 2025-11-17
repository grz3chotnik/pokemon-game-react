export default function PokemonInfo({
  pokemon,
  pokemonHP,
  maxHP,
}: {
  pokemon: string;
  pokemonHP: number;
  maxHP: number;
}) {
  const hpPercent = (pokemonHP / maxHP) * 100;

  return (
    <div className="playerinfo">
      <div className="pokemonname">
        <p>{pokemon}</p>
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
