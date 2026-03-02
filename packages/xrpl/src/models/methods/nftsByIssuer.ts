import { NFToken } from '../common'

import {
  BaseRequest,
  BaseResponse,
  LookupByLedgerRequest,
  PaginationRequest,
  PaginationResponse,
} from './baseMethod'

/**
 * The nfts_by_issuer method returns a list of NFTokens issued by the account.
 * The order of the NFTs is not associated with the date the NFTs were minted.
 * Expects a response in the form of a {@link
 * NFTsByIssuerResponse}.
 *
 * @category Requests
 */
export interface NFTsByIssuerRequest
  extends BaseRequest, LookupByLedgerRequest, PaginationRequest {
  command: 'nfts_by_issuer'
  /**
   * A unique identifier for the account, most commonly the account's address
   */
  issuer: string
  /**
   * Filter NFTs issued by this issuer that have this taxon.
   */
  nft_taxon?: number
}

/**
 * Expected response from an {@link NFTsByIssuerRequest}.
 *
 * @category Responses
 */
export interface NFTsByIssuerResponse extends BaseResponse {
  result: {
    /**
     * The unique identifier for the account, most commonly the account's address
     */
    issuer: string
    /**
     * A list of NFTs issued by the account.
     * The order of the NFTs is not associated with the date the NFTs were minted.
     */
    nfts: NFToken[]
    /**
     * Use to filter NFTs issued by this issuer that have this taxon.
     */
    nft_taxon?: number
  } & PaginationResponse
}
