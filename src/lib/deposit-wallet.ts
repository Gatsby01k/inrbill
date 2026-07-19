import { isValidTronAddress } from "@/lib/deposit-policy";

export function companyUsdtTrc20Address() {
  const address = process.env.USDT_TRC20_DEPOSIT_ADDRESS?.trim() ?? "";
  return isValidTronAddress(address) ? address : null;
}

export function tronAddressUrl(address: string) {
  return `https://tronscan.org/#/address/${encodeURIComponent(address)}`;
}

export function tronTransactionUrl(transactionHash: string) {
  return `https://tronscan.org/#/transaction/${encodeURIComponent(transactionHash)}`;
}
