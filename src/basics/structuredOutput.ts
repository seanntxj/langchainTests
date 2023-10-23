/* Imports OpenAI Key */
import { config } from "dotenv";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { HumanMessage } from "langchain/schema";
config({});

/**
 * Creating the schema
 */
const extractionFunctionSchema = {
  name: "extractor",
  description: "Interprets the human message into several objectives.",
  parameters: {
    type: "object",
    properties: {
      wantToTalkToHuman: {
        type: "boolean",
        description: "Does the human message sound like they want to talk to a live human agent? Do not mistake it for asking for information about humans.",
      },
      wantToBookAnAppointment: {
        type: "boolean",
        description: "Does the human message sound like they want to book an appointment of some sort?",
      },
      chat_response: {
        type: "string",
        description: "A response to the human's input",
      },
    },
    required: ["wantToTalkToHuman", "wantToBookAnAppointment", "chat_response"],
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
}).bind({
  functions: [extractionFunctionSchema],
  function_call: { name: "extractor" },
});

const result = await model.invoke([
  new HumanMessage("Who are the representitives of RealFake?"),
]);

console.log(JSON.parse(result.additional_kwargs.function_call.arguments));
