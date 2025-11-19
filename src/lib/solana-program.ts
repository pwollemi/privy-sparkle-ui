import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, Keypair } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, getMint, getAccount, getAssociatedTokenAddressSync } from '@solana/spl-token';
import programIdl from './program-idl.json';
import { DynamicBondingCurveClient, buildCurve, MigrationOption, TokenDecimal, BaseFeeMode, ActivationType, CollectFeeMode, MigrationFeeOption, TokenType } from '@meteora-ag/dynamic-bonding-curve-sdk';
import BN from 'bn.js';
import { supabase } from '@/integrations/supabase/client';

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
      console.log('🚀 Starting token pool creation...');

      const client = new DynamicBondingCurveClient(connection, 'confirmed');

      // -------- 1) Create config (same logic as your reference code) --------
      console.log('🔧 Building curve config...');
      const curveConfig = buildCurve({
        totalTokenSupply: 100000000,
        percentageSupplyOnMigration: 10,
        migrationQuoteThreshold: 20,
        migrationOption: MigrationOption.MET_DAMM_V2,
        tokenBaseDecimal: TokenDecimal.SIX,
        tokenQuoteDecimal: TokenDecimal.NINE,
        lockedVestingParam: {
          totalLockedVestingAmount: 20000000,
          numberOfVestingPeriod: 12,
          cliffUnlockAmount: 0,
          totalVestingDuration: 356 * 3600 * 24,
          cliffDurationFromMigrationTime: 0,
        },
        baseFeeParams: {
          baseFeeMode: BaseFeeMode.FeeSchedulerLinear,
          feeSchedulerParam: {
            startingFeeBps: 100,
            endingFeeBps: 10,
            numberOfPeriod: 1,
            totalDuration: 100,
          },
        },
        dynamicFeeEnabled: true,
        activationType: ActivationType.Timestamp,
        collectFeeMode: CollectFeeMode.QuoteToken,
        migrationFeeOption: MigrationFeeOption.FixedBps25,
        tokenType: TokenType.Token2022,
        partnerLpPercentage: 0,
        creatorLpPercentage: 0,
        partnerLockedLpPercentage: 100,
        creatorLockedLpPercentage: 0,
        creatorTradingFeePercentage: 0,
        leftover: 50000000,
        tokenUpdateAuthority: 4,
        migrationFee: {
          feePercentage: 0,
          creatorFeePercentage: 0,
        },
      });

      // Generate a new keypair for the config account
      const configKeypair = Keypair.generate();
      console.log('📋 configKeypair:', configKeypair.publicKey.toBase58());

      const createConfigParams = {
        config: configKeypair.publicKey,
        feeClaimer: new PublicKey('JD2zL67TrjzxkNyjzBT2vqJVqY1ZeSUtotes3LRsmb6Y'),
        leftoverReceiver: new PublicKey('JD2zL67TrjzxkNyjzBT2vqJVqY1ZeSUtotes3LRsmb6Y'),
        quoteMint: new PublicKey('So11111111111111111111111111111111111111112'),
        payer: publicKey,
        ...curveConfig,
      };

      console.log('🧱 Building createConfig transaction...');
      const configTx = await client.partner.createConfig(createConfigParams);

      let {
        context: { slot: minContextSlot },
        value: { blockhash, lastValidBlockHeight },
      } = await connection.getLatestBlockhashAndContext();

      configTx.feePayer = publicKey;
      configTx.recentBlockhash = blockhash;
      configTx.partialSign(configKeypair);

      console.log('💳 Sending config transaction...');
      const configSig = await sendTransaction(configTx, connection, { minContextSlot });
      console.log('✅ Config tx signature:', configSig);

      await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature: configSig });
      console.log('🎉 Config created');

      // -------- 2) Create pool using that config (same as your createPool) --------
      const baseMintKeypair = Keypair.generate();
      console.log('🔑 baseMintKeypair:', baseMintKeypair.publicKey.toBase58());

      const poolTx = await client.pool.createPool({
        name: params.name,
        symbol: params.symbol,
        uri: params.website || 'https://coinporate.app',
        payer: publicKey,
        poolCreator: publicKey,
        config: configKeypair.publicKey,
        baseMint: baseMintKeypair.publicKey,
      });

      ({
        context: { slot: minContextSlot },
        value: { blockhash, lastValidBlockHeight },
      } = await connection.getLatestBlockhashAndContext());

      poolTx.feePayer = publicKey;
      poolTx.recentBlockhash = blockhash;
      poolTx.partialSign(baseMintKeypair);

      console.log('💳 Sending pool transaction...');
      const signature = await sendTransaction(poolTx, connection, { minContextSlot });
      console.log('✅ Pool tx signature:', signature);

      await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature });
      console.log('🎉 Pool created');

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

      console.log('✨ Pool created successfully:', poolAddress);
      return {
        signature,
        poolAddress,
        tokenMint: baseMintKeypair.publicKey.toBase58(),
        poolDetails,
      };
    } catch (error: any) {
      console.error('❌ Error creating token pool:', error);
      let msg = error?.message || 'Unknown error';
      if (error?.error?.message) msg = error.error.message;
      throw new Error(`Failed to create token pool: ${msg}`);
    }
  };

  // Function to record price data after trades
  const recordPriceHistory = async (tokenMint: string, priceSol: number, type: 'buy' | 'sell', signature: string, userWallet: string, volumeSol?: number) => {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      await supabase.from('price_history').insert({
        token_mint: tokenMint,
        price_sol: priceSol,
        volume_sol: volumeSol || 0,
        transaction_type: type,
        transaction_signature: signature,
        user_wallet: userWallet,
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
      console.log('💰 Starting buy transaction...');
      const client = new DynamicBondingCurveClient(connection, 'confirmed');
      const poolPubkey = new PublicKey(poolAddress);
      
      // Get pool state to access token info
      console.log('📊 Fetching pool state...');
      const poolState = await client.state.getPool(poolPubkey);
      if (!poolState) {
        throw new Error('Pool not found');
      }

      const account = (poolState as any)?.account ?? poolState;
      const baseMint = account.baseMint || account.base_mint;
      
      if (!baseMint) {
        throw new Error('Base mint not found in pool');
      }

      console.log('🪙 Token mint:', baseMint.toString());
      console.log('💵 Buying with SOL:', solAmount);

      // Convert SOL amount to lamports (BN)
      const lamportsBn = new BN(Math.floor(solAmount * LAMPORTS_PER_SOL));
      console.log('📊 Lamports:', lamportsBn.toString());

      // Build swap transaction (buy) - swapping SOL for tokens
      console.log('🔨 Building buy transaction...');
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
      console.log('⏳ Getting blockhash...');
      const {
        context: { slot: minContextSlot },
        value: { blockhash, lastValidBlockHeight },
      } = await connection.getLatestBlockhashAndContext();

      transaction.feePayer = publicKey;
      transaction.recentBlockhash = blockhash;

      console.log('📤 Transaction instructions:', transaction.instructions.length);
      console.log('💳 Sending buy transaction to wallet...');
      const signature = await sendTransaction(transaction, connection, { 
        minContextSlot,
        skipPreflight: false,
        preflightCommitment: 'confirmed'
      });
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
        await recordPriceHistory(baseMint.toString(), currentPrice, 'buy', signature, publicKey.toString(), solAmount);
        
        // Update user's token balance in database
        await updateUserTokenBalance(publicKey.toString(), baseMint.toString());
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
      console.log('🔴 Starting sell transaction...');
      const client = new DynamicBondingCurveClient(connection, 'confirmed');
      const poolPubkey = new PublicKey(poolAddress);
      
      // Get pool state to access token info
      console.log('📊 Fetching pool state...');
      const poolState = await client.state.getPool(poolPubkey);
      if (!poolState) {
        throw new Error('Pool not found');
      }

      const account = (poolState as any)?.account ?? poolState;
      const baseMint = account.baseMint || account.base_mint;
      
      if (!baseMint) {
        throw new Error('Base mint not found in pool');
      }

      console.log('🪙 Token mint:', baseMint.toString());

      // Determine which token program this mint uses (Token or Token-2022)
      const baseMintPubkey = new PublicKey(baseMint.toString());
      const mintAccInfo = await connection.getAccountInfo(baseMintPubkey, 'confirmed');
      const isToken2022 = mintAccInfo?.owner?.equals(TOKEN_2022_PROGRAM_ID) ?? false;
      const tokenProgramId = isToken2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
      
      console.log('🔧 Token program:', isToken2022 ? 'Token-2022' : 'Token');
      
      // Check if user has associated token account and balance
      const ata = getAssociatedTokenAddressSync(baseMintPubkey, publicKey, false, tokenProgramId);
      console.log('💼 User ATA:', ata.toString());
      
      try {
        const tokenAccount = await getAccount(connection, ata, 'confirmed', tokenProgramId);
        const currentBalance = Number(tokenAccount.amount);
        console.log('💰 Current token balance (raw):', currentBalance);
        
        if (currentBalance === 0) {
          throw new Error('No tokens to sell');
        }
      } catch (ataError) {
        console.error('❌ Token account error:', ataError);
        throw new Error('You do not own any of these tokens');
      }
      
      // Determine token decimals and convert to smallest units (BN)
      const mintInfo = await getMint(connection, baseMintPubkey, 'confirmed', tokenProgramId);
      const decimals = mintInfo.decimals ?? 6;
      const factor = Math.pow(10, decimals);
      const amountBn = new BN(Math.floor(tokenAmount * factor));

      console.log('📏 Decimals:', decimals);
      console.log('📊 Selling amount (tokens):', tokenAmount);
      console.log('📊 Selling amount (raw):', amountBn.toString());

      // Build swap transaction (sell) - swapping tokens for SOL
      console.log('🔨 Building sell transaction...');
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
      console.log('⏳ Getting blockhash...');
      const {
        context: { slot: minContextSlot },
        value: { blockhash, lastValidBlockHeight },
      } = await connection.getLatestBlockhashAndContext();

      transaction.feePayer = publicKey;
      transaction.recentBlockhash = blockhash;

      console.log('📤 Transaction instructions:', transaction.instructions.length);
      console.log('💳 Sending sell transaction to wallet...');
      
      const signature = await sendTransaction(transaction, connection, { 
        minContextSlot,
        skipPreflight: false,
        preflightCommitment: 'confirmed'
      });
      
      console.log('📝 Sell signature:', signature);
      console.log('⏳ Confirming transaction...');
      await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature });

      // Calculate current price from pool state and record it
      try {
        const updatedPoolState = await client.state.getPool(poolPubkey);
        const updatedAccount = (updatedPoolState as any)?.account ?? updatedPoolState;
        const currentPrice = updatedAccount?.sqrtPrice ? Number(updatedAccount.sqrtPrice.toString()) / (2 ** 63) : 0;
        const tokenValue = tokenAmount * currentPrice;
        
        console.log('Recording sell price:', currentPrice, 'SOL for token:', baseMint.toString());
        await recordPriceHistory(baseMint.toString(), currentPrice, 'sell', signature, publicKey.toString(), tokenValue);
        
        // Update user's token balance in database
        await updateUserTokenBalance(publicKey.toString(), baseMint.toString());
      } catch (priceError) {
        console.error('Failed to record price after sell:', priceError);
      }

      console.log('✅ Sell transaction confirmed!');

      // Calculate current price from pool state and record it
      try {
        const updatedPoolState = await client.state.getPool(poolPubkey);
        const updatedAccount = (updatedPoolState as any)?.account ?? updatedPoolState;
        const currentPrice = updatedAccount?.sqrtPrice ? Number(updatedAccount.sqrtPrice.toString()) / (2 ** 63) : 0;
        const tokenValue = tokenAmount * currentPrice;
        
        console.log('Recording sell price:', currentPrice, 'SOL for token:', baseMint.toString());
        await recordPriceHistory(baseMint.toString(), currentPrice, 'sell', signature, publicKey.toString(), tokenValue);
        
        // Update user's token balance in database
        await updateUserTokenBalance(publicKey.toString(), baseMint.toString());
      } catch (priceError) {
        console.error('Failed to record price after sell:', priceError);
      }

      return signature;
    } catch (error: any) {
      console.error('❌ Error selling token:', error);
      
      // Extract detailed error information
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      // Check for specific wallet errors
      if (error?.error?.message) {
        errorMessage = error.error.message;
      }
      
      // Check for transaction simulation errors
      if (error?.logs) {
        console.error('Transaction logs:', error.logs);
        errorMessage += '\nTransaction logs: ' + error.logs.join('\n');
      }
      
      throw new Error(`Failed to sell token: ${errorMessage}`);
    }
  };

  return {
    createTokenPool,
    buyToken,
    sellToken,
    isConnected: connected && !!publicKey,
    walletAddress: publicKey?.toBase58(),
  };
}

