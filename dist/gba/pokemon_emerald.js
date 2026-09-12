// @ts-check
/// <reference path="../../gamehook.d.ts" />

const PARTY_SIZE = 6;
const ACTIVE_POKEMON_MODIFIERS = [
    'attack', 'defense', 'speed', 'special_attack',
    'special_defense', 'accuracy', 'evasion',
];
const FLEE_OUTCOMES = [
    'LOST', 'DRAW', 'RAN', 'PLAYER_TELEPORTED', 'POKEMON_FLED',
    'NO_SAFARI_BALLS', 'FORFEITED', 'POKEMON_TELEPORTED',
];

function getGameState(teamLevel, callback1, callback2, battleOutcomes) {
    if (teamLevel === 0 || callback1 == null) return 'No Pokemon';
    if (callback2 === 'Battle Animation') return 'To Battle';
    if (callback1 === 'Overworld') return 'Overworld';
    if (callback1 === 'Battle') return battleOutcomes != null ? 'From Battle' : 'Battle';
    return 'Error';
}

function getBattleOutcome(gameState, outcome) {
    if (gameState !== 'From Battle') return null;
    if (outcome === 'WON') return 'Win';
    if (outcome === 'CAUGHT') return 'Caught';
    return FLEE_OUTCOMES.includes(outcome) ? 'Flee' : null;
}

function getOverworldPartyPosition() {
    for (let slot = 0; slot < PARTY_SIZE; slot++) {
        if (properties.getValue(`player.team.${slot}.stats.hp`) > 0) return slot;
    }
    return 0;
}

function clearActivePokemonModifiers() {
    for (const modifier of ACTIVE_POKEMON_MODIFIERS) {
        properties.set(`player.active_pokemon.modifiers.${modifier}`, { address: null, value: 0 });
    }
}

function updateActivePokemon(gameState) {
    const inBattle = gameState === 'Battle' || gameState === 'From Battle';
    const partyPosition = inBattle
        ? properties.getValue('battle.player.party_position')
        : getOverworldPartyPosition();

    properties.setValue('player.party_position', partyPosition);
    properties.copy(`player.team.${partyPosition}`, 'player.active_pokemon');
    if (gameState === 'Battle') {
        properties.copy('battle.player.active_pokemon', 'player.active_pokemon');
    }
    else {
        clearActivePokemonModifiers();
    }
}

function preprocessor() {
    const battleOutcomes = properties.getValue('battle.other.battle_outcomes');
    const gameState = getGameState(
        properties.getValue('player.team.0.level'),
        properties.getValue('pointers.callback_1'),
        properties.getValue('pointers.callback_2'),
        battleOutcomes);

    properties.setValue('meta.state', gameState);
    properties.setValue('battle.outcome', getBattleOutcome(gameState, battleOutcomes));
    updateActivePokemon(gameState);
}

export { preprocessor };
