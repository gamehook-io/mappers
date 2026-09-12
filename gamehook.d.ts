/**
 * Gamehook mapper-script bridge.
 *
 * Scripts run once per mapper read. Define `preprocessor()` to run before properties decode;
 * return `false` to skip that frame. Define `postprocessor()` for work after decode. Use native
 * processors for decryption, virtual-region creation, and other expensive work.
 */

interface GamehookMemoryNamespace {
    /** Read one byte from this poll's RAM snapshot. */
    get_byte(address: number): number;
    /** Read an unsigned little-endian 16-bit value from this poll's RAM snapshot. */
    get_uint16_le(address: number): number;
    /** Read an unsigned little-endian 32-bit value from this poll's RAM snapshot. */
    get_uint32_le(address: number): number;
}

interface GamehookProperties {
    /** Read current decoded value for a dot-separated mapper property path. */
    getValue(path: string): any;
    /** Override one property's displayed value for this read. */
    setValue(path: string, value: unknown): void;
    /** Read several property values in supplied path order. */
    getValues(paths: string[]): any[];
    /** Override several property values. Object keys are dot-separated property paths. */
    setValues(values: object): void;
    /** Change one property's address, metadata, or displayed value. */
    set(path: string, values: GamehookPropertyChanges): void;
    /** Copy matching property values and metadata between two mapper subtrees. */
    copy(sourcePath: string, destinationPath: string): void;
}

interface GamehookPropertyChanges {
    address?: number | null;
    memoryContainer?: string | null;
    length?: number;
    bits?: string | null;
    reference?: string | null;
    value?: unknown;
}

/** Persistent numeric/address values used by deferred XML addresses. */
declare const variables: Record<string, any>;
/** Persistent mapper-local state. Keep small; use native processor state for heavy work. */
declare const state: Record<string, any>;
/** Read-only RAM snapshot. No device reads occur here. */
declare const memory: { wram: GamehookMemoryNamespace };
/** Mapper property read/write bridge. */
declare const properties: GamehookProperties;
