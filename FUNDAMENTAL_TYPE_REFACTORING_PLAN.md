# Fundamental Type Refactoring Plan for ts-json-schema-generator Compatibility

## Executive Summary

This document outlines a comprehensive plan to modify the core TypeScript types in xrpl.js to achieve 100% compatibility with `ts-json-schema-generator`. Unlike creating parallel simplified types, this approach involves fundamental changes to the existing type definitions.

### Scope

This plan targets the 5 failed API methods and their underlying type system issues:

| Method | Root Cause | Impact Area |
|--------|------------|-------------|
| `ledger` | Large union types via `Ledger` → `LedgerEntry[]` and `Transaction[]` | ledger.ts, Ledger.ts |
| `ledger_entry` | Generic type parameter `<T = LedgerEntry>` | ledgerEntry.ts |
| `submit_multisigned` | `Transaction` union (70+ types) | submitMultisigned.ts |
| `tx` | Generic + conditional types + `TransactionMetadata<T>` | tx.ts, metadata.ts |
| `simulate` | Discriminated unions with `never` + generics | simulate.ts |

---

## Part 1: Generic Type Parameters

### Current Problem

```typescript
// ledgerEntry.ts - Generic with default
export interface LedgerEntryResponse<T = LedgerEntry> extends BaseResponse {
  result: {
    node?: T  // Cannot resolve at schema generation time
  }
}

// tx.ts - Generic with constraint and default
export interface TxResponse<T extends BaseTransaction = Transaction> extends BaseResponse {
  result: BaseTxResult<typeof RIPPLED_API_V2, T> & { tx_json: T }
}

// simulate.ts - Generic in response union member
export interface SimulateJsonResponse<T extends BaseTransaction = Transaction> extends BaseResponse {
  result: {
    tx_json: T
    meta?: TransactionMetadata<T>
  }
}
```

### Why ts-json-schema-generator Fails

- JSON Schema has no concept of generics or type parameters
- The generator cannot "instantiate" the generic with its default value
- Error: "No root type found" indicates complete resolution failure

### Refactoring Strategy: Inline Default Types

**Approach**: Remove generic parameters and inline the default type directly.

#### Before (ledgerEntry.ts):
```typescript
export interface LedgerEntryResponse<T = LedgerEntry> extends BaseResponse {
  result: {
    index: string
    ledger_current_index: number
    node?: T
    node_binary?: string
    validated?: boolean
    deleted_ledger_index?: number
  }
}
```

#### After (ledgerEntry.ts):
```typescript
export interface LedgerEntryResponse extends BaseResponse {
  result: {
    index: string
    ledger_current_index: number
    node?: LedgerEntry  // Inlined default
    node_binary?: string
    validated?: boolean
    deleted_ledger_index?: number
  }
}

// NEW: For users who need typed responses, provide a branded utility type
export type TypedLedgerEntryResponse<T extends LedgerEntry> = Omit<LedgerEntryResponse, 'result'> & {
  result: Omit<LedgerEntryResponse['result'], 'node'> & { node?: T }
}
```

#### Before (tx.ts):
```typescript
export interface TxResponse<T extends BaseTransaction = Transaction> extends BaseResponse {
  result: BaseTxResult<typeof RIPPLED_API_V2, T> & { tx_json: T }
  searched_all?: boolean
}
```

#### After (tx.ts):
```typescript
export interface TxResponse extends BaseResponse {
  result: TxResult & { tx_json: Transaction }
  searched_all?: boolean
}

// Flattened result type (see Part 2 for conditional type handling)
interface TxResult {
  hash: string
  ctid?: string
  ledger_index?: number
  meta_blob?: TransactionMetadata | string  // Removed conditional
  meta?: TransactionMetadata | string
  validated?: boolean
  close_time_iso?: string
  date?: number
}

// NEW: Typed utility for advanced users
export type TypedTxResponse<T extends BaseTransaction> = Omit<TxResponse, 'result'> & {
  result: Omit<TxResponse['result'], 'tx_json'> & { tx_json: T }
}
```

### Impact Analysis

