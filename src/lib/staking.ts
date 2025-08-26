import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { Program, AnchorProvider, web3, BN } from '@coral-xyz/anchor';
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, createAssociatedTokenAccountInstruction, getAssociatedTokenAddress } from '@solana/spl-token';

// Import the staking program IDL
import stakingIdl from './staking-program-idl.json';

export interface StakingProgramInterface {
  version: string;
  name: string;
  instructions: Array<{
    name: string;
    accounts: Array<{
      name: string;
      isMut: boolean;
      isSigner: boolean;
    }>;
    args: Array<{
      name: string;
      type: string;
    }>;
  }>;
  accounts: Array<{
    name: string;
    type: {
      kind: string;
      fields: Array<{
        name: string;
        type: string;
      }>;
    };
  }>;
}

// Program ID for the staking program
export const STAKING_PROGRAM_ID = new PublicKey('7RXwD6sJmeFnkovweVFNqrhHAeX5nvaeFmeeUq1dTMGo');

// Seeds for PDAs
export const POOL_SEED = 'pool';
export const STAKE_VAULT_SEED = 'stake_vault';
export const REWARD_VAULT_SEED = 'reward_vault';
export const POSITION_SEED = 'position';

export class StakingProgram {
  private program: Program;
  private connection: Connection;

  constructor(connection: Connection, wallet: any) {
    const provider = new AnchorProvider(connection, wallet, {});
    this.program = new Program(stakingIdl as any, provider);
    this.connection = connection;
  }
  private toCamelCase(name: string): string {
    return name.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
  }

  private getMethodByKeyword(keyword: string) {
    const idl: any = this.program.idl as any;
    const found = idl?.instructions?.find((ix: any) => String(ix.name).toLowerCase().includes(keyword.toLowerCase()));
    if (!found) return null;
    const methodName = this.toCamelCase(found.name);
    return (this.program.methods as any)[methodName];
  }

  private async resolveTokenProgramId(mint: PublicKey): Promise<PublicKey> {
    const mintAccInfo = await this.connection.getAccountInfo(mint);
    const isToken2022 = mintAccInfo?.owner?.equals(TOKEN_2022_PROGRAM_ID) ?? false;
    return isToken2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
  }

