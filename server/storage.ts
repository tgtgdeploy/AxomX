import { eq, desc, sql, and } from "drizzle-orm";
import { db } from "./db";
import {
  profiles,
  vaultPositions,
  strategies,
  strategySubscriptions,
  predictionMarkets,
  nodeMemberships,
  transactions,
  tradeBets,
  aiPredictions,
  hedgePositions,
  insurancePurchases,
  predictionBets,
  systemConfig,
  type Profile,
  type InsertProfile,
  type VaultPosition,
  type InsertVaultPosition,
  type Strategy,
  type InsertStrategy,
  type StrategySubscription,
  type InsertStrategySubscription,
  type PredictionMarket,
  type InsertPredictionMarket,
  type NodeMembership,
  type Transaction,
  type InsertTransaction,
  type TradeBet,
  type InsertTradeBet,
  type AiPrediction,
  type HedgePosition,
  type InsertHedgePosition,
  type InsurancePurchase,
  type InsertInsurancePurchase,
  type PredictionBet,
  type InsertPredictionBet,
} from "@shared/schema";

export interface IStorage {
  getProfileByWallet(walletAddress: string): Promise<Profile | undefined>;
  createProfile(profile: InsertProfile): Promise<Profile>;
  updateProfile(id: string, data: Partial<Profile>): Promise<Profile>;
  getProfileById(id: string): Promise<Profile | undefined>;
  getReferrals(userId: string): Promise<Profile[]>;
  getProfileByRefCode(refCode: string): Promise<Profile | undefined>;

  getVaultPositions(userId: string): Promise<VaultPosition[]>;
  createVaultPosition(position: InsertVaultPosition): Promise<VaultPosition>;
  updateVaultPosition(id: string, data: Partial<VaultPosition>): Promise<VaultPosition>;

  getStrategies(): Promise<Strategy[]>;
  createStrategy(strategy: InsertStrategy): Promise<Strategy>;

  getStrategySubscriptions(userId: string): Promise<StrategySubscription[]>;
  createStrategySubscription(sub: InsertStrategySubscription): Promise<StrategySubscription>;

  getPredictionMarkets(): Promise<PredictionMarket[]>;
  createPredictionMarket(market: InsertPredictionMarket): Promise<PredictionMarket>;

  getNodeMembership(userId: string): Promise<NodeMembership | undefined>;
  createNodeMembership(userId: string, nodeType: string, price: string): Promise<NodeMembership>;

  getTransactions(userId: string, type?: string): Promise<Transaction[]>;
  createTransaction(tx: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: string, data: Partial<Transaction>): Promise<Transaction>;

  getTradeBets(userId: string): Promise<TradeBet[]>;
  createTradeBet(bet: InsertTradeBet): Promise<TradeBet>;
  updateTradeBet(id: string, data: Partial<TradeBet>): Promise<TradeBet>;
  getTradeStats(userId: string): Promise<{ total: number; wins: number; losses: number; totalStaked: string }>;

  getLatestPrediction(asset: string): Promise<AiPrediction | undefined>;
  savePrediction(data: Partial<AiPrediction>): Promise<AiPrediction>;

  getVaultOverview(): Promise<{ tvl: string; holders: number; totalPositions: number }>;
  getStrategyOverview(): Promise<{ totalAum: string; avgWinRate: string; avgReturn: string }>;

  getHedgePositions(userId: string): Promise<HedgePosition[]>;
  createHedgePosition(data: InsertHedgePosition): Promise<HedgePosition>;
  getInsurancePurchases(userId: string): Promise<InsurancePurchase[]>;
  createInsurancePurchase(data: InsertInsurancePurchase): Promise<InsurancePurchase>;
  getInsurancePoolOverview(): Promise<{ poolSize: string; totalPolicies: number; totalPaid: string; payoutRate: string }>;

  getPredictionBets(userId: string): Promise<PredictionBet[]>;
  createPredictionBet(data: InsertPredictionBet): Promise<PredictionBet>;
}

