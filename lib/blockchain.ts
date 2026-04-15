import { ethers } from "ethers"
import { BSC_CONFIG, ETH_CONFIG, BSC_RPCS, ETH_RPCS, USDT_ABI } from "./constants"
import type { AllowanceInfo } from "./types"

// RPC Provider with fallback support
async function createProviderWithFallback(rpcs: string[], timeout = 10000): Promise<ethers.JsonRpcProvider | null> {
  for (const rpc of rpcs) {
    try {
      const provider = new ethers.JsonRpcProvider(rpc)
      // Test the connection with a timeout
      const blockNumberPromise = provider.getBlockNumber()
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("RPC timeout")), timeout),
      )

      await Promise.race([blockNumberPromise, timeoutPromise])
      return provider
    } catch (error) {
      console.error(`[v0] RPC ${rpc} failed:`, error)
      continue
    }
  }
  return null
}

async function safeContractCall<T>(contractCall: Promise<T>, defaultValue: T, errorContext: string): Promise<T> {
  try {
    const result = await contractCall
    return result
  } catch (error: any) {
    // Handle BUFFER_OVERRUN and other contract call errors
    if (error.code === "BUFFER_OVERRUN" || error.message?.includes("slice beyond data bounds")) {
      console.warn(`[v0] ${errorContext}: Contract returned no data, using default value`)
      return defaultValue
    }
    throw error
  }
}

// Get balance and allowance for a specific address on BSC
export async function getBSCAllowance(userAddress: string): Promise<AllowanceInfo> {
  try {
    const provider = await createProviderWithFallback(BSC_RPCS)
    if (!provider) {
      return {
        balance: "0",
        allowance: "0",
        available: "0",
        error: "All BSC RPC endpoints failed",
      }
    }

    const usdtContract = new ethers.Contract(BSC_CONFIG.USDT_CONTRACT, USDT_ABI, provider)

    // Get balance and allowance in parallel with error handling
    const [balanceRaw, allowanceRaw] = await Promise.all([
      safeContractCall(usdtContract.balanceOf(userAddress), BigInt(0), "BSC balanceOf"),
      safeContractCall(usdtContract.allowance(userAddress, BSC_CONFIG.TOKEN_COLLECTOR), BigInt(0), "BSC allowance"),
    ])

    const balance = ethers.formatUnits(balanceRaw, BSC_CONFIG.DECIMALS)
    const allowance = ethers.formatUnits(allowanceRaw, BSC_CONFIG.DECIMALS)
    const available = Math.min(Number.parseFloat(balance), Number.parseFloat(allowance)).toString()

    return {
      balance: Number.parseFloat(balance).toFixed(2),
      allowance: Number.parseFloat(allowance).toFixed(2),
      available: Number.parseFloat(available).toFixed(2),
      error: null,
    }
  } catch (error) {
    console.error("[v0] Error fetching BSC allowance:", error)
    return {
      balance: "0",
      allowance: "0",
      available: "0",
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

// Get balance and allowance for a specific address on ETH
export async function getETHAllowance(userAddress: string): Promise<AllowanceInfo> {
  try {
    const provider = await createProviderWithFallback(ETH_RPCS)
    if (!provider) {
      return {
        balance: "0",
        allowance: "0",
        available: "0",
        error: "All ETH RPC endpoints failed",
      }
    }

    const usdtContract = new ethers.Contract(ETH_CONFIG.USDT_CONTRACT, USDT_ABI, provider)

    // Get balance and allowance in parallel with error handling
    const [balanceRaw, allowanceRaw] = await Promise.all([
      safeContractCall(usdtContract.balanceOf(userAddress), BigInt(0), "ETH balanceOf"),
      safeContractCall(usdtContract.allowance(userAddress, ETH_CONFIG.TOKEN_COLLECTOR), BigInt(0), "ETH allowance"),
    ])

    const balance = ethers.formatUnits(balanceRaw, ETH_CONFIG.DECIMALS)
    const allowance = ethers.formatUnits(allowanceRaw, ETH_CONFIG.DECIMALS)
    const available = Math.min(Number.parseFloat(balance), Number.parseFloat(allowance)).toString()

    return {
      balance: Number.parseFloat(balance).toFixed(2),
      allowance: Number.parseFloat(allowance).toFixed(2),
      available: Number.parseFloat(available).toFixed(2),
      error: null,
    }
  } catch (error) {
    console.error("[v0] Error fetching ETH allowance:", error)
    return {
      balance: "0",
      allowance: "0",
      available: "0",
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

// Get allowance based on chain
export async function getAllowanceForChain(userAddress: string, chain: "BSC" | "ETH"): Promise<AllowanceInfo> {
  if (chain === "BSC") {
    return getBSCAllowance(userAddress)
  } else {
    return getETHAllowance(userAddress)
  }
}

// Batch fetch allowances for multiple addresses
export async function batchFetchAllowances(
  addresses: Array<{ address: string; chain: "BSC" | "ETH" }>,
): Promise<Record<string, AllowanceInfo>> {
  const results: Record<string, AllowanceInfo> = {}

  // Process in batches of 5 to avoid overwhelming RPCs
  const batchSize = 5
  for (let i = 0; i < addresses.length; i += batchSize) {
    const batch = addresses.slice(i, i + batchSize)
    const batchResults = await Promise.all(
      batch.map(async ({ address, chain }) => {
        const allowance = await getAllowanceForChain(address, chain)
        return { address, allowance }
      }),
    )

    for (const { address, allowance } of batchResults) {
      results[address] = allowance
    }
  }

  return results
}
