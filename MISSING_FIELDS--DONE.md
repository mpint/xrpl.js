## Implementation Plan: Adding Missing Fields to xrpl.js Types

This section provides a detailed implementation plan for adding the 8 missing fields to the xrpl.js TypeScript type definitions.

### Overview

| Task | File | Changes | Priority |
|------|------|---------|----------|
| 1 | accountLines.ts | Add `ignore_default` to request, `limit` to response | High |
| 2 | accountNFTs.ts | Add `ledger_hash`, `ledger_index` to response | High |
| 3 | ammInfo.ts | Add `account` to request | Medium |
| 4 | nftBuyOffers.ts | Add `limit`, `marker` to request & response | High |
| 5 | nftSellOffers.ts | Add `limit`, `marker` to request & response | High |
| 6 | vaultInfo.ts | Add `ledger_current_index` to response | Medium |

### Task 1: Fix account_lines types

**File:** `packages/xrpl/src/models/methods/accountLines.ts`

**Change 1 - Add to `AccountLinesRequest` (after `peer` field, around line 84):**

```typescript
/**
 * If true, filter out trust lines with balances at their default values.
 * The default is false.
 */
ignore_default?: boolean
```

**Change 2 - Add to `AccountLinesResponse.result` (after `marker` field, around line 134):**

```typescript
/**
 * The limit value used in the request.
 */
limit?: number
```

---

### Task 2: Fix account_nfts types

**File:** `packages/xrpl/src/models/methods/accountNFTs.ts`

**Add to `AccountNFTsResponse.result` (after existing fields):**

```typescript
/**
 * The identifying hash of the ledger that was used to generate this response.
 */
ledger_hash?: string
/**
 * The ledger index of the ledger that was used to generate this response.
 */
ledger_index?: number
/**
 * If true, this data comes from a validated ledger.
 */
validated?: boolean
```

---

### Task 3: Fix amm_info types

**File:** `packages/xrpl/src/models/methods/ammInfo.ts`

**Add to `AMMInfoRequest` (after `asset2` field, around line 27):**

```typescript
/**
 * The address of another account which holds LP Tokens for the requested AMM.
 * If specified, the response includes a field for the amount of the specified
 * account's LP Tokens.
 */
account?: string
```

---

### Task 4: Fix nft_buy_offers types

**File:** `packages/xrpl/src/models/methods/nftBuyOffers.ts`

**Change 1 - Add to `NFTBuyOffersRequest` (after `nft_id` field):**

```typescript
/**
 * Limit the number of NFT buy offers to retrieve. The server may return
 * fewer results. Valid values are within 50-500. The default is 250.
 */
limit?: number
/**
 * Value from a previous paginated response. Resume retrieving data where
 * that response left off.
 */
marker?: unknown
```

**Change 2 - Add to `NFTBuyOffersResponse.result` (after `nft_id` field):**

```typescript
/**
 * The limit value used in the request.
 */
limit?: number
/**
 * Server-defined value indicating the response is paginated. Pass this to
 * the next call to resume where this call left off.
 */
marker?: unknown
```

---

### Task 5: Fix nft_sell_offers types

**File:** `packages/xrpl/src/models/methods/nftSellOffers.ts`

**Change 1 - Add to `NFTSellOffersRequest` (after `nft_id` field):**

```typescript
/**
 * Limit the number of NFT sell offers to retrieve. The server may return
 * fewer results. Valid values are within 50-500. The default is 250.
 */
limit?: number
/**
 * Value from a previous paginated response. Resume retrieving data where
 * that response left off.
 */
marker?: unknown
```

**Change 2 - Add to `NFTSellOffersResponse.result` (after `nft_id` field):**

```typescript
/**
 * The limit value used in the request.
 */
limit?: number
/**
 * Server-defined value indicating the response is paginated. Pass this to
 * the next call to resume where this call left off.
 */
marker?: unknown
```

---

### Task 6: Fix vault_info types

**File:** `packages/xrpl/src/models/methods/vaultInfo.ts`

**Add to `VaultInfoResponse.result` (after `ledger_index` field, around line 200):**

```typescript
/**
 * The ledger index of the current in-progress ledger, which was used when
 * retrieving this information. May be omitted.
 */
ledger_current_index?: number
```

---

### Post-Implementation Tasks

#### Task 7: Regenerate OpenAPI Schema

After making the type changes, regenerate the OpenAPI schema to verify the fixes are reflected:

```bash
npm run generate:openapi
```

#### Task 8: Run Tests

Ensure all existing tests pass after the type changes:

```bash
npm test
```

---

### Verification Checklist

After implementation, verify each change by checking:

- [ ] TypeScript compiles without errors
- [ ] All existing tests pass
- [ ] New fields appear in generated OpenAPI schema
- [ ] Field descriptions match xrpl.org documentation
- [ ] Optional fields are correctly marked with `?`
- [ ] Field types match documentation (string, number, boolean, unknown for marker)

---

### PR Template

When creating the PR, use this template:

**Title:** `fix(types): Add missing fields to API request/response types`

**Description:**
```markdown
## Summary

This PR adds missing optional fields to several API request/response type definitions to align with the official xrpl.org documentation.

## Changes

### account_lines
- Added `ignore_default` to `AccountLinesRequest`
- Added `limit` to `AccountLinesResponse`

### account_nfts
- Added `ledger_hash`, `ledger_index`, `validated` to `AccountNFTsResponse`

### amm_info
- Added `account` parameter to `AMMInfoRequest`

### nft_buy_offers
- Added `limit`, `marker` pagination to request and response

### nft_sell_offers
- Added `limit`, `marker` pagination to request and response

### vault_info
- Added `ledger_current_index` to `VaultInfoResponse`

## Motivation

These fields are documented in the official xrpl.org API reference but were missing from the TypeScript type definitions. This affects:
1. TypeScript autocompletion for developers
2. Generated OpenAPI schema completeness

## Testing

- All existing tests pass
- OpenAPI schema regenerated and verified

## Documentation

- xrpl.org references linked in JSDoc comments
```
