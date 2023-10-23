import readline from 'readline';
import { RetrievalQAChain } from "langchain/chains";
import { OpenAI } from "langchain/llms/openai";
import { PromptTemplate } from "langchain/prompts";
import { config } from "dotenv";
import { FaissStore } from "langchain/vectorstores/faiss";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";

import { promises as fs } from 'fs';
import { getCostFromTokens, getTokens } from '../funcs.js';
config({});



const model = new OpenAI({});

const template = `Use the following pieces of context to answer the question at the end.
If you don't know the answer, just say that you don't know, don't try to make up an answer.
Use three sentences maximum and keep the answer as concise as possible.

Previous messages:
{context}
Question: 
{question}
Helpful Answer:`;

const embeddings = new OpenAIEmbeddings();

const vectorStore = await FaissStore.load("src/vectors", embeddings);

export const getResponse = async (question: string) => {
  // Save the question to the text file
  const filePath = 'previousQuestions.txt';
  try {
    // Append the new question to the existing file or create the file if it doesn't exist
    await fs.appendFile(filePath, question + '\n', 'utf8');
  } catch (error) {
    console.error('Error saving the question:', error);
  }

  // Now you can use the saved question in templateWithContext
  const fileContents = await fs.readFile(filePath, 'utf8');
  const previousQuestions = fileContents.split('\n').filter(Boolean).join('\n'); // Read and format the previous questions
  const templateWithContext = template.replace("{context}", previousQuestions);

  console.log(vectorStore.asRetriever())

  const chain = RetrievalQAChain.fromLLM(model, vectorStore.asRetriever(), {
    prompt: PromptTemplate.fromTemplate(templateWithContext),
  });

  const response = await chain.call({
    query: question,
  });

  return response.text
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function getUserInput() {
  rl.question('Enter a message (or "q" to quit): ', async (input) => {
    if (input.toLowerCase() === 'q') {
      console.log('Goodbye!');
      rl.close();
    } else {
      const chatBotResponse = await getResponse(input);
      console.log(chatBotResponse);
      const tokens = getTokens(input, chatBotResponse);
      const cost = getCostFromTokens(tokens);
      console.log(`Tokens: ${tokens} | Cost: ${cost}`)
      getUserInput();
    }
  });
}

getUserInput();
