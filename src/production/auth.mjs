import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const SCRYPT = Object.freeze({ N: 16384, r: 8, p: 1, keyLength: 64 });
const OWNER_SEATS = new Set(['Matt', 'Janna']);
const normalizeSeat = value => `${value ?? ''}`.trim().toLowerCase();
const tokenKey = token => createHash('sha256').update(token).digest('hex');

export class AuthError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export async function hashSecret(secret, salt = randomBytes(16)) {
  if (typeof secret !== 'string' || secret.length < 14 || secret.length > 256)
    throw new AuthError(400, 'Use a passphrase of 14 to 256 characters.');
  const key = await scrypt(secret, salt, SCRYPT.keyLength, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64url')}$${key.toString('base64url')}`;
}

export async function verifySecret(secret, encoded) {
  try {
    const [kind, n, r, p, saltText, expectedText] = encoded.split('$');
    if (kind !== 'scrypt' || Number(n) !== SCRYPT.N || Number(r) !== SCRYPT.r || Number(p) !== SCRYPT.p) return false;
    const expected = Buffer.from(expectedText, 'base64url');
    const actual = await scrypt(secret, Buffer.from(saltText, 'base64url'), expected.length,
      { N: Number(n), r: Number(r), p: Number(p), maxmem: 64 * 1024 * 1024 });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch { return false; }
}

export function recoveryCode() {
  const raw = randomBytes(24).toString('base64url').toUpperCase();
  return raw.match(/.{1,8}/g).join('-');
}

export class LocalAccountService {
  constructor(store, { idleMs = 30 * 60 * 1000, lockMs = 15 * 60 * 1000, maxFailures = 5,
    now = () => Date.now() } = {}) {
    this.store = store; this.idleMs = idleMs; this.lockMs = lockMs;
    this.maxFailures = maxFailures; this.now = now; this.sessions = new Map();
  }

  async enroll(seat, password) {
    const user = await this.#owner(seat);
    if (user.password_hash) throw new AuthError(409, 'This owner account is already enrolled.');
    const code = recoveryCode();
    const created = await this.store.enroll(user.id, await hashSecret(password), await hashSecret(code));
    if (!created) throw new AuthError(409, 'This owner account is already enrolled.');
    return { seat: user.seat, recoveryCode: code };
  }

  async login(seat, password) {
    const user = await this.store.findSeat(seat);
    const now = this.now();
    if (!user?.active || !user.password_hash || (user.locked_until && new Date(user.locked_until).getTime() > now))
      throw new AuthError(401, 'Invalid sign-in or temporarily locked account.');
    if (!await verifySecret(password, user.password_hash)) {
      const failures = Number(user.failed_attempts ?? 0) + 1;
      await this.store.loginFailed(user.id, { failedAttempts: failures,
        lockedUntil: failures >= this.maxFailures ? new Date(now + this.lockMs).toISOString() : null });
      throw new AuthError(401, 'Invalid sign-in or temporarily locked account.');
    }
    await this.store.loginSucceeded(user.id);
    const token = randomBytes(32).toString('base64url');
    this.sessions.set(tokenKey(token), { userId: user.id, seat: user.seat,
      authSubject: user.auth_subject, credentialVersion: Number(user.credential_version), lastSeen: now });
    return { token, seat: user.seat, idleMs: this.idleMs };
  }

  async authenticate(token, { touch = true } = {}) {
    const key = tokenKey(`${token ?? ''}`);
    const session = this.sessions.get(key);
    if (!session) throw new AuthError(401, 'Sign in to continue.');
    if (this.now() - session.lastSeen >= this.idleMs) {
      this.sessions.delete(key); await this.store.record(session.userId, 'session-expired');
      throw new AuthError(401, 'Your session expired after 30 minutes of inactivity.');
    }
    const user = await this.store.findSeat(session.seat);
    if (!user?.active || Number(user.credential_version) !== session.credentialVersion) {
      this.sessions.delete(key); throw new AuthError(401, 'Sign in to continue.');
    }
    if (touch) session.lastSeen = this.now();
    return { userId: session.userId, seat: session.seat, authSubject: session.authSubject };
  }

  async logout(token) {
    const key = tokenKey(`${token ?? ''}`); const session = this.sessions.get(key);
    this.sessions.delete(key); if (session) await this.store.record(session.userId, 'logout');
  }

  async resetWithRecoveryCode(seat, code, newPassword) {
    const user = await this.#owner(seat);
    if (!user.recovery_code_hash || !await verifySecret(code, user.recovery_code_hash))
      throw new AuthError(401, 'Invalid recovery code.');
    return this.#replace(user, user.id, newPassword, 'recovery-reset');
  }

  async resetByCoOwner(actorToken, targetSeat, newPassword) {
    const actor = await this.authenticate(actorToken, { touch: false });
    const target = await this.#owner(targetSeat);
    if (actor.userId === target.id) throw new AuthError(400, 'Use password change or a recovery code for your own account.');
    return this.#replace(target, actor.userId, newPassword, 'co-owner-reset');
  }

  async #replace(target, actorUserId, password, eventType) {
    const code = recoveryCode();
    await this.store.replaceCredential({ actorUserId, targetUserId: target.id,
      passwordHash: await hashSecret(password), recoveryCodeHash: await hashSecret(code), eventType });
    this.#invalidate(target.id);
    return { seat: target.seat, recoveryCode: code };
  }

  async #owner(seat) {
    const user = await this.store.findSeat(seat);
    if (!user?.active || !OWNER_SEATS.has(user.seat) || normalizeSeat(user.seat) !== normalizeSeat(seat))
      throw new AuthError(404, 'Owner account not found.');
    return user;
  }

  #invalidate(userId) {
    for (const [key, session] of this.sessions) if (session.userId === userId) this.sessions.delete(key);
  }
}

export function sessionTokenFromRequest(req, cookieName = 'nec_session') {
  const pair = `${req.headers.cookie ?? ''}`.split(';').map(value => value.trim())
    .find(value => value.startsWith(`${cookieName}=`));
  return pair ? decodeURIComponent(pair.slice(cookieName.length + 1)) : null;
}

export function sessionCookie(token, { secure = true, maxAgeSeconds = 1800, cookieName = 'nec_session' } = {}) {
  const attributes = [`${cookieName}=${encodeURIComponent(token ?? '')}`, 'Path=/', 'HttpOnly', 'SameSite=Strict', `Max-Age=${token ? maxAgeSeconds : 0}`];
  if (secure) attributes.push('Secure');
  return attributes.join('; ');
}

export function requestAuthenticator(accounts) {
  return async req => {
    try { return (await accounts.authenticate(sessionTokenFromRequest(req))).authSubject; }
    catch (error) { if (error?.status === 401) return null; throw error; }
  };
}
