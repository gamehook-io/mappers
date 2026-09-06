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

function postprocessor() {
    // player.party_position is set by the XML conditions for the overworld case; in battle it's
    // the real memory-backed battle.player.party_position value instead.
    const inBattle = getValue('meta.state') === 'Battle';
    if (inBattle) setValue('player.party_position', getValue('battle.player.party_position'));
    copyProperties(`player.team.${getValue('player.party_position')}`, 'player.active_pokemon');
    if (inBattle) copyProperties('battle.player.active_pokemon', 'player.active_pokemon');
}

export { postprocessor };