| Aspect | Before | After | Impact |
|--------|--------|-------|--------|
| Type Safety | Full generic support | Concrete types + utility types | 🟡 Moderate - users lose inline generics |
| Schema Generation | ❌ Fails | ✅ Works | Positive |
| IDE Autocomplete | ✅ Full | ✅ Full | Neutral |
| Breaking Change | - | Yes | See migration section |

---

## Part 2: Conditional Types

### Current Problem

```typescript
// tx.ts - Conditional type based on API version
interface BaseTxResult<
  Version extends APIVersion = typeof DEFAULT_API_VERSION,
  T extends BaseTransaction = Transaction,
> {
  hash: string
  // Conditional: only present for API v2
  meta_blob?: Version extends typeof RIPPLED_API_V2
    ? TransactionMetadata<T> | string
    : never
  meta?: TransactionMetadata<T> | string
}

// metadata.ts - Chained conditional type
export type TransactionMetadata<T extends BaseTransaction = Transaction> =
  T extends Payment ? PaymentMetadata
  : T extends NFTokenMint ? NFTokenMintMetadata
  : T extends NFTokenCreateOffer ? NFTokenCreateOfferMetadata
  : T extends NFTokenAcceptOffer ? NFTokenAcceptOfferMetadata
  : T extends NFTokenCancelOffer ? NFTokenCancelOfferMetadata
  : T extends MPTokenIssuanceCreate ? MPTokenIssuanceCreateMetadata
  : TransactionMetadataBase
```

### Why ts-json-schema-generator Fails

- Conditional types require compile-time type narrowing
- The generator cannot evaluate `T extends X ? Y : Z` statically
- Nested conditionals with generic parameters create exponential complexity

### Refactoring Strategy: Flatten to Union Types

**Approach**: Replace conditional types with explicit union types that enumerate all possibilities.

#### Before (metadata.ts):
```typescript
export type TransactionMetadata<T extends BaseTransaction = Transaction> =
  T extends Payment ? PaymentMetadata
  : T extends NFTokenMint ? NFTokenMintMetadata
  // ... more conditionals
  : TransactionMetadataBase
```

#### After (metadata.ts):
```typescript
// Explicit union of all metadata types
export type TransactionMetadata =
  | PaymentMetadata
  | NFTokenMintMetadata
  | NFTokenCreateOfferMetadata
  | NFTokenAcceptOfferMetadata
  | NFTokenCancelOfferMetadata
  | MPTokenIssuanceCreateMetadata
  | TransactionMetadataBase

// For typed usage, provide a mapping type (not exported to schema)
/** @internal */
export type TransactionMetadataFor<T extends BaseTransaction> =
  T extends Payment ? PaymentMetadata
  : T extends NFTokenMint ? NFTokenMintMetadata
  : T extends NFTokenCreateOffer ? NFTokenCreateOfferMetadata
  : T extends NFTokenAcceptOffer ? NFTokenAcceptOfferMetadata
  : T extends NFTokenCancelOffer ? NFTokenCancelOfferMetadata
  : T extends MPTokenIssuanceCreate ? MPTokenIssuanceCreateMetadata
  : TransactionMetadataBase
```

#### Before (tx.ts):
```typescript
interface BaseTxResult<
  Version extends APIVersion = typeof DEFAULT_API_VERSION,
  T extends BaseTransaction = Transaction,
> {
  meta_blob?: Version extends typeof RIPPLED_API_V2
    ? TransactionMetadata<T> | string
    : never
}
```

#### After (tx.ts):
```typescript
// Single concrete type for API v2 (the default and primary version)
interface TxResult {
  hash: string
  ctid?: string
  ledger_index?: number
  meta_blob?: TransactionMetadata | string  // Always present in v2
  meta?: TransactionMetadata | string
  validated?: boolean
  close_time_iso?: string
  date?: number
}

// Keep V1 result separate (doesn't need schema generation)
interface TxV1Result {
  hash: string
  ctid?: string
  ledger_index?: number
  // meta_blob is never present in V1
  meta?: TransactionMetadata | string
  validated?: boolean
  close_time_iso?: string
  date?: number
}
```

### Impact Analysis

