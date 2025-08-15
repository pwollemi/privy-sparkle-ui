import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, Keypair } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, getMint } from '@solana/spl-token';
import programIdl from './program-idl.json';
import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk';
import BN from 'bn.js';

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

  // Function to record price data after trades
  const recordPriceHistory = async (tokenMint: string, priceSol: number, type: 'buy' | 'sell', signature: string, volumeSol?: number) => {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      await supabase.from('price_history').insert({
        token_mint: tokenMint,
        price_sol: priceSol,
        volume_sol: volumeSol || 0,
        transaction_type: type,
        transaction_signature: signature,
      });
    } catch (error) {
      console.error('Failed to record price history:', error);
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

      // Convert SOL amount to lamports (BN)
      const lamportsBn = new BN(Math.floor(solAmount * LAMPORTS_PER_SOL));

      // Build swap transaction (buy) - swapping SOL for tokens
      const transaction = await client.pool.swap({
        pool: poolPubkey,
        owner: publicKey,
        payer: publicKey,
        swapBaseForQuote: false, // false when buying with SOL per SDK semantics
        amountIn: lamportsBn,
        minimumAmountOut: new BN(0),
        referralTokenAccount: null,
      });

      // Send and confirm transaction
      const {
        context: { slot: minContextSlot },
        value: { blockhash, lastValidBlockHeight },
      } = await connection.getLatestBlockhashAndContext();

      transaction.feePayer = publicKey;
      transaction.recentBlockhash = blockhash;

      console.log('💰 Sending buy transaction...');
      const signature = await sendTransaction(transaction, connection, { minContextSlot });
      console.log('📝 Transaction signature:', signature);
      
      console.log('⏳ Confirming transaction...');
      await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature });
      console.log('✅ Transaction confirmed!');

      // Calculate current price from pool state and record it
      try {
        const updatedPoolState = await client.state.getPool(poolPubkey);
        const updatedAccount = (updatedPoolState as any)?.account ?? updatedPoolState;
        const currentPrice = updatedAccount?.sqrtPrice ? Number(updatedAccount.sqrtPrice.toString()) / (2 ** 63) : 0;
        
        console.log('Recording buy price:', currentPrice, 'SOL for token:', baseMint.toString());
        await recordPriceHistory(baseMint.toString(), currentPrice, 'buy', signature, solAmount);
      } catch (priceError) {
        console.error('Failed to record price after buy:', priceError);
      }

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

      // Determine token decimals and convert to smallest units (BN)
      const mintInfo = await getMint(connection, new PublicKey(baseMint.toString()));
      const decimals = mintInfo.decimals ?? 6;
      const factor = Math.pow(10, decimals);
      const amountBn = new BN(Math.floor(tokenAmount * factor));

      // Build swap transaction (sell) - swapping tokens for SOL
      const transaction = await client.pool.swap({
        pool: poolPubkey,
        owner: publicKey,
        payer: publicKey,
        swapBaseForQuote: true, // true when selling tokens for SOL per SDK semantics
        amountIn: amountBn,
        minimumAmountOut: new BN(0),
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

      // Calculate current price from pool state and record it
      try {
        const updatedPoolState = await client.state.getPool(poolPubkey);
        const updatedAccount = (updatedPoolState as any)?.account ?? updatedPoolState;
        const currentPrice = updatedAccount?.sqrtPrice ? Number(updatedAccount.sqrtPrice.toString()) / (2 ** 63) : 0;
        const tokenValue = tokenAmount * currentPrice;
        
        console.log('Recording sell price:', currentPrice, 'SOL for token:', baseMint.toString());
        await recordPriceHistory(baseMint.toString(), currentPrice, 'sell', signature, tokenValue);
      } catch (priceError) {
        console.error('Failed to record price after sell:', priceError);
      }

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