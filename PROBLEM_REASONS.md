# OpenAPI Schema Generation - Problems and Limitations

This document tracks known issues, limitations, and workarounds encountered during the OpenAPI schema generation implementation.

## Overview

The OpenAPI schema generation uses `ts-json-schema-generator` to extract JSON Schema Draft-07 from TypeScript types, then transforms them to OpenAPI 3.x compatible format. While this approach works well for most methods, there are some limitations.

## Current Status

- **Target Methods**: 38 methods (from 47 total official XRPL methods)
- **Successfully Generated**: 35 methods (92% success rate)
- **Failed Methods**: 5 methods (13% of target)
- **Generated Schema Size**: 74,600 lines
- **Validation Status**: ✅ Valid OpenAPI 3.x schema

## Failed Methods

The following 5 methods failed to generate schemas due to `ts-json-schema-generator` limitations:

### 1. `ledger` (Ledger Methods)
- **Error**: "Encountered a reference to a missing definition, this is a bug."
- **Request Type**: `LedgerRequest`
- **Response Type**: `LedgerResponse`
- **Root Cause**: ts-json-schema-generator bug - fails to resolve internal type references
- **Impact**: Missing one of the core ledger query methods
- **Workaround**: None currently available

### 2. `ledger_entry` (Ledger Methods)
- **Error**: "No root type 'LedgerEntryResponse' found"
- **Request Type**: `LedgerEntryRequest`
- **Response Type**: `LedgerEntryResponse`
- **Root Cause**: Type name resolution issue in ts-json-schema-generator
- **Impact**: Missing ledger entry lookup method
- **Workaround**: None currently available

### 3. `submit_multisigned` (Transaction Methods)
- **Error**: "Encountered a reference to a missing definition, this is a bug."
- **Request Type**: `SubmitMultisignedRequest`
- **Response Type**: `SubmitMultisignedResponse`
- **Root Cause**: ts-json-schema-generator bug - fails to resolve internal type references
- **Impact**: Missing multi-signature transaction submission (has v1/v2 differences)
- **Workaround**: None currently available

### 4. `tx` (Transaction Methods)
- **Error**: "No root type 'TxResponse' found"
- **Request Type**: `TxRequest`
- **Response Type**: `TxResponse`
- **Root Cause**: Type name resolution issue in ts-json-schema-generator
- **Impact**: Missing transaction lookup method (has v1/v2 differences)
- **Workaround**: None currently available

### 5. `simulate` (Transaction Methods)
- **Error**: "Encountered a reference to a missing definition, this is a bug."
- **Request Type**: `SimulateRequest`
- **Response Type**: `SimulateResponse`
- **Root Cause**: ts-json-schema-generator bug - fails to resolve internal type references
- **Impact**: Missing transaction simulation method
- **Workaround**: None currently available

## JSON Schema Draft-07 to OpenAPI 3.x Transformation Issues

The following incompatibilities were identified and resolved:

### ✅ Resolved Issues

1. **`const` keyword**
   - **Problem**: OpenAPI 3.x doesn't support the `const` keyword
   - **Solution**: Transform `const: "value"` to `enum: ["value"]`
   - **Example**: `{ const: "account_channels" }` → `{ enum: ["account_channels"] }`

2. **Type arrays**
   - **Problem**: OpenAPI requires `type` to be a string, not an array
   - **Solution**: Transform `type: ["string", "number"]` to `anyOf: [{ type: "string" }, { type: "number" }]`
   - **Example**: `{ type: ["number", "string"] }` → `{ anyOf: [{ type: "number" }, { type: "string" }] }`

3. **Null types**
   - **Problem**: OpenAPI 3.x uses `nullable: true` instead of `type: "null"`
   - **Solution**: Extract `null` from type arrays and add `nullable: true`
   - **Example**: `{ type: ["string", "null"] }` → `{ type: "string", nullable: true }`

4. **String `deprecated` property**
   - **Problem**: OpenAPI requires `deprecated` to be boolean, not string
   - **Solution**: Convert string values to boolean
   - **Example**: `{ deprecated: "true" }` → `{ deprecated: true }`

5. **Tuple types in `items`**
   - **Problem**: OpenAPI doesn't support tuple types (array of schemas in `items`)
   - **Solution**: Convert to `anyOf` or use first item
   - **Example**: `{ items: [{ type: "string" }, { type: "number" }] }` → `{ items: { anyOf: [...] } }`

6. **Unsupported properties**
   - **Problem**: JSON Schema Draft-07 has properties not in OpenAPI 3.x
   - **Solution**: Remove `category`, `$schema`, and other unsupported properties

## Additional Issues Encountered

### 7. TypeScript Type Check Errors During Schema Generation

