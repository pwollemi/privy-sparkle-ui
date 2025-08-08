import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, Keypair } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import programIdl from './program-idl.json';
import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk';

// Program configuration
export const PROGRAM_ID = new PublicKey('HANVKJPfmADejWxYUVdLYn59URiZCLZvHZ3PbXkZh6Wp');
export const POOL_AUTHORITY = new PublicKey('ACStL54CSBxDTC45MnGwXaFn4muWuLsEGHVUkxD2JU3Y');
export const RPC_ENDPOINT = 'https://api.devnet.solana.com';

// Initialize connection
export const connection = new Connection(RPC_ENDPOINT, 'confirmed');

export interface TokenCreationParams {
  name: string;
  symbol: string;
  description: string;
  initialSupply: number;
  image?: File;
  website?: string;
  twitter?: string;
  telegram?: string;
}

export interface PoolCreationResult {
  signature: string;
  poolAddress: string;
  tokenMint: string;
}

export const useSolanaProgram = () => {
  const { publicKey, connected, sendTransaction } = useWallet();

  const createTokenPool = async (params: TokenCreationParams): Promise<PoolCreationResult> => {
    if (!publicKey) throw new Error('Wallet not connected');

    try {
      const client = new DynamicBondingCurveClient(connection, 'confirmed');
      const configKey = new PublicKey('Fcu8wTpiFLfxPDUNSK7kbEKYKqcdWEuaNQHegyoRUygr'); // Provided config key

      // Mint for the new token
      const baseMintKeypair = Keypair.generate();

      // Build createPool transaction
      const transaction = await client.pool.createPool({
        baseMint: baseMintKeypair.publicKey,
        config: configKey,
        name: params.name,
        symbol: params.symbol,
        uri: params.website || 'https://coinporate.app',
        payer: publicKey,
        poolCreator: publicKey,
      });

      // Finalize and send
      const {
        context: { slot: minContextSlot },
        value: { blockhash, lastValidBlockHeight },
      } = await connection.getLatestBlockhashAndContext();

      transaction.feePayer = publicKey;
      transaction.recentBlockhash = blockhash;
      transaction.partialSign(baseMintKeypair);

      const signature = await sendTransaction(transaction, connection, { minContextSlot });
      await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature });

      // Fetch created pool by base mint
      const created = await client.state.getPoolByBaseMint(baseMintKeypair.publicKey);
      const poolAddress = created ? created.publicKey.toBase58() : '';

      return {
        signature,
        poolAddress,
        tokenMint: baseMintKeypair.publicKey.toBase58(),
      };
    } catch (error) {
      console.error('Error creating token pool:', error);
      throw new Error(`Failed to create token pool: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const buyToken = async (poolAddress: string, solAmount: number): Promise<string> => {
    if (!publicKey) {
      throw new Error('Wallet not connected');
    }

    // Implementation for buying tokens using swap instruction
    // This would use the 'swap' instruction from the IDL
    throw new Error('Buy token functionality not implemented yet');
  };

  const sellToken = async (poolAddress: string, tokenAmount: number): Promise<string> => {
    if (!publicKey) {
      throw new Error('Wallet not connected');
    }

    // Implementation for selling tokens using swap instruction
    // This would use the 'swap' instruction from the IDL
    throw new Error('Sell token functionality not implemented yet');
  };

  return {
    createTokenPool,
    buyToken,
    sellToken,
    isConnected: connected && !!publicKey,
    walletAddress: publicKey?.toBase58(),
  };
};