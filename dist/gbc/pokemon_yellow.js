// @ts-ignore
__variables;
// @ts-ignore
__state;
// @ts-ignore
__memory;
// @ts-ignore
const mapper = __mapper;
// @ts-ignore
__console;
const getValue = mapper.get_property_value;
const setValue = mapper.set_property_value;
const copyProperties = mapper.copy_properties;

const PARTY_SIZE = 6;

/** Generate a nibble from each IV's respective bit */
function generateNibbleFromIVs(ivs, bit) {
    const specialBit = (ivs.special >> bit) & 1;
    const speedBit = (ivs.speed >> bit) & 1;
    const defenseBit = (ivs.defense >> bit) & 1;
    const attackBit = (ivs.attack >> bit) & 1;
    return specialBit | (speedBit << 1) | (defenseBit << 2) | (attackBit << 3);
}

function postprocessor() {
    // player.party_position is set by the XML conditions for the overworld case; in battle it's
    // the real memory-backed battle.player.party_position value instead.
    const inBattle = getValue('meta.state') === 'Battle';
    if (inBattle) setValue('player.party_position', getValue('battle.player.party_position'));
    copyProperties(`player.team.${getValue('player.party_position')}`, 'player.active_pokemon');
    if (inBattle) copyProperties('battle.player.active_pokemon', 'player.active_pokemon');

    // ivs.hp isn't stored in memory - it's derived from the low bit of each other IV.
    for (let index = 0; index < PARTY_SIZE; index++) {
        const ivs = {
            attack: getValue(`player.team.${index}.ivs.attack`),
            defense: getValue(`player.team.${index}.ivs.defense`),
            special: getValue(`player.team.${index}.ivs.special`),
            speed: getValue(`player.team.${index}.ivs.speed`),
        };
        setValue(`player.team.${index}.ivs.hp`, generateNibbleFromIVs(ivs, 0));
    }
}

export { postprocessor };