| Aspect | Before | After | Impact |
|--------|--------|-------|--------|
| Type Narrowing | Automatic via conditionals | Manual via type guards | 🟡 Moderate |
| Schema Generation | ❌ Fails | ✅ Works | Positive |
| Runtime Behavior | Unchanged | Unchanged | Neutral |
| API v1 Support | Via generics | Via separate types | Neutral |

---

## Part 3: Large Union Types (Transaction, LedgerEntry)

### Current Problem

```typescript
// transaction.ts - 70+ member union
export type SubmittableTransaction =
  | AMMBid | AMMClawback | AMMCreate | AMMDelete | AMMDeposit | AMMVote | AMMWithdraw
  | AccountDelete | AccountSet | Batch | CheckCancel | CheckCash | CheckCreate
  | Clawback | CredentialAccept | CredentialCreate | CredentialDelete
  // ... 50+ more types

export type Transaction = SubmittableTransaction | PseudoTransaction

// LedgerEntry.ts - 26 member union
type LedgerEntry =
  | AccountRoot | Amendments | AMM | Bridge | Check | Credential | Delegate
  | DepositPreauth | DirectoryNode | Escrow | FeeSettings | LedgerHashes
  // ... more types
```

### Why ts-json-schema-generator Fails

With 70+ types, each having 10-20 fields:
- Total schema complexity: ~1,050+ fields to resolve
- Circular references between types
- Memory/complexity limits exceeded
- Error: "Encountered a reference to a missing definition"

### Refactoring Strategy Options

#### Option A: Discriminated Base Type with Extensibility

Replace the massive union with a base type that uses a discriminator pattern JSON Schema can handle.

##### Before:
```typescript
export type Transaction = SubmittableTransaction | PseudoTransaction
// Used as: tx_json: Transaction
```

##### After:
```typescript
// Base transaction with discriminator
export interface TransactionBase extends BaseTransaction {
  TransactionType: TransactionType  // String literal union of all types
}

// Keep full union for internal TypeScript usage
export type Transaction = SubmittableTransaction | PseudoTransaction

// For schema generation: use the base type with explicit discriminator
export interface TransactionSchema extends TransactionBase {
  // Common fields all transactions share
  Account: string
  Fee?: string
  Flags?: number
  LastLedgerSequence?: number
  Memos?: Memo[]
  Sequence?: number
  SigningPubKey?: string
  SourceTag?: number
  TicketSequence?: number
  TxnSignature?: string
  NetworkID?: number
  // Additional properties allowed for specific transaction types
  [key: string]: unknown
}

// String literal union for discriminator (works in JSON Schema)
export type TransactionType =
  | 'AMMBid' | 'AMMClawback' | 'AMMCreate' | 'AMMDelete'
  | 'AMMDeposit' | 'AMMVote' | 'AMMWithdraw' | 'AccountDelete'
  | 'AccountSet' | 'Batch' | 'CheckCancel' | 'CheckCash'
  // ... all 70+ types as string literals
```

#### Option B: Grouped Sub-Unions

Split the massive union into logical groups that are each small enough for the generator.

##### After:
```typescript
// Group by feature area
export type AMMTransaction = AMMBid | AMMClawback | AMMCreate | AMMDelete | AMMDeposit | AMMVote | AMMWithdraw
export type CheckTransaction = CheckCancel | CheckCash | CheckCreate
export type EscrowTransaction = EscrowCancel | EscrowCreate | EscrowFinish
export type NFTokenTransaction = NFTokenAcceptOffer | NFTokenBurn | NFTokenCancelOffer | NFTokenCreateOffer | NFTokenMint | NFTokenModify
export type PaymentTransaction = Payment | PaymentChannelClaim | PaymentChannelCreate | PaymentChannelFund
export type XChainTransaction = XChainAccountCreateCommit | XChainAddAccountCreateAttestation | XChainAddClaimAttestation | XChainClaim | XChainCommit | XChainCreateBridge | XChainCreateClaimID | XChainModifyBridge
// ... more groups

// Full union remains for TypeScript
export type Transaction = SubmittableTransaction | PseudoTransaction

// Schema-friendly grouped reference
export type TransactionGroup =
  | AMMTransaction
  | CheckTransaction
  | EscrowTransaction
  | NFTokenTransaction
  | PaymentTransaction
  | XChainTransaction
  // ... more groups
```

