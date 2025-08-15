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
  poolDetails?: {
    pool: string;
    config?: string;
    creator?: string;
    baseMint: string;
    poolType?: number;
    activationPoint?: string;
  };
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
      const created: any = await client.state.getPoolByBaseMint(baseMintKeypair.publicKey);
      const poolAddress = created ? (created.publicKey?.toBase58?.() ?? created.publicKey?.toString?.() ?? '') : '';
      const acc = created?.account ?? created;
      const poolDetails = created
        ? {
            pool: created.publicKey?.toBase58?.() ?? poolAddress,
            config: acc?.config?.toBase58?.() ?? acc?.config?.toString?.(),
            creator:
              acc?.poolCreator?.toBase58?.() ??
              acc?.creator?.toBase58?.() ??
              acc?.creator?.toString?.(),
            baseMint: baseMintKeypair.publicKey.toBase58(),
            poolType: Number(acc?.poolType ?? acc?.pool_type ?? 0),
            activationPoint: String(acc?.activationPoint ?? acc?.activation_point ?? ''),
          }
        : undefined;

      return {
        signature,
        poolAddress,
        tokenMint: baseMintKeypair.publicKey.toBase58(),
        poolDetails,
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

    try {
      const client = new DynamicBondingCurveClient(connection, 'confirmed');
      const poolPubkey = new PublicKey(poolAddress);
      
      // Get pool state to access token info
      const poolState = await client.state.getPool(poolPubkey);
      if (!poolState) {
        throw new Error('Pool not found');
      }

      const account = (poolState as any)?.account ?? poolState;
      const baseMint = account.baseMint || account.base_mint;
      
      if (!baseMint) {
        throw new Error('Base mint not found in pool');
      }

      // Convert SOL amount to lamports
      const lamports = Math.floor(solAmount * LAMPORTS_PER_SOL);

      // Build swap transaction (buy) - swapping SOL for tokens
      const transaction = await client.pool.swap({
        pool: poolPubkey,
        owner: publicKey,
        payer: publicKey,
        swapBaseForQuote: true, // true = buying tokens with SOL (base)
        amountIn: lamports,
        minimumAmountOut: 0, // Set to 0 for now, should calculate slippage tolerance
        referralTokenAccount: null,
      });

      // Send transaction
      const {
        context: { slot: minContextSlot },
        value: { blockhash, lastValidBlockHeight },
      } = await connection.getLatestBlockhashAndContext();

      transaction.feePayer = publicKey;
      transaction.recentBlockhash = blockhash;

      const signature = await sendTransaction(transaction, connection, { minContextSlot });
      await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature });

      return signature;
    } catch (error) {
      console.error('Error buying token:', error);
      throw new Error(`Failed to buy token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const sellToken = async (poolAddress: string, tokenAmount: number): Promise<string> => {
    if (!publicKey) {
      throw new Error('Wallet not connected');
    }

    try {
      const client = new DynamicBondingCurveClient(connection, 'confirmed');
      const poolPubkey = new PublicKey(poolAddress);
      
      // Get pool state to access token info
      const poolState = await client.state.getPool(poolPubkey);
      if (!poolState) {
        throw new Error('Pool not found');
      }

      const account = (poolState as any)?.account ?? poolState;
      const baseMint = account.baseMint || account.base_mint;
      
      if (!baseMint) {
        throw new Error('Base mint not found in pool');
      }

      // Build swap transaction (sell) - swapping tokens for SOL
      const transaction = await client.pool.swap({
        pool: poolPubkey,
        owner: publicKey,
        payer: publicKey,
        swapBaseForQuote: false, // false = selling tokens for SOL (quote)
        amountIn: tokenAmount,
        minimumAmountOut: 0, // Set to 0 for now, should calculate slippage tolerance
        referralTokenAccount: null,
      });

      // Send transaction
      const {
        context: { slot: minContextSlot },
        value: { blockhash, lastValidBlockHeight },
      } = await connection.getLatestBlockhashAndContext();

      transaction.feePayer = publicKey;
      transaction.recentBlockhash = blockhash;

      const signature = await sendTransaction(transaction, connection, { minContextSlot });
      await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature });

      return signature;
    } catch (error) {
      console.error('Error selling token:', error);
      throw new Error(`Failed to sell token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return {
    createTokenPool,
    buyToken,
    sellToken,
    isConnected: connected && !!publicKey,
    walletAddress: publicKey?.toBase58(),
  };
};