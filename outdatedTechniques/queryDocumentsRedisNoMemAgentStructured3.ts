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

/* Langchain agent tools */
import { initializeAgentExecutorWithOptions } from "langchain/agents";
import { ChainTool } from "langchain/tools";
import { Calculator } from "langchain/tools/calculator";
import { HumanMessage } from "langchain/schema";

/**
 * Creating the schema
 */

const extractionFunctionSchema = {
  name: "extractor",
  description: "Interprets the human message into several objectives.",
  parameters: {
    type: "object",
    properties: {
      eventName: {
        type: "string",
        enum: ['speakToHumanAgent','makeAnAppointment','none'],
        description: "Does the human message indicate wanting to do any of these things? If none apply, return none.",
      },
    },
    required: ["eventName"],
  },
};
const schemaModel = new ChatOpenAI({
  modelName: "gpt-3.5-turbo",
  temperature: 0.5,
  // openAIApiKey: "ANDcanbepassedhere",
}).bind({
  functions: [extractionFunctionSchema],
  function_call: { name: "extractor" },
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
 * Creating the chain for document retrieval
 */
/* Creating the doc retrieval chain */
export const chainNoMemRedisDocRetrieval = RetrievalQAChain.fromLLM(
  model,
  vectorStore.asRetriever(),
  {
    returnSourceDocuments: false, // Do NOT enable this, it will cause the agent to hallucinate. Instead just look at the verbose output which will show the source anyways.
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
  agentType: "chat-conversational-react-description", // Different types may be used
  verbose: true, // Show the thought process of the bot
});

/**
 * Trying out a question 
 */
const question = "What is STIT?";

/* Let the answer what's the best way to get an answer */
const agentAnswer = await executor.call({ input: question });
console.log(agentAnswer);

/* Check if the human was asking for a live agent (maybe make this run same times as the prev lol) */
const result = await schemaModel.invoke([
  new HumanMessage(question),
]);

/* Final response */
const needsHandover = JSON.parse(result.additional_kwargs.function_call.arguments)

console.log(needsHandover);

console.log('Final response: ------------')

console.log({
  customEvent: !(needsHandover.handOver === 'none'),
  ...needsHandover, 
  AIMessage: agentAnswer.output,
})

/**
 * Ensure to disconnect from the Redis session before closing the script
 */

await client.disconnect();