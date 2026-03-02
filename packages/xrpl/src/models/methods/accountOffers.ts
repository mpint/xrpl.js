import { Amount } from '../common'

import {
  BaseRequest,
  BaseResponse,
  LookupByLedgerRequest,
  PaginationRequest,
  PaginationResponse,
} from './baseMethod'

/**
 * The account_offers method retrieves a list of offers made by a given account
 * that are outstanding as of a particular ledger version. Expects a response in
 * the form of a {@link AccountOffersResponse}.
 *
 * @category Requests
 */
export interface AccountOffersRequest
  extends BaseRequest, LookupByLedgerRequest, PaginationRequest {
  command: 'account_offers'
  /** A unique identifier for the account, most commonly the account's Address. */
  account: string
  /**
   * If true, then the account field only accepts a public key or XRP Ledger
   * address. Otherwise, account can be a secret or passphrase (not
   * recommended). The default is false.
   */
  strict?: boolean
}

export interface AccountOffer {
  /** Options set for this offer entry as bit-flags. */
  flags: number
  /** Sequence number of the transaction that created this entry. */
  seq: number
  /**
   * The amount the account placing this Offer receives.
   */
  taker_gets: Amount
  /**
   * The amount the account placing this Offer pays.
   */
  taker_pays: Amount
  /**
   * The exchange rate of the Offer, as the ratio of the original taker_pays
   * divided by the original taker_gets. When executing offers, the offer with
   * the most favorable (lowest) quality is consumed first; offers with the same
   * quality are executed from oldest to newest.
   */
  quality: string
  /**
   * A time after which this offer is considered unfunded, as the number of
   * seconds since the Ripple Epoch. See also: Offer Expiration.
   */
  expiration?: number
}

/**
 * Response expected from an {@link AccountOffersRequest}.
 *
 * @category Responses
 */
export interface AccountOffersResponse extends BaseResponse {
  result: {
    /** Unique Address identifying the account that made the offers. */
    account: string
    /**
     * Array of objects, where each object represents an offer made by this
     * account that is outstanding as of the requested ledger version. If the
     * number of offers is large, only returns up to limit at a time.
     */
    offers?: AccountOffer[]
    /**
     * The ledger index of the current in-progress ledger version, which was
     * used when retrieving this data.
     */
    ledger_current_index?: number
    /**
     * The ledger index of the ledger version that was used when retrieving
     * this data, as requested.
     */
    ledger_index?: number
    /**
     * The identifying hash of the ledger version that was used when retrieving
     * this data.
     */
    ledger_hash?: string
  } & PaginationResponse
}
