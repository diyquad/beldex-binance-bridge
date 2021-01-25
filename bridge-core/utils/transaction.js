/* eslint-disable import/prefer-default-export */
import { TYPE } from './constants';

/**
 * Helper class for incoming transactions
 */
export default class TransactionHelper {
  /**
   * Create a helper instance.
   * @param {{ binance: { client, ourAddress }, loki: { client }}} config The helper config.
   */
  constructor(config) {
    const { binance, loki } = config;

    this.bnb = binance.client;
    this.ourBNBAddress = binance.ourAddress;

    this.loki = loki.client;
  }

  /**
   * Get incoming transactions to the given account.
   *
   * @param {any} account The account.
   * @param {'loki'|'bnb'} accountType The account type.
   * @return {Promise<{ hash, amount }>} An array of incoming transactions
   */
  async getIncomingTransactions(account, accountType) {
    switch (accountType) {
      case TYPE.BNB: {
        const { memo } = account;
        const transactions = await this.getIncomingBNBTransactions(this.ourBNBAddress);
        return transactions
          .filter(tx => tx.memo.trim() === memo.trim())
          .map(({ hash, amount, timestamp }) => ({ hash, amount, timestamp }));
      }
      case TYPE.LOKI: {
        const { addressIndex } = account;

        // We only want transactions that have been confirmed
        const transactions = await this.getIncomingLokiTransactions(addressIndex);
        return transactions
          .filter(tx => tx.confirmed)
          .map(({ hash, amount, timestamp }) => ({ hash, amount, timestamp }));
      }
      default:
        return [];
    }
  }

  /**
   * Get incoming transactions from the given BNB address.
   * @param {string} address The BNB address
   * @param {number} since The time since a given date in milliseconds.
   */
  async getIncomingBNBTransactions(address, since = null) {
    const transactions = await this.bnb.getIncomingTransactions(address, since);
    return transactions.map(tx => ({
      ...tx,
      hash: tx.txHash,
      amount: tx.value,
      // BNB timestamps are in string format, we need to convert to seconds
      timestamp: Math.floor(Date.parse(tx.timeStamp) / 1000),
    }));
  }

  /**
   * Get incoming transactions from the given BDX address.
   * @param {number} addressIndex The BDX address index.
   * @param {{ pool: boolean }} options Any additional options
   * @returns {Promise<{ hash, amount, confirmed }>} An array of incoming transactions
   */
  async getIncomingLokiTransactions(addressIndex, options = {}) {
    const transactions = await this.loki.getIncomingTransactions(addressIndex, options);
    return transactions.map(tx => ({
      ...tx,
      confirmed: !!tx.checkpointed,
      hash: tx.txid,
      amount: tx.amount,
    }));
  }
}
