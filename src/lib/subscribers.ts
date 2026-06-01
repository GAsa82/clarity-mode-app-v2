const STORAGE_KEY = "clarity-subscribers";

export type Subscriber = {
  email: string;
  createdAt: string;
};

export function getSubscribers(): Subscriber[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Subscriber[];
  } catch (e) {
    console.error("Failed to read subscribers:", e);
    return [];
  }
}

export function saveSubscribers(list: Subscriber[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.error("Failed to save subscribers:", e);
  }
}

export function addSubscriber(email: string): { added: boolean; reason?: string } {
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return { added: false, reason: "invalid" };
  }
  const list = getSubscribers();
  if (list.some((s) => s.email === normalized)) {
    return { added: false, reason: "duplicate" };
  }
  const entry: Subscriber = { email: normalized, createdAt: new Date().toISOString() };
  list.unshift(entry);
  saveSubscribers(list);
  return { added: true };
}

export function subscriberCount(): number {
  return getSubscribers().length;
}
