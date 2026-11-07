import { catalogRequest } from "./catalog-storage";

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
  publishedAt?: string;
  links?: {label:string;url:string}[];
  audio?: {id:string;name:string;url:string;type:string;size:number;caption?:string}[];
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

export const podcastStorageKey = "observatorio-podcast-v1";
let cache:Episode[]=[];
export function readEpisodes():Episode[]{return cache}
export async function loadEpisodes():Promise<Episode[]>{
  const {records}=await catalogRequest<{records:Episode[]}>("episodes");
  cache=records.map(item=>({...blankEpisode(),...item}));return cache;
}
export async function saveEpisode(episode:Episode):Promise<Episode>{
  if(cache.some(item=>item.youtubeId===episode.youtubeId&&item.id!==episode.id))throw new Error("Este video ya está registrado. Abre su ficha para editarlo.");
  const exists=cache.some(item=>item.id===episode.id);
  const {record}=await catalogRequest<{record:Episode}>("episodes",exists?episode.id:undefined,exists?"PUT":"POST",episode);
  const saved={...blankEpisode(),...record};cache=[saved,...cache.filter(item=>item.id!==saved.id)];return saved;
}
export async function deleteEpisode(id:string):Promise<Episode>{
  const episode=cache.find(item=>item.id===id);
  if(!episode)throw new Error("No encontramos este episodio. Recarga el catálogo.");
  await catalogRequest("episodes",id,"DELETE");cache=cache.filter(item=>item.id!==id);return episode;
}
