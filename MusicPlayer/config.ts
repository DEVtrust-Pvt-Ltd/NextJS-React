const playerConfig = {
  container: "#draw",
  waveColor: "rgba(100,100,130,.2)",
  height: 42,
  cursorColor: "rgba(100,100,120,.35)",
  barWidth: 2,
  normalize: true,
  responsive: true,
  cursorWidth: 1,
  pixelRatio: 2,
  backend: "MediaElement",
  mediaType: "audio",
} as WaveSurfer.WaveSurferParams;

export { playerConfig };
