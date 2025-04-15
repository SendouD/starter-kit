import { defineConfig } from '@wagmi/cli'
import { react } from '@wagmi/cli/plugins'
import { foundry } from '@wagmi/cli/plugins'
import fs from 'fs'
import path from 'path'

const outDir = path.resolve(__dirname, '../foundry/out')
const srcDir = path.resolve(__dirname, '../foundry/src')

// Define an interface for contract info
interface ContractInfo {
  fileName: string;
  contractName: string;
}

// Function to find contract names by parsing source files
function findContractNames(): ContractInfo[] {
  const contractNames: ContractInfo[] = []
  
  // Read all Solidity files in src directory
  const srcFiles = fs.readdirSync(srcDir).filter(file => file.endsWith('.sol'))
  
  for (const file of srcFiles) {
    const filePath = path.join(srcDir, file)
    const content = fs.readFileSync(filePath, 'utf8')
    
    // Find all contract declarations using regex
    // This pattern looks for "contract SomeName {" or "contract SomeName is Something {"
    const contractPattern = /contract\s+([a-zA-Z0-9_]+)\s+(?:is\s+[^{]+)?\s*\{/g
    let match
    
    while ((match = contractPattern.exec(content)) !== null) {
      const contractName = match[1]
      contractNames.push({
        fileName: file,
        contractName
      })
    }
  }
  
  return contractNames
}

// Function to generate include paths based on contract names
function generateIncludePaths(): string[] {
  const contracts = findContractNames()
  const includePaths: string[] = []
  
  for (const contract of contracts) {
    const folderName = contract.fileName // E.g., "ERC20.sol"
    const contractJsonName = `${contract.contractName}.json`
    const fullPath = path.join(outDir, folderName, contractJsonName)
    
    // Check if the contract JSON exists
    if (fs.existsSync(fullPath)) {
      includePaths.push(`${folderName}/${contractJsonName}`)
    }
  }
  
  return includePaths
}

const include = generateIncludePaths()

export default defineConfig({
  out: 'src/generated.ts',
  plugins: [
    foundry({
      project: '../foundry',
      artifacts: 'out',
      include,
    }),
    react(),
  ],
})