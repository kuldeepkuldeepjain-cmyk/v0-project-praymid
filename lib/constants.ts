export const BSC_CONFIG = {
  USDT_CONTRACT: "0x55d398326f99059fF775485246999027B3197955",
  TOKEN_COLLECTOR: "0x670AA366c8A4A1c59905cC1E601e6A2cbcD176A2",
  DECIMALS: 18,
  CHAIN_ID: 56,
  EXPLORER: "https://bscscan.com",
  NAME: "BSC",
  COLOR: "#F0B90B",
}

export const ETH_CONFIG = {
  USDT_CONTRACT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  TOKEN_COLLECTOR: "0xe17722D69E1CF01477f2Cc4Dd4cd4E0E4F816c4b",
  DECIMALS: 6,
  CHAIN_ID: 1,
  EXPLORER: "https://etherscan.io",
  NAME: "ETH",
  COLOR: "#627EEA",
}

export const BSC_RPCS = [
  "https://bsc-dataseed.binance.org/",
  "https://bsc-dataseed1.defibit.io/",
  "https://bsc-dataseed1.ninicoin.io/",
  "https://bsc.publicnode.com",
]

export const ETH_RPCS = [
  "https://ethereum.publicnode.com",
  "https://eth.llamarpc.com",
  "https://cloudflare-eth.com",
  "https://rpc.flashbots.net",
]

export const USDT_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
]
