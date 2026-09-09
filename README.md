# Mappers

A mapper describes game memory in XML. Add a same-named JavaScript file only when values need
derived calculations or an address must be selected at runtime.

```
my_game.xml
my_game.js
```

XML is static layout. Put conditional logic, game state, and derived values in JavaScript. Mapper
XML does not support `<if>`, `<elif>`, or `<else>`.

## XML reference

| Element | Purpose | Key attributes |
| --- | --- | --- |
| `<mapper>` | Mapper root. | `id`, `name`, `platform`, `version` |
| `<macros>` | Holds reusable property layouts. | — |
| `<macro>` | Uses a layout declared in `<macros>`. | `name`, `type`, `var:*` |
| `<properties>` | Holds the public property tree. | — |
| Any nested element | Creates a property path segment. | Element name becomes part of the path. |
| `<property>` | Declares one decoded value. | See property attributes below. |
| `<memory>` / `<read>` | Requests raw RAM for a preprocessor. | `start`, `end` |
| `<references>` / `<entry>` | Maps numeric values to display text. | `key`, `value` |

### Required namespace declaration

| Attribute | Value | Why |
| --- | --- | --- |
| `xmlns:xsi` | `http://www.w3.org/2001/XMLSchema-instance` | Enables `xsi:schemaLocation`. |
| `xsi:schemaLocation` | `https://schema.gamehook.io/mapper https://schema.gamehook.io/mapper.xsd` | Lets XML editors find the mapper schema. |
| `xmlns:var` | `https://schema.gamehook.io/attributes/var` | Enables `var:*` macro inputs. |

```xml
<mapper platform="GB"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="https://schema.gamehook.io/mapper https://schema.gamehook.io/mapper.xsd"
    xmlns:var="https://schema.gamehook.io/attributes/var">
    <macros />
    <properties />
</mapper>
```

### Property attributes

| Attribute | Description |
| --- | --- |
| `name` | Last segment of the property path. Required. |
| `type` | Decoder type, such as `int`, `bool`, or `string`. |
| `address` | RAM address or address expression. |
| `length` | Byte count for multi-byte numbers and strings. |
| `bits` | A bit number or range, such as `3` or `0-3`. Always use plural `bits`. |
| `reference` | Name of a table in `<references>`. |
| `value` | Static value; no RAM read occurs. |
| `characterMap` | Character map for a string. |
| `description` | User-facing explanation. |

| Address syntax | Meaning |
| --- | --- |
| `{name}` | Compile-time macro variable. |
| `{{name}}` | Runtime variable set by `preprocessor`. |

## Script reference

Scripts run in Jint. Keep them small: select an address, read decoded values, calculate, and write
results. Native C# performs mapper reads, property writes, and editing.

| Export | Runs | Use it for |
| --- | --- | --- |
| `preprocessor` | Before XML properties decode. | Read a small raw-RAM value and set `__variables` used by `{{name}}` addresses. |
| `postprocessor` | After XML properties decode. | Calculate and set derived values. |

| Global | Purpose |
| --- | --- |
| `__variables` | Runtime address inputs for XML. |
| `__memory.defaultNamespace` | Raw RAM requested by `<memory>`. |
| `__mapper` | Decoded property API. Assign it once: `const mapper = __mapper`. |

```js
const variables = __variables;
const memory = __memory.defaultNamespace;
const mapper = __mapper;

function preprocessor() {
  const slot = memory.get_byte(0xCC2F);
  variables.active_party_address = 0xD16B + slot * 44;
}

function postprocessor() {
  const [hp, maxHp] = mapper.get_values(['player.hp', 'player.max_hp']);
  mapper.set_values({ 'player.hp_percent': Math.floor(hp * 100 / maxHp) });
}

export { preprocessor, postprocessor };
```

### Mapper API

| Method | Use |
| --- | --- |
| `get_property_value(path)` | Read one decoded property. |
| `set_property_value(path, value)` | Set one derived property. |
| `get_values(paths)` | Read many decoded properties in one native call. Returns values in path order. |
| `set_values(values)` | Set many properties in one native call. Object keys are property paths. |
| `clear_values(paths)` | Set listed properties to `null`. |
| `copy_properties(sourcePath, destinationPath)` | Copy matching properties, values, addresses, and metadata between trees. |
| `copy_indexed(sourcePrefix, destinationPrefix, indexes)` | Copy values from indexed source paths into sequential destination paths. |

All paths must exist. Batch methods do not create properties or read emulator memory directly.

## Dynamic native views

When an object can occupy several RAM slots, use `preprocessor` to select its address and let XML
decode the selected slot. The property remains native and writable; JavaScript does not copy a
second object tree.

```xml
<macro name="active_pokemon" type="party_pokemon"
       var:address="{{active_party_address}}"
       var:nicknameAddress="{{active_party_nickname_address}}" />
```

Use a persistent party view for identity and normal stats. Put only live battle stats, stages,
effects, and turn state under `battle`.
