import { BaseRepository } from "./BaseRepository.js";

function mapUser(row = {}) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.status,
    passwordHash: row.password_hash,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class UserRepository extends BaseRepository {
  async findByEmail(email) {
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!normalizedEmail) {
      return null;
    }

    const rows = await this.query("SELECT * FROM users WHERE LOWER(email) = ? LIMIT 1", [normalizedEmail]);
    return rows[0] ? mapUser(rows[0]) : null;
  }

  async list() {
    const rows = await this.query("SELECT * FROM users ORDER BY name ASC");
    return rows.map(mapUser);
  }

  async updateByEmail(email, updates = {}) {
    const current = await this.findByEmail(email);

    if (!current) {
      return null;
    }

    const next = {
      name: updates.name ?? current.name,
      role: updates.role ?? current.role,
      status: updates.status ?? current.status,
    };

    await this.query("UPDATE users SET name = ?, role = ?, status = ? WHERE email = ?", [next.name, next.role, next.status, current.email]);
    return this.findByEmail(current.email);
  }

  async upsert(user = {}) {
    await this.query(
      `INSERT INTO users (name, email, password_hash, role, status)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         role = VALUES(role),
         status = VALUES(status),
         password_hash = VALUES(password_hash)`,
      [user.name, user.email, user.passwordHash || user.password_hash, user.role || "User", user.status || "Active"]
    );
  }
}
