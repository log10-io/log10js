const { OpenAI } = require("langchain/llms/openai");
const { loadSummarizationChain } = require("langchain/chains");
const { Document } = require("langchain/document");
const { Configuration, OpenAIApi } = require("openai");

require("dotenv").config();
const log10 = require("../log10");

const main = async () => {
  const log10_OpenAIApi = log10(OpenAIApi);
  const openai = new log10_OpenAIApi(
    new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    })
  );
  let model = new OpenAI();
  model.client = openai;

  const chain = loadSummarizationChain(model, { type: "stuff" });
  const docs = [
    new Document({
      pageContent:
        "Quantum mechanics is a fundamental theory in physics that provides a description of the physical properties of nature at the scale of atoms and subatomic particles.[2]: 1.1  It is the foundation of all quantum physics including quantum chemistry, quantum field theory, quantum technology, and quantum information science.",
    }),
    new Document({
      pageContent:
        "Quantum mechanics differs from classical physics in that energy, momentum, angular momentum, and other quantities of a bound system are restricted to discrete values (quantization); objects have characteristics of both particles and waves (wave–particle duality); and there are limits to how accurately the value of a physical quantity can be predicted prior to its measurement, given a complete set of initial conditions (the uncertainty principle).",
    }),
  ];
  const res = await chain.call({
    input_documents: docs,
  });
  console.log(res);
};
main();
