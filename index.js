const express = require("express");
const axios = require("axios");
const cors = require("cors");
const qs = require("querystring");

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

function generateTaskId() {
  const randomHex = Math.random().toString(16).substring(2, 14);
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `gitee_${randomHex}_${randomNum}`;
}

function generateImageName() {
  return `reference-image-${Date.now()}`;
}

// Polling function to wait until task is done
async function waitForImage(task_id, prompt) {
  const size = "1024*1024";
  const model = "flux-dev";
  const influence = 100;
  const image_name = generateImageName();

  const data = qs.stringify({ task_id, prompt, size, model, influence, image_name });

  // submit task
  await axios.post(
    "https://api.aizdzj.com/draw/text2image.php",
    data,
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );

  // poll until image is ready
  for (let i = 0; i < 20; i++) { // max 20 tries
    await new Promise(r => setTimeout(r, 1000)); // wait 1 second

    const statusRes = await axios.post(
      "https://api.aizdzj.com/draw/text2image.php",
      qs.stringify({ task_id }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const task_status = statusRes.data?.task_status;
    const url = statusRes.data?.result?.data?.[0]?.url;

    if (task_status === "SUCCEEDED" && url) return url;
  }

  throw new Error("Image generation timed out");
}

// GET API — returns direct image
app.get("/api/generate", async (req, res) => {
  try {
    const prompt = req.query.prompt;
    if (!prompt) return res.status(400).send("prompt is required");

    const task_id = generateTaskId();
    const imageUrl = await waitForImage(task_id, prompt);

    // stream the image
    const imageResponse = await axios.get(imageUrl, { responseType: "stream" });
    res.setHeader("Content-Type", "image/png");
    imageResponse.data.pipe(res);

  } catch (err) {
    console.log(err.response?.data || err);
    res.status(500).send("Error generating image");
  }
});

app.listen(PORT, () => console.log(`Direct image API running on port ${PORT}`));
