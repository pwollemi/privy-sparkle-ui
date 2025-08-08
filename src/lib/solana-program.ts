import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import programIdl from './program-idl.json';

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
    if (!publicKey) {
      throw new Error('Wallet not connected');
    }

    const walletPublicKey = publicKey;

    try {
      // Generate keypairs for new accounts
      const poolKeypair = PublicKey.findProgramAddressSync(
        [Buffer.from('pool'), walletPublicKey.toBuffer()],
        PROGRAM_ID
      )[0];

      const tokenMintKeypair = PublicKey.findProgramAddressSync(
        [Buffer.from('mint'), poolKeypair.toBuffer()],
        PROGRAM_ID
      )[0];

      // Create virtual pool initialization parameters
      const initializeParams = {
        initial_supply: params.initialSupply * LAMPORTS_PER_SOL, // Convert to proper decimals
        max_buy_cap: 1000 * LAMPORTS_PER_SOL,
        max_sell_cap: 1000 * LAMPORTS_PER_SOL,
        creation_fee: 0.05 * LAMPORTS_PER_SOL,
      };

      // Build instruction data for initialize_virtual_pool_with_spl_token
      const instructionData = Buffer.concat([
        Buffer.from([140, 85, 215, 176, 102, 215, 220, 155]), // discriminator
        Buffer.from(JSON.stringify(initializeParams))
      ]);

      // Get associated token accounts
      const userTokenAccount = await getAssociatedTokenAddress(
        tokenMintKeypair,
        walletPublicKey,
        false,
        TOKEN_PROGRAM_ID
      );

      const baseVault = PublicKey.findProgramAddressSync(
        [Buffer.from('base_vault'), poolKeypair.toBuffer()],
        PROGRAM_ID
      )[0];

      const quoteVault = PublicKey.findProgramAddressSync(
        [Buffer.from('quote_vault'), poolKeypair.toBuffer()],
        PROGRAM_ID
      )[0];

      const eventAuthority = PublicKey.findProgramAddressSync(
        [Buffer.from('__event_authority')],
        PROGRAM_ID
      )[0];

      // Create transaction
      const transaction = new Transaction();

      // Add create associated token account instruction if needed
      try {
        await connection.getAccountInfo(userTokenAccount);
      } catch {
        transaction.add(
          createAssociatedTokenAccountInstruction(
            walletPublicKey,
            userTokenAccount,
            walletPublicKey,
            tokenMintKeypair,
            TOKEN_PROGRAM_ID
          )
        );
      }

      // Add the main pool initialization instruction
      transaction.add({
        keys: [
          { pubkey: PROGRAM_ID, isSigner: false, isWritable: false }, // config
          { pubkey: poolKeypair, isSigner: false, isWritable: true }, // virtual_pool
          { pubkey: tokenMintKeypair, isSigner: false, isWritable: true }, // base_mint
          { pubkey: PublicKey.default, isSigner: false, isWritable: false }, // quote_mint (SOL)
          { pubkey: baseVault, isSigner: false, isWritable: true }, // base_vault
          { pubkey: quoteVault, isSigner: false, isWritable: true }, // quote_vault
          { pubkey: walletPublicKey, isSigner: true, isWritable: true }, // payer
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // token_base_program
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // token_quote_program
          { pubkey: eventAuthority, isSigner: false, isWritable: false }, // event_authority
          { pubkey: PROGRAM_ID, isSigner: false, isWritable: false }, // program
        ],
        programId: PROGRAM_ID,
        data: instructionData,
      });

      // Send transaction via wallet adapter
      const signature = await sendTransaction(transaction, connection);
      
      // Confirm transaction
      await connection.confirmTransaction(signature, 'confirmed');

      return {
        signature,
        poolAddress: poolKeypair.toString(),
        tokenMint: tokenMintKeypair.toString(),
      };
    } catch (error) {
      console.error('Error creating token pool:', error);
      throw new Error(`Failed to create token pool: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const buyToken = async (poolAddress: string, solAmount: number): Promise<string> => {
    const wallet = getWallet();
    
    if (!wallet.address) {
      throw new Error('Wallet not connected');
    }

    // Implementation for buying tokens using swap instruction
    // This would use the 'swap' instruction from the IDL
    throw new Error('Buy token functionality not implemented yet');
  };

  const sellToken = async (poolAddress: string, tokenAmount: number): Promise<string> => {
    const wallet = getWallet();
    
    if (!wallet.address) {
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