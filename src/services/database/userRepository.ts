import type { User } from "../../types/user.types";
import { getDatabase } from "./db";

function parseUser(row: any): User {
  return {
    id: row.id,
    name: row.name,
    whyAnchor: row.why_anchor,
    whyAnchorImageUri: row.why_anchor_image_uri,
    profileImageUri: row.profile_image_uri ?? undefined,
    dreamBoardImageUri: row.dream_board_image_uri ?? undefined,
    currentPhase: row.current_phase,
    onboardingCompleted: Boolean(row.onboarding_completed),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const UserRepository = {
  async create(data: {
    id: string;
    name: string;
    whyAnchor: string;
    whyAnchorImageUri?: string;
  }): Promise<User> {
    const db = await getDatabase();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO users (id, name, why_anchor, why_anchor_image_uri, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        data.id,
        data.name,
        data.whyAnchor,
        data.whyAnchorImageUri ?? null,
        now,
        now,
      ],
    );

    return {
      id: data.id,
      name: data.name,
      whyAnchor: data.whyAnchor,
      whyAnchorImageUri: data.whyAnchorImageUri,
      currentPhase: 1,
      onboardingCompleted: false,
      createdAt: now,
      updatedAt: now,
    };
  },

  async getFirst(): Promise<User | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<any>("SELECT * FROM users LIMIT 1");
    return row ? parseUser(row) : null;
  },

  async getById(id: string): Promise<User | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<any>(
      "SELECT * FROM users WHERE id = ?",
      [id],
    );
    return row ? parseUser(row) : null;
  },

  async update(id: string, data: Partial<User>): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();

    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updates.push("name = ?");
      values.push(data.name);
    }
    if (data.whyAnchor !== undefined) {
      updates.push("why_anchor = ?");
      values.push(data.whyAnchor);
    }
    if (data.whyAnchorImageUri !== undefined) {
      updates.push("why_anchor_image_uri = ?");
      values.push(data.whyAnchorImageUri);
    }
    if (data.profileImageUri !== undefined) {
      updates.push("profile_image_uri = ?");
      values.push(data.profileImageUri);
    }
    if (data.dreamBoardImageUri !== undefined) {
      updates.push("dream_board_image_uri = ?");
      values.push(data.dreamBoardImageUri);
    }
    if (data.currentPhase !== undefined) {
      updates.push("current_phase = ?");
      values.push(data.currentPhase);
    }
    if (data.onboardingCompleted !== undefined) {
      updates.push("onboarding_completed = ?");
      values.push(data.onboardingCompleted ? 1 : 0);
    }

    updates.push("updated_at = ?");
    values.push(now);
    values.push(id);

    await db.runAsync(
      `UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
      values,
    );
  },

  async completeOnboarding(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      "UPDATE users SET onboarding_completed = 1, updated_at = ? WHERE id = ?",
      [new Date().toISOString(), id],
    );
  },

  // Migra o ID local de um usuário para um novo ID (ex: UUID do Supabase Auth).
  // Usado quando o usuário foi criado com um ID local diferente do auth UUID.
  async updateId(oldId: string, newId: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      "UPDATE users SET id = ?, updated_at = ? WHERE id = ?",
      [newId, new Date().toISOString(), oldId],
    );
  },
};
