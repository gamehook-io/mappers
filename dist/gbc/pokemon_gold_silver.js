// @ts-ignore
const variables = __variables;
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
const getProperty = mapper.get_property;
const setProperty = mapper.set_property;
const copyProperties = mapper.copy_properties;

const HIDDEN_POWER_TYPES = [
    "Fighting",
    "Flying",
    "Poison",
    "Ground",
    "Rock",
    "Bug",
    "Ghost",
    "Steel",
    "Fire",
    "Water",
    "Grass",
    "Electric",
    "Psychic",
    "Ice",
    "Dragon",
    "Dark",
];
/** Generate a nibble from each IV's respective bit */
function generateNibbleFromIVs(ivs, bit) {
    const specialBit = (ivs.special >> bit) & 1;
    const speedBit = (ivs.speed >> bit) & 1;
    const defenseBit = (ivs.defense >> bit) & 1;
    const attackBit = (ivs.attack >> bit) & 1;
    return specialBit | (speedBit << 1) | (defenseBit << 2) | (attackBit << 3);
}
/** Calculate the HP IV */
function hpIv(ivs) {
    return generateNibbleFromIVs(ivs, 0);
}
/** Calculate hidden power's type from IVs */
function hidden_powerType(ivs) {
    const lookupIndex = ((ivs.attack & 0x3) << 2) | (ivs.defense & 0x3); // 0-15
    return HIDDEN_POWER_TYPES[lookupIndex];
}
/** Calculate hidden power's base power from IVs */
function hidden_powerPower(ivs) {
    const sum = generateNibbleFromIVs(ivs, 3);
    const specialRemainder = ivs.special & 0x3;
    return ((5 * sum + specialRemainder) >> 1) + 31;
}
/** Calculate if a Pokemon is shiny from the IVs */
function shiny(ivs) {
    return (ivs.defense == 10 &&
        ivs.special == 10 &&
        ivs.speed == 10 &&
        (ivs.attack & 2) != 0);
}

