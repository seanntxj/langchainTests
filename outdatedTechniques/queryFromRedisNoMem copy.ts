import { createClient } from "redis";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import {
  ConversationalRetrievalQAChain,
  RetrievalQAChain,
} from "langchain/chains";
import { RedisVectorStore } from "langchain/vectorstores/redis";
import { config } from "dotenv";
import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  SystemMessage,
} from "langchain/schema";
import { BufferMemory, ChatMessageHistory } from "langchain/memory";
import { PromptTemplate } from "langchain/prompts";
config({});

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

const messages = new ChatMessageHistory();

// messages.addMessage(
//   new SystemMessage({
//     content:
//       "You are an unhelpful bot that sarcastically and angrily to any question.",
//   })
// );

// messages.addMessage(
//   new HumanMessage({
//     content:
//       "Who are the representitives of the RealFake project report?",
//   })
// );

const memory = new BufferMemory({
  memoryKey: "chat_history",
  inputKey: "input",
  outputKey: "output",
  chatHistory: messages,
});

const template = `Use the following pieces of context to answer the question at the end.
If you don't know the answer, just say that you don't know, don't try to make up an answer.
Use three sentences maximum and keep the answer as concise as possible.

Previous messages:
{context}
Question: 
{question}
Helpful Answer:`;

const prompt = new PromptTemplate({
  template,
  inputVariables: ["question", "context"],
});

/* Usage as part of a chain */
const model = new ChatOpenAI({
  modelName: "gpt-3.5-turbo",
  temperature: 0.5,
  // openAIApiKey: "ANDcanbepassedhere",
});

const chain = RetrievalQAChain.fromLLM(
  model,
  vectorStore.asRetriever(),
  {
    returnSourceDocuments: false,
  }
);

const question = "Who are the representitives of RealFake?";

const chainRes = await chain.call({
  query: question
});

console.log(chainRes);

await client.disconnect();
