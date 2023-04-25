const { Configuration, OpenAIApi } = require("openai");
require("dotenv").config();
const log10 = require("../log10");

const openaiKey = process.env.OPENAI_API_KEY;
console.log("openaiKey:", openaiKey);

const configuration = new Configuration({
  apiKey: openaiKey,
});

// log10 integration
const log10_OpenAIApi = log10(OpenAIApi);
const openai = new log10_OpenAIApi(configuration);

try {
  request = {
    model: "text-ada-001",
    prompt: "wat is 2+2?",
  };
  openai.createCompletion(request).then((response) => {
    const data = response.data;
    console.log("Choices:", JSON.stringify(data, null, 2));
  });
} catch (e) {
  console.error(e);
  return res.status(401).json({ error: e.message, status: e.response?.status });
}