export class DatabaseStorage implements IStorage {
  async getProfileByWallet(walletAddress: string): Promise<Profile | undefined> {
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.walletAddress, walletAddress.toLowerCase()));
    return profile;
  }

  async createProfile(profile: InsertProfile): Promise<Profile> {
    const [created] = await db
      .insert(profiles)
      .values({ ...profile, walletAddress: profile.walletAddress.toLowerCase() })
      .returning();
    return created;
  }

  async updateProfile(id: string, data: Partial<Profile>): Promise<Profile> {
    const [updated] = await db.update(profiles).set(data).where(eq(profiles.id, id)).returning();
    return updated;
  }

  async getProfileById(id: string): Promise<Profile | undefined> {
    const [profile] = await db.select().from(profiles).where(eq(profiles.id, id));
    return profile;
  }

  async getReferrals(userId: string): Promise<Profile[]> {
    return db.select().from(profiles).where(eq(profiles.referrerId, userId));
  }

  async getProfileByRefCode(refCode: string): Promise<Profile | undefined> {
    const [profile] = await db.select().from(profiles).where(eq(profiles.refCode, refCode));
    return profile;
  }

  async getVaultPositions(userId: string): Promise<VaultPosition[]> {
    return db.select().from(vaultPositions).where(eq(vaultPositions.userId, userId)).orderBy(desc(vaultPositions.startDate));
  }

  async createVaultPosition(position: InsertVaultPosition): Promise<VaultPosition> {
    const [created] = await db.insert(vaultPositions).values(position).returning();
    return created;
  }

  async updateVaultPosition(id: string, data: Partial<VaultPosition>): Promise<VaultPosition> {
    const [updated] = await db.update(vaultPositions).set(data).where(eq(vaultPositions.id, id)).returning();
    return updated;
  }

  async getStrategies(): Promise<Strategy[]> {
    return db.select().from(strategies);
  }

  async createStrategy(strategy: InsertStrategy): Promise<Strategy> {
    const [created] = await db.insert(strategies).values(strategy).returning();
    return created;
  }

  async getStrategySubscriptions(userId: string): Promise<StrategySubscription[]> {
    return db.select().from(strategySubscriptions).where(eq(strategySubscriptions.userId, userId));
  }

  async createStrategySubscription(sub: InsertStrategySubscription): Promise<StrategySubscription> {
    const [created] = await db.insert(strategySubscriptions).values(sub).returning();
    return created;
  }

  async getPredictionMarkets(): Promise<PredictionMarket[]> {
    return db.select().from(predictionMarkets);
  }

  async createPredictionMarket(market: InsertPredictionMarket): Promise<PredictionMarket> {
    const [created] = await db.insert(predictionMarkets).values(market).returning();
    return created;
  }

  async getNodeMembership(userId: string): Promise<NodeMembership | undefined> {
    const [membership] = await db
      .select()
      .from(nodeMemberships)
      .where(eq(nodeMemberships.userId, userId));
    return membership;
  }

  async createNodeMembership(userId: string, nodeType: string, price: string): Promise<NodeMembership> {
    const [created] = await db
      .insert(nodeMemberships)
      .values({ userId, nodeType, price })
      .returning();
    return created;
  }

  async getTransactions(userId: string, type?: string): Promise<Transaction[]> {
    if (type) {
      return db.select().from(transactions)
        .where(and(eq(transactions.userId, userId), eq(transactions.type, type)))
        .orderBy(desc(transactions.createdAt));
    }
    return db.select().from(transactions).where(eq(transactions.userId, userId)).orderBy(desc(transactions.createdAt));
  }

  async createTransaction(tx: InsertTransaction): Promise<Transaction> {
    const [created] = await db.insert(transactions).values(tx).returning();
    return created;
  }

  async updateTransaction(id: string, data: Partial<Transaction>): Promise<Transaction> {
    const [updated] = await db.update(transactions).set(data).where(eq(transactions.id, id)).returning();
    return updated;
  }

  async getTradeBets(userId: string): Promise<TradeBet[]> {
    return db.select().from(tradeBets).where(eq(tradeBets.userId, userId)).orderBy(desc(tradeBets.createdAt));
  }

  async createTradeBet(bet: InsertTradeBet): Promise<TradeBet> {
    const [created] = await db.insert(tradeBets).values(bet).returning();
    return created;
  }

  async updateTradeBet(id: string, data: Partial<TradeBet>): Promise<TradeBet> {
    const [updated] = await db.update(tradeBets).set(data).where(eq(tradeBets.id, id)).returning();
    return updated;
  }

  async getTradeStats(userId: string): Promise<{ total: number; wins: number; losses: number; totalStaked: string }> {
    const bets = await db.select().from(tradeBets).where(eq(tradeBets.userId, userId));
    const total = bets.length;
    const wins = bets.filter(b => b.result === "WIN").length;
    const losses = bets.filter(b => b.result === "LOSS").length;
    const totalStaked = bets.reduce((sum, b) => sum + Number(b.amount || 0), 0).toFixed(2);
    return { total, wins, losses, totalStaked };
  }

  async getLatestPrediction(asset: string): Promise<AiPrediction | undefined> {
    const [pred] = await db.select().from(aiPredictions)
      .where(eq(aiPredictions.asset, asset))
      .orderBy(desc(aiPredictions.createdAt))
      .limit(1);
    return pred;
  }

  async savePrediction(data: Partial<AiPrediction>): Promise<AiPrediction> {
    const [created] = await db.insert(aiPredictions).values(data as any).returning();
    return created;
  }

  async getVaultOverview(): Promise<{ tvl: string; holders: number; totalPositions: number }> {
    const positions = await db.select().from(vaultPositions).where(eq(vaultPositions.status, "ACTIVE"));
    const tvl = positions.reduce((sum, p) => sum + Number(p.principal || 0), 0);
    const holderIds = new Set(positions.map(p => p.userId));
    return {
      tvl: tvl.toFixed(2),
      holders: holderIds.size,
      totalPositions: positions.length,
    };
  }

  async getStrategyOverview(): Promise<{ totalAum: string; avgWinRate: string; avgReturn: string }> {
    const strats = await db.select().from(strategies).where(eq(strategies.status, "ACTIVE"));
    const totalAum = strats.reduce((sum, s) => sum + Number(s.totalAum || 0), 0);
    const avgWinRate = strats.length > 0
      ? (strats.reduce((sum, s) => sum + Number(s.winRate || 0), 0) / strats.length)
      : 0;
    const avgReturn = strats.length > 0
      ? (strats.reduce((sum, s) => sum + Number(s.monthlyReturn || 0), 0) / strats.length)
      : 0;
    return {
      totalAum: totalAum.toFixed(2),
      avgWinRate: avgWinRate.toFixed(2),
      avgReturn: avgReturn.toFixed(2),
    };
  }
  async getHedgePositions(userId: string): Promise<HedgePosition[]> {
    return db.select().from(hedgePositions).where(eq(hedgePositions.userId, userId)).orderBy(desc(hedgePositions.createdAt));
  }

  async createHedgePosition(data: InsertHedgePosition): Promise<HedgePosition> {
    const [created] = await db.insert(hedgePositions).values(data).returning();
    return created;
  }

  async getInsurancePurchases(userId: string): Promise<InsurancePurchase[]> {
    return db.select().from(insurancePurchases).where(eq(insurancePurchases.userId, userId)).orderBy(desc(insurancePurchases.createdAt));
  }

  async createInsurancePurchase(data: InsertInsurancePurchase): Promise<InsurancePurchase> {
    const [created] = await db.insert(insurancePurchases).values(data).returning();
    return created;
  }

  async getInsurancePoolOverview(): Promise<{ poolSize: string; totalPolicies: number; totalPaid: string; payoutRate: string }> {
    const allPurchases = await db.select().from(insurancePurchases);
    const poolSize = allPurchases.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const totalPolicies = allPurchases.length;
    const paidOut = allPurchases.filter(p => p.status === "PAID").reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const payoutRate = totalPolicies > 0 ? (allPurchases.filter(p => p.status === "PAID").length / totalPolicies * 100) : 0;
    return {
      poolSize: poolSize.toFixed(2),
      totalPolicies,
      totalPaid: paidOut.toFixed(2),
      payoutRate: payoutRate.toFixed(2),
    };
  }

  async getPredictionBets(userId: string): Promise<PredictionBet[]> {
    return db.select().from(predictionBets).where(eq(predictionBets.userId, userId)).orderBy(desc(predictionBets.createdAt));
  }

  async createPredictionBet(data: InsertPredictionBet): Promise<PredictionBet> {
    const [created] = await db.insert(predictionBets).values(data).returning();
    return created;
  }
}

export const storage = new DatabaseStorage();
