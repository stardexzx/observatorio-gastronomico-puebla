export type Episode = {
  id: string;
  title: string;
  youtubeId: string;
  format: "podcast" | "video";
  description: string;
  participants: string;
  date: string;
  municipality: string;
  municipalityCode: string;
  recipeIds: string[];
  ingredientIds: string[];
  status: "draft" | "published";
  updatedAt: string;
};

export const blankEpisode = (): Episode => ({
  id: "", title: "", youtubeId: "", format: "podcast", description: "",
  participants: "", date: "", municipality: "", municipalityCode: "", recipeIds: [], ingredientIds: [],
  status: "draft", updatedAt: "",
});

// Accept video links only, and construct embed URLs from the validated ID.
export function youtubeVideoId(input: string): string | null {
  try {
    const url = new URL(input.trim());
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return null;
    const host = url.hostname.toLowerCase();
    let id: string | null = null;
    if (host === "youtu.be") id = url.pathname.split("/")[1];
    else if (["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com"].includes(host)) {
      if (url.pathname === "/watch") id = url.searchParams.get("v");
      else if (/^\/(embed|shorts|live)\//.test(url.pathname)) id = url.pathname.split("/")[2];
    }
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  } catch { return null; }
}

const storageKey = "observatorio-podcast-v1";
export function readEpisodes(): Episode[] {
  const saved = window.localStorage.getItem(storageKey);
  if (!saved) return [];
  const records: unknown = JSON.parse(saved);
  if (!Array.isArray(records) || records.some(item => !item || typeof item.id !== "string" || typeof item.title !== "string" || !/^[A-Za-z0-9_-]{11}$/.test(item.youtubeId) || !["draft", "published"].includes(item.status))) {
    throw new Error("No se pudo leer el catálogo de episodios.");
  }
  return records.map(item => ({...blankEpisode(), ...item}));
}
export function saveEpisode(episode: Episode): Episode {
  const records = readEpisodes();
  if (records.some(item => item.youtubeId === episode.youtubeId && item.id !== episode.id)) {
    throw new Error("Este video ya está registrado. Abre su ficha para editarlo.");
  }
  const saved = {...episode, id: episode.id || crypto.randomUUID(), updatedAt: new Date().toISOString()};
  window.localStorage.setItem(storageKey, JSON.stringify([saved, ...records.filter(item => item.id !== saved.id)]));
  return saved;
}
export function deleteEpisode(id: string): Episode {
  const records = readEpisodes();
  const episode = records.find(item => item.id === id);
  if (!episode) throw new Error("No encontramos este episodio. Recarga el catálogo.");
  window.localStorage.setItem(storageKey, JSON.stringify(records.filter(item => item.id !== id)));
  return episode;
}