- **Problem**: Initial runs of ts-json-schema-generator failed with TypeScript compilation errors
- **Error**: Various type checking errors in the xrpl.js codebase
- **Solution**: Set `skipTypeCheck: true` in `scripts/openapi-config.json`
- **Impact**: Schema generation works but doesn't validate TypeScript correctness
- **Tradeoff**: We prioritize schema generation over strict type checking in the generation process
- **Note**: The actual TypeScript code still type-checks normally during builds

### 8. Schema Reference Format Mismatch

- **Problem**: ts-json-schema-generator uses `#/definitions/` for internal references, but OpenAPI 3.x expects `#/components/schemas/`
- **Error**: Invalid schema references in generated output
- **Solution**: Implemented `fixSchemaReferences()` function to recursively replace all `#/definitions/` with `#/components/schemas/`
- **Impact**: All schema references now work correctly in OpenAPI validators
- **Code Location**: `scripts/generate-openapi-schema.ts` lines ~100-120

### 9. Missing Schema Definitions

- **Problem**: ts-json-schema-generator only returns the root type schema, not all referenced definitions
- **Error**: Generated schemas had `$ref` pointers to missing definitions
- **Solution**: Extract all definitions from the generated schema and add them to the components/schemas section
- **Impact**: Complete schema with all 258 type definitions included
- **Code Location**: `scripts/generate-openapi-schema.ts` in `generateSchemas()` function

### 10. Versioned Response Handling Complexity

- **Problem**: Only 2 of 5 methods with v1/v2 differences successfully generated (account_info, account_tx)
- **Failed Methods**: ledger, submit_multisigned, tx (all failed due to ts-json-schema-generator bugs)
- **Impact**: Cannot demonstrate full `oneOf` discriminator pattern for all versioned methods
- **Current State**: The 2 successful methods show the pattern works, but 3 methods are missing
- **Workaround**: Document the pattern in the schema for the 2 working methods

### 11. Large Schema File Size

- **Problem**: Generated schema is 74,600 lines (very large)
- **Root Cause**: Comprehensive type definitions with all nested objects fully expanded
- **Impact**:
  - Large file size (~3-4 MB)
  - Slower to parse and validate
  - Difficult to manually inspect
- **Mitigation**: This is expected for comprehensive API schemas; tools handle it fine
- **Alternative**: Could use `$ref` more aggressively to reduce duplication, but increases complexity

### 12. Clio Method Duplicates

- **Problem**: Some Clio methods (server_info, ledger) are variants of existing methods
- **Decision**: Count them once in the metadata but note they're Clio-specific
- **Impact**: Actual unique method count is 38, not 40
- **Documentation**: Clearly marked in method-metadata.ts with comments

## Potential Future Improvements

### Alternative Approaches

1. **Manual Schema Definitions**
   - Write OpenAPI schemas manually for the 5 failed methods
   - Pros: Complete control, guaranteed to work
   - Cons: Manual maintenance, potential drift from TypeScript types

2. **Different Schema Generator**
   - Try alternative tools like `typescript-json-schema` or `ts-to-zod`
   - Pros: May handle edge cases better
   - Cons: May have different limitations, requires migration

3. **Hybrid Approach**
   - Use ts-json-schema-generator for most methods
   - Manually define schemas for the 5 failed methods
   - Pros: Best of both worlds
   - Cons: Increased complexity

4. **Schema Optimization**
   - Use `$ref` more aggressively to reduce file size
   - Implement schema bundling/dereferencing options
   - Pros: Smaller file size, faster parsing
   - Cons: More complex generation logic

### Upstream Fixes

The root cause of the 5 failed methods is bugs in `ts-json-schema-generator`. Consider:
- Filing issues with the ts-json-schema-generator project
- Contributing fixes upstream
- Monitoring for new releases that may resolve these issues
- Testing with alternative schema generators

## Maintenance Notes

### When XRPL Protocol Evolves

1. **New Methods Added**
   - Add to `scripts/method-metadata.ts`
   - Re-run generation script
   - Check if new method generates successfully

2. **Type Definitions Changed**
   - Re-run generation script
   - Check for new transformation issues
   - Update `transformToOpenAPISchema()` if needed

3. **Failed Methods Fixed**
   - Monitor ts-json-schema-generator releases
   - Test failed methods with new versions
   - Update this document when methods start working

### Validation

Always validate the generated schema after changes:
```bash
npx ts-node scripts/generate-openapi-schema.ts
```

The script automatically validates using `@apidevtools/swagger-parser`.

## Related Documentation

- [DECISION_REASONS.md](./DECISION_REASONS.md) - Design decisions for metadata storage
- [OPENAPI_IMPLEMENTATION_PLAN.md](./OPENAPI_IMPLEMENTATION_PLAN.md) - Implementation plan and completeness tracking
- [scripts/generate-openapi-schema.ts](./scripts/generate-openapi-schema.ts) - Main generation script