#### Option C: Record<string, unknown> with Documentation

The most pragmatic approach for schema generation - accept that the full union cannot be represented.

##### After:
```typescript
// For API schema purposes
export interface TransactionObject {
  TransactionType: string
  Account: string
  Fee?: string
  Flags?: number
  LastLedgerSequence?: number
  Sequence?: number
  [key: string]: unknown
}

// Keep full union for TypeScript users
export type Transaction = SubmittableTransaction | PseudoTransaction
```

### Recommended Approach: Option A (Discriminated Base Type)

**Rationale**:
- Preserves the `TransactionType` discriminator in the schema
- Allows validation of the discriminator value
- Documents all valid transaction types as an enum
- Maintains full TypeScript types for library users

### Impact Analysis

| Aspect | Before | After (Option A) | Impact |
|--------|--------|------------------|--------|
| Type Safety (TS) | Full union | Full union preserved | Neutral |
| Schema Completeness | ❌ Fails | 🟡 Base type + discriminator | Trade-off |
| Field Validation | All fields | Common fields only | 🟡 Moderate loss |
| TransactionType Enum | Not in schema | ✅ In schema | Positive |

---

## Part 4: Discriminated Unions with `never`

### Current Problem

```typescript
// simulate.ts - Mutual exclusivity pattern
export type SimulateRequest = BaseRequest & {
  command: 'simulate'
  binary?: boolean
} & (
  | { tx_blob: string; tx_json?: never }      // If tx_blob, then tx_json is never
  | { tx_json: Transaction; tx_blob?: never }  // If tx_json, then tx_blob is never
)
```

### Why ts-json-schema-generator Fails

- `never` type has no JSON Schema equivalent
- The intersection with union creates complex type algebra
- The generator cannot flatten this to a simple schema
- Error: "Encountered a reference to a missing definition"

### Refactoring Strategy: Replace with Optional Fields + Documentation

**Approach**: Remove the `never` constraint, make both fields optional, and document the mutual exclusivity.

#### Before (simulate.ts):
```typescript
export type SimulateRequest = BaseRequest & {
  command: 'simulate'
  binary?: boolean
} & (
  | { tx_blob: string; tx_json?: never }
  | { tx_json: Transaction; tx_blob?: never }
)
```

#### After (simulate.ts):
```typescript
/**
 * The `simulate` method simulates a transaction without submitting it.
 *
 * **Note**: Exactly one of `tx_blob` or `tx_json` must be provided.
 * Providing both or neither will result in an error.
 */
export interface SimulateRequest extends BaseRequest {
  command: 'simulate'

  /**
   * If true, return transaction data in binary format.
   */
  binary?: boolean

  /**
   * The transaction in binary (hex) format.
   * Mutually exclusive with `tx_json` - provide exactly one.
   */
  tx_blob?: string

  /**
   * The transaction in JSON format.
   * Mutually exclusive with `tx_blob` - provide exactly one.
   */
  tx_json?: Transaction
}

// For TypeScript users who want compile-time enforcement, provide branded types
export type SimulateBlobRequest = SimulateRequest & { tx_blob: string; tx_json?: undefined }
export type SimulateJsonRequest = SimulateRequest & { tx_json: Transaction; tx_blob?: undefined }

// Runtime validation function
export function isValidSimulateRequest(req: SimulateRequest): boolean {
  const hasTxBlob = req.tx_blob !== undefined
  const hasTxJson = req.tx_json !== undefined
  return hasTxBlob !== hasTxJson  // XOR - exactly one must be present
}
```

#### OpenAPI Schema Enhancement:
```yaml
SimulateRequest:
  type: object
  required:
    - command
  properties:
    command:
      type: string
      enum: ["simulate"]
    binary:
      type: boolean
    tx_blob:
      type: string
      description: |
        The transaction in binary (hex) format.
        **Mutually exclusive with tx_json** - provide exactly one.
    tx_json:
      $ref: '#/components/schemas/TransactionSchema'
      description: |
        The transaction in JSON format.
        **Mutually exclusive with tx_blob** - provide exactly one.
  # Use oneOf to express mutual exclusivity in OpenAPI 3.0+
  oneOf:
    - required: [tx_blob]
      properties:
        tx_json:
          not: {}
    - required: [tx_json]
      properties:
        tx_blob:
          not: {}
```

