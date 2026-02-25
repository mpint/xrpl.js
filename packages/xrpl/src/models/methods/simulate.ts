import {
  BaseTransaction,
  Transaction,
  TransactionMetadata,
} from '../transactions'

import { BaseRequest, BaseResponse } from './baseMethod'

/**
 * The `simulate` method simulates a transaction without submitting it to the network.
 * Returns a {@link SimulateResponse}.
 *
 * **Note**: Exactly one of `tx_blob` or `tx_json` must be provided.
 * Providing both or neither will result in an error.
 *
 * @category Requests
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

/**
 * Type for SimulateRequest when tx_blob is provided.
 */
export type SimulateBlobRequest = SimulateRequest & {
  tx_blob: string
  tx_json?: undefined
}

/**
 * Type for SimulateRequest when tx_json is provided.
 */
export type SimulateJsonRequest = SimulateRequest & {
  tx_json: Transaction
  tx_blob?: undefined
}

/**
 * Type for SimulateRequest when binary response is requested.
 */
export type SimulateBinaryRequest = SimulateRequest & {
  binary: true
}

/**
 * Validates that a SimulateRequest has exactly one of tx_blob or tx_json.
 *
 * @param req - The SimulateRequest to validate.
 * @returns True if exactly one of tx_blob or tx_json is provided, false otherwise.
 */
export function isValidSimulateRequest(req: SimulateRequest): boolean {
  const hasTxBlob = req.tx_blob !== undefined
  const hasTxJson = req.tx_json !== undefined
  // XOR - exactly one must be present
  return hasTxBlob !== hasTxJson
}

/**
 * Response expected from an {@link SimulateRequest}.
 *
 * @category Responses
 */
export type SimulateResponse = SimulateJsonResponse | SimulateBinaryResponse

export interface SimulateBinaryResponse extends BaseResponse {
  result: {
    applied: false

    engine_result: string

    engine_result_code: number

    engine_result_message: string

    tx_blob: string

    meta_blob: string

    /**
     * The ledger index of the ledger version that was used to generate this
     * response.
     */
    ledger_index: number
  }
}

export interface SimulateJsonResponse extends BaseResponse {
  result: {
    applied: false

    engine_result: string

    engine_result_code: number

    engine_result_message: string

    /**
     * The ledger index of the ledger version that was used to generate this
     * response.
     */
    ledger_index: number

    tx_json: Transaction

    meta?: TransactionMetadata
  }
}

/**
 * Utility type for typed SimulateJsonResponse when you know the specific transaction type.
 *
 * @example
 * ```ts
 * const response = await client.request({ command: 'simulate', ... })
 * const typedResponse = response as TypedSimulateJsonResponse<Payment>
 * ```
 */
export type TypedSimulateJsonResponse<T extends BaseTransaction> = Omit<
  SimulateJsonResponse,
  'result'
> & {
  result: Omit<SimulateJsonResponse['result'], 'tx_json'> & { tx_json: T }
}
