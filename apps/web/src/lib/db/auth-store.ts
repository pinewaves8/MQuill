// Authentication store for v1 with file-based persistence
import { User, UserSession } from '@packages/shared-types';
import { loadCollection, saveCollection } from './file-storage';
import { createHash } from 'crypto';

const USERS_COLLECTION = 'users';
const SESSIONS_COLLECTION = 'sessions';

class AuthStore {
  private users: Map<string, User> = new Map();
  private sessions: Map<string, UserSession> = new Map();
  private initialized = false;

  private ensureInitialized(): void {
    if (this.initialized) return;
    this.initialized = true;

    try {
      const savedUsers = loadCollection<User>(USERS_COLLECTION);
      savedUsers.forEach((u) => this.users.set(u.id, u));

      const savedSessions = loadCollection<UserSession>(SESSIONS_COLLECTION);
      savedSessions.forEach((s) => this.sessions.set(s.id, s));
    } catch (error) {
      console.error('[AuthStore] Failed to load:', error);
    }
  }

  private persist(): void {
    this.ensureInitialized();
    try {
      saveCollection(USERS_COLLECTION, Array.from(this.users.values()));
      saveCollection(SESSIONS_COLLECTION, Array.from(this.sessions.values()));
    } catch (error) {
      console.error('[AuthStore] Failed to persist:', error);
    }
  }

  private hashPassword(password: string): string {
    return createHash('sha256').update(password).digest('hex');
  }

  async register(email: string, password: string, name: string): Promise<User | { error: string }> {
    this.ensureInitialized();

    // Check if email already exists
    const existingUser = Array.from(this.users.values()).find((u) => u.email === email);
    if (existingUser) {
      return { error: 'Email already registered' };
    }

    const id = crypto.randomUUID();
    const user: User = {
      id,
      email,
      passwordHash: this.hashPassword(password),
      name,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.users.set(id, user);
    this.persist();

    return user;
  }

  async login(email: string, password: string): Promise<{ user: User; sessionId: string } | { error: string }> {
    this.ensureInitialized();

    const user = Array.from(this.users.values()).find((u) => u.email === email);
    if (!user) {
      return { error: 'Invalid email or password' };
    }

    if (user.passwordHash !== this.hashPassword(password)) {
      return { error: 'Invalid email or password' };
    }

    // Create session
    const sessionId = crypto.randomUUID();
    const session: UserSession = {
      id: sessionId,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    };

    this.sessions.set(sessionId, session);
    this.persist();

    return { user, sessionId };
  }

  async logout(sessionId: string): Promise<void> {
    this.ensureInitialized();
    this.sessions.delete(sessionId);
    this.persist();
  }

  async getSession(sessionId: string): Promise<UserSession | null> {
    this.ensureInitialized();
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    // Check if expired
    if (new Date() > session.expiresAt) {
      this.sessions.delete(sessionId);
      this.persist();
      return null;
    }

    return session;
  }

  async getUserById(userId: string): Promise<User | null> {
    this.ensureInitialized();
    return this.users.get(userId) || null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    this.ensureInitialized();
    return Array.from(this.users.values()).find((u) => u.email === email) || null;
  }
}

export const authStore = new AuthStore();