### Impact Analysis

| Aspect | Before | After | Impact |
|--------|--------|-------|--------|
| Compile-time Enforcement | ✅ Via `never` | ⚠️ Via branded types | 🟡 Requires user action |
| Runtime Validation | Not provided | ✅ Function provided | Positive |
| Schema Generation | ❌ Fails | ✅ Works | Positive |
| OpenAPI Expressiveness | N/A | ✅ Via `oneOf` | Positive |

---

## Part 5: Complex Intersection Types

### Current Problem

```typescript
// simulate.ts - Multiple intersection operators
export type SimulateRequest = BaseRequest & {
  command: 'simulate'
  binary?: boolean
} & (
  | { tx_blob: string; tx_json?: never }
  | { tx_json: Transaction; tx_blob?: never }
)

// submitMultisigned.ts - Result with intersection
export interface SubmitMultisignedResponse extends BaseResponse {
  result: BaseSubmitMultisignedResult & {
    hash?: string
  }
}
```

### Refactoring Strategy: Flatten Intersections

**Approach**: Combine intersected types into single interfaces with all properties.

#### Before (submitMultisigned.ts):
```typescript
interface BaseSubmitMultisignedResult {
  engine_result: string
  engine_result_code: number
  engine_result_message: string
  tx_blob: string
  tx_json: Transaction
}

export interface SubmitMultisignedResponse extends BaseResponse {
  result: BaseSubmitMultisignedResult & {
    hash?: string
  }
}
```

#### After (submitMultisigned.ts):
```typescript
export interface SubmitMultisignedResponse extends BaseResponse {
  result: {
    /** Code indicating the preliminary result of the transaction. */
    engine_result: string
    /** Numeric code correlated to engine_result. */
    engine_result_code: number
    /** Human-readable explanation of the transaction result. */
    engine_result_message: string
    /** The complete transaction in hex string format. */
    tx_blob: string
    /** The complete transaction in JSON format. */
    tx_json: Transaction  // Note: Still has large union issue (see Part 3)
    /** Transaction hash (API v2+). */
    hash?: string
  }
}

// Keep base interface for internal reuse if needed
/** @internal */
interface BaseSubmitMultisignedResult {
  engine_result: string
  engine_result_code: number
  engine_result_message: string
  tx_blob: string
  tx_json: Transaction
}
```

### Impact Analysis

| Aspect | Before | After | Impact |
|--------|--------|-------|--------|
| Code Reuse | Via base interfaces | Inlined (with internal base) | Neutral |
| Schema Generation | ❌ Fails | ✅ Works | Positive |
| Readability | Requires following inheritance | All fields visible | Positive |
| Maintenance | Single source | Some duplication | 🟡 Minor overhead |

---

## Part 6: Specific File Refactoring Plans

### 6.1 ledgerEntry.ts

**Changes Required**:
1. Remove generic parameter from `LedgerEntryResponse`
2. Inline `LedgerEntry` type directly

```typescript
// BEFORE
export interface LedgerEntryResponse<T = LedgerEntry> extends BaseResponse {
  result: {
    index: string
    ledger_current_index: number
    node?: T
    node_binary?: string
    validated?: boolean
    deleted_ledger_index?: number
  }
}

// AFTER
export interface LedgerEntryResponse extends BaseResponse {
  result: {
    index: string
    ledger_current_index: number
    node?: LedgerEntry
    node_binary?: string
    validated?: boolean
    deleted_ledger_index?: number
  }
}

// Utility type for typed usage
export type TypedLedgerEntryResponse<T extends LedgerEntry> =
  Omit<LedgerEntryResponse, 'result'> & {
    result: Omit<LedgerEntryResponse['result'], 'node'> & { node?: T }
  }
```

### 6.2 tx.ts

**Changes Required**:
1. Remove generic parameters from `TxResponse` and `TxV1Response`
2. Flatten `BaseTxResult` into concrete types
3. Remove conditional type for `meta_blob`

