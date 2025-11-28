interface PokemonInfoProps {
  name?: string;
  hp?: number;
  maxHP?: number;
}

const PokemonInfo = ({ name, hp = 100, maxHP = 100 }: PokemonInfoProps) => {
  const hpPercent = (hp / maxHP) * 100;
  const hpLabel = name ? `${hp}/${maxHP}` : `-/-`;

  return (
    <div className="playerInfo">
      <div className="pokemonname">
        <p
          style={{
            height: "37.5px",
          }}
        >
          {name}
        </p>
      </div>

      <div className="healthbardiv">
        <div className="outerhealthbar">
          <p>HP</p>
          <div className="healthbar">
            <div className="health" style={{ width: hpPercent + "%" }}></div>
          </div>
        </div>
      </div>
      <p>{hpLabel}</p>
    </div>
  );
};

export default PokemonInfo;
