import { isValidTronAddress } from "@/lib/deposit-policy";

// Public receiving address — safe to expose in the authenticated partner UI.
// An environment override keeps wallet rotation possible without a code change.
export const DEFAULT_USDT_TRC20_DEPOSIT_ADDRESS = "TJNzB4sUGBo8fv7UdeeKQKQUffpfLSXbPP";

export function companyUsdtTrc20Address() {
  const address = process.env.USDT_TRC20_DEPOSIT_ADDRESS?.trim() || DEFAULT_USDT_TRC20_DEPOSIT_ADDRESS;
  return isValidTronAddress(address) ? address : null;
}

export function tronAddressUrl(address: string) {
  return `https://tronscan.org/#/address/${encodeURIComponent(address)}`;
}

export function tronTransactionUrl(transactionHash: string) {
  return `https://tronscan.org/#/transaction/${encodeURIComponent(transactionHash)}`;
}