// Update user token balance in database after buy/sell
const updateUserTokenBalance = async (userWallet: string, tokenMint: string): Promise<void> => {
  try {
    // Get actual balance from blockchain
    const connection = new Connection(RPC_ENDPOINT, 'confirmed');
    const walletPubkey = new PublicKey(userWallet);
    const tokenMintPubkey = new PublicKey(tokenMint);
    
    // Determine which token program this mint uses
    const mintAccInfo = await connection.getAccountInfo(tokenMintPubkey, 'confirmed');
    const isToken2022 = mintAccInfo?.owner?.equals(TOKEN_2022_PROGRAM_ID) ?? false;
    const tokenProgramId = isToken2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
    
    // Get associated token account
    const ata = getAssociatedTokenAddressSync(tokenMintPubkey, walletPubkey, false, tokenProgramId);
    
    let balance = 0;
    try {
      const accountInfo = await getAccount(connection, ata, 'confirmed', tokenProgramId);
      const mintInfo = await getMint(connection, tokenMintPubkey, 'confirmed', tokenProgramId);
      balance = Number(accountInfo.amount) / Math.pow(10, mintInfo.decimals);
    } catch (error) {
      // Account doesn't exist, balance is 0
      console.log('Token account not found, balance is 0');
    }
    
    // Upsert balance in database
    const { data, error } = await supabase
      .from('token_balances')
      .upsert({
        user_wallet: userWallet,
        token_mint: tokenMint,
        balance: balance,
        last_updated: new Date().toISOString()
      }, {
        onConflict: 'user_wallet,token_mint'
      });
      
    if (error) {
      console.error('Failed to update user balance:', error);
    } else {
      console.log('✅ Updated user balance:', balance, 'tokens for', userWallet);
    }
  } catch (error) {
    console.error('Error updating user token balance:', error);
  }
};