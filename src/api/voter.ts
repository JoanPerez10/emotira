const VOTER_KEY = "pobles-emoji:voter-id";

export const voterId = () => {
  try {
    let id = localStorage.getItem(VOTER_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(VOTER_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
};

// Separat per mode, perquè els ids simulats no es barregin amb els reals
export const votedStorageKey = (mode: string) => `pobles-emoji:voted:${mode}`;