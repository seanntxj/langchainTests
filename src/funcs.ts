import { encoding_for_model } from "@dqbd/tiktoken";

export function getTokens(question: string, response: string) {
  const encoder = encoding_for_model("gpt-3.5-turbo");
  let tokens = encoder.encode(question);
  const questionTokens = tokens.length;
  tokens = encoder.encode(response)
  const responseTokens = tokens.length;
  encoder.free();

  return responseTokens + questionTokens;

}

export const getCostFromTokens = (tokens: number) => {
  const COST_PER_TOKEN = 0.002 / 1000
  return tokens * COST_PER_TOKEN
}