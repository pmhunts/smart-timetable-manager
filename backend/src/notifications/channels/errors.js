/** Error raised by a channel provider; `retryable` tells the worker whether to back off and retry. */
class DeliveryError extends Error {
  constructor(message, { retryable = true, providerCode } = {}) {
    super(message);
    this.retryable = retryable;
    this.providerCode = providerCode;
  }
}

module.exports = { DeliveryError };
