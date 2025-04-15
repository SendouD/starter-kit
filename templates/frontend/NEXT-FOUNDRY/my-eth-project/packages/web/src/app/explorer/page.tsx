"use client"
import React, { useState, useEffect } from 'react';
import { useWriteContract, useConfig, useChainId } from 'wagmi';
import { ethers } from 'ethers';
import * as generatedContracts from '../../generated';

// Type to represent a contract function
interface ContractFunction {
  name: string;
  type: 'read' | 'write';
  inputs: Array<{
    name: string;
    type: string;
    internalType?: string;
  }>;
  outputs?: Array<{
    name: string;
    type: string;
    internalType?: string;
  }>;
}

// Function execution state
interface ExecutionState {
  functionName: string;
  args: any[];
  loading: boolean;
}

const DynamicContractExplorer: React.FC = () => {
  const [contractAddress, setContractAddress] = useState<string>('');
  const [selectedContract, setSelectedContract] = useState<string>('');
  const [selectedTab, setSelectedTab] = useState<'read' | 'write'>('read');
  const [contracts, setContracts] = useState<Array<{ name: string; abi: any }>>([]);
  const [functions, setFunctions] = useState<ContractFunction[]>([]);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, any>>({});
  const [isReadLoading, setIsReadLoading] = useState<Record<string, boolean>>({});
  
  // Get wagmi config and current chain id
  const config = useConfig();
  const chainId = useChainId();
  
  // Extract contracts from generated file
  useEffect(() => {
    const extractedContracts: Array<{ name: string; abi: any }> = [];
    
    // Loop through all exports to find ABIs
    for (const key in generatedContracts) {
      if (key.endsWith('Abi')) {
        const contractName = key.replace('Abi', '');
        extractedContracts.push({
          name: contractName,
          abi: (generatedContracts as any)[key]
        });
      }
    }
    
    setContracts(extractedContracts);
  }, []);
  
  // Parse selected contract ABI to get functions
  useEffect(() => {
    if (!selectedContract) {
      setFunctions([]);
      return;
    }
    
    const contract = contracts.find(c => c.name === selectedContract);
    if (!contract) return;
    
    const parsedFunctions: ContractFunction[] = [];
    
    for (const item of contract.abi) {
      if (item.type === 'function') {
        parsedFunctions.push({
          name: item.name,
          type: ['view', 'pure'].includes(item.stateMutability) ? 'read' : 'write',
          inputs: item.inputs || [],
          outputs: item.outputs || []
        });
      }
    }
    
    setFunctions(parsedFunctions);
    // Reset input values and results
    setInputValues({});
    setResults({});
  }, [selectedContract, contracts]);
  
  // Prepare args for a function
  const prepareArgs = (functionName: string) => {
    const func = functions.find(f => f.name === functionName);
    if (!func) return [];
    
    return func.inputs.map((input, index) => {
      const value = inputValues[`${functionName}_${index}`] || '';
      
      // Better type conversion based on input type
      if (input.type.includes('int') && !value.startsWith('0x')) {
        return value ? value : '0'; // Ethers will convert to BigNumber
      }
      if (input.type === 'bool') {
        return value.toLowerCase() === 'true';
      }
      return value; // Ethers handles addresses and other types well
    });
  };
  
  // Find the current chain
  const currentChain = config.chains.find(chain => chain.id === chainId);
  
  // Setup contract writes
  const { writeContract, isPending: isWritePending, isSuccess: isWriteSuccess, error: writeError } = useWriteContract();
  
  // Track currently executing write function
  const [executingWriteFunction, setExecutingWriteFunction] = useState<string | null>(null);
  
  // Reset write function state on success or error
  useEffect(() => {
    if ((isWriteSuccess || writeError) && executingWriteFunction) {
      setExecutingWriteFunction(null);
      
      // If error, update results to show error
      if (writeError) {
        setResults(prev => ({
          ...prev,
          [executingWriteFunction]: `Error: ${writeError.message || 'Unknown error'}`
        }));
      } else {
        setResults(prev => ({
          ...prev,
          [executingWriteFunction]: 'Transaction submitted successfully'
        }));
      }
    }
  }, [isWriteSuccess, writeError, executingWriteFunction]);
  
  // Handle input change
  const handleInputChange = (functionName: string, inputIndex: number, value: string) => {
    setInputValues(prev => ({
      ...prev,
      [`${functionName}_${inputIndex}`]: value
    }));
  };
  
  // Execute a read function using ethers.js
  const executeReadFunction = async (func: ContractFunction) => {
    if (!contractAddress || !selectedContract || !currentChain) return;
    
    const contract = contracts.find(c => c.name === selectedContract);
    if (!contract) return;
    
    setIsReadLoading(prev => ({ ...prev, [func.name]: true }));
    
    try {
      const args = prepareArgs(func.name);
      console.log(`Executing read function: ${func.name} with args:`, args);
      
      // Create ethers provider
      const provider = new ethers.JsonRpcProvider(currentChain.rpcUrls.default.http[0]);
      
      // Create contract instance
      const ethersContract = new ethers.Contract(
        contractAddress, 
        contract.abi, 
        provider
      );
      
      // Call contract function
      const result = await ethersContract[func.name](...args);
      
      setResults(prev => ({
        ...prev,
        [func.name]: result
      }));
      
    } catch (error: any) {
      console.error(`Error executing read function ${func.name}:`, error);
      setResults(prev => ({
        ...prev,
        [func.name]: `Error: ${error?.message || 'Unknown error'}`
      }));
    } finally {
      setIsReadLoading(prev => ({ ...prev, [func.name]: false }));
    }
  };
  
  // Execute a write function - still using wagmi for this
  const executeWriteFunction = async (func: ContractFunction) => {
    if (!contractAddress || !selectedContract) return;
    
    const contract = contracts.find(c => c.name === selectedContract);
    if (!contract) return;
    
    setExecutingWriteFunction(func.name);
    
    try {
      const args = prepareArgs(func.name);
      console.log(`Executing write function: ${func.name} with args:`, args);
      
      writeContract({
        address: contractAddress as `0x${string}`,
        abi: contract.abi,
        functionName: func.name,
        args
      });
    } catch (error: any) {
      console.error(`Error calling ${func.name}:`, error);
      setExecutingWriteFunction(null);
      setResults(prev => ({
        ...prev,
        [func.name]: `Error: ${error?.message || 'Unknown error'}`
      }));
    }
  };
  
  // Format output value based on type
  const formatOutput = (value: any): string => {
    if (value === undefined || value === null) return 'null';
    
    // Handle ethers BigNumber
    if (value._isBigNumber) {
      return value.toString();
    }
    
    // Handle ethers v6 bigint
    if (typeof value === 'bigint') return value.toString();
    
    if (typeof value === 'object' && Array.isArray(value)) {
      return '[' + value.map(formatOutput).join(', ') + ']';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  };
  
  // Properly validate contract address
  const isValidAddress = (address: string) => {
    return /^0x[0-9a-fA-F]{40}$/.test(address);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-50 rounded-lg shadow-md">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Dynamic Contract Explorer</h1>
      
      {/* Chain Info */}
      <div className="mb-6 p-3 bg-blue-50 rounded-lg border border-blue-100">
        <p className="text-blue-800">
          Connected to chain: <strong>{currentChain?.name || 'Unknown'}</strong> (ID: {chainId})
        </p>
      </div>
      
      {/* Contract Selection */}
      <div className="mb-6">
        <label className="block text-gray-700 mb-2">Select Contract</label>
        <select
          className="w-full p-2 border border-gray-300 rounded"
          value={selectedContract}
          onChange={(e) => setSelectedContract(e.target.value)}
        >
          <option value="">-- Select a Contract --</option>
          {contracts.map(contract => (
            <option key={contract.name} value={contract.name}>
              {contract.name}
            </option>
          ))}
        </select>
      </div>
      
      {/* Contract Address Input */}
      <div className="mb-6">
        <label className="block text-gray-700 mb-2">Contract Address</label>
        <input
          type="text"
          value={contractAddress}
          onChange={(e) => setContractAddress(e.target.value)}
          placeholder="0x..."
          className={`w-full p-2 border ${isValidAddress(contractAddress) || !contractAddress ? 'border-gray-300' : 'border-red-500'} rounded`}
        />
        {contractAddress && !isValidAddress(contractAddress) && (
          <p className="text-red-500 text-sm mt-1">Invalid Ethereum address format</p>
        )}
      </div>
      
      {/* Tabs */}
      {selectedContract && (
        <div className="flex mb-6 border-b">
          <button
            className={`py-2 px-4 ${selectedTab === 'read' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
            onClick={() => setSelectedTab('read')}
          >
            Read Functions
          </button>
          <button
            className={`py-2 px-4 ${selectedTab === 'write' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
            onClick={() => setSelectedTab('write')}
          >
            Write Functions
          </button>
        </div>
      )}
      
      {/* Contract Functions */}
      {selectedContract && functions.length > 0 ? (
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">
            {selectedTab === 'read' ? 'Read Functions' : 'Write Functions'}
          </h2>
          
          {functions
            .filter(func => func.type === selectedTab)
            .map(func => (
              <div key={func.name} className="mb-6 pb-4 border-b border-gray-200">
                <h3 className="font-medium text-gray-700">
                  {func.name}({func.inputs.map(input => `${input.type} ${input.name || ''}`).join(', ')})
                  {func.outputs && func.outputs.length > 0 && 
                    ` returns (${func.outputs.map(output => output.type).join(', ')})`
                  }
                </h3>
                
                {/* Function inputs */}
                {func.inputs.length > 0 && (
                  <div className="mt-2 mb-2">
                    {func.inputs.map((input, index) => (
                      <div key={index} className="flex items-center mb-2">
                        <label className="w-32 text-sm text-gray-600">
                          {input.name || `param${index}`} ({input.type})
                        </label>
                        <input
                          type="text"
                          value={inputValues[`${func.name}_${index}`] || ''}
                          onChange={(e) => handleInputChange(func.name, index, e.target.value)}
                          className="flex-1 p-2 border border-gray-300 rounded"
                          placeholder={`${input.type}`}
                        />
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Execute button */}
                <button 
                  onClick={() => func.type === 'read' 
                    ? executeReadFunction(func) 
                    : executeWriteFunction(func)
                  } 
                  className={`mt-2 ${
                    func.type === 'read' 
                      ? 'bg-blue-500 hover:bg-blue-600' 
                      : 'bg-green-500 hover:bg-green-600'
                  } text-white px-4 py-2 rounded`}
                  disabled={!contractAddress || !isValidAddress(contractAddress) || 
                    (func.type === 'read' && isReadLoading[func.name]) || 
                    (func.type === 'write' && executingWriteFunction === func.name)}
                >
                  {func.type === 'read' 
                    ? (isReadLoading[func.name] ? 'Loading...' : 'Query')
                    : (executingWriteFunction === func.name ? 'Processing...' : 'Execute')}
                </button>
                
                {/* Result display for read/write functions */}
                {results[func.name] !== undefined && (
                  <div className={`mt-2 p-2 ${results[func.name]?.toString().startsWith('Error:') ? 'bg-red-50' : 'bg-gray-100'} rounded font-mono text-sm`}>
                    Result: {formatOutput(results[func.name])}
                  </div>
                )}
              </div>
            ))}
        </div>
      ) : (
        selectedContract && (
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-gray-600">No {selectedTab} functions found in this contract.</p>
          </div>
        )
      )}
    </div>
  );
};

export default DynamicContractExplorer;