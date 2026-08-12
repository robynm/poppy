import { supabase, cloudEnabled } from "./supabase.js";
import { Log } from "./log.js";

// --- Cloud sync (Supabase) -------------------------------------------------
// A per-device durable mirror. Anonymous auth gives a stable identity stored in
// localStorage (which survives the IndexedDB wipes we're guarding against), so
// on the next load the app can re-download any photos the browser evicted.
// Metadata (items/edits/tags/snaps) is one JSON row per user; photos are one
// Storage object per image id at `<uid>/<id>`.

const TABLE = "wardrobe";
const BUCKET = "photos";

let userId = null;
let authPromise = null;

// --- status broadcast (for the header menu indicator) ----------------------
let statusListener = null;
function onCloudStatus(fn) {
  statusListener = fn;
}
function emit(status, extra) {
  try {
    statusListener?.(status, extra);
  } catch {
    /* listener errors must never break sync */
  }
}

// --- auth ------------------------------------------------------------------
async function ensureAnonAuth() {
  if (!cloudEnabled) return null;
  if (userId) return userId;
  if (authPromise) return authPromise;
  authPromise = (async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        userId = session.user.id;
        return userId;
      }
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      userId = data.user?.id ?? null;
      Log.info("cloud.auth", { anon: true });
      return userId;
    } catch (e) {
      Log.error("cloud.auth.failed", { error: String(e) });
      return null;
    } finally {
      authPromise = null;
    }
  })();
  return authPromise;
}

// --- metadata --------------------------------------------------------------
async function pullState() {
  if (!(await ensureAnonAuth())) return null;
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select("data")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return data?.data ?? null;
  } catch (e) {
    Log.error("cloud.pull.failed", { error: String(e) });
    return null;
  }
}

async function pushState(metadata) {
  if (!(await ensureAnonAuth())) return false;
  try {
    const { error } = await supabase
      .from(TABLE)
      .upsert({
        user_id: userId,
        data: metadata,
        updated_at: new Date().toISOString(),
      });
    if (error) throw error;
    return true;
  } catch (e) {
    Log.error("cloud.push.failed", { error: String(e) });
    return false;
  }
}

// Debounced metadata push, used by the save* handlers on every change. Takes a
// getter (not a value) so it reads the freshest state when the timer fires —
// after all the React state updates from a burst of edits have settled.
let pushTimer = null;
let metaGetter = null;
function scheduleStatePush(getMeta) {
  if (!cloudEnabled) return;
  metaGetter = getMeta;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(async () => {
    const m = metaGetter?.();
    metaGetter = null;
    if (!m) return;
    if (!navigator.onLine) {
      emit("offline");
      markDirty();
      return;
    }
    emit("syncing");
    const ok = await pushState(m);
    if (ok) {
      clearDirty();
      emit("synced", { at: Date.now() });
    } else {
      markDirty();
      emit("error");
    }
  }, 1500);
}

// --- photos ----------------------------------------------------------------
const pathFor = (id) => `${userId}/${id}`;

async function pushImage(id, blob) {
  if (!(await ensureAnonAuth())) return false;
  try {
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(pathFor(id), blob, {
        upsert: true,
        contentType: blob.type || "image/webp",
      });
    if (error) throw error;
    return true;
  } catch (e) {
    Log.error("cloud.image.push.failed", { id, error: String(e) });
    return false;
  }
}

async function downloadImage(id) {
  if (!(await ensureAnonAuth())) return null;
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .download(pathFor(id));
    if (error) throw error;
    return data; // Blob
  } catch (e) {
    Log.error("cloud.image.download.failed", { id, error: String(e) });
    return null;
  }
}

async function listCloudImageIds() {
  if (!(await ensureAnonAuth())) return new Set();
  const ids = new Set();
  const limit = 1000;
  let offset = 0;
  try {
    for (;;) {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .list(userId, { limit, offset });
      if (error) throw error;
      for (const f of data) ids.add(f.name);
      if (data.length < limit) break;
      offset += limit;
    }
  } catch (e) {
    Log.error("cloud.list.failed", { error: String(e) });
  }
  return ids;
}

// --- dirty flag (offline / failed pushes retried on next load or reconnect) -
const DIRTY_KEY = "closet:cloud_dirty:v1";
const markDirty = () => {
  try {
    localStorage.setItem(DIRTY_KEY, "1");
  } catch {}
};
const clearDirty = () => {
  try {
    localStorage.removeItem(DIRTY_KEY);
  } catch {}
};
const isDirty = () => {
  try {
    return localStorage.getItem(DIRTY_KEY) === "1";
  } catch {
    return false;
  }
};

export {
  cloudEnabled,
  onCloudStatus,
  emit as emitCloudStatus,
  ensureAnonAuth,
  pullState,
  pushState,
  scheduleStatePush,
  pushImage,
  downloadImage,
  listCloudImageIds,
  markDirty,
  clearDirty,
  isDirty,
};
