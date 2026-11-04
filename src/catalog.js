// Catálogo de álbumes y canciones.
// Los videos se reproducen desde YouTube (canales oficiales); este proyecto no aloja audio ni video.
// energy: "high" (baile), "mid" (medio tiempo), "ballad" (balada) — define el estilo de luces.
// bpm: aproximado; se puede ajustar desde la app.

export const ALBUMS = [
  {
    id: "hyyh-pt1",
    title: "The Most Beautiful Moment in Life Pt.1",
    year: 2015,
    palette: ["#ff6f91", "#6a5acd", "#ffd6e0"],
    songs: [{ id: "i-need-u", title: "I NEED U", yt: "jjskoRh8GTE", bpm: 79, energy: "mid" }],
  },
  {
    id: "young-forever",
    title: "The Most Beautiful Moment in Life: Young Forever",
    year: 2016,
    palette: ["#ff4500", "#ffb000", "#ff1e56"],
    songs: [{ id: "fire", title: "FIRE", yt: "ALj5MKjy2BU", bpm: 168, energy: "high" }],
  },
  {
    id: "wings",
    title: "WINGS",
    year: 2016,
    palette: ["#8b0000", "#f5f5f5", "#2b1055"],
    songs: [{ id: "bst", title: "Blood Sweat & Tears", yt: "hmE9f-TEutc", bpm: 93, energy: "mid" }],
  },
  {
    id: "ynwa",
    title: "You Never Walk Alone",
    year: 2017,
    palette: ["#9ad1ff", "#ffffff", "#b39ddb"],
    songs: [
      { id: "spring-day", title: "Spring Day", yt: "xEeFrLSkMm8", bpm: 107, energy: "ballad" },
      { id: "not-today", title: "Not Today", yt: "9DwzBICPhdM", bpm: 110, energy: "high" },
    ],
  },
  {
    id: "ly-her",
    title: "Love Yourself 承 'Her'",
    year: 2017,
    palette: ["#4fc3f7", "#ff80ab", "#b388ff"],
    songs: [
      { id: "dna", title: "DNA", yt: "MBdVXkSdhwU", bpm: 130, energy: "high" },
      { id: "mic-drop", title: "MIC Drop (Steve Aoki Remix)", yt: "kTlv5_Bs8aw", bpm: 85, energy: "high" },
    ],
  },
  {
    id: "ly-tear",
    title: "Love Yourself 轉 'Tear'",
    year: 2018,
    palette: ["#1a237e", "#c62828", "#7e57c2"],
    songs: [{ id: "fake-love", title: "FAKE LOVE", yt: "7C2z4GqqS5E", bpm: 78, energy: "mid" }],
  },
  {
    id: "ly-answer",
    title: "Love Yourself 結 'Answer'",
    year: 2018,
    palette: ["#ff3d00", "#00e5ff", "#ffea00", "#d500f9"],
    songs: [{ id: "idol", title: "IDOL", yt: "pBuZEGYXA6E", bpm: 126, energy: "high" }],
  },
  {
    id: "mots-persona",
    title: "Map of the Soul: Persona",
    year: 2019,
    palette: ["#ff8fb1", "#ffffff", "#b39ddb"],
    songs: [{ id: "bwl", title: "Boy With Luv (feat. Halsey)", yt: "XsX3ATc3FbA", bpm: 120, energy: "high" }],
  },
  {
    id: "mots-7",
    title: "Map of the Soul: 7",
    year: 2020,
    palette: ["#212121", "#ffffff", "#7c4dff"],
    songs: [
      { id: "on", title: "ON", yt: "mPVDGOVjRQ0", bpm: 106, energy: "high" },
      { id: "black-swan", title: "Black Swan", yt: "0lapF4DQPKQ", bpm: 93, energy: "mid" },
    ],
  },
  {
    id: "be",
    title: "BE",
    year: 2020,
    palette: ["#ffb74d", "#ff8a65", "#ce93d8"],
    songs: [
      { id: "life-goes-on", title: "Life Goes On", yt: "-5q5mZbe3V8", bpm: 81, energy: "ballad" },
      { id: "dynamite", title: "Dynamite", yt: "gdZLi9oWNZg", bpm: 114, energy: "high" },
    ],
  },
  {
    id: "butter",
    title: "Butter",
    year: 2021,
    palette: ["#ffd600", "#fff59d", "#ff9100"],
    songs: [
      { id: "butter", title: "Butter", yt: "WMweEpGlu_U", bpm: 110, energy: "high" },
      { id: "ptd", title: "Permission to Dance", yt: "CuklIb9d3fI", bpm: 125, energy: "high" },
    ],
  },
  {
    id: "proof",
    title: "Proof",
    year: 2022,
    palette: ["#7b1fa2", "#e1bee7", "#ffffff"],
    songs: [{ id: "yet-to-come", title: "Yet To Come", yt: "kXpOEzNZ8hQ", bpm: 87, energy: "ballad" }],
  },
  {
    id: "arirang",
    title: "ARIRANG",
    year: 2026,
    palette: ["#0d3b66", "#4fc3f7", "#e0f7fa"],
    songs: [{ id: "swim", title: "SWIM", yt: "b4iVv91Z6lY", bpm: 100, energy: "mid" }],
  },
];

// Conciertos oficiales completos: están en plataformas de pago con DRM, así que no se pueden
// incrustar. Se ven allí y la app sincroniza las luces con el modo micrófono.
export const CONCERT_FILMS = [
  {
    id: "ytc-busan",
    title: "BTS: Yet to Come (Busan 2022)",
    platform: "Prime Video",
    url: "https://www.primevideo.com/detail/0K11DW0KILODWF5T5CMO4VW98M",
  },
  {
    id: "ptd-la",
    title: "Permission to Dance on Stage – LA",
    platform: "Disney+",
    url: "https://www.disneyplus.com/",
  },
  {
    id: "weverse",
    title: "Conciertos y VODs en Weverse",
    platform: "Weverse",
    url: "https://weverse.io/bts",
  },
];

/** Lista plana en orden de reproducción: álbum por álbum. */
export function flatQueue(albums = ALBUMS) {
  return albums.flatMap((album) => album.songs.map((song) => ({ album, song })));
}
