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
 * Creating the Chat instance and asking it a question
 */

/* Usage as part of a chain */
export const model = new ChatOpenAI({
  modelName: "gpt-3.5-turbo",
  temperature: 0.5,
  // openAIApiKey: "ANDcanbepassedhere",
});

export const chainNoMemRedisDocRetrieval = RetrievalQAChain.fromLLM(model, vectorStore.asRetriever(), {
  returnSourceDocuments: false,
});

const question = "Who are the representitives of RealFake?";

const chainRes = await chainNoMemRedisDocRetrieval.call({
  query: question,
});

console.log(chainRes);

/**
 * Ensure to disconnect from the Redis session before closing the script
 */

await client.disconnect();
