# OpenAPI Schema Generation Plan for xrpl.js

## Overview

This plan outlines the implementation of an OpenAPI 3.0.3 schema generator for xrpl.js using `ts-json-schema-generator`. The schema will support **API v2 only** (not v1 or v3), and will focus exclusively on HTTP/JSON-RPC methods (excluding WebSocket streaming).

**Important Notes:**
- **API Version Support**: This schema supports **API v2 only**. API v1 is legacy and no longer supported. API v3 is still in beta and not yet implemented in xrpl.js.
- **Documentation Links**: All xrpl.org documentation links must end with `.md` to fetch markdown format (e.g., `https://xrpl.org/docs/.../method.md`)

## Goals

1. **Generate OpenAPI schema from TypeScript types** - Leverage existing TypeScript definitions in `packages/xrpl/src/models/methods/`
2. **Support API v2 only** - Focus on the current stable API version (default since xrpl.js v4.0.0)
3. **HTTP methods only** - Exclude WebSocket-specific methods (subscribe, unsubscribe) and streaming types
4. **Automated generation** - Integrate into build process for automatic updates
5. **Standards compliant** - Produce valid OpenAPI 3.0.3 specification

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                   TypeScript Source Types                    │
│         packages/xrpl/src/models/methods/*.ts                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              ts-json-schema-generator                        │
│  - Extract type definitions                                  │
│  - Generate JSON Schema Draft-07 for Request/Response       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Schema Transformation Layer                     │
│  - Convert JSON Schema Draft-07 to OpenAPI 3.0.3            │
│  - Transform incompatible constructs (const→enum, etc.)     │
│  - Map Request/Response pairs to operations                 │
│  - Create separate paths per method (/account_info, etc.)  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              OpenAPI 3.0.3 Specification                     │
│  - paths: Separate path per method for better DX           │
│  - components/schemas: All request/response types           │
│  - API v2 only (no v1 support)                             │
└─────────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

This implementation is based on 5 major architectural decisions documented in `DECISION_REASONS.md`:

1. **Method Metadata Storage** - TypeScript file (`scripts/method-metadata.ts`) for type-safe metadata
2. **JSON Schema to OpenAPI Transformation** - Automated transformation layer to convert Draft-07 to OpenAPI 3.0.3
3. **Handling Failed Methods** - Generate partial schema (92% coverage) rather than blocking on failures
4. **OpenAPI Version** - Use 3.0.3 for universal tool support (not 3.1.0)
5. **API Paths** - Separate path per method (`/account_info`, `/tx`, etc.) for better developer experience

See `DECISION_REASONS.md` for detailed rationale and tradeoffs for each decision.

## Methods to Include

### HTTP-Compatible Methods (Exclude WebSocket-only)

**Include:**
- All account methods (10): account_channels, account_currencies, account_info, account_lines, account_nfts, account_objects, account_offers, account_tx, gateway_balances, noripple_check
- All ledger methods (5): ledger, ledger_closed, ledger_current, ledger_data, ledger_entry
- Transaction methods (5): submit, submit_multisigned, transaction_entry, tx, simulate
- Path/order book methods (7): amm_info, book_offers, deposit_authorized, nft_buy_offers, nft_sell_offers, path_find, ripple_path_find
- Payment channel methods (1): channel_verify
- Server info methods (6): fee, feature, server_info, server_state, server_definitions, manifest
- Utility methods (3): ping, random
- Clio methods (3): nft_info, nft_history, nfts_by_issuer
- Vault methods (1): vault_info

**Exclude (WebSocket-only):**
- subscribe, unsubscribe
- All Stream types (LedgerStream, ValidationStream, TransactionStream, PathFindStream, PeerStatusStream, OrderBookStream, ConsensusStream)

**Total: ~41 HTTP-compatible methods**

## API Version Support

**This schema supports API v2 only.** While xrpl.js maintains backward compatibility with API v1 in the TypeScript types, the OpenAPI schema focuses exclusively on API v2 for the following reasons:

1. **API v2 is the current stable version** - Default since xrpl.js v4.0.0 (July 2024)
2. **API v1 is legacy** - Maintained for backward compatibility but not recommended for new integrations
3. **API v3 is beta** - Still requires `[beta_rpc_api]` config flag in rippled, not yet implemented in xrpl.js
4. **Simplified schema** - Supporting only v2 reduces complexity and maintenance burden

### Methods That Had v1/v2 Differences (Historical Reference)

The following methods had different responses between v1 and v2. Since we only support v2, we use the v2 response types:

1. **account_info** - Uses `AccountInfoResponse` (v2: signer_lists at top level)
2. **account_tx** - Uses `AccountTxResponse` (v2 structure)
3. **ledger** - Uses `LedgerResponse` (v2 structure)
4. **submit_multisigned** - Uses `SubmitMultisignedResponse` (v2 structure)
5. **tx** - Uses `TxResponse` (v2: transaction in tx_json field)

## Implementation Steps

### Phase 1: Setup and Configuration

1. **Install dependencies**
   ```bash
   npm install --save-dev ts-json-schema-generator @apidevtools/swagger-parser
   ```

2. **Create configuration file** - `scripts/openapi-config.json`
   - Configure ts-json-schema-generator options
   - Define type inclusion/exclusion patterns
   - Set up discriminator handling

### Phase 2: Schema Generation Script

3. **Create generation script** - `scripts/generate-openapi-schema.ts`
   - Use ts-json-schema-generator to extract schemas for each Request/Response type
   - Filter out WebSocket-only types
   - Generate base JSON schemas

### Phase 3: OpenAPI Transformation

4. **Create transformation module** - Implemented in `scripts/generate-openapi-schema.ts`
   - Convert JSON Schema Draft-07 to OpenAPI 3.0.3 components
   - Transform incompatible constructs:
     - `const` → `enum` (OpenAPI 3.0.3 doesn't support `const`)
     - Type arrays → `anyOf` (e.g., `["string", "number"]` → `anyOf: [{type: "string"}, {type: "number"}]`)
     - Extract `null` from type arrays and add `nullable: true`
   - Create separate paths per method (`/account_info`, `/tx`, etc.)
   - Map request/response pairs to POST operations

### Phase 4: Validation and Testing

6. **Validate generated schema**
   - Use @apidevtools/swagger-parser to validate
   - Test with sample requests/responses
   - Ensure all methods are correctly represented

7. **Integration testing**
   - Generate client code using openapi-generator
   - Test against actual XRPL server

### Phase 5: Documentation and Integration

8. **Add to build process**
   - Add npm script: `"generate:openapi": "ts-node scripts/generate-openapi-schema.ts"`
   - Integrate into CI/CD pipeline
   - Output to `openapi.json` or `openapi.yaml`

9. **Documentation**
   - Usage guide for the OpenAPI schema
   - Examples of client generation
   - API versioning explanation

## File Structure

```
xrpl.js/
├── scripts/
│   ├── openapi-config.json              # Configuration for schema generator
│   ├── generate-openapi-schema.ts       # Main generation script
│   ├── transform-to-openapi.ts          # JSON Schema → OpenAPI transformer
│   └── method-metadata.ts               # Metadata about methods (categories, versions)
├── openapi.json                         # Generated OpenAPI schema (output)
└── OPENAPI_IMPLEMENTATION_PLAN.md       # This document
```

## Technical Considerations

### ts-json-schema-generator Configuration

```typescript
{
  path: "packages/xrpl/src/models/methods/index.ts",
  tsconfig: "packages/xrpl/tsconfig.json",
  type: "*", // Generate all exported types
  expose: "export",
  topRef: false,
  jsDoc: "extended",
  skipTypeCheck: false,
  extraTags: ["category"]
}
```

### JSON-RPC Endpoint Representation

**Decision: Separate Path per Method** (See Decision 5 in `DECISION_REASONS.md`)

While XRPL actually uses a single JSON-RPC endpoint, the OpenAPI schema represents each method as a separate path for better developer experience:

```yaml
paths:
  /account_info:
    post:
      summary: Get basic data about an account
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/AccountInfoRequest'
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AccountInfoResponse'
  /tx:
    post:
      summary: Retrieve info about a transaction
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/TxRequest'
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TxResponse'
  # ... separate path for each method
```

**Benefits:**
- Better Swagger UI/Redoc experience
- Easier method discovery
- Better client code generation
- Standard OpenAPI pattern for JSON-RPC APIs

**Note:** Documentation will clarify that all methods actually use the same JSON-RPC endpoint in practice.

## Completeness Tracking

### Implementation Status

**Last Updated**: 2026-02-22

- **Total XRPL Methods**: 47
- **Target Methods** (HTTP-compatible): 38
- **Successfully Generated**: 35 methods ✅
- **Success Rate**: 92% of target (35/38)
- **Failed Methods**: 5 (due to ts-json-schema-generator limitations)
- **Excluded Methods**: 9 (admin-only, WebSocket-only, deprecated)

### Official XRPL Public API Methods (Source: https://xrpl.org/docs/references/http-websocket-apis/public-api-methods)

This section tracks the completeness of the OpenAPI schema against the official XRPL documentation.

#### Account Methods (10 methods) - ✅ 10/10 Generated

- [x] `account_channels` - Get a list of payment channels where the account is the source
  - 📖 https://xrpl.org/docs/references/http-websocket-apis/public-api-methods/account-methods/account_channels.md
- [x] `account_currencies` - Get a list of currencies an account can send or receive
  - 📖 https://xrpl.org/docs/references/http-websocket-apis/public-api-methods/account-methods/account_currencies.md
- [x] `account_info` - Get basic data about an account
  - 📖 https://xrpl.org/docs/references/http-websocket-apis/public-api-methods/account-methods/account_info.md
- [x] `account_lines` - Get info about an account's trust lines
  - 📖 https://xrpl.org/docs/references/http-websocket-apis/public-api-methods/account-methods/account_lines.md
- [x] `account_nfts` - Get a list of non-fungible tokens owned by an account
  - 📖 https://xrpl.org/docs/references/http-websocket-apis/public-api-methods/account-methods/account_nfts.md
- [x] `account_objects` - Get all ledger objects owned by an account
  - 📖 https://xrpl.org/docs/references/http-websocket-apis/public-api-methods/account-methods/account_objects.md
- [x] `account_offers` - Get info about an account's currency exchange offers
  - 📖 https://xrpl.org/docs/references/http-websocket-apis/public-api-methods/account-methods/account_offers.md
- [x] `account_tx` - Get info about an account's transactions
  - 📖 https://xrpl.org/docs/references/http-websocket-apis/public-api-methods/account-methods/account_tx.md
- [x] `gateway_balances` - Calculate total amounts issued by an account
  - 📖 https://xrpl.org/docs/references/http-websocket-apis/public-api-methods/account-methods/gateway_balances.md
- [x] `noripple_check` - Get recommended changes to an account's Default Ripple and No Ripple settings
  - 📖 https://xrpl.org/docs/references/http-websocket-apis/public-api-methods/account-methods/noripple_check.md

#### Ledger Methods (5 methods) - ✅ 3/5 Generated (2 failed)

- ❌ `ledger` - Get info about a ledger version - **FAILED** (ts-json-schema-generator bug)
  - 📖 https://xrpl.org/docs/references/http-websocket-apis/public-api-methods/ledger-methods/ledger.md
- [x] `ledger_closed` - Get the latest closed ledger version
  - 📖 https://xrpl.org/docs/references/http-websocket-apis/public-api-methods/ledger-methods/ledger_closed.md
- [x] `ledger_current` - Get the current working ledger version
  - 📖 https://xrpl.org/docs/references/http-websocket-apis/public-api-methods/ledger-methods/ledger_current.md
- [x] `ledger_data` - Get the raw contents of a ledger version
  - 📖 https://xrpl.org/docs/references/http-websocket-apis/public-api-methods/ledger-methods/ledger_data.md
- ❌ `ledger_entry` - Get one element from a ledger version - **FAILED** (type not found)
  - 📖 https://xrpl.org/docs/references/http-websocket-apis/public-api-methods/ledger-methods/ledger_entry.md

#### Transaction Methods (6 methods - 2 excluded) - ✅ 2/4 Generated (3 failed)

- [x] `submit` - Send a transaction to the network
  - 📖 https://xrpl.org/docs/references/http-websocket-apis/public-api-methods/transaction-methods/submit.md
- ❌ `submit_multisigned` - Send a multi-signed transaction to the network - **FAILED** (ts-json-schema-generator bug)
  - 📖 https://xrpl.org/docs/references/http-websocket-apis/public-api-methods/transaction-methods/submit_multisigned.md
- [x] `transaction_entry` - Retrieve info about a transaction from a particular ledger version
  - 📖 https://xrpl.org/docs/references/http-websocket-apis/public-api-methods/transaction-methods/transaction_entry.md
- ❌ `tx` - Retrieve info about a transaction from all the ledgers on hand - **FAILED** (type not found)
  - 📖 https://xrpl.org/docs/references/http-websocket-apis/public-api-methods/transaction-methods/tx.md
- ❌ `simulate` - Simulate a transaction (if available in xrpl.js) - **FAILED** (ts-json-schema-generator bug)
  - 📖 https://xrpl.org/docs/references/http-websocket-apis/public-api-methods/transaction-methods/simulate.md
- ❌ `sign` - **EXCLUDED** (Admin-only by default, requires public signing enabled)
  - 📖 https://xrpl.org/docs/references/http-websocket-apis/public-api-methods/transaction-methods/sign.md
- ❌ `sign_for` - **EXCLUDED** (Admin-only by default, requires public signing enabled)
  - 📖 https://xrpl.org/docs/references/http-websocket-apis/public-api-methods/transaction-methods/sign_for.md

#### Path and Order Book Methods (7 methods) - ✅ 7/7 Generated

- [x] `amm_info` - Get info about an Automated Market Maker (AMM)
  - 📖 https://xrpl.org/docs/references/http-websocket-apis/public-api-methods/path-and-order-book-methods/amm_info.md
- [x] `book_offers` - Get info about offers to exchange two currencies
  - 📖 https://xrpl.org/docs/references/http-websocket-apis/public-api-methods/path-and-order-book-methods/book_offers.md
- [x] `deposit_authorized` - Look up whether one account is authorized to send payments directly to another
  - 📖 https://xrpl.org/docs/references/http-websocket-apis/public-api-methods/path-and-order-book-methods/deposit_authorized.md
- [x] `nft_buy_offers` - Retrieve a list of buy offers for a specified NFToken object
  - 📖 https://xrpl.org/docs/references/http-websocket-apis/public-api-methods/path-and-order-book-methods/nft_buy_offers.md
- [x] `nft_sell_offers` - Retrieve a list of sell offers for a specified NFToken object
  - 📖 https://xrpl.org/docs/references/http-websocket-apis/public-api-methods/path-and-order-book-methods/nft_sell_offers.md
- [x] `path_find` - Find a path for a payment between two accounts and receive updates
  - 📖 https://xrpl.org/docs/references/http-websocket-apis/public-api-methods/path-and-order-book-methods/path_find.md
- [x] `ripple_path_find` - Find a path for payment between two accounts, once
  - 📖 https://xrpl.org/docs/references/http-websocket-apis/public-api-methods/path-and-order-book-methods/ripple_path_find.md

#### Payment Channel Methods (2 methods - 1 excluded) - ✅ 1/1 Generated

- [x] `channel_verify` - Check a payment channel claim's signature
  - 📖 https://xrpl.org/docs/references/http-websocket-apis/public-api-methods/payment-channel-methods/channel_verify.md
- ❌ `channel_authorize` - **EXCLUDED** (Admin-only by default, requires public signing enabled)
  - 📖 https://xrpl.org/docs/references/http-websocket-apis/public-api-methods/payment-channel-methods/channel_authorize.md

#### Subscription Methods (2 methods - BOTH EXCLUDED)

- ❌ `subscribe` - **EXCLUDED** (WebSocket-only streaming method)
  - 📖 https://xrpl.org/docs/references/http-websocket-apis/public-api-methods/subscription-methods/subscribe.md
- ❌ `unsubscribe` - **EXCLUDED** (WebSocket-only streaming method)
  - 📖 https://xrpl.org/docs/references/http-websocket-apis/public-api-methods/subscription-methods/unsubscribe.md

#### Server Info Methods (6 methods) - ✅ 6/6 Generated

- [x] `fee` - Get information about transaction cost
  - 📖 https://xrpl.org/docs/references/http-websocket-apis/public-api-methods/server-info-methods/fee.md
- [x] `feature` - Returns information about amendments this server knows about
  - 📖 https://xrpl.org/docs/references/http-websocket-apis/public-api-methods/server-info-methods/feature.md
- [x] `server_info` - Retrieve status of the server in human-readable format
  - 📖 https://xrpl.org/docs/references/http-websocket-apis/public-api-methods/server-info-methods/server_info.md
- [x] `server_state` - Retrieve status of the server in machine-readable format
  - 📖 https://xrpl.org/docs/references/http-websocket-apis/public-api-methods/server-info-methods/server_state.md
- [x] `server_definitions` - Retrieve a list of types and fields used for the XRPL's canonical binary format
  - 📖 https://xrpl.org/docs/references/http-websocket-apis/public-api-methods/server-info-methods/server_definitions.md
- [x] `manifest` - Retrieve the latest ephemeral public key information about a known validator
  - 📖 https://xrpl.org/docs/references/http-websocket-apis/public-api-methods/server-info-methods/manifest.md

#### Clio Methods (5 methods) - ✅ 3/3 Generated (2 are duplicates)

- [x] `server_info` (Clio variant) - Retrieve status of the Clio server (same as server_info above)
  - 📖 https://xrpl.org/docs/references/http-websocket-apis/public-api-methods/clio-methods/server_info-clio.md
- ❌ `ledger` (Clio variant) - Get info about a ledger version using Clio server's ledger API (duplicate, ledger failed above)
  - 📖 https://xrpl.org/docs/references/http-websocket-apis/public-api-methods/clio-methods/ledger-clio.md
- [x] `nft_info` - Retrieve information about the specified NFT using Clio server's nft_info API
  - 📖 https://xrpl.org/docs/references/http-websocket-apis/public-api-methods/clio-methods/nft_info.md
- [x] `nft_history` - Retrieve the history of ownership and transfers for the specified NFT
  - 📖 https://xrpl.org/docs/references/http-websocket-apis/public-api-methods/clio-methods/nft_history.md
- [x] `nfts_by_issuer` - Returns a list of NFTokens that are issued by the specified account
  - 📖 https://xrpl.org/docs/references/http-websocket-apis/public-api-methods/clio-methods/nfts_by_issuer.md

#### Utility Methods (3 methods - 1 excluded) - ✅ 2/2 Generated

- [x] `ping` - Confirm connectivity with the server
  - 📖 https://xrpl.org/docs/references/http-websocket-apis/public-api-methods/utility-methods/ping.md
- [x] `random` - Generate a random number
  - 📖 https://xrpl.org/docs/references/http-websocket-apis/public-api-methods/utility-methods/random.md
- ❌ `json` - **EXCLUDED** (Commandline-only proxy method)
  - 📖 https://xrpl.org/docs/references/http-websocket-apis/public-api-methods/utility-methods/json.md

#### Vault Methods (1 method) - ✅ 1/1 Generated

- [x] `vault_info` - Get information about a specific vault
  - 📖 https://xrpl.org/docs/references/http-websocket-apis/public-api-methods/vault-methods/vault_info.md

#### Deprecated Methods (EXCLUDED)
- ❌ `owner_info` - **EXCLUDED** (Deprecated, use account_objects instead)
  - 📖 https://xrpl.org/docs/references/http-websocket-apis/public-api-methods/account-methods/owner_info.md
- ❌ `tx_history` - **EXCLUDED** (Deprecated, use account_tx or ledger instead)
  - 📖 https://xrpl.org/docs/references/http-websocket-apis/public-api-methods/transaction-methods/tx_history.md

### Summary Statistics

**Total Official XRPL Public Methods:** 47

**Implementation Results:**
- **Target Methods (HTTP-compatible):** 38 methods
- **Successfully Generated:** 35 methods ✅
- **Failed to Generate:** 5 methods ❌ (due to ts-json-schema-generator limitations)
  - `ledger` (Ledger Methods)
  - `ledger_entry` (Ledger Methods)
  - `submit_multisigned` (Transaction Methods)
  - `tx` (Transaction Methods)
  - `simulate` (Transaction Methods)
- **Success Rate:** 92% (35/38)

**Exclusions:**
- **Excluded (WebSocket-only):** 2 methods (subscribe, unsubscribe)
- **Excluded (Admin-only):** 3 methods (sign, sign_for, channel_authorize)
- **Excluded (Commandline-only):** 1 method (json)
- **Excluded (Deprecated):** 2 methods (owner_info, tx_history)
- **Excluded (Clio duplicates):** 1 method (ledger_range - Clio-only)

**Note on API Versioning:** Since this schema supports API v2 only, all methods use their v2 response types. The 5 methods that had v1/v2 differences now only include their v2 variants.

### Validation Checklist

Use this checklist as the final validation step:

1. **Coverage Validation**
   - [ ] All 38 HTTP-compatible methods are present in the OpenAPI schema
   - [ ] All excluded methods are documented with reasons
   - [ ] No undocumented methods in the schema

2. **API Version Validation**
   - [ ] Schema supports API v2 only (not v1 or v3)
   - [ ] All response types use v2 variants
   - [ ] No v1-specific types are included
   - [ ] Documentation clearly states v2-only support

3. **Schema Quality Validation**
   - [ ] All request types are documented
   - [ ] All response types are documented
   - [ ] JSDoc comments are preserved in descriptions
   - [ ] Required fields are marked correctly
   - [ ] Optional fields are marked correctly

4. **OpenAPI Compliance**
   - [ ] Schema validates with @apidevtools/swagger-parser
   - [ ] OpenAPI version is 3.0.3 (not 3.1.0)
   - [ ] All $ref references resolve correctly
   - [ ] No circular references (or handled appropriately)
   - [ ] JSON Schema Draft-07 constructs properly transformed to OpenAPI 3.0.3

5. **Documentation Links**
   - [ ] All xrpl.org documentation links end with `.md` suffix
   - [ ] Links fetch markdown format correctly

## Success Criteria

- [ ] Valid OpenAPI 3.0.3 schema generated
- [ ] All 38 HTTP-compatible methods included (see completeness tracking above)
- [ ] API v2 only support (no v1 or v3)
- [ ] All response types use v2 variants
- [ ] WebSocket and admin-only methods excluded
- [ ] Schema validates with @apidevtools/swagger-parser
- [ ] JSON Schema Draft-07 to OpenAPI 3.0.3 transformation working correctly
- [ ] Separate paths per method for better developer experience
- [ ] All xrpl.org documentation links end with `.md` suffix
- [ ] Integrated into build process
- [ ] Documentation complete
- [ ] Completeness tracking shows 92% coverage (35/38 methods)

## Next Steps

1. Install ts-json-schema-generator
2. Create initial generation script
3. Test with a subset of methods (e.g., account_info, tx)
4. Expand to all methods
5. Add validation and testing
6. Verify completeness against official XRPL documentation
7. Integrate into build process
