import {
  BaseRequest,
  BaseResponse,
  LookupByLedgerRequest,
  PaginationRequest,
  PaginationResponse,
} from './baseMethod'

/**
 * The `account_nfts` method retrieves all of the NFTs currently owned by the
 * specified account.
 *
 * @category Requests
 */
export interface AccountNFTsRequest
  extends BaseRequest, LookupByLedgerRequest, PaginationRequest {
  command: 'account_nfts'
  /**
   * The unique identifier of an account, typically the account's address. The
   * request returns NFTs owned by this account.
   */
  account: string
}

/**
 * One NFToken that might be returned from an {@link AccountNFTsRequest}.
 *
 * @category Responses
 */
export interface AccountNFToken {
  Flags: number
  Issuer: string
  NFTokenID: string
  NFTokenTaxon: number
  URI?: string
  nft_serial: number
}

/**
 * Response expected from an {@link AccountNFTsRequest}.
 *
 * @category Responses
 */
export interface AccountNFTsResponse extends BaseResponse {
  result: {
    /**
     * The account requested.
     */
    account: string
    /**
     * A list of NFTs owned by the specified account.
     */
    account_nfts: AccountNFToken[]
    /**
     * The ledger index of the current open ledger, which was used when
     * retrieving this information.
     */
    ledger_current_index: number
    /** If true, this data comes from a validated ledger. */
    validated: boolean
  } & PaginationResponse
}