const PARTY_SIZE = 6;
function getGamestate() {
    const team_0_level = getValue('player.team.0.level');
    const outcome_flags = getValue('battle.other.outcome_flags');
    const battle_mode = getValue('battle.mode');
    const low_health_alarm = getValue('battle.other.low_health_alarm');
    const team_0_species = getValue('player.team.0.species');
    const player_battle_species = getValue('battle.player.active_pokemon.species');
    const state = getValue('meta.state');
    if (team_0_level == 0) {
        return 'No Pokemon';
    }
    else if (battle_mode == null) {
        return 'Overworld';
    }
    else if (low_health_alarm == "Disabled" || outcome_flags > 0) {
        return 'From Battle';
    }
    else if (team_0_species == player_battle_species) {
        return 'Battle';
    }
    else if ((state == 'Overworld' || state == 'To Battle') && battle_mode != null) {
        return 'To Battle';
    }
    else {
        return 'Battle';
    }
}
function getEncounterRate() {
    const time_of_day = getValue("time.current.time_of_day");
    const morning = getValue("overworld.encounter_rates.morning");
    const day = getValue("overworld.encounter_rates.day");
    const night = getValue("overworld.encounter_rates.night");
    const water = getValue("overworld.encounter_rates.water");
    const movement_state = getValue("overworld.movement_state");
    if (movement_state == "Surfing") {
        return water;
    }
    switch (time_of_day) {
        case "Morning":
            return morning;
        case "Day":
            return day;
        case "Night":
            return night;
        default:
            return 0;
    }
}
function getBattleOutcome() {
    const outcome_flags = getValue('battle.other.outcome_flags');
    const gamestate = getGamestate();
    switch (gamestate) {
        case 'From Battle':
            switch (outcome_flags) {
                case 0:
                case 64:
                case 128:
                case 192:
                    return 'Win';
                case 1:
                case 65:
                case 129:
                case 193:
                    return 'Lose';
                case 2:
                case 66:
                case 130:
                case 194:
                    return 'Flee';
                default:
                    return null;
            }
    }
    return null;
}
function getPlayerPartyPosition() {
    const gamestate = getGamestate();
    switch (gamestate) {
        case 'Battle':
            return getValue('battle.player.party_position');
        case 'From Battle':
            return getValue('battle.player.party_position');
        default: {
            const team = [0, 1, 2, 3, 4, 5];
            for (let i = 0; i < team.length; i++) {
                if (getValue(`player.team.${i}.stats.hp`) > 0) {
                    return i;
                }
            }
            return 0;
        }
    }
}
function postprocessor() {
    variables.reload_addresses = true;
    const gamestate = getGamestate();
    setValue("meta.state", gamestate);
    setValue("overworld.encounter_rate", getEncounterRate());
    setValue("battle.outcome", getBattleOutcome());
    //Set player.active_pokemon properties
    const party_position_overworld = getPlayerPartyPosition();
    const party_position_battle = getValue('battle.player.party_position');
    setValue('player.party_position', getPlayerPartyPosition());
    if (gamestate === 'Battle') {
        copyProperties(`player.team.${party_position_battle}`, 'player.active_pokemon');
        copyProperties('battle.player.active_pokemon', 'player.active_pokemon');
    }
    else {
        setProperty('player.active_pokemon.modifiers.attack', { address: null, value: 0 });
        setProperty('player.active_pokemon.modifiers.defense', { address: null, value: 0 });
        setProperty('player.active_pokemon.modifiers.speed', { address: null, value: 0 });
        setProperty('player.active_pokemon.modifiers.special_attack', { address: null, value: 0 });
        setProperty('player.active_pokemon.modifiers.special_defense', { address: null, value: 0 });
        setProperty('player.active_pokemon.modifiers.accuracy', { address: null, value: 0 });
        setProperty('player.active_pokemon.modifiers.evasion', { address: null, value: 0 });
        setProperty('player.active_pokemon.volatile_status_conditions.confused', { address: null, value: false });
        setProperty('player.active_pokemon.volatile_status_conditions.toxic', { address: null, value: false });
        setProperty('player.active_pokemon.volatile_status_conditions.leech_seed', { address: null, value: false });
        setProperty('player.active_pokemon.volatile_status_conditions.curse', { address: null, value: false });
        setProperty('player.active_pokemon.volatile_status_conditions.in_love', { address: null, value: false });
        setProperty('player.active_pokemon.volatile_status_conditions.nightmare', { address: null, value: false });
        setProperty('player.active_pokemon.effects.protect', { address: null, value: false });
        setProperty('player.active_pokemon.effects.identified', { address: null, value: false });
        setProperty('player.active_pokemon.effects.perish', { address: null, value: false });
        setProperty('player.active_pokemon.effects.endure', { address: null, value: false });
        setProperty('player.active_pokemon.effects.rollout', { address: null, value: false });
        setProperty('player.active_pokemon.effects.curled', { address: null, value: false });
        setProperty('player.active_pokemon.effects.bide', { address: null, value: false });
        setProperty('player.active_pokemon.effects.rampage', { address: null, value: false });
        setProperty('player.active_pokemon.effects.in_loop', { address: null, value: false });
        setProperty('player.active_pokemon.effects.flinched', { address: null, value: false });
        setProperty('player.active_pokemon.effects.charged', { address: null, value: false });
        setProperty('player.active_pokemon.effects.underground', { address: null, value: false });
        setProperty('player.active_pokemon.effects.flying', { address: null, value: false });
        setProperty('player.active_pokemon.effects.bypass_accuracy', { address: null, value: false });
        setProperty('player.active_pokemon.effects.mist', { address: null, value: false });
        setProperty('player.active_pokemon.effects.focus_energy', { address: null, value: false });
        setProperty('player.active_pokemon.effects.substitute', { address: null, value: false });
        setProperty('player.active_pokemon.effects.recharge', { address: null, value: false });
        setProperty('player.active_pokemon.effects.rage', { address: null, value: false });
        setProperty('player.active_pokemon.effects.transformed', { address: null, value: false });
        setProperty('player.active_pokemon.effects.encored', { address: null, value: false });
        setProperty('player.active_pokemon.effects.lock_on', { address: null, value: false });
        setProperty('player.active_pokemon.effects.destiny_bond', { address: null, value: false });
        setProperty('player.active_pokemon.effects.cant_run', { address: null, value: false });
        setProperty('player.active_pokemon.counters.rollout', { address: null, value: 0 });
        setProperty('player.active_pokemon.counters.confuse', { address: null, value: 0 });
        setProperty('player.active_pokemon.counters.toxic', { address: null, value: 0 });
        setProperty('player.active_pokemon.counters.disable', { address: null, value: 0 });
        setProperty('player.active_pokemon.counters.encore', { address: null, value: 0 });
        setProperty('player.active_pokemon.counters.perish', { address: null, value: 0 });
        setProperty('player.active_pokemon.counters.fury_cutter', { address: null, value: 0 });
        setProperty('player.active_pokemon.counters.protect', { address: null, value: 0 });
        copyProperties(`player.team.${party_position_overworld}`, 'player.active_pokemon');
    }
    for (let index = 0; index < PARTY_SIZE; index++) {
        const ivs = {
            attack: getValue(`player.team.${index}.ivs.attack`),
            defense: getValue(`player.team.${index}.ivs.defense`),
            special: getValue(`player.team.${index}.ivs.special`),
            speed: getValue(`player.team.${index}.ivs.speed`),
        };
        setValue(`player.team.${index}.shiny`, shiny(ivs));
        setValue(`player.team.${index}.hidden_power.power`, hidden_powerPower(ivs));
        setValue(`player.team.${index}.hidden_power.type`, hidden_powerType(ivs));
        setValue(`player.team.${index}.ivs.hp`, hpIv(ivs));
    }
}

export { getBattleOutcome, getEncounterRate, getGamestate, postprocessor };