```typescript
// BEFORE
interface BaseTxResult<
  Version extends APIVersion = typeof DEFAULT_API_VERSION,
  T extends BaseTransaction = Transaction,
> {
  hash: string
  meta_blob?: Version extends typeof RIPPLED_API_V2
    ? TransactionMetadata<T> | string
    : never
  // ...
}

export interface TxResponse<T extends BaseTransaction = Transaction> extends BaseResponse {
  result: BaseTxResult<typeof RIPPLED_API_V2, T> & { tx_json: T }
}

// AFTER
interface TxResultBase {
  hash: string
  ctid?: string
  ledger_index?: number
  meta?: TransactionMetadata | string
  validated?: boolean
  close_time_iso?: string
  date?: number
}

export interface TxResponse extends BaseResponse {
  result: TxResultBase & {
    meta_blob?: TransactionMetadata | string
    tx_json: Transaction
  }
  searched_all?: boolean
}

export interface TxV1Response extends BaseResponse {
  result: TxResultBase & Transaction  // V1 spreads transaction into result
  searched_all?: boolean
}
```

### 6.3 simulate.ts

**Changes Required**:
1. Convert type alias to interface
2. Remove `never` pattern for mutual exclusivity
3. Remove generic from `SimulateJsonResponse`

```typescript
// BEFORE
export type SimulateRequest = BaseRequest & {
  command: 'simulate'
  binary?: boolean
} & (
  | { tx_blob: string; tx_json?: never }
  | { tx_json: Transaction; tx_blob?: never }
)

export interface SimulateJsonResponse<T extends BaseTransaction = Transaction> extends BaseResponse {
  result: {
    tx_json: T
    meta?: TransactionMetadata<T>
    // ...
  }
}

// AFTER
export interface SimulateRequest extends BaseRequest {
  command: 'simulate'
  binary?: boolean
  /** Mutually exclusive with tx_json */
  tx_blob?: string
  /** Mutually exclusive with tx_blob */
  tx_json?: Transaction
}

export interface SimulateJsonResponse extends BaseResponse {
  result: {
    applied: false
    engine_result: string
    engine_result_code: number
    engine_result_message: string
    ledger_index: number
    tx_json: Transaction
    meta?: TransactionMetadata
  }
}
```

### 6.4 submitMultisigned.ts

**Changes Required**:
1. Flatten intersection type in response

```typescript
// BEFORE
export interface SubmitMultisignedResponse extends BaseResponse {
  result: BaseSubmitMultisignedResult & {
    hash?: string
  }
}

// AFTER
export interface SubmitMultisignedResponse extends BaseResponse {
  result: {
    engine_result: string
    engine_result_code: number
    engine_result_message: string
    tx_blob: string
    tx_json: Transaction
    hash?: string
  }
}
```

### 6.5 ledger.ts

**Changes Required**:
1. Flatten `LedgerBinary` to avoid `Omit<Ledger, ...>` pattern
2. Address the `Ledger` type's large unions (see Part 3)

```typescript
// BEFORE
export interface LedgerBinary extends Omit<Ledger, 'transactions' | 'accountState'> {
  accountState?: string[]
  transactions?: string[]
}

// AFTER
export interface LedgerBinary {
  account_hash: string
  close_flags: number
  close_time: number
  close_time_human: string
  close_time_resolution: number
  close_time_iso: string
  closed: boolean
  ledger_hash: string
  ledger_index: number
  parent_close_time: number
  parent_hash: string
  total_coins: string
  transaction_hash: string
  // Binary-specific overrides
  accountState?: string[]
  transactions?: string[]
}
```

---

## Part 7: Breaking Change Assessment

### Summary of Breaking Changes

| Change | Severity | Affected Users | Migration Effort |
|--------|----------|----------------|------------------|
| Remove generic from `LedgerEntryResponse` | 🟡 Medium | Users explicitly using `<T>` parameter | Low - use utility type |
| Remove generic from `TxResponse` | 🟡 Medium | Users explicitly using `<T>` parameter | Low - use utility type |
| Remove generic from `SimulateJsonResponse` | 🟡 Medium | Users explicitly using `<T>` parameter | Low - use utility type |
| Change `SimulateRequest` from type alias to interface | 🟢 Low | Type introspection users | Minimal |
| Remove `never` from `SimulateRequest` | 🟡 Medium | Users relying on compile-time exclusivity | Add runtime check |
| Flatten `TransactionMetadata` conditional | 🟢 Low | Users narrowing metadata by transaction | Use new internal type |

