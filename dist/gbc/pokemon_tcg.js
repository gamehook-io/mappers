// @ts-check
/// <reference path="../../gamehook.d.ts" />

const DECK_SIZE = 60;
const BENCH_SIZE = 6;

function gameState(song, cardsNotInDeck) {
    if (song === 'MUSIC_MATCH_START_1' || song === 'MUSIC_MATCH_START_2' || song === 'MUSIC_MATCH_START_3') return 'To Battle';
    if (song === 'MUSIC_DUEL_THEME_1' || song === 'MUSIC_DUEL_THEME_2' || song === 'MUSIC_DUEL_THEME_3') return cardsNotInDeck >= 7 ? 'Battle' : 'To Battle';
    if (song === 'MUSIC_MATCH_VICTORY' || song === 'MUSIC_MATCH_LOSS' || song === 'MUSIC_MATCH_DRAW') return 'From Battle';

    return 'Overworld';
}

function range(prefix, length) {
    return Array.from({ length }, (_, index) => `${prefix}.${index}`);
}

const playerDeckPaths = range('player.deck', DECK_SIZE);
const opponentDeckPaths = range('opponent.deck', DECK_SIZE);
const playerHandPaths = range('player.hand_raw', DECK_SIZE);
const opponentHandPaths = range('opponent.hand_raw', DECK_SIZE);
const playerBenchPaths = range('player.bench_raw', BENCH_SIZE);
const opponentBenchPaths = range('opponent.bench_raw', BENCH_SIZE);

function copyHand(updates, count, handCards, deck, handPath) {
    const visibleCards = Math.max(0, Math.min(DECK_SIZE, count ?? 0));
    for (let slot = 0; slot < DECK_SIZE; slot++) {
        const card = handCards[visibleCards - 1 - slot];
        updates[`${handPath}.${slot}`] = slot < visibleCards ? deck[card] ?? null : null;
    }
}

function copyBench(updates, benchCards, deck, benchPath) {
    for (let slot = 0; slot < BENCH_SIZE; slot++) {
        const card = benchCards[slot];
        updates[`${benchPath}.${slot}`] = card >= DECK_SIZE ? null : deck[card] ?? null;
    }
}

function postprocessor() {
    const values = properties.getValues([
        'audio.current_song', 'player.NumberOfCardsNotInDeck',
        'player.wPlayerArenaCard', 'opponent.wOpponentArenaCard',
        'player.wPlayerNumberOfCardsInHand', 'opponent.wOpponentNumberOfCardsInHand',
        ...playerDeckPaths, ...opponentDeckPaths, ...playerHandPaths, ...opponentHandPaths, ...playerBenchPaths, ...opponentBenchPaths,
    ]);

    let offset = 0;
    const song = values[offset++];
    const cardsNotInDeck = values[offset++];
    const playerArena = values[offset++];
    const opponentArena = values[offset++];
    const playerHandCount = values[offset++];
    const opponentHandCount = values[offset++];
    const playerDeckValues = values.slice(offset, offset += DECK_SIZE);
    const opponentDeckValues = values.slice(offset, offset += DECK_SIZE);
    const playerHandRaw = values.slice(offset, offset += DECK_SIZE);
    const opponentHandRaw = values.slice(offset, offset += DECK_SIZE);
    const playerBenchRaw = values.slice(offset, offset += BENCH_SIZE);
    const opponentBenchRaw = values.slice(offset, offset += BENCH_SIZE);
    const updates = { 'meta.state': gameState(song, cardsNotInDeck) };

    updates['player.arena_pokemon'] = playerArena === 255 ? null : playerDeckValues[playerArena] ?? null;
    updates['opponent.arena_pokemon'] = opponentArena === 255 ? null : opponentDeckValues[opponentArena] ?? null;

    copyHand(updates, playerHandCount, playerHandRaw, playerDeckValues, 'player.hand');
    copyHand(updates, opponentHandCount, opponentHandRaw, opponentDeckValues, 'opponent.hand');
    copyBench(updates, playerBenchRaw, playerDeckValues, 'player.bench');
    copyBench(updates, opponentBenchRaw, opponentDeckValues, 'opponent.bench');
    
    properties.setValues(updates);
}

export { postprocessor };
