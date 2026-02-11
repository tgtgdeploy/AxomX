import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  numeric,
  timestamp,
  pgEnum,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const executionModeEnum = pgEnum("execution_mode", [
  "EXTERNAL",
  "INTERNAL",
]);

export const vaultPlanEnum = pgEnum("vault_plan", [
  "5_DAYS",
  "15_DAYS",
  "45_DAYS",
]);

export const vaultStatusEnum = pgEnum("vault_status", [
  "ACTIVE",
  "COMPLETED",
  "EARLY_EXIT",
]);

export const nodeTypeEnum = pgEnum("node_type", ["MAX", "MINI", "NONE"]);

export const accountTypeEnum = pgEnum("account_type", [
  "spot",
  "vault",
  "strategy",
  "bonus",
]);

export const strategyStatusEnum = pgEnum("strategy_status", [
  "ACTIVE",
  "PAUSED",
  "CLOSED",
]);

export const profiles = pgTable("profiles", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  walletAddress: text("wallet_address").notNull().unique(),
  refCode: text("ref_code")
    .notNull()
    .default(sql`substr(md5(random()::text), 1, 8)`),
  referrerId: varchar("referrer_id"),
  rank: text("rank").notNull().default("V0"),
  nodeType: text("node_type").notNull().default("NONE"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const vaultPositions = pgTable("vault_positions", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => profiles.id),
  planType: text("plan_type").notNull(),
  executionMode: text("execution_mode").notNull().default("INTERNAL"),
  principal: numeric("principal", { precision: 18, scale: 6 }).notNull(),
  dailyRate: numeric("daily_rate", { precision: 10, scale: 6 }).notNull(),
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date"),
  status: text("status").notNull().default("ACTIVE"),
});

export const strategies = pgTable("strategies", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  leverage: text("leverage").notNull().default("3X-10X"),
  winRate: numeric("win_rate", { precision: 6, scale: 2 }),
  monthlyReturn: numeric("monthly_return", { precision: 6, scale: 2 }),
  totalAum: numeric("total_aum", { precision: 18, scale: 2 }).default("0"),
  status: text("status").notNull().default("ACTIVE"),
  isHot: boolean("is_hot").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const strategySubscriptions = pgTable("strategy_subscriptions", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => profiles.id),
  strategyId: varchar("strategy_id")
    .notNull()
    .references(() => strategies.id),
  executionMode: text("execution_mode").notNull().default("INTERNAL"),
  allocatedCapital: numeric("allocated_capital", {
    precision: 18,
    scale: 6,
  }).notNull(),
  maxDrawdown: numeric("max_drawdown", { precision: 6, scale: 4 }).default(
    "0.30",
  ),
  status: text("status").notNull().default("ACTIVE"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const predictionMarkets = pgTable("prediction_markets", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  asset: text("asset").notNull(),
  timeframe: text("timeframe").notNull(),
  targetPrice1: numeric("target_price_1", { precision: 18, scale: 2 }),
  targetPrice2: numeric("target_price_2", { precision: 18, scale: 2 }),
  yesOdds: numeric("yes_odds", { precision: 6, scale: 2 }),
  noOdds: numeric("no_odds", { precision: 6, scale: 2 }),
  expiresAt: timestamp("expires_at"),
  status: text("status").notNull().default("OPEN"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const nodeMemberships = pgTable("node_memberships", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => profiles.id),
  nodeType: text("node_type").notNull(),
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date"),
  status: text("status").notNull().default("ACTIVE"),
});

export const systemConfig = pgTable("system_config", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertProfileSchema = createInsertSchema(profiles).omit({
  id: true,
  createdAt: true,
  refCode: true,
});

export const insertVaultPositionSchema = createInsertSchema(
  vaultPositions,
).omit({ id: true, startDate: true });

export const insertStrategySchema = createInsertSchema(strategies).omit({
  id: true,
  createdAt: true,
});

export const insertStrategySubscriptionSchema = createInsertSchema(
  strategySubscriptions,
).omit({ id: true, createdAt: true });

export const insertPredictionMarketSchema = createInsertSchema(
  predictionMarkets,
).omit({ id: true, createdAt: true });

export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profiles.$inferSelect;
export type VaultPosition = typeof vaultPositions.$inferSelect;
export type InsertVaultPosition = z.infer<typeof insertVaultPositionSchema>;
export type Strategy = typeof strategies.$inferSelect;
export type InsertStrategy = z.infer<typeof insertStrategySchema>;
export type StrategySubscription = typeof strategySubscriptions.$inferSelect;
export type InsertStrategySubscription = z.infer<
  typeof insertStrategySubscriptionSchema
>;
export type PredictionMarket = typeof predictionMarkets.$inferSelect;
export type InsertPredictionMarket = z.infer<
  typeof insertPredictionMarketSchema
>;
export type NodeMembership = typeof nodeMemberships.$inferSelect;
export type SystemConfig = typeof systemConfig.$inferSelect;
