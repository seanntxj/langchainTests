/**
 * Imports
 */

/* Imports from Langchain */
import { ChatOpenAI } from "langchain/chat_models/openai";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { RetrievalQAChain } from "langchain/chains";

/* Redis Vector store imports */
import { MongoClient } from "mongodb";
import { MongoDBAtlasVectorSearch } from "langchain/vectorstores/mongodb_atlas";
import { createClient } from "redis";
import { RedisVectorStore } from "langchain/vectorstores/redis";

/* Imports OpenAI Key */
import { config } from "dotenv";
config({});

/* Langchain agent tools */
import { initializeAgentExecutorWithOptions } from "langchain/agents";
import { ChainTool } from "langchain/tools";
import { Calculator } from "langchain/tools/calculator";

/**
 * Redis vector store connection
 */

const MONGODB_ATLAS_URI = `mongodb+srv://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_CLUSTERNAME}.z5ynmjb.mongodb.net/?retryWrites=true&w=majority`;
console.log(MONGODB_ATLAS_URI);
const client = new MongoClient(MONGODB_ATLAS_URI);
const gptCollection = client
  .db(process.env.MONGO_DEFAULT_DB)
  .collection("gptTest");

const vectorStore = new MongoDBAtlasVectorSearch(new OpenAIEmbeddings(), {
  collection: gptCollection,
  indexName: "default", // The name of the Atlas search index. Defaults to "default"
  textKey: "text", // The name of the collection field containing the raw content. Defaults to "text"
  embeddingKey: "embedding", // The name of the collection field containing the embedded text. Defaults to "embedding"
});

/**
 * Creating an OpenAI model instance
 */

/* Usage as part of a chain */
export const model = new ChatOpenAI({
  modelName: "gpt-3.5-turbo",
  temperature: 0.5,
  // openAIApiKey: "ANDcanbepassedhere",
});

/**
 * Creating the chain for document retrieval
 */
/* Creating the doc retrieval chain */
export const chainNoMemRedisDocRetrieval = RetrievalQAChain.fromLLM(
  model,
  vectorStore.asRetriever({
    searchType: "mmr",
    searchKwargs: {
      fetchK: 20,
      lambda: 0.1,
    }}),
  {
    returnSourceDocuments: false,
  }
);
/* Turning the chain into a tool */
const docRetrievalTool = new ChainTool({
  chain: chainNoMemRedisDocRetrieval,
  name: "document-retreival-qa",
  description:
    "Useful for when a user asks about RealFake or STIT (Stitch it in time). ",
});

/**
 * Creating the agent and giving it its tools
 */

const tools = [new Calculator(), docRetrievalTool];
const executor = await initializeAgentExecutorWithOptions(tools, model, {
  agentType: "chat-conversational-react-description",
  verbose: true, // Show the thought process of the bot
  maxIterations: 10, // Stop the Agent from going on an infinte loop
});

/**
 * Trying out a question
 */
const input1 = "What is STIT?";

const resultOne = await vectorStore.similaritySearch(input1, 1);
console.log(resultOne);

const result1 = await executor.call({ input: input1 });
console.log(result1);

/**
 * Ensure to disconnect from the Redis session before closing the script
 */

await client.close();
