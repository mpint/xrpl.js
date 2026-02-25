# Why the Types Refactor Was Necessary for OpenAPI Schema Generation

This document explains why refactoring certain TypeScript types was a necessary prerequisite for generating a complete OpenAPI schema for xrpl.js.

## Background

The goal was to generate OpenAPI schemas for all 40 HTTP-compatible XRPL JSON-RPC methods using `ts-json-schema-generator`. Before the refactoring, only 35 of 40 methods succeeded. Five methods failed:

- `ledger`
- `ledger_entry`
- `submit_multisigned`
- `tx`
- `simulate`

## Root Causes Identified

Two distinct issues were discovered:

### 1. Generic Types Are Not Discoverable

**ts-json-schema-generator cannot find or generate schemas for generic interfaces.**

When an interface has a type parameter (even with a default), the generator cannot locate it as a "root type":

```typescript
// ❌ FAILS: "No root type 'LedgerEntryResponse' found"
export interface LedgerEntryResponse<T = LedgerEntry> extends BaseResponse {
  result: {
    node?: T
    // ...
  }
}

// ✅ WORKS: Generates schema with 46 definitions
export interface LedgerEntryResponse extends BaseResponse {
  result: {
    node?: LedgerEntry
    // ...
  }
}
```

This is a fundamental limitation of ts-json-schema-generator. JSON Schema has no concept of generics—it deals with concrete types only. The generator cannot produce a schema for a type that requires a type parameter at instantiation time.

### 2. Generator Caching Bug

When the same generator instance is reused for multiple types, internal caching causes "missing definition" errors:

```
❌ LedgerResponse: Encountered a reference to a missing definition, this is a bug.
❌ TxResponse: Encountered a reference to a missing definition, this is a bug.
```

This was solved by creating a fresh generator instance for each type.

## Types That Required Refactoring

### LedgerEntryResponse

**Before:**
```typescript
export interface LedgerEntryResponse<T = LedgerEntry> extends BaseResponse {
  result: { node?: T; /* ... */ }
}
```

**After:**
```typescript
export interface LedgerEntryResponse extends BaseResponse {
  result: { node?: LedgerEntry; /* ... */ }
}

// Utility type for typed usage (not used for schema generation)
export type TypedLedgerEntryResponse<T extends LedgerEntry> = Omit<
  LedgerEntryResponse, 'result'
> & { result: Omit<LedgerEntryResponse['result'], 'node'> & { node?: T } }
```

### TxResponse / TxV1Response

**Before:**
```typescript
export interface TxResponse<
  T extends Transaction = Transaction,
> extends BaseTxResult<T> {
  result: { /* ... */ }
}
```

**After:**
```typescript
export interface TxResponse extends BaseResponse {
  result: TxResultBase & { /* ... */ }
}

// Utility type for typed usage
export type TypedTxResponse<T extends Transaction> = /* ... */
```

### SimulateJsonResponse

**Before:**
```typescript
export interface SimulateJsonResponse<T extends Transaction = Transaction>
  extends BaseResponse {
  result: { tx_json?: T; /* ... */ }
}
```

**After:**
```typescript
export interface SimulateJsonResponse extends BaseResponse {
  result: { tx_json?: Transaction; /* ... */ }
}

export type TypedSimulateJsonResponse<T extends Transaction> = /* ... */
```

### SimulateRequest

**Before:**
```typescript
export type SimulateRequest = SimulateBinaryRequest | SimulateJsonRequest
// Where SimulateJsonRequest used discriminated union with `never`
```

**After:**
```typescript
export interface SimulateRequest extends BaseRequest, LookupByLedgerRequest {
  command: 'simulate'
  tx_blob?: string
  tx_json?: Transaction
  binary?: boolean
}

// Runtime validation function added
export function isValidSimulateRequest(req: SimulateRequest): boolean
```

### TransactionMetadata

**Before:**
```typescript
export type TransactionMetadata<T extends Transaction = Transaction> =
  T extends Payment ? CreatedNode | ... : TransactionMetadataBase
```

**After:**
```typescript
export type TransactionMetadata =
  | PaymentTransactionMetadata
  | NFTokenAcceptOfferMetadata
  | /* other specific metadata types */
  | TransactionMetadataBase
```

## Evidence: Fresh Generator Alone Was Insufficient

Testing confirmed that the fresh generator fix alone would not have worked:

| Test | Result |
|------|--------|
| Generic `LedgerEntryResponse<T = LedgerEntry>` with fresh generator | ❌ "No root type found" |
| Non-generic `LedgerEntryResponse` with fresh generator | ✅ Works (46 definitions) |

The generator simply cannot discover generic interfaces as root types.

## Solution Summary

Both fixes were required:

| Fix | What It Solved |
|-----|----------------|
| **Type refactoring** | Made types discoverable by removing generic parameters |
| **Fresh generator per type** | Avoided internal caching bugs |

## Maintaining Type Safety

The refactoring preserves type safety through utility types:

```typescript
// For users who need typed responses:
const response = await client.request({ command: 'ledger_entry', ... })
const typed = response as TypedLedgerEntryResponse<AccountRoot>
typed.result.node // Type: AccountRoot | undefined
```

These utility types are not exported for schema generation but remain available for TypeScript users who need precise typing.

## Conclusion

The type refactoring was not optional—it addressed a fundamental incompatibility between TypeScript generics and JSON Schema. While the fresh generator fix resolved caching issues, the generic types were simply invisible to the schema generator regardless of how it was configured or invoked.
