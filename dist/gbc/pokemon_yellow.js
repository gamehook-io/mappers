const variables = __variables;
const memory = __memory.defaultNamespace;
const mapper = __mapper;

const PARTY_BASE = 0xD16A;
const NICKNAME_BASE = 0xD2B4;
const PARTY_SLOT_SIZE = 44;
const NICKNAME_SIZE = 11;
const PARTY_COUNT = 6;

function firstLivingPartySlot() {
    for (let slot = 0; slot < PARTY_COUNT; slot++) {
        const hpAddress = PARTY_BASE + slot * PARTY_SLOT_SIZE + 1;
        if (memory.get_byte(hpAddress) !== 0 || memory.get_byte(hpAddress + 1) !== 0) return slot;
    }
    return 0;
}

function preprocessor() {
    const battleHasStarted = memory.get_byte(0xD056) !== 0 && memory.get_byte(0xCCF5) !== 0;
    const battleIsEnding = memory.get_byte(0xCCF6) === 1 || memory.get_byte(0xCF0B) > 0;
    const battleSlot = memory.get_byte(0xCC2F);
    const slot = battleHasStarted && !battleIsEnding && battleSlot < PARTY_COUNT
        ? battleSlot : firstLivingPartySlot();

    variables.active_party_slot = slot;
    variables.active_party_address = PARTY_BASE + slot * PARTY_SLOT_SIZE;
    variables.active_party_nickname_address = NICKNAME_BASE + slot * NICKNAME_SIZE;
}

function stateFromValues(teamLevel, battleMode, battleStart, lowHealthAlarm, outcomeFlags) {
    if (teamLevel === 0) return 'No Pokemon';
    if (battleMode == null) return 'Overworld';
    if (battleStart === 0) return 'To Battle';
    if (lowHealthAlarm === 'Disabled' || outcomeFlags > 0) return 'From Battle';
    return 'Battle';
}

function battleOutcome(state, outcomeFlags) {
    if (state !== 'From Battle') return null;
    if (outcomeFlags === 0) return 'Win';
    if (outcomeFlags === 1) return 'Lose';
    if (outcomeFlags === 2) return 'Flee';
    return null;
}

function postprocessor() {
    const [teamLevel, battleMode, battleStart, lowHealthAlarm, outcomeFlags] = mapper.get_values([
        'player.team.0.level', 'battle.mode', 'battle.other.battle_start',
        'battle.other.low_health_alarm', 'battle.other.outcome_flags',
    ]);
    const state = stateFromValues(teamLevel, battleMode, battleStart, lowHealthAlarm, outcomeFlags);
    mapper.set_values({
        'meta.state': state,
        'battle.outcome': battleOutcome(state, outcomeFlags),
        'player.party_position': variables.active_party_slot,
    });
}

export { preprocessor, postprocessor };