### Who Is Affected

#### 1. Users Explicitly Using Generic Parameters

```typescript
// BEFORE - This code will break
const response: LedgerEntryResponse<AccountRoot> = await client.request({...})

// AFTER - Migration path
const response = await client.request({...})
const typedResponse = response as TypedLedgerEntryResponse<AccountRoot>
// Or use type assertion
const accountRoot = response.result.node as AccountRoot
```

#### 2. Users Relying on `never` for Type Safety

```typescript
// BEFORE - TypeScript prevents this
const req: SimulateRequest = {
  command: 'simulate',
  tx_blob: '...',
  tx_json: {...}  // Error: tx_json must be never
}

// AFTER - No compile-time error, but runtime validation available
const req: SimulateRequest = {
  command: 'simulate',
  tx_blob: '...',
  tx_json: {...}  // Compiles, but isValidSimulateRequest() returns false
}
```

#### 3. Users with Version-Specific Type Handling

```typescript
// BEFORE
function handleTxResult<V extends APIVersion>(result: BaseTxResult<V>) {
  if (result.meta_blob) {
    // Type knows this is only present for V2
  }
}

// AFTER
function handleTxResult(result: TxResponse['result'] | TxV1Response['result']) {
  if ('meta_blob' in result && result.meta_blob) {
    // Must do runtime check
  }
}
```

### Migration Guide

#### For Generic Type Users

```typescript
// Option 1: Use the new utility types
import { TypedLedgerEntryResponse, TypedTxResponse } from 'xrpl'

// Option 2: Type assertion
const entry = response.result.node as AccountRoot

// Option 3: Type guard
function isAccountRoot(entry: LedgerEntry): entry is AccountRoot {
  return entry.LedgerEntryType === 'AccountRoot'
}
```

#### For Mutual Exclusivity Users

```typescript
// Add runtime validation
import { SimulateRequest, isValidSimulateRequest } from 'xrpl'

function submitSimulation(req: SimulateRequest) {
  if (!isValidSimulateRequest(req)) {
    throw new Error('Provide exactly one of tx_blob or tx_json')
  }
  // ...
}
```

#### For Version-Specific Code

```typescript
// Use explicit version-specific types
import { TxResponse, TxV1Response } from 'xrpl'

function handleV2(response: TxResponse) {
  // meta_blob may be present
}

function handleV1(response: TxV1Response) {
  // meta_blob is not present
}
```

---

## Part 8: Trade-offs Analysis

### Type Expressiveness vs Schema Generation

| Aspect | Full Type Expressiveness | Schema-Compatible Types |
|--------|-------------------------|------------------------|
| Generic Parameters | ✅ Compile-time type inference | ❌ Must use utility types |
| Conditional Types | ✅ Automatic narrowing | ❌ Manual type guards |
| Discriminated Unions | ✅ Compile-time enforcement | ⚠️ Runtime validation |
| Large Unions | ✅ Full type information | ⚠️ Base type + discriminator |
| IDE Autocomplete | ✅ Full field completion | ⚠️ Base fields only for unions |
| JSON Schema | ❌ Cannot generate | ✅ Full compatibility |
| OpenAPI Docs | ❌ Cannot generate | ✅ Full compatibility |

### Recommended Balance

For xrpl.js, we recommend prioritizing schema generation compatibility with the following mitigations:

1. **Provide utility types** for users who need typed generics
2. **Provide runtime validation** functions for mutual exclusivity
3. **Use `@internal` markers** to preserve complex types for internal use
4. **Document all constraints** in JSDoc comments
5. **Generate comprehensive OpenAPI schemas** with full descriptions

---

## Part 9: Implementation Plan

### Phase 1: Low-Impact Changes (Week 1)

**Files**: metadata.ts

1. Convert `TransactionMetadata<T>` conditional to union type
2. Add `@internal` marker to keep conditional version
3. Update tests

**Estimated Effort**: 2-4 hours
**Breaking Changes**: Minimal

