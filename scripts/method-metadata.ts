/**
 * Metadata about XRPL API methods for OpenAPI schema generation
 */

export interface MethodMetadata {
  /** The command name as used in requests */
  command: string;
  /** Human-readable description */
  description: string;
  /** Category for organization */
  category: string;
  /** Whether this method has v1/v2 differences */
  hasVersionDifferences: boolean;
  /** Whether to include in OpenAPI schema */
  includeInSchema: boolean;
  /** Reason for exclusion if not included */
  exclusionReason?: string;
  /** Request type name */
  requestType: string;
  /** Response type name (v2 or generic) */
  responseType: string;
  /** V1 response type name if different */
  responseTypeV1?: string;
}

/**
 * Complete list of XRPL public API methods with metadata
 * Source: https://xrpl.org/docs/references/http-websocket-apis/public-api-methods
 */
export const XRPL_METHODS: MethodMetadata[] = [
  // Account Methods (10)
  {
    command: "account_channels",
    description:
      "Get a list of payment channels where the account is the source",
    category: "Account Methods",
    hasVersionDifferences: false,
    includeInSchema: true,
    requestType: "AccountChannelsRequest",
    responseType: "AccountChannelsResponse",
  },
  {
    command: "account_currencies",
    description: "Get a list of currencies an account can send or receive",
    category: "Account Methods",
    hasVersionDifferences: false,
    includeInSchema: true,
    requestType: "AccountCurrenciesRequest",
    responseType: "AccountCurrenciesResponse",
  },
  {
    command: "account_info",
    description: "Get basic data about an account",
    category: "Account Methods",
    hasVersionDifferences: true,
    includeInSchema: true,
    requestType: "AccountInfoRequest",
    responseType: "AccountInfoResponse",
    responseTypeV1: "AccountInfoV1Response",
  },
  {
    command: "account_lines",
    description: "Get info about an account's trust lines",
    category: "Account Methods",
    hasVersionDifferences: false,
    includeInSchema: true,
    requestType: "AccountLinesRequest",
    responseType: "AccountLinesResponse",
  },
  {
    command: "account_nfts",
    description: "Get a list of non-fungible tokens owned by an account",
    category: "Account Methods",
    hasVersionDifferences: false,
    includeInSchema: true,
    requestType: "AccountNFTsRequest",
    responseType: "AccountNFTsResponse",
  },
  {
    command: "account_objects",
    description: "Get all ledger objects owned by an account",
    category: "Account Methods",
    hasVersionDifferences: false,
    includeInSchema: true,
    requestType: "AccountObjectsRequest",
    responseType: "AccountObjectsResponse",
  },
  {
    command: "account_offers",
    description: "Get info about an account's currency exchange offers",
    category: "Account Methods",
    hasVersionDifferences: false,
    includeInSchema: true,
    requestType: "AccountOffersRequest",
    responseType: "AccountOffersResponse",
  },
  {
    command: "account_tx",
    description: "Get info about an account's transactions",
    category: "Account Methods",
    hasVersionDifferences: true,
    includeInSchema: true,
    requestType: "AccountTxRequest",
    responseType: "AccountTxResponse",
    responseTypeV1: "AccountTxV1Response",
  },
  {
    command: "gateway_balances",
    description: "Calculate total amounts issued by an account",
    category: "Account Methods",
    hasVersionDifferences: false,
    includeInSchema: true,
    requestType: "GatewayBalancesRequest",
    responseType: "GatewayBalancesResponse",
  },
  {
    command: "noripple_check",
    description:
      "Get recommended changes to an account's Default Ripple and No Ripple settings",
    category: "Account Methods",
    hasVersionDifferences: false,
    includeInSchema: true,
    requestType: "NoRippleCheckRequest",
    responseType: "NoRippleCheckResponse",
  },

  // Ledger Methods (5)
  {
    command: "ledger",
    description: "Get info about a ledger version",
    category: "Ledger Methods",
    hasVersionDifferences: true,
    includeInSchema: true,
    requestType: "LedgerRequest",
    responseType: "LedgerResponse",
    responseTypeV1: "LedgerV1Response",
  },
  {
    command: "ledger_closed",
    description: "Get the latest closed ledger version",
    category: "Ledger Methods",
    hasVersionDifferences: false,
    includeInSchema: true,
    requestType: "LedgerClosedRequest",
    responseType: "LedgerClosedResponse",
  },
  {
    command: "ledger_current",
    description: "Get the current working ledger version",
    category: "Ledger Methods",
    hasVersionDifferences: false,
    includeInSchema: true,
    requestType: "LedgerCurrentRequest",
    responseType: "LedgerCurrentResponse",
  },
  {
    command: "ledger_data",
    description: "Get the raw contents of a ledger version",
    category: "Ledger Methods",
    hasVersionDifferences: false,
    includeInSchema: true,
    requestType: "LedgerDataRequest",
    responseType: "LedgerDataResponse",
  },
  {
    command: "ledger_entry",
    description: "Get one element from a ledger version",
    category: "Ledger Methods",
    hasVersionDifferences: false,
    includeInSchema: true,
    requestType: "LedgerEntryRequest",
    responseType: "LedgerEntryResponse",
  },

  // Transaction Methods (6 total, 4 included, 2 excluded)
  {
    command: "submit",
    description: "Send a transaction to the network",
    category: "Transaction Methods",
    hasVersionDifferences: false,
    includeInSchema: true,
    requestType: "SubmitRequest",
    responseType: "SubmitResponse",
  },
  {
    command: "submit_multisigned",
    description: "Send a multi-signed transaction to the network",
    category: "Transaction Methods",
    hasVersionDifferences: true,
    includeInSchema: true,
    requestType: "SubmitMultisignedRequest",
    responseType: "SubmitMultisignedResponse",
    responseTypeV1: "SubmitMultisignedV1Response",
  },
  {
    command: "transaction_entry",
    description:
      "Retrieve info about a transaction from a particular ledger version",
    category: "Transaction Methods",
    hasVersionDifferences: false,
    includeInSchema: true,
    requestType: "TransactionEntryRequest",
    responseType: "TransactionEntryResponse",
  },
  {
    command: "tx",
    description:
      "Retrieve info about a transaction from all the ledgers on hand",
    category: "Transaction Methods",
    hasVersionDifferences: true,
    includeInSchema: true,
    requestType: "TxRequest",
    responseType: "TxResponse",
    responseTypeV1: "TxV1Response",
  },
  {
    command: "simulate",
    description: "Simulate a transaction",
    category: "Transaction Methods",
    hasVersionDifferences: false,
    includeInSchema: true,
    requestType: "SimulateRequest",
    responseType: "SimulateResponse",
  },
  {
    command: "sign",
    description: "Cryptographically sign a transaction",
    category: "Transaction Methods",
    hasVersionDifferences: false,
    includeInSchema: false,
    exclusionReason: "Admin-only by default, requires public signing enabled",
    requestType: "SignRequest",
    responseType: "SignResponse",
  },
  {
    command: "sign_for",
    description: "Contribute to a multi-signature",
    category: "Transaction Methods",
    hasVersionDifferences: false,
    includeInSchema: false,
    exclusionReason: "Admin-only by default, requires public signing enabled",
    requestType: "SignForRequest",
    responseType: "SignForResponse",
  },

  // Path and Order Book Methods (7)
  {
    command: "amm_info",
    description: "Get info about an Automated Market Maker (AMM)",
    category: "Path and Order Book Methods",
    hasVersionDifferences: false,
    includeInSchema: true,
    requestType: "AMMInfoRequest",
    responseType: "AMMInfoResponse",
  },
  {
    command: "book_offers",
    description: "Get info about offers to exchange two currencies",
    category: "Path and Order Book Methods",
    hasVersionDifferences: false,
    includeInSchema: true,
    requestType: "BookOffersRequest",
    responseType: "BookOffersResponse",
  },
  {
    command: "deposit_authorized",
    description:
      "Look up whether one account is authorized to send payments directly to another",
    category: "Path and Order Book Methods",
    hasVersionDifferences: false,
    includeInSchema: true,
    requestType: "DepositAuthorizedRequest",
    responseType: "DepositAuthorizedResponse",
  },
  {
    command: "nft_buy_offers",
    description: "Retrieve a list of buy offers for a specified NFToken object",
    category: "Path and Order Book Methods",
    hasVersionDifferences: false,
    includeInSchema: true,
    requestType: "NFTBuyOffersRequest",
    responseType: "NFTBuyOffersResponse",
  },
  {
    command: "nft_sell_offers",
    description:
      "Retrieve a list of sell offers for a specified NFToken object",
    category: "Path and Order Book Methods",
    hasVersionDifferences: false,
    includeInSchema: true,
    requestType: "NFTSellOffersRequest",
    responseType: "NFTSellOffersResponse",
  },
  {
    command: "path_find",
    description:
      "Find a path for a payment between two accounts and receive updates",
    category: "Path and Order Book Methods",
    hasVersionDifferences: false,
    includeInSchema: true,
    requestType: "PathFindRequest",
    responseType: "PathFindResponse",
  },
  {
    command: "ripple_path_find",
    description: "Find a path for payment between two accounts, once",
    category: "Path and Order Book Methods",
    hasVersionDifferences: false,
    includeInSchema: true,
    requestType: "RipplePathFindRequest",
    responseType: "RipplePathFindResponse",
  },

  // Payment Channel Methods (2 total, 1 included, 1 excluded)
  {
    command: "channel_verify",
    description: "Check a payment channel claim's signature",
    category: "Payment Channel Methods",
    hasVersionDifferences: false,
    includeInSchema: true,
    requestType: "ChannelVerifyRequest",
    responseType: "ChannelVerifyResponse",
  },
  {
    command: "channel_authorize",
    description: "Create a signature to authorize a payment channel claim",
    category: "Payment Channel Methods",
    hasVersionDifferences: false,
    includeInSchema: false,
    exclusionReason: "Admin-only by default, requires public signing enabled",
    requestType: "ChannelAuthorizeRequest",
    responseType: "ChannelAuthorizeResponse",
  },

  // Subscription Methods (2 total, both excluded)
  {
    command: "subscribe",
    description: "Listen for updates about a particular subject",
    category: "Subscription Methods",
    hasVersionDifferences: false,
    includeInSchema: false,
    exclusionReason: "WebSocket-only streaming method",
    requestType: "SubscribeRequest",
    responseType: "SubscribeResponse",
  },
  {
    command: "unsubscribe",
    description: "Stop listening for updates about a particular subject",
    category: "Subscription Methods",
    hasVersionDifferences: false,
    includeInSchema: false,
    exclusionReason: "WebSocket-only streaming method",
    requestType: "UnsubscribeRequest",
    responseType: "UnsubscribeResponse",
  },

  // Server Info Methods (6)
  {
    command: "fee",
    description: "Get information about transaction cost",
    category: "Server Info Methods",
    hasVersionDifferences: false,
    includeInSchema: true,
    requestType: "FeeRequest",
    responseType: "FeeResponse",
  },
  {
    command: "feature",
    description: "Returns information about amendments this server knows about",
    category: "Server Info Methods",
    hasVersionDifferences: false,
    includeInSchema: true,
    requestType: "FeatureRequest",
    responseType: "FeatureResponse",
  },
  {
    command: "server_info",
    description: "Retrieve status of the server in human-readable format",
    category: "Server Info Methods",
    hasVersionDifferences: false,
    includeInSchema: true,
    requestType: "ServerInfoRequest",
    responseType: "ServerInfoResponse",
  },
  {
    command: "server_state",
    description: "Retrieve status of the server in machine-readable format",
    category: "Server Info Methods",
    hasVersionDifferences: false,
    includeInSchema: true,
    requestType: "ServerStateRequest",
    responseType: "ServerStateResponse",
  },
  {
    command: "server_definitions",
    description:
      "Retrieve a list of types and fields used for the XRPL's canonical binary format",
    category: "Server Info Methods",
    hasVersionDifferences: false,
    includeInSchema: true,
    requestType: "ServerDefinitionsRequest",
    responseType: "ServerDefinitionsResponse",
  },
  {
    command: "manifest",
    description:
      "Retrieve the latest ephemeral public key information about a known validator",
    category: "Server Info Methods",
    hasVersionDifferences: false,
    includeInSchema: true,
    requestType: "ManifestRequest",
    responseType: "ManifestResponse",
  },

  // Clio Methods (5)
  {
    command: "nft_info",
    description:
      "Retrieve information about the specified NFT using Clio server",
    category: "Clio Methods",
    hasVersionDifferences: false,
    includeInSchema: true,
    requestType: "NFTInfoRequest",
    responseType: "NFTInfoResponse",
  },
  {
    command: "nft_history",
    description:
      "Retrieve the history of ownership and transfers for the specified NFT",
    category: "Clio Methods",
    hasVersionDifferences: false,
    includeInSchema: true,
    requestType: "NFTHistoryRequest",
    responseType: "NFTHistoryResponse",
  },
  {
    command: "nfts_by_issuer",
    description:
      "Returns a list of NFTokens that are issued by the specified account",
    category: "Clio Methods",
    hasVersionDifferences: false,
    includeInSchema: true,
    requestType: "NFTsByIssuerRequest",
    responseType: "NFTsByIssuerResponse",
  },

  // Utility Methods (3 total, 2 included, 1 excluded)
  {
    command: "ping",
    description: "Confirm connectivity with the server",
    category: "Utility Methods",
    hasVersionDifferences: false,
    includeInSchema: true,
    requestType: "PingRequest",
    responseType: "PingResponse",
  },
  {
    command: "random",
    description: "Generate a random number",
    category: "Utility Methods",
    hasVersionDifferences: false,
    includeInSchema: true,
    requestType: "RandomRequest",
    responseType: "RandomResponse",
  },
  {
    command: "json",
    description: "Pass JSON through to the server",
    category: "Utility Methods",
    hasVersionDifferences: false,
    includeInSchema: false,
    exclusionReason: "Commandline-only proxy method",
    requestType: "JsonRequest",
    responseType: "JsonResponse",
  },

  // Vault Methods (1)
  {
    command: "vault_info",
    description: "Get information about a specific vault",
    category: "Vault Methods",
    hasVersionDifferences: false,
    includeInSchema: true,
    requestType: "VaultInfoRequest",
    responseType: "VaultInfoResponse",
  },

  // Deprecated Methods (2 total, both excluded)
  {
    command: "owner_info",
    description: "Get info about an account (deprecated)",
    category: "Deprecated Methods",
    hasVersionDifferences: false,
    includeInSchema: false,
    exclusionReason: "Deprecated, use account_objects instead",
    requestType: "OwnerInfoRequest",
    responseType: "OwnerInfoResponse",
  },
  {
    command: "tx_history",
    description: "Get transaction history (deprecated)",
    category: "Deprecated Methods",
    hasVersionDifferences: false,
    includeInSchema: false,
    exclusionReason: "Deprecated, use account_tx or ledger instead",
    requestType: "TxHistoryRequest",
    responseType: "TxHistoryResponse",
  },
];

/**
 * Get methods that should be included in the OpenAPI schema
 */
export function getIncludedMethods(): MethodMetadata[] {
  return XRPL_METHODS.filter((m) => m.includeInSchema);
}

/**
 * Get methods that have version differences (v1/v2)
 */
export function getVersionedMethods(): MethodMetadata[] {
  return XRPL_METHODS.filter((m) => m.hasVersionDifferences);
}

/**
 * Get methods by category
 */
export function getMethodsByCategory(category: string): MethodMetadata[] {
  return XRPL_METHODS.filter((m) => m.category === category);
}
