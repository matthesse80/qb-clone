const one = async (db, sql, values = []) => (await db.query(sql, values)).rows[0];

export class PostgresCredentialStore {
  constructor(db) { this.db = db; }

  async findSeat(seat) {
    return one(this.db, `SELECT u.id,u.seat,u.auth_subject,u.active,c.password_hash,c.recovery_code_hash,
      c.credential_version,c.failed_attempts,c.locked_until
      FROM ledger.app_user u LEFT JOIN ledger.local_credential c ON c.user_id=u.id
      WHERE lower(u.seat)=lower($1)`, [seat]);
  }

  async enroll(userId, passwordHash, recoveryCodeHash) {
    return this.db.transaction(async tx => {
      const inserted = await tx.query(`INSERT INTO ledger.local_credential(user_id,password_hash,recovery_code_hash)
        VALUES($1,$2,$3) ON CONFLICT (user_id) DO NOTHING RETURNING user_id`,
      [userId, passwordHash, recoveryCodeHash]);
      if (!inserted.rows.length) return false;
      await this.#event(tx, userId, userId, 'enroll');
      return true;
    });
  }

  async loginSucceeded(userId) {
    await this.db.transaction(async tx => {
      await tx.query(`UPDATE ledger.local_credential SET failed_attempts=0,locked_until=NULL
        WHERE user_id=$1`, [userId]);
      await this.#event(tx, userId, userId, 'login-success');
    });
  }

  async loginFailed(userId, { failedAttempts, lockedUntil }) {
    await this.db.transaction(async tx => {
      await tx.query(`UPDATE ledger.local_credential SET failed_attempts=$2,locked_until=$3
        WHERE user_id=$1`, [userId, failedAttempts, lockedUntil]);
      await this.#event(tx, null, userId, 'login-failed', { locked: Boolean(lockedUntil) });
    });
  }

  async replaceCredential({ actorUserId, targetUserId, passwordHash, recoveryCodeHash, eventType }) {
    await this.db.transaction(async tx => {
      const updated = await tx.query(`UPDATE ledger.local_credential SET password_hash=$2,recovery_code_hash=$3,
        credential_version=credential_version+1,failed_attempts=0,locked_until=NULL,updated_at=now()
        WHERE user_id=$1 RETURNING user_id`, [targetUserId, passwordHash, recoveryCodeHash]);
      if (!updated.rows.length) throw new Error('Account is not enrolled.');
      await this.#event(tx, actorUserId, targetUserId, eventType);
    });
  }

  async record(userId, eventType) {
    await this.#event(this.db, userId, userId, eventType);
  }

  async #event(db, actorUserId, targetUserId, eventType, metadata = {}) {
    await db.query(`INSERT INTO ledger.security_event(actor_user_id,target_user_id,event_type,metadata)
      VALUES($1,$2,$3,$4)`, [actorUserId, targetUserId, eventType, JSON.stringify(metadata)]);
  }
}
