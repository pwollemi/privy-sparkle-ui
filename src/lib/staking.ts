import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { Program, AnchorProvider, web3, BN } from '@coral-xyz/anchor';
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';

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
export const USER_STAKE_SEED = 'user_stake';

export class StakingProgram {
  private program: Program;
  private connection: Connection;

  constructor(connection: Connection, wallet: any) {
    const provider = new AnchorProvider(connection, wallet, {});
    this.program = new Program(stakingIdl as any, provider, STAKING_PROGRAM_ID);
    this.connection = connection;
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

  // Get the user stake account PDA
  async getUserStakePDA(userWallet: PublicKey, stakeMint: PublicKey): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddress(
      [
        Buffer.from(USER_STAKE_SEED),
        userWallet.toBuffer(),
        stakeMint.toBuffer(),
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
    amount: number
  ): Promise<Transaction> {
    const [poolPDA] = await this.getPoolPDA();
    const [userStakePDA] = await this.getUserStakePDA(userWallet, stakeMint);
    const [stakeVaultPDA] = await this.getStakeVaultPDA();

    const transaction = new Transaction();
    
    // Note: This is a placeholder - the actual implementation would depend on the
    // specific methods available in your staking program IDL
    try {
      const tokenProgram = await this.resolveTokenProgramId(stakeMint);
      const instruction = await this.program.methods
        .stake(new BN(amount))
        .accounts({
          pool: poolPDA,
          userStake: userStakePDA,
          user: userWallet,
          stakeMint: stakeMint,
          stakeVault: stakeVaultPDA,
          systemProgram: SystemProgram.programId,
          tokenProgram: tokenProgram,
        })
        .instruction();

      transaction.add(instruction);
    } catch (error) {
      console.error('Error creating stake instruction:', error);
      throw new Error('Failed to create stake transaction');
    }

    return transaction;
  }

  // Unstake tokens
  async unstakeTokens(
    userWallet: PublicKey,
    stakeMint: PublicKey,
    amount: number
  ): Promise<Transaction> {
    const [poolPDA] = await this.getPoolPDA();
    const [userStakePDA] = await this.getUserStakePDA(userWallet, stakeMint);
    const [stakeVaultPDA] = await this.getStakeVaultPDA();

    const transaction = new Transaction();
    
    try {
      const tokenProgram = await this.resolveTokenProgramId(stakeMint);
      const instruction = await this.program.methods
        .unstake(new BN(amount))
        .accounts({
          pool: poolPDA,
          userStake: userStakePDA,
          user: userWallet,
          stakeMint: stakeMint,
          stakeVault: stakeVaultPDA,
          systemProgram: SystemProgram.programId,
          tokenProgram: tokenProgram,
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
    stakeMint: PublicKey
  ): Promise<Transaction> {
    const [poolPDA] = await this.getPoolPDA();
    const [userStakePDA] = await this.getUserStakePDA(userWallet, stakeMint);
    const [rewardVaultPDA] = await this.getRewardVaultPDA();

    const transaction = new Transaction();
    
    try {
      const tokenProgram = await this.resolveTokenProgramId(stakeMint);
      const instruction = await this.program.methods
        .claimRewards()
        .accounts({
          pool: poolPDA,
          userStake: userStakePDA,
          user: userWallet,
          rewardVault: rewardVaultPDA,
          systemProgram: SystemProgram.programId,
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
      // TODO: Implement proper account fetching based on actual IDL structure
      // const poolAccount = await this.program.account.pool.fetch(poolPDA);
      // return poolAccount;
      return null;
    } catch (error) {
      console.error('Error fetching pool info:', error);
      return null;
    }
  }

  // Get user stake info
  async getUserStakeInfo(userWallet: PublicKey, stakeMint: PublicKey): Promise<any> {
    try {
      const [userStakePDA] = await this.getUserStakePDA(userWallet, stakeMint);
      // TODO: Implement proper account fetching based on actual IDL structure
      // const userStakeAccount = await this.program.account.userStake.fetch(userStakePDA);
      // return userStakeAccount;
      return null;
    } catch (error) {
      console.error('Error fetching user stake info:', error);
      return null;
    }
  }
}