import React, { useRef, useState, useEffect } from "react";
import type { YouTubePlayerOptions } from "@/types/ytb.params";
import YouTube from "react-youtube";

export default function YoutubePlayer({ videoId }: { videoId: string }) {
  const [start, setStart] = useState<number>(100);
  const [end, setEnd] = useState<number>(1005);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const playerRef = useRef<any>(null);
  const lastSeekRef = useRef<number>(0);
  const SEEK_COOLDOWN_MS = 500;

  const options: YouTubePlayerOptions = {
    width: "100%",
    height: "400px",
    playerVars: {
      autoplay: 1,
      playsinline: 1,
      start: start,
      end: end,
    },
  };

  const onReady = (event: any) => {
    playerRef.current = event.target;
    try {
      event.target.mute();
    } catch (e) {}
  };

  const onEventChange = (event: any) => {
    console.log(event);
  };

  const onEnd = (event: any) => {
    const p = playerRef.current || event.target;
    if (p && typeof p.seekTo === "function") {
      p.seekTo(start, true);
      p.playVideo();
    }
  };

  const onStateChange = (event: any) => {
    onEventChange(event);
    const state = event.data;

    if (state === 3 || state === 1) {
      const p = playerRef.current || event.target;
      if (p && typeof p.getCurrentTime === "function") {
        try {
          const t = p.getCurrentTime();
          const now = Date.now();
          if (
            t < start - SEEK_COOLDOWN_MS &&
            now - lastSeekRef.current > SEEK_COOLDOWN_MS
          ) {
            lastSeekRef.current = now;
            if (typeof p.seekTo === "function") {
              p.seekTo(start, true);
              if (typeof p.playVideo === "function") p.playVideo();
            }
          }
        } catch (e) {
          // ignore
        }
      }
    }

    setIsPlaying(state === 1);

    if (state === 0) {
      // ended
      onEnd(event);
    }
  };

  const togglePlay = () => {
    const p = playerRef.current;
    if (!p) return;
    if (isPlaying) p.pauseVideo();
    else p.playVideo();
  };

  useEffect(() => {
    return () => {
      // cleanup reference
      playerRef.current = null;
    };
  }, []);

  const onStartChange = (v: number) => {
    setStart(v);
    const p = playerRef.current;
    if (p && typeof p.seekTo === "function") {
      p.seekTo(v, true);
    }
  };

  const onEndChange = (v: number) => {
    setEnd(v);
  };

  return (
    <div className="w-full min-h-full">
      <YouTube
        videoId={videoId}
        opts={options}
        onReady={onReady}
        onStateChange={onStateChange}
        onEnd={onEnd}
      />

      <div className="mt-4 flex items-center gap-3">
        <button
          className="px-3 py-1 bg-gray-200 rounded"
          onClick={togglePlay}
          aria-label="Toggle play"
        >
          {isPlaying ? "Pause" : "Play"}
        </button>

        <label className="flex items-center gap-2">
          <span>Start (s):</span>
          <input
            type="number"
            value={start}
            onChange={(e) => onStartChange(Number(e.target.value))}
            className="w-24 px-2 py-1 border rounded"
          />
        </label>

        <label className="flex items-center gap-2">
          <span>End (s):</span>
          <input
            type="number"
            value={end}
            onChange={(e) => onEndChange(Number(e.target.value))}
            className="w-24 px-2 py-1 border rounded"
          />
        </label>
      </div>
    </div>
  );
}
