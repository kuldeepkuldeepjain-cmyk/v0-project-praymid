import { NextResponse } from "next/server"
import { getAllParticipants } from "@/lib/data-store"
import type { UserRank } from "@/lib/types"

// Mock leaderboard data with 100 participants
const generateMockLeaderboard = () => {
  const ranks: UserRank[] = ["platinum", "gold", "silver", "bronze"]
  const usernames = [
    "crypto_king",
    "blockchain_master",
    "flow_wizard",
    "chain_lord",
    "node_ninja",
    "hash_hunter",
    "token_trader",
    "defi_dragon",
    "yield_yogi",
    "stake_shark",
    "mint_master",
    "gas_guru",
    "wallet_warrior",
    "ledger_legend",
    "block_boss",
    "satoshi_student",
    "eth_eagle",
    "sol_surfer",
    "ada_ace",
    "dot_diver",
    "bnb_baron",
    "matic_maven",
    "avax_alpha",
    "ftm_falcon",
    "near_nomad",
    "atom_archer",
    "luna_legend",
    "algo_artist",
    "xtz_xpert",
    "egld_elite",
    "flow_founder",
    "hbar_hero",
    "theta_thunder",
    "vet_viking",
    "one_oracle",
    "zil_zen",
    "enj_emperor",
    "sand_sultan",
    "mana_mogul",
    "axs_ace",
    "slp_sniper",
    "gala_giant",
    "imx_icon",
    "lrc_lord",
    "ens_expert",
    "aave_angel",
    "comp_chief",
    "mkr_master",
    "snx_sage",
    "yfi_yoda",
    "crv_captain",
    "bal_boss",
    "sushi_samurai",
    "uni_unicorn",
    "cake_king",
    "quick_queen",
    "joe_joker",
    "spell_spirit",
    "time_titan",
    "ohm_omega",
    "klima_knight",
    "fox_fury",
    "shib_shark",
    "doge_duke",
    "floki_flame",
    "elon_eagle",
    "safe_sage",
    "baby_baron",
    "kishu_king",
    "akita_ace",
    "hoge_hero",
    "pit_prince",
    "leash_legend",
    "bone_boss",
    "ryoshi_royal",
    "pawth_pioneer",
    "klee_knight",
    "mononoke_master",
    "saitama_sage",
    "luffy_lord",
    "goku_guru",
    "naruto_ninja",
    "ichigo_icon",
    "eren_elite",
    "levi_legend",
    "mikasa_maven",
    "zoro_zen",
    "sanji_sultan",
    "nami_noble",
    "robin_royal",
    "chopper_chief",
    "franky_fury",
    "brook_boss",
    "jinbe_joker",
    "yamato_yogi",
    "kaido_king",
    "shanks_shark",
    "whitebeard_warrior",
    "roger_royal",
    "ace_alpha",
  ]

  return usernames.slice(0, 100).map((username, index) => {
    let rank: UserRank
    let participationCount: number

    if (index < 5) {
      rank = "platinum"
      participationCount = 50 + Math.floor(Math.random() * 50)
    } else if (index < 20) {
      rank = "gold"
      participationCount = 20 + Math.floor(Math.random() * 15)
    } else if (index < 50) {
      rank = "silver"
      participationCount = 8 + Math.floor(Math.random() * 10)
    } else {
      rank = "bronze"
      participationCount = Math.floor(Math.random() * 5)
    }

    return {
      position: index + 1,
      username,
      participantNumber: 100 + index,
      rank,
      participation_count: participationCount,
      country: [
        "United States",
        "United Kingdom",
        "India",
        "Germany",
        "Canada",
        "Australia",
        "Japan",
        "Brazil",
        "France",
        "Singapore",
      ][index % 10],
      joinedAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
    }
  })
}

export async function GET() {
  try {
    // Get registered participants and merge with mock data
    const registeredParticipants = getAllParticipants()
    const mockLeaderboard = generateMockLeaderboard()

    // Add registered participants to leaderboard
    const registeredForLeaderboard = registeredParticipants.map((p: any, index: number) => ({
      position: mockLeaderboard.length + index + 1,
      username: p.username || `user_${p.participantNumber}`,
      participantNumber: p.participantNumber,
      rank: p.rank || "bronze",
      participation_count: p.participation_count || 0,
      country: p.country || "Unknown",
      joinedAt: p.created_at,
    }))

    // Combine and sort by participation count
    const allParticipants = [...mockLeaderboard, ...registeredForLeaderboard]
      .sort((a, b) => b.participation_count - a.participation_count)
      .slice(0, 100)
      .map((p, index) => ({ ...p, position: index + 1 }))

    return NextResponse.json({
      success: true,
      leaderboard: allParticipants,
      totalParticipants: allParticipants.length,
    })
  } catch (error) {
    console.error("[v0] Leaderboard error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch leaderboard" }, { status: 500 })
  }
}
