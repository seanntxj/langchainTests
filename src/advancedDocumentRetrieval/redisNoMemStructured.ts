/**
 * Imports
 */

/* Imports from Langchain */
import { ChatOpenAI } from "langchain/chat_models/openai";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { RetrievalQAChain } from "langchain/chains";

/* Redis Vector store imports */
import { createClient } from "redis";
import { RedisVectorStore } from "langchain/vectorstores/redis";

/* Imports OpenAI Key */
import { config } from "dotenv";
import { AIMessage, HumanMessage } from "langchain/schema";
config({});

/**
 * Redis vector store connection
 */

const client = createClient({
  url: process.env.REDIS_URL ?? "redis://localhost:6379",
});
await client.connect();
const vectorStore = new RedisVectorStore(
  new OpenAIEmbeddings({
    // openAIApiKey: "canbepassedhere",
  }),
  {
    redisClient: client,
    indexName: "testDocsForClient01",
  }
);

/**
 * Creating the schema
 */
const extractionFunctionSchema = {
  name: "extractor",
  description: "Extracts fields from the input.",
  parameters: {
    type: "object",
    properties: {
      confidence: {
        type: "number",
        description: "How confident the AIMessage's answer is. If it knows the answer, the confidence is high. However, the more unsure the answer OR states not having information or context, the lower the confidence."
      },
      chat_response: {
        type: "string",
        description: "A response to the human's input",
      },
    },
    required: ["confidence", "chat_response"],
  },
};

/**
 * Creating the Chat instance and asking it a question
 */

/* Usage as part of a chain */
const model = new ChatOpenAI({
  modelName: "gpt-3.5-turbo",
  temperature: 0.5,
  // openAIApiKey: "ANDcanbepassedhere",
});

const chain = RetrievalQAChain.fromLLM(model, vectorStore.asRetriever(), {
  returnSourceDocuments: false,
});

const question = "Who developed RealFakes?";

const chainRes = await chain.call({
  query: question,
});

console.log(chainRes.text);

chainRes;

/**
 * Creating the Chat instance and asking it a question
 */

/* Usage as part of a chain */
const structureParser = new ChatOpenAI({
  modelName: "gpt-3.5-turbo",
  temperature: 0.5,
  // openAIApiKey: "ANDcanbepassedhere",
}).bind({
  functions: [extractionFunctionSchema],
  function_call: { name: "extractor" },
});

const result = await structureParser.invoke([new AIMessage(chainRes.text)]);

console.log(JSON.parse(result.additional_kwargs.function_call.arguments));

/**
 * Ensure to disconnect from the Redis session before closing the script
 */

await client.disconnect();
