// @ts-check
/// <reference path="../../gamehook.d.ts" />

// Per-Pokemon battle data is allocated back to back: the player's party, then the opponent's, then
// any ally and second opponent. Where each block starts depends on the party sizes before it.
const BATTLE_RAM_START = 0x0225B1B0;
// Slots past a party's size point here, a block the game leaves blank.
const NULL_BATTLE_DATA = 0x0225ADD0;
const BATTLE_POKEMON_SIZE = 0x224;
const DOUBLE_TRAINER_OFFSET = 0x158;
const OPPONENT_INDIRECT_OFFSET = 0x34;
const IN_BATTLE = 21828;
const PARTY_SIZE = 6;
const HIDDEN_POWER_TYPES = ['Fighting', 'Flying', 'Poison', 'Ground', 'Rock', 'Bug', 'Ghost', 'Steel', 'Fire', 'Water', 'Grass', 'Electric', 'Psychic', 'Ice', 'Dragon', 'Dark'];
const IV_STATS = ['hp', 'attack', 'defense', 'speed', 'special_attack', 'special_defense'];
const HIDDEN_POWER_POKEMON = [
    'player.team', 'battle.player.team', 'battle.ally.team', 'battle.opponent.team', 'battle.opponent_2.team',
].flatMap(team => [0, 1, 2, 3, 4, 5].map(slot => `${team}.${slot}`));

function teamSize(count) {
    return count > PARTY_SIZE ? 0 : count ?? 0;
}

// Team sizes come from the previous read: battle addresses must be chosen before this read decodes.
function selectBattleAddresses() {
    const [playerCount, opponentCount, allyCount, opponent2Count] = properties.getValues([
        'player.team_count', 'battle.opponent.team_count', 'battle.ally.team_count', 'battle.opponent_2.team_count',
    ]).map(teamSize);
    const opponentStart = BATTLE_RAM_START + playerCount * BATTLE_POKEMON_SIZE;
    const doubleTrainerOffset = allyCount && opponent2Count ? DOUBLE_TRAINER_OFFSET : 0;

    variables.battle_ram_player_0 = BATTLE_RAM_START;
    variables.battle_ram_opponent_0 = opponentStart;
    variables.outcome_flags_offset = BATTLE_RAM_START
        + (playerCount + opponentCount + allyCount + opponent2Count) * 2 * BATTLE_POKEMON_SIZE
        + doubleTrainerOffset;
    for (let slot = 1; slot < PARTY_SIZE; slot++) {
        variables[`battle_ram_player_${slot}`] = playerCount > slot ? BATTLE_RAM_START + BATTLE_POKEMON_SIZE * slot : NULL_BATTLE_DATA;
        variables[`battle_ram_opponent_${slot}`] = opponentCount > slot ? opponentStart + BATTLE_POKEMON_SIZE * slot : NULL_BATTLE_DATA;
    }
}

function getGameState(previousState, values) {
    if (values.teamCount === 0) return 'No Pokemon';
    if (values.battle !== IN_BATTLE) return 'Overworld';
    if (previousState === 'To Battle' && values.battleStateReady === 3) return 'Battle';
    if (previousState !== 'Battle' && previousState !== 'From Battle' && values.toBattlePointer === 0 && values.playerLock === 1) return 'To Battle';
    if (values.trainer === '--' && values.battleEnd === 1) return 'From Battle';
    if (values.outcomeFlags === 1) return 'From Battle';
    const headerActive = values.generics.some(generic => generic > 0);
    if (previousState !== 'To Battle' && values.header === 87 && values.activeSpecies != null && headerActive) return 'Battle';
    return '';
}

function readGameState() {
    const [
        previousState, teamCount, header, generic1, generic2, generic3, generic4, activeSpecies,
        outcomeFlags, battleEnd, toBattlePointer, battleStateReady, battle, playerLock, trainer,
    ] = properties.getValues([
        'meta.state', 'player.team_count', 'battle.other.battle_header',
        'battle.other.battle_header_generic_1', 'battle.other.battle_header_generic_2',
        'battle.other.battle_header_generic_3', 'battle.other.battle_header_generic_4',
        'battle.player.active_pokemon.species', 'battle.other.outcome_flags', 'battle.other.battle_end',
        'battle.other.to_battle_pointer_1', 'battle.other.battle_state_ready', 'battle.other.battle',
        'battle.other.player_lock', 'battle.opponent.trainer',
    ]);
    return getGameState(previousState, {
        teamCount, header, generics: [generic1, generic2, generic3, generic4], activeSpecies,
        outcomeFlags, battleEnd, toBattlePointer, battleStateReady, battle, playerLock, trainer,
    });
}

function hiddenPowerBits(ivs, bit) {
    return ivs.reduce((sum, iv, index) => sum | (((iv >> bit) & 1) << index), 0);
}

function deriveHiddenPower() {
    const paths = HIDDEN_POWER_POKEMON.flatMap(pokemon => IV_STATS.map(stat => `${pokemon}.ivs.${stat}`));
    const values = properties.getValues(paths);
    const updates = {};
    HIDDEN_POWER_POKEMON.forEach((pokemon, index) => {
        const ivs = values.slice(index * IV_STATS.length, (index + 1) * IV_STATS.length);
        const known = ivs.every(iv => iv != null);
        updates[`${pokemon}.hidden_power.type`] = known ? HIDDEN_POWER_TYPES[Math.floor(hiddenPowerBits(ivs, 0) * 15 / 63)] : null;
        updates[`${pokemon}.hidden_power.power`] = known ? Math.floor(hiddenPowerBits(ivs, 1) * 40 / 63) + 30 : null;
    });
    properties.setValues(updates);
}

function preprocessor() {
    selectBattleAddresses();
}

function postprocessor() {
    const opponentIndirect = properties.getValue('battle.TESTING.opponent_indirect_1');
    properties.setValues({
        'meta.state': readGameState(),
        'battle.opponent.party_position': opponentIndirect == null ? null
            : (opponentIndirect - (variables.battle_ram_opponent_0 + OPPONENT_INDIRECT_OFFSET)) / BATTLE_POKEMON_SIZE,
    });
    deriveHiddenPower();
}

export { preprocessor, postprocessor };
