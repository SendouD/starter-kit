'use client'; // <-- ADD THIS LINE

import { http, createConfig } from 'wagmi'
import { mainnet, sepolia , baseSepolia,hardhat} from 'wagmi/chains'

export const config = createConfig({
  chains: [baseSepolia,hardhat],
  transports: {
    [baseSepolia.id]:http(),
    [hardhat.id]:http()
  },
})