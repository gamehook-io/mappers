// @ts-check
/// <reference path="../../gamehook.d.ts" />

const PARTY_BASE = 0xDCDF;
const NICKNAME_BASE = 0xDE41;
const PARTY_SLOT_SIZE = 48;
const NICKNAME_SIZE = 11;
const PARTY_COUNT = 6;
const PARTY_PATHS = [
    'player.team.0', 'player.team.1', 'player.team.2',
    'player.team.3', 'player.team.4', 'player.team.5',
    'player.active_pokemon',
];
const HIDDEN_POWER_TYPES = ['Fighting', 'Flying', 'Poison', 'Ground', 'Rock', 'Bug', 'Ghost', 'Steel', 'Fire', 'Water', 'Grass', 'Electric', 'Psychic', 'Ice', 'Dragon', 'Dark'];
let previousState = 'Overworld';

function firstLivingPartySlot() {
    for (let slot = 0; slot < PARTY_COUNT; slot++) {
        const hpAddress = PARTY_BASE + slot * PARTY_SLOT_SIZE + 34;
        if (memory.wram.get_byte(hpAddress) !== 0 || memory.wram.get_byte(hpAddress + 1) !== 0) return slot;
    }
    return 0;
}

function stateFromRam() {
    if (memory.wram.get_byte(PARTY_BASE + 31) === 0) return 'No Pokemon';
    if (memory.wram.get_byte(0xD22D) === 0) return 'Overworld';
    if (memory.wram.get_byte(0xC6FD) === 1 || memory.wram.get_byte(0xD0EE) > 0) return 'From Battle';
    if (memory.wram.get_byte(PARTY_BASE) === memory.wram.get_byte(0xC62C)) return 'Battle';
    return previousState === 'Overworld' || previousState === 'To Battle' ? 'To Battle' : 'Battle';
}

function preprocessor() {
    const state = stateFromRam();
    const battleSlot = memory.wram.get_byte(0xD0D4);
    const useBattleSlot = (state === 'Battle' || state === 'From Battle') && battleSlot < PARTY_COUNT;
    const slot = useBattleSlot ? battleSlot : firstLivingPartySlot();
    variables.active_party_slot = slot;
    variables.active_party_address = PARTY_BASE + slot * PARTY_SLOT_SIZE;
    variables.active_party_nickname_address = NICKNAME_BASE + slot * NICKNAME_SIZE;
}

function encounterRate(timeOfDay, morning, day, night, water, movementState) {
    if (movementState === 'Surfing') return water;
    if (timeOfDay === 'Morning') return morning;
    if (timeOfDay === 'Day') return day;
    if (timeOfDay === 'Night') return night;
    return 0;
}

function battleOutcome(state, outcome) {
    if (state !== 'From Battle') return null;
    if (outcome % 64 === 0) return 'Win';
    if (outcome % 64 === 1) return 'Lose';
    if (outcome % 64 === 2) return 'Flee';
    return null;
}

function makeIvNumber(attack, defense, speed, special, bit) {
    return ((special >> bit) & 1) | (((speed >> bit) & 1) << 1) | (((defense >> bit) & 1) << 2) | (((attack >> bit) & 1) << 3);
}

function derivePokemonValues() {
    const paths = [];
    for (const pokemonPath of PARTY_PATHS) {
        paths.push(`${pokemonPath}.ivs.attack`);
        paths.push(`${pokemonPath}.ivs.defense`);
        paths.push(`${pokemonPath}.ivs.speed`);
        paths.push(`${pokemonPath}.ivs.special`);
    }
    const values = properties.getValues(paths);
    const updates = {};
    let valueIndex = 0;
    for (const pokemonPath of PARTY_PATHS) {
        const attack = values[valueIndex++];
        const defense = values[valueIndex++];
        const speed = values[valueIndex++];
        const special = values[valueIndex++];
        updates[`${pokemonPath}.ivs.hp`] = makeIvNumber(attack, defense, speed, special, 0);
        updates[`${pokemonPath}.shiny`] = defense === 10 && speed === 10 && special === 10 && (attack & 2) !== 0;
        updates[`${pokemonPath}.hidden_power.type`] = HIDDEN_POWER_TYPES[((attack & 3) << 2) | (defense & 3)];
        updates[`${pokemonPath}.hidden_power.power`] = ((5 * makeIvNumber(attack, defense, speed, special, 3) + (special & 3)) >> 1) + 31;
    }
    properties.setValues(updates);
}

function postprocessor() {
    const [timeOfDay, morning, day, night, water, movementState, outcome] = properties.getValues([
        'time.current.time_of_day', 'overworld.encounter_rates.morning', 'overworld.encounter_rates.day',
        'overworld.encounter_rates.night', 'overworld.encounter_rates.water', 'overworld.movement_state',
        'battle.other.outcome_flags',
    ]);
    const state = stateFromRam();
    previousState = state;
    properties.setValues({
        'meta.state': state,
        'overworld.encounter_rate': encounterRate(timeOfDay, morning, day, night, water, movementState),
        'battle.outcome': battleOutcome(state, outcome),
        'player.party_position': variables.active_party_slot,
    });
    derivePokemonValues();
}

export { preprocessor, postprocessor };
