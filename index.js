import express from "express";
import axios from "axios";
import cheerio from "cheerio";
import cors from "cors";

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

// AUTO-DETECT LYRICS API
app.get("/lyrics", async (req, res) => {
  const { song } = req.query;

  if (!song) {
    return res.json({ lyrics: null });
  }

  try {
    // Step 1 — Search Deezer to detect artist + title
    const searchURL = `https://api.deezer.com/search?q=${encodeURIComponent(song)}`;
    const search = await axios.get(searchURL);

    if (!search.data.data.length)
      return res.json({ lyrics: null });

    const best = search.data.data[0];

    const title = best.title;
    const artist = best.artist.name;

    // Step 2 — Search on Genius
    const geniusURL = `https://genius.com/api/search/song?q=${encodeURIComponent(
      artist + " " + title
    )}`;

    const genius = await axios.get(geniusURL);

    const hits = genius.data.response.sections[0].hits;
    if (!hits.length)
      return res.json({ lyrics: null });

    const songURL = hits[0].result.url;

    // Step 3 — Scrape lyrics
    const page = await axios.get(songURL);
    const $ = cheerio.load(page.data);
    let lyrics = $("div[data-lyrics-container='true']").text().trim();

    return res.json({ lyrics });

  } catch (e) {
    return res.json({ lyrics: null });
  }
});

app.listen(PORT, () => console.log("API running on " + PORT));
