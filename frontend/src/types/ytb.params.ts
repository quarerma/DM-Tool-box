// youtube-player-options.ts

export interface YouTubePlayerVars {
  autoplay?: 0 | 1;
  cc_lang_pref?: string;
  cc_load_policy?: 1;
  color?: "red" | "white";
  controls?: 0 | 1;
  disablekb?: 0 | 1;
  enablejsapi?: 0 | 1;
  end?: number;
  fs?: 0 | 1;
  hl?: string;
  iv_load_policy?: 1 | 3;
  list?: string;
  listType?: "playlist" | "user_uploads" | "search";
  loop?: 0 | 1;
  modestbranding?: 0 | 1;
  origin?: string;
  playlist?: string;
  playsinline?: 0 | 1;
  rel?: 0 | 1;
  start?: number;
  widget_referrer?: string;
}

export interface YouTubePlayerOptions {
  height?: string;
  width?: string;
  playerVars?: YouTubePlayerVars;
}
