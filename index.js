const express = require("express");
const axios = require("axios");
const cors = require("cors");
const qs = require("querystring");

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

// Generate dynamic task_id
function generateTaskId() {
  const randomHex = Math.random().toString(16).substring(2, 14);
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `gitee_${randomHex}_${randomNum}`;
}

// Generate timestamp image name
function generateImageName() {
  return `reference-image-${Date.now()}`;
}

// GET API — returns image directly
app.get("/api/generate", async (req, res) => {
  try {
    const prompt = req.query.prompt;
    if (!prompt) return res.status(400).send("prompt is required");

    const task_id = generateTaskId();
    const image_name = generateImageName();

    const data = qs.stringify({
      task_id,
      prompt,
      size: "1024*1024",
      model: "flux-dev",
      influence: 100,
      image_name
    });

    // Step 1: generate image
    const generateRes = await axios.post(
      "https://api.aizdzj.com/draw/text2image.php",
      data,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent":
            "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36",
          "Origin": "https://draw.freeforai.com",
          "Referer": "https://draw.freeforai.com/"
        }
      }
    );

    const imageUrl = generateRes.data?.result?.data?.[0]?.url;
    if (!imageUrl) return res.status(500).send("Failed to generate image");

    // Step 2: fetch the actual image and stream it
    const imageResponse = await axios.get(imageUrl, { responseType: "stream" });

    res.setHeader("Content-Type", "image/png"); // or "image/jpeg" depending on the format
    imageResponse.data.pipe(res);

  } catch (error) {
    console.log(error.response?.data || error);
    res.status(500).send("Error generating image");
  }
});

app.listen(PORT, () => console.log(`Direct image API running on port ${PORT}`));
