const express = require("express");
const axios = require("axios");
const archiver = require("archiver");

const app = express();
const PORT = process.env.PORT || 3000;

/**
 * GET /generate-images
 * Query parameters:
 *  - prompt (string, required)
 *  - count (number, optional, default 1)
 */
app.get("/generate-images", async (req, res) => {
  const { prompt, count = 1 } = req.query;
  if (!prompt) return res.status(400).send("Prompt is required");

  try {
    // Prepare array to hold image buffers
    const images = [];

    for (let i = 0; i < Math.min(count, 5); i++) { // limit max to 5 at once
      // Call SkyFortress API
      const response = await axios.post(
        "https://skyfortress.dev/api/generate-image",
        {
          prompt,
          width: 1024,
          height: 1024,
          steps: 30,
          guidanceScale: 5,
          seed: Math.floor(Math.random() * 1000000000),
          negativePrompt: "lowers, cropped, bad anatomy, bad hands, text, error, missing fingers, worst quality, low quality, normal quality, jpeg artifacts, duplicate, morbid, mutilated, out of frame, extra fingers, mutated hands, poorly drawn hands, mutation, deformed, blurry, bad proportions, extra limbs, cloned face, gross proportions, malformed limbs, missing arms, missing legs, extra arms, extra legs, fused fingers, too many fingers, long neck",
          turnstileToken: "YOUR_TURNSTILE_TOKEN_HERE" // replace
        },
        {
          headers: {
            "Content-Type": "application/json",
            "Cookie": "cf_clearance=9.bA.kARTBnO0pCRnwlryZABEHagHXw7Wfl03Y-1764429730-1.2.1.1-vLrm.bZn0EMtuuN3iFCqUn4yXPf0f5mOHqOCAbmI89g9OLOYjWzyKBNRG7DyXea9WZaCEUnJy3fy.Ma0zuP4UW9h3XuY70queLS95Y67U6R8KP7FuV0lfSEcQNH_5GwgWiiYtTKLbpmIae8R1MeUrS0O4pt41i9KsqEXRqlPcbyyJzeC9SLepppwLiYwTPFu7zAU1kZhtUrhJdO5UhRBJbP9tYiFE7_620" // replace
          }
        }
      );

      const imageUrl = response.data.url;
      const fullUrl = `https://skyfortress.dev${imageUrl}`;

      // Fetch image buffer
      const imageResponse = await axios.get(fullUrl, { responseType: "arraybuffer" });
      images.push({ buffer: imageResponse.data, filename: `image-${i + 1}.png` });
    }

    if (images.length === 1) {
      // Send single image directly
      res.set("Content-Type", "image/png");
      return res.send(images[0].buffer);
    }

    // Send multiple images as ZIP
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", "attachment; filename=images.zip");

    const archive = archiver("zip");
    archive.pipe(res);
    images.forEach(img => archive.append(img.buffer, { name: img.filename }));
    await archive.finalize();

  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to generate images");
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