  // Get the pool PDA
  async getPoolPDA(): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddress(
      [Buffer.from(POOL_SEED)],
      STAKING_PROGRAM_ID
    );
  }

  // Get the stake vault PDA
  async getStakeVaultPDA(): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddress(
      [Buffer.from(STAKE_VAULT_SEED)],
      STAKING_PROGRAM_ID
    );
  }

  // Get the reward vault PDA
  async getRewardVaultPDA(): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddress(
      [Buffer.from(REWARD_VAULT_SEED)],
      STAKING_PROGRAM_ID
    );
  }

  // Get the user position account PDA
  async getUserPositionPDA(userWallet: PublicKey): Promise<[PublicKey, number]> {
    const [poolPDA] = await this.getPoolPDA();
    return await PublicKey.findProgramAddress(
      [
        Buffer.from(POSITION_SEED),
        poolPDA.toBuffer(),
        userWallet.toBuffer(),
      ],
      STAKING_PROGRAM_ID
    );
  }

  // Initialize a staking pool (admin only)
  async initializePool(
    admin: PublicKey,
    stakeMint: PublicKey
  ): Promise<Transaction> {
    const [poolPDA] = await this.getPoolPDA();
    const [stakeVaultPDA] = await this.getStakeVaultPDA();
    const [rewardVaultPDA] = await this.getRewardVaultPDA();

    const transaction = new Transaction();
    const tokenProgram = await this.resolveTokenProgramId(stakeMint);
    const instruction = await this.program.methods
      .initializePool()
      .accounts({
        pool: poolPDA,
        admin: admin,
        stakeMint: stakeMint,
        stakeVault: stakeVaultPDA,
        rewardVault: rewardVaultPDA,
        systemProgram: SystemProgram.programId,
        tokenProgram: tokenProgram,
      })
      .instruction();

    transaction.add(instruction);
    return transaction;
  }

  // Stake tokens
  async stakeTokens(
    userWallet: PublicKey,
    stakeMint: PublicKey,
    userTokenAccount: PublicKey,
    amount: number
  ): Promise<Transaction> {
    const [poolPDA] = await this.getPoolPDA();
    const [positionPDA] = await this.getUserPositionPDA(userWallet);
    const [stakeVaultPDA] = await this.getStakeVaultPDA();

    const transaction = new Transaction();
    
    try {
      const tokenProgram = await this.resolveTokenProgramId(stakeMint);
      
      // Check if user's token account exists, create if not
      const userTokenAccountInfo = await this.connection.getAccountInfo(userTokenAccount);
      if (!userTokenAccountInfo) {
        console.log('🔧 Creating associated token account...');
        const createATAInstruction = createAssociatedTokenAccountInstruction(
          userWallet, // payer
          userTokenAccount, // ata
          userWallet, // owner
          stakeMint, // mint
          tokenProgram
        );
        transaction.add(createATAInstruction);
      }

      // Check if position account exists, if not it will be created by the program
      const positionAccountInfo = await this.connection.getAccountInfo(positionPDA);
      console.log(`🔍 Position account exists: ${!!positionAccountInfo}`);

      console.log('🔧 Creating stake instruction with accounts:', {
        pool: poolPDA.toString(),
        stakeMint: stakeMint.toString(), 
        position: positionPDA.toString(),
        user: userWallet.toString(),
        userTokenAccount: userTokenAccount.toString(),
        stakeVault: stakeVaultPDA.toString(),
        tokenProgram: tokenProgram.toString(),
        systemProgram: SystemProgram.programId.toString(),
      });

      const instruction = await this.program.methods
        .stake(new BN(amount.toString()))
        .accounts({
          pool: poolPDA,
          stakeMint: stakeMint,
          position: positionPDA,
          user: userWallet,
          userTokenAccount: userTokenAccount,
          stakeVault: stakeVaultPDA,
          tokenProgram: tokenProgram,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      transaction.add(instruction);
    } catch (error) {
      console.error('Error creating stake instruction:', error);
      throw new Error(`Failed to create stake transaction: ${error}`);
    }

    return transaction;
  }

  // Unstake tokens
  async unstakeTokens(
    userWallet: PublicKey,
    stakeMint: PublicKey,
    userTokenAccount: PublicKey,
    amount: number
  ): Promise<Transaction> {
    const [poolPDA] = await this.getPoolPDA();
    const [positionPDA] = await this.getUserPositionPDA(userWallet);
    const [stakeVaultPDA] = await this.getStakeVaultPDA();

    const transaction = new Transaction();
    
    try {
      const tokenProgram = await this.resolveTokenProgramId(stakeMint);
      const instruction = await this.program.methods
        .withdraw(new BN(amount.toString()))
        .accounts({
          pool: poolPDA,
          stakeMint: stakeMint,
          position: positionPDA,
          user: userWallet,
          userTokenAccount: userTokenAccount,
          stakeVault: stakeVaultPDA,
          tokenProgram: tokenProgram,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      transaction.add(instruction);
    } catch (error) {
      console.error('Error creating unstake instruction:', error);
      throw new Error('Failed to create unstake transaction');
    }

    return transaction;
  }

  // Claim rewards
  async claimRewards(
    userWallet: PublicKey,
    stakeMint: PublicKey,
    userTokenAccount: PublicKey
  ): Promise<Transaction> {
    const [poolPDA] = await this.getPoolPDA();
    const [positionPDA] = await this.getUserPositionPDA(userWallet);
    const [rewardVaultPDA] = await this.getRewardVaultPDA();

    const transaction = new Transaction();
    
    try {
      const tokenProgram = await this.resolveTokenProgramId(stakeMint);
      
      console.log('🔧 Creating claim rewards instruction with accounts:', {
        pool: poolPDA.toString(),
        stakeMint: stakeMint.toString(), 
        position: positionPDA.toString(),
        user: userWallet.toString(),
        userTokenAccount: userTokenAccount.toString(),
        rewardVault: rewardVaultPDA.toString(),
        tokenProgram: tokenProgram.toString(),
      });
      
      const instruction = await this.program.methods
        .claimRewards()
        .accounts({
          pool: poolPDA,
          stakeMint: stakeMint,
          position: positionPDA,
          user: userWallet,
          userTokenAccount: userTokenAccount,
          rewardVault: rewardVaultPDA,
          tokenProgram: tokenProgram,
        })
        .instruction();

      transaction.add(instruction);
    } catch (error) {
      console.error('Error creating claim rewards instruction:', error);
      throw new Error('Failed to create claim rewards transaction');
    }

    return transaction;
  }

  // Get pool info
  async getPoolInfo(): Promise<any> {
    try {
      const [poolPDA] = await this.getPoolPDA();
      
      // Fetch the pool account using the program
      const poolAccount = await (this.program.account as any).pool.fetch(poolPDA);
      
      if (!poolAccount) {
        console.warn('Pool account not found');
        return null;
      }

      // Return the pool data with proper field names
      return {
        admin: poolAccount.admin,
        stakeMint: poolAccount.stakeMint ?? poolAccount.stake_mint,
        rewardRate: poolAccount.rewardRate ?? poolAccount.reward_rate,
        accRewardPerShare: poolAccount.accRewardPerShare ?? poolAccount.acc_reward_per_share,
        totalStaked: poolAccount.totalStaked ?? poolAccount.total_staked,
        pendingRewards: poolAccount.pendingRewards ?? poolAccount.pending_rewards,
        lastUpdateTime: poolAccount.lastUpdate ?? poolAccount.last_update,
        bump: poolAccount.bump,
        stakeVaultBump: poolAccount.stakeVaultBump ?? poolAccount.stake_vault_bump,
        rewardVaultBump: poolAccount.rewardVaultBump ?? poolAccount.reward_vault_bump,
        
        // Legacy field names for compatibility
        acc_reward_per_share: poolAccount.accRewardPerShare ?? poolAccount.acc_reward_per_share,
        total_staked: poolAccount.totalStaked ?? poolAccount.total_staked,
        reward_rate: poolAccount.rewardRate ?? poolAccount.reward_rate,
        last_update_time: poolAccount.lastUpdate ?? poolAccount.last_update,
        last_update: poolAccount.lastUpdate ?? poolAccount.last_update,
      };
    } catch (error) {
      console.error('Error fetching pool info:', error);
      return null;
    }
  }

  // Get user position info
  async getUserPositionInfo(userWallet: PublicKey): Promise<any> {
    try {
      const [positionPDA] = await this.getUserPositionPDA(userWallet);
      const positionAccount = await (this.program.account as any).position.fetch(positionPDA);
      return positionAccount;
    } catch (error) {
      console.error('Error fetching user position info:', error);
      return null;
    }
  }
}