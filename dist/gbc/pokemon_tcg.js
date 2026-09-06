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

function getGameState() {
    const music_track = getValue(`audio.current_song`)
    switch (music_track) {
        case "MUSIC_MATCH_START_1": return "To Battle";
        case "MUSIC_MATCH_START_2": return "To Battle";
        case "MUSIC_MATCH_START_3": return "To Battle";
        case "MUSIC_DUEL_THEME_1" : {
            if (getValue(`player.NumberOfCardsNotInDeck`) >= 7) { return "Battle"; }
            else { return "To Battle"; }
        }
        case "MUSIC_DUEL_THEME_2" : {
            if (getValue(`player.NumberOfCardsNotInDeck`) >= 7) { return "Battle"; }
            else { return "To Battle"; }
        }
        case "MUSIC_DUEL_THEME_3" : {
            if (getValue(`player.NumberOfCardsNotInDeck`) >= 7) { return "Battle"; }
            else { return "To Battle"; }
        }
        case "MUSIC_MATCH_VICTORY": return "From Battle";
        case "MUSIC_MATCH_LOSS"   : return "From Battle";
        case "MUSIC_MATCH_DRAW"   : return "From Battle";
        default:
            return "Overworld";
    }
}
function getHand(cards_in_hand, raw_hand, hand_path, deck_path) {
    // Get the number of cards in the player's hand.
    const numCards = getValue(cards_in_hand);
    
    // Collect the card values from player.hand.0 to player.hand.(numCards - 1)
    const handCards = [];
    for (let i = 0; i < numCards; i++) {
        handCards.push(getValue(`${raw_hand}.${i}`));
    }

    // Reverse the order of the cards.
    const reversedHandCards = handCards.reverse();

    // Store the reversed array in the destination path.
    for (let i = 0; i < numCards; i++) {
        setValue(`${hand_path}.${i}`, getValue(`${deck_path}.${reversedHandCards[i]}`));
    }
}
function setIndirectReference(set_location, indirect_reference_path, value_path, break_value = 255) {
    if (getValue(indirect_reference_path) >= break_value) { setValue(set_location, null); return; }
    setValue(set_location, getValue(`${value_path}.${getValue(indirect_reference_path)}`));
}

// Post Processor
function postprocessor() {
    // Set both Arena Pokemon
    if (getValue(`player.wPlayerArenaCard`) != 255)     { setIndirectReference(`player.arena_pokemon`, `player.wPlayerArenaCard`, `player.deck`); }         else { setValue(`player.arena_pokemon`, null);}
    if (getValue(`opponent.wOpponentArenaCard`) != 255) { setIndirectReference(`opponent.arena_pokemon`, `opponent.wOpponentArenaCard`, `opponent.deck`); } else { setValue(`opponent.arena_pokemon`, null);}
    
    // Populate hands with the correct values
    getHand("player.wPlayerNumberOfCardsInHand", "player.hand_raw", "player.hand", "player.deck")
    getHand("opponent.wOpponentNumberOfCardsInHand", "opponent.hand_raw", "opponent.hand", "opponent.deck")

    // Set player bench Pokemon
    if (getValue(`player.bench_raw.0`) != 255) { setIndirectReference(`player.bench.0`, `player.bench_raw.0`, `player.deck`, 60); } else { setValue(`player.bench.0`, null);}
    if (getValue(`player.bench_raw.1`) != 255) { setIndirectReference(`player.bench.1`, `player.bench_raw.1`, `player.deck`, 60); } else { setValue(`player.bench.1`, null);}
    if (getValue(`player.bench_raw.2`) != 255) { setIndirectReference(`player.bench.2`, `player.bench_raw.2`, `player.deck`, 60); } else { setValue(`player.bench.2`, null);}
    if (getValue(`player.bench_raw.3`) != 255) { setIndirectReference(`player.bench.3`, `player.bench_raw.3`, `player.deck`, 60); } else { setValue(`player.bench.3`, null);}
    if (getValue(`player.bench_raw.4`) != 255) { setIndirectReference(`player.bench.4`, `player.bench_raw.4`, `player.deck`, 60); } else { setValue(`player.bench.4`, null);}
    if (getValue(`player.bench_raw.5`) != 255) { setIndirectReference(`player.bench.5`, `player.bench_raw.5`, `player.deck`, 60); } else { setValue(`player.bench.5`, null);}

    // Set opponent bench Pokemon
    if (getValue(`opponent.bench_raw.0`) != 255) { setIndirectReference(`opponent.bench.0`, `opponent.bench_raw.0`, `opponent.deck`, 60); } else { setValue(`opponent.bench.0`, null);}
    if (getValue(`opponent.bench_raw.1`) != 255) { setIndirectReference(`opponent.bench.1`, `opponent.bench_raw.1`, `opponent.deck`, 60); } else { setValue(`opponent.bench.1`, null);}
    if (getValue(`opponent.bench_raw.2`) != 255) { setIndirectReference(`opponent.bench.2`, `opponent.bench_raw.2`, `opponent.deck`, 60); } else { setValue(`opponent.bench.2`, null);}
    if (getValue(`opponent.bench_raw.3`) != 255) { setIndirectReference(`opponent.bench.3`, `opponent.bench_raw.3`, `opponent.deck`, 60); } else { setValue(`opponent.bench.3`, null);}
    if (getValue(`opponent.bench_raw.4`) != 255) { setIndirectReference(`opponent.bench.4`, `opponent.bench_raw.4`, `opponent.deck`, 60); } else { setValue(`opponent.bench.4`, null);}
    if (getValue(`opponent.bench_raw.5`) != 255) { setIndirectReference(`opponent.bench.5`, `opponent.bench_raw.5`, `opponent.deck`, 60); } else { setValue(`opponent.bench.5`, null);}

    // Update the game state
    setValue(`meta.state`, getGameState());
}

export { postprocessor };