### Phase 2: Generic Parameter Removal (Week 2)

**Files**: ledgerEntry.ts, tx.ts, simulate.ts

1. Remove generic parameters from response types
2. Add utility types for typed usage
3. Update tests and examples
4. Update JSDoc comments

**Estimated Effort**: 6-8 hours
**Breaking Changes**: Medium (users with explicit generics)

### Phase 3: Discriminated Union Refactoring (Week 3)

**Files**: simulate.ts

1. Replace `never` pattern with optional fields
2. Add runtime validation function
3. Add branded types for strict usage
4. Update tests

**Estimated Effort**: 4-6 hours
**Breaking Changes**: Medium (users relying on `never`)

### Phase 4: Intersection Flattening (Week 3)

**Files**: submitMultisigned.ts, ledger.ts

1. Flatten intersection types
2. Inline base interfaces
3. Update tests

**Estimated Effort**: 3-4 hours
**Breaking Changes**: None (internal restructure)

### Phase 5: Large Union Handling (Week 4)

**Files**: transaction.ts, common.ts, LedgerEntry.ts, Ledger.ts

1. Create `TransactionType` string literal union
2. Create `TransactionSchema` base interface for schema
3. Create `LedgerEntryType` string literal union
4. Create `LedgerEntrySchema` base interface
5. Update method files to use schema types where needed

**Estimated Effort**: 8-12 hours
**Breaking Changes**: None (additive)

### Phase 6: Testing & Documentation (Week 5)

1. Run full test suite
2. Test schema generation
3. Verify OpenAPI output
4. Update CHANGELOG
5. Write migration guide
6. Update API documentation

**Estimated Effort**: 4-6 hours

### Total Estimated Effort: 27-40 hours (1-2 developer weeks)

---

## Part 10: Alternative Approaches Considered

### Alternative 1: Use ts-json-schema-generator Plugins

**Rejected because**:
- No existing plugins for our specific patterns
- Plugin development would take longer than refactoring
- Would create dependency on custom tooling

### Alternative 2: Fork ts-json-schema-generator

**Rejected because**:
- Maintenance burden of custom fork
- May break with upstream updates
- Solving symptoms, not root cause

### Alternative 3: Use TypeBox or Zod

**Rejected because**:
- Requires complete rewrite of type definitions
- Different programming model (schema-first vs type-first)
- Significant learning curve for contributors

### Alternative 4: Manual OpenAPI Schemas

**Rejected because**:
- High maintenance burden
- Two sources of truth
- Easy to drift from TypeScript types

---

## Appendix A: Files to Modify

| File | Changes | Priority |
|------|---------|----------|
| `packages/xrpl/src/models/methods/ledgerEntry.ts` | Remove generic | P1 |
| `packages/xrpl/src/models/methods/tx.ts` | Remove generics, flatten conditionals | P1 |
| `packages/xrpl/src/models/methods/simulate.ts` | Remove generics, remove never pattern | P1 |
| `packages/xrpl/src/models/methods/submitMultisigned.ts` | Flatten intersection | P2 |
| `packages/xrpl/src/models/methods/ledger.ts` | Flatten Omit pattern | P2 |
| `packages/xrpl/src/models/transactions/metadata.ts` | Convert conditional to union | P2 |
| `packages/xrpl/src/models/transactions/transaction.ts` | Add TransactionSchema | P3 |
| `packages/xrpl/src/models/transactions/common.ts` | Add TransactionType union | P3 |
| `packages/xrpl/src/models/ledger/LedgerEntry.ts` | Add LedgerEntrySchema | P3 |
| `packages/xrpl/src/models/ledger/Ledger.ts` | Flatten BaseLedger | P3 |

## Appendix B: Test Files to Update

- `packages/xrpl/test/models/methods/*.test.ts`
- `packages/xrpl/test/integration/requests/*.test.ts`
- Schema generation tests (new)

## Appendix C: Version Bump Recommendation

Given the breaking changes to generic type parameters, this refactoring should be released as:

- **Major version bump** if strict semver (breaking changes to public API)
- **Minor version bump** with deprecation warnings if providing migration period

Recommended approach: **Major version bump** with comprehensive migration guide.
