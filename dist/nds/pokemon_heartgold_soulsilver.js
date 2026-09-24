// @ts-check
/// <reference path="../../gamehook.d.ts" />

// Most game data hangs off this pointer. The native processor skips frames where it is invalid.
const BASE_POINTER = 0x0211186C;
const PARTY_SIZE = 6;
const HIDDEN_POWER_TYPES = ['Fighting', 'Flying', 'Poison', 'Ground', 'Rock', 'Bug', 'Ghost', 'Steel', 'Fire', 'Water', 'Grass', 'Electric', 'Psychic', 'Ice', 'Dragon', 'Dark'];
const IV_STATS = ['hp', 'attack', 'defense', 'speed', 'special_attack', 'special_defense'];
const HIDDEN_POWER_POKEMON = [
    'player.team', 'battle.player.team', 'battle.ally.team', 'battle.opponent.team', 'battle.opponent_2.team',
].flatMap(team => [0, 1, 2, 3, 4, 5].map(slot => `${team}.${slot}`));

// 0xE51C1008 read as a signed int; the legacy mapper treated it as "no game loaded".
const NO_GAME_POINTER = -451145720;

function getGameState(teamCount, globalPointer, activePokemonPv, teamPokemonPv, outcomeFlags, teamNickname, battleNickname) {
    if (teamCount === 0 || globalPointer === 0 || globalPointer === NO_GAME_POINTER) return 'No Pokemon';
    if (activePokemonPv === teamPokemonPv) return outcomeFlags === 1 ? 'From Battle' : 'Battle';
    return teamNickname !== battleNickname ? 'Overworld' : 'No Pokemon';
}

// Enemy mid-battle state, for precise timing during battles.
function getEnemyState(state, outcomeFlags, enemyBarSyncedHp) {
    if (state === 'No Pokemon' || state === 'Overworld') return 'N/A';
    if (state !== 'Battle') return null;
    if (outcomeFlags === 1) return 'Battle Finished';
    if (enemyBarSyncedHp > 0) return 'Pokemon In Battle';
    if (enemyBarSyncedHp === 0) return 'Pokemon Fainted';
    return null;
}

function getBattleMode(state, opponentTrainer) {
    if (state !== 'Battle') return null;
    return opponentTrainer === null ? 'Wild' : 'Trainer';
}

function getBattleOutcome(state, outcomeFlags) {
    return state === 'From Battle' && outcomeFlags === 1 ? 'Win' : null;
}

function getOverworldPartyPosition() {
    for (let slot = 0; slot < PARTY_SIZE; slot++) {
        if (properties.getValue(`player.team.${slot}.stats.hp`) > 0) return slot;
    }
    return 0;
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
    const base = memory.wram.get_uint32_le(BASE_POINTER);
    variables.global_pointer = base;
    variables.dynamic_player = base + 0x5BA78;
    variables.dynamic_opponent = base + 0x5C048;
    variables.dynamic_ally = base + 0x5BA78 + 0x5D0 * 2;
    variables.dynamic_opponent_2 = base + 0x5BA78 + 0x5D0 * 3;
    variables.current_party_indexes = base + 0x571E0;
}

function postprocessor() {
    const [teamCount, globalPointer, teamNickname, battleNickname, activePokemonPv, teamPokemonPv, outcomeFlags, enemyBarSyncedHp, opponentTrainer, walkingRate, battlePartyPosition] = properties.getValues([
        'player.team_count', 'meta.global_pointer', 'player.team.0.nickname', 'battle.player.active_pokemon.nickname',
        'battle.player.active_pokemon.internals.personality_value', 'player.team.0.internals.personality_value',
        'battle.other.outcome_flags', 'battle.opponent.enemy_bar_synced_hp', 'battle.opponent.trainer',
        'overworld.encounter_rates.walking', 'battle.player.party_position',
    ]);
    const state = getGameState(teamCount, globalPointer, activePokemonPv, teamPokemonPv, outcomeFlags, teamNickname, battleNickname);
    const inBattle = state === 'Battle' || state === 'From Battle';
    properties.setValues({
        'meta.state': state,
        'meta.state_enemy': getEnemyState(state, outcomeFlags, enemyBarSyncedHp),
        'battle.mode': getBattleMode(state, opponentTrainer),
        'battle.outcome': getBattleOutcome(state, outcomeFlags),
        // Surfing and fishing rates are mapped, but nothing yet says which one applies.
        'overworld.encounter_rate': walkingRate,
        'player.party_position': inBattle ? battlePartyPosition : getOverworldPartyPosition(),
    });
    deriveHiddenPower();
}

export { preprocessor, postprocessor };
