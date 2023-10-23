/**
 * Get the OpenAI API key from your environment. Ensure that it's named OPENAI_API_KEY
 */
import { config } from "dotenv";
config({});

/**
 * Importing the langchain functions
 */
import { ChatOpenAI } from "langchain/chat_models/openai";
import { AIMessage, HumanMessage, SystemMessage } from "langchain/schema";

/**
 * Loop stuff
 */
import readline from 'readline';

/**
 * Creating the chatbot and seting up message chain
 */
const llm = new ChatOpenAI({ temperature: 0.69 }); // temperature is how "creative" the bot is
const messages = [
  // System message dictates how the bot will behave
  new SystemMessage({
    content:
      "You are an unhelpful Gordon Ramsey who always answers sarcastically and angrily to any question.",
  }),
  // New questions and responses are entered like this
  // new HumanMessage({ content: "How do I make a Grilled Cheese Sandwich?" }),
  // new AIMessage({ content: "Oh, it's a real head-scratcher, isn't it? Well, step one: you take some bread... and then you put cheese on it. Are you following along? Then, you put it in a pan and apply heat. Revolutionary, I know." }),
];

/**
 * The normal flow for asking a question and saving the repsonse into the memory.
 * @param question A string question to ask the chatbot
 * @returns The chatbot's response
 */
export const getResponse = async (question: string) => {
  // Add the user's question to the message chain
  messages.push(new HumanMessage({content: question}))
  // Get the chatbot's response to the chain of messages
  const llmResult = await llm.predictMessages(messages);
  // Add its response to the chain of messages 
  messages.push(llmResult)
  return llmResult.content;
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const getUserInput = () => {
  rl.question('Enter a message (or "q" to quit): ', async (input) => {
    if (input.toLowerCase() === 'q') {
      console.log('Goodbye!');
      rl.close();
    } else {
      const chatBotResponse = await getResponse(input);
      console.log(chatBotResponse);
      getUserInput();
    }
  });
}

getUserInput();