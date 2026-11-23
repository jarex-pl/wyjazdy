// Warstwa danych: Firebase (prawdziwa synchronizacja) albo tryb demo (localStorage).
import { firebaseConfig } from './config.js';

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function randomChars(n) {
  const a = new Uint32Array(n);
  crypto.getRandomValues(a);
  return Array.from(a, (x) => CODE_ALPHABET[x % CODE_ALPHABET.length]).join('');
}
export const newTripCode = () => 'WYJ-' + randomChars(6);
export const newId = () => Date.now().toString(36) + randomChars(6).toLowerCase();
export const newAdminKey = () => randomChars(4) + '-' + randomChars(4);

export const isFirebaseConfigured = () =>
  !!firebaseConfig.apiKey && !String(firebaseConfig.apiKey).startsWith('WKLEJ');

// ---------------------------------------------------------------- Firebase
class FirebaseStore {
  constructor() { this.mode = 'firebase'; }

  async init() {
    const fb = await import('../vendor/firebase.js');
    this.fb = fb;
    const app = fb.initializeApp(firebaseConfig);
    this.auth = fb.getAuth(app);
    try {
      this.db = fb.initializeFirestore(app, {
        localCache: fb.persistentLocalCache({ tabManager: fb.persistentMultipleTabManager() })
      });
    } catch (e) {
      this.db = fb.initializeFirestore(app, {});
    }
    this.uid = await new Promise((resolve, reject) => {
      const off = fb.onAuthStateChanged(this.auth, (u) => {
        if (u) { off(); resolve(u.uid); }
      });
      fb.signInAnonymously(this.auth).catch((e) => { off(); reject(e); });
    });
    return this.uid;
  }

  tripRef(code) { return this.fb.doc(this.db, 'trips', code); }
  expCol(code) { return this.fb.collection(this.db, 'trips', code, 'expenses'); }

  async createTrip(data) {
    const { fb } = this;
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = newTripCode();
      const ref = this.tripRef(code);
      try {
        const snap = await fb.getDoc(ref);
        if (snap.exists()) continue;
      } catch (e) { /* brak uprawnień do odczytu = nie istnieje */ }
      await fb.setDoc(ref, { ...data, admins: [this.uid], createdAt: Date.now() });
      await fb.setDoc(fb.doc(this.db, 'trips', code, 'private', 'admin'), { key: newAdminKey() });
      return code;
    }
    throw new Error('Nie udało się wygenerować kodu');
  }

  async getTrip(code) {
    try {
      const snap = await this.fb.getDoc(this.tripRef(code));
      return snap.exists() ? { id: code, ...snap.data() } : null;
    } catch (e) {
      if (String(e.code).includes('permission')) return null;
      throw e;
    }
  }

  watchTrip(code, cb, onErr) {
    return this.fb.onSnapshot(this.tripRef(code), { includeMetadataChanges: true },
      (snap) => cb(snap.exists() ? { id: code, ...snap.data() } : null, { pending: snap.metadata.hasPendingWrites, cache: snap.metadata.fromCache }),
      onErr);
  }

  watchExpenses(code, cb, onErr) {
    return this.fb.onSnapshot(this.expCol(code), { includeMetadataChanges: true },
      (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })), { pending: snap.metadata.hasPendingWrites, cache: snap.metadata.fromCache }),
      onErr);
  }

  updateTrip(code, patch) { return this.fb.updateDoc(this.tripRef(code), patch); }
  addExpense(code, exp) {
    const id = exp.id || newId();
    const data = { ...exp }; delete data.id;
    return this.fb.setDoc(this.fb.doc(this.db, 'trips', code, 'expenses', id), data);
  }
  updateExpense(code, id, patch) { return this.fb.updateDoc(this.fb.doc(this.db, 'trips', code, 'expenses', id), patch); }
  deleteExpense(code, id) { return this.fb.deleteDoc(this.fb.doc(this.db, 'trips', code, 'expenses', id)); }

  async getAdminKey(code) {
    const snap = await this.fb.getDoc(this.fb.doc(this.db, 'trips', code, 'private', 'admin'));
    return snap.exists() ? snap.data().key : null;
  }

  async claimAdmin(code, key, trip) {
    const { fb } = this;
    try {
      await fb.setDoc(fb.doc(this.db, 'trips', code, 'adminClaims', this.uid), { key: key.trim().toUpperCase(), at: Date.now() });
    } catch (e) { return false; }
    const admins = Array.from(new Set([...(trip.admins || []), this.uid]));
    await fb.updateDoc(this.tripRef(code), { admins });
    return true;
  }

  async deleteTrip(code) {
    const { fb } = this;
    const snap = await fb.getDocs(this.expCol(code));
    let batch = fb.writeBatch(this.db), n = 0;
    for (const d of snap.docs) {
      batch.delete(d.ref);
      if (++n % 400 === 0) { await batch.commit(); batch = fb.writeBatch(this.db); }
    }
    await batch.commit();
    try { await fb.deleteDoc(fb.doc(this.db, 'trips', code, 'private', 'admin')); } catch (e) {}
    await fb.deleteDoc(this.tripRef(code));
  }
}

