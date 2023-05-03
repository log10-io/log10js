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
  openai
    .createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: "Hello world" }],
    })
    .then((completion) => {
      console.log(completion.data.choices[0].message);
    });
} catch (e) {
  console.error(e);
  return res.status(401).json({ error: e.message, status: e.response?.status });
}
