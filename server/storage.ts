import { type User, type InsertUser } from "@shared/schema";
import { randomUUID } from "crypto";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;

  constructor() {
    this.users = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      ...insertUser,
      id,
      name: insertUser.name || null,
      createdAt: new Date(),
      companyName: null,
      companyPhone: null,
      companyEmail: null,
      companyAddress: null,
      companyWebsite: null,
      companyTaxId: null,
      currentPlan: 'free',
      isSubscribed: false,
      subscriptionStatus: 'inactive',
      revenuecatAppUserId: null,
      subscriptionPlatform: null,
      subscriptionTier: 'free',
      subscriptionExpiryDate: null,
      subscriptionRenewalDate: null,
      subscriptionCancellationDate: null,
      isTrialing: false,
      subscriptionUpdatedAt: new Date(),
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      stripePriceId: null,
      emailVerifiedAt: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
    };
    this.users.set(id, user);
    return user;
  }
}

export const storage = new MemStorage();