// ---------------------------------------------------------------- Tryb demo
class LocalStore {
  constructor() {
    this.mode = 'demo';
    this.listeners = new Set();
    window.addEventListener('storage', (ev) => {
      if (ev.key && ev.key.startsWith('demo:')) this.emit();
    });
  }
  async init() {
    let uid = localStorage.getItem('demo:uid');
    if (!uid) { uid = 'demo-' + randomChars(8); localStorage.setItem('demo:uid', uid); }
    this.uid = uid;
    return uid;
  }
  _get(k, d) { try { return JSON.parse(localStorage.getItem('demo:' + k)) ?? d; } catch (e) { return d; } }
  _set(k, v) { localStorage.setItem('demo:' + k, JSON.stringify(v)); this.emit(); }
  emit() { setTimeout(() => this.listeners.forEach((fn) => fn()), 0); }

  async createTrip(data) {
    const code = newTripCode();
    this._set('trip:' + code, { ...data, admins: [this.uid], createdAt: Date.now(), adminKey: newAdminKey() });
    this._set('exp:' + code, []);
    return code;
  }
  async getTrip(code) {
    const t = this._get('trip:' + code, null);
    return t ? { id: code, ...t } : null;
  }
  watchTrip(code, cb) {
    const fn = () => { const t = this._get('trip:' + code, null); cb(t ? { id: code, ...t } : null, { pending: false, cache: false }); };
    this.listeners.add(fn); fn();
    return () => this.listeners.delete(fn);
  }
  watchExpenses(code, cb) {
    const fn = () => cb(this._get('exp:' + code, []), { pending: false, cache: false });
    this.listeners.add(fn); fn();
    return () => this.listeners.delete(fn);
  }
  async updateTrip(code, patch) {
    const t = this._get('trip:' + code, null); if (!t) throw new Error('Brak wyjazdu');
    this._set('trip:' + code, { ...t, ...patch });
  }
  async addExpense(code, exp) {
    const list = this._get('exp:' + code, []);
    list.push({ ...exp, id: exp.id || newId() });
    this._set('exp:' + code, list);
  }
  async updateExpense(code, id, patch) {
    this._set('exp:' + code, this._get('exp:' + code, []).map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }
  async deleteExpense(code, id) {
    this._set('exp:' + code, this._get('exp:' + code, []).filter((e) => e.id !== id));
  }
  async getAdminKey(code) { return this._get('trip:' + code, {}).adminKey || null; }
  async claimAdmin(code, key, trip) {
    const t = this._get('trip:' + code, null);
    if (!t || t.adminKey !== key.trim().toUpperCase()) return false;
    this._set('trip:' + code, { ...t, admins: Array.from(new Set([...(t.admins || []), this.uid])) });
    return true;
  }
  async deleteTrip(code) {
    localStorage.removeItem('demo:trip:' + code);
    localStorage.removeItem('demo:exp:' + code);
    this.emit();
  }
}

export function createStore() {
  return isFirebaseConfigured() ? new FirebaseStore() : new LocalStore();
}
