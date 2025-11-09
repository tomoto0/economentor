import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { invokeLLM, Message } from "../_core/llm";
import { getChatLogs } from "../db";

/**
 * Research router handles:
 * - Web search integration
 * - Complex question analysis
 * - Thought experiments and scenario analysis
 */
export const researchRouter = router({
  // Analyze a complex question and provide research-based response
  analyzeQuestion: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
        question: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Get chat history for context
        const chatHistory = await getChatLogs(input.sessionId);

        const messages: Message[] = [
          {
            role: "system",
            content: `You are an expert mathematics and economics researcher. When analyzing complex questions:
1. Break down the question into components
2. Identify related theories and concepts
3. Provide research-based insights
4. Connect mathematical concepts to real-world applications
5. Suggest relevant research directions

Respond in Japanese when appropriate.`,
          },
          ...chatHistory.map((log) => ({
            role: log.sender === "user" ? ("user" as const) : ("assistant" as const),
            content: log.content,
          })),
          {
            role: "user",
            content: `Please analyze this question deeply: ${input.question}`,
          },
        ];

        const result = await invokeLLM({
          messages,
          maxTokens: 2048,
        });

        const response = result.choices[0]?.message?.content || "";

        if (typeof response !== "string") {
          throw new Error("Unexpected response format from LLM");
        }

        return {
          analysis: response,
          contentType: "markdown" as const,
        };
      } catch (error) {
        console.error("Failed to analyze question:", error);
        throw new Error(
          `Failed to analyze question: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }),

  // Generate thought experiment scenarios
  generateScenarios: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
        scenario: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Get chat history for context
        const chatHistory = await getChatLogs(input.sessionId);

        const messages: Message[] = [
          {
            role: "system",
            content: `You are an expert in mathematical modeling and economic analysis. When generating thought experiment scenarios:
1. Create 3-4 distinct scenarios based on the given situation
2. For each scenario, explain:
   - Initial conditions
   - Mathematical model
   - Expected outcomes
   - Key variables and their relationships
3. Compare and contrast the scenarios
4. Discuss implications and limitations

Format your response as a structured analysis with clear sections for each scenario.

Respond in Japanese.`,
          },
          ...chatHistory.map((log) => ({
            role: log.sender === "user" ? ("user" as const) : ("assistant" as const),
            content: log.content,
          })),
          {
            role: "user",
            content: `Generate thought experiment scenarios for: ${input.scenario}`,
          },
        ];

        const result = await invokeLLM({
          messages,
          maxTokens: 3000,
        });

        const response = result.choices[0]?.message?.content || "";

        if (typeof response !== "string") {
          throw new Error("Unexpected response format from LLM");
        }

        return {
          scenarios: response,
          contentType: "markdown" as const,
        };
      } catch (error) {
        console.error("Failed to generate scenarios:", error);
        throw new Error(
          `Failed to generate scenarios: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }),

  // Apply theory to real-world context
  applyToRealWorld: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
        theory: z.string(),
        context: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Get chat history for context
        const chatHistory = await getChatLogs(input.sessionId);

        const messages: Message[] = [
          {
            role: "system",
            content: `You are an expert at connecting mathematical and economic theories to real-world applications. When applying theory to context:
1. Explain how the theory applies to the given context
2. Identify key mathematical relationships
3. Discuss practical implications
4. Highlight assumptions and limitations
5. Suggest how parameters might change in practice
6. Provide concrete examples

Be thorough but accessible. Respond in Japanese.`,
          },
          ...chatHistory.map((log) => ({
            role: log.sender === "user" ? ("user" as const) : ("assistant" as const),
            content: log.content,
          })),
          {
            role: "user",
            content: `Apply the theory "${input.theory}" to this real-world context: ${input.context}`,
          },
        ];

        const result = await invokeLLM({
          messages,
          maxTokens: 2048,
        });

        const response = result.choices[0]?.message?.content || "";

        if (typeof response !== "string") {
          throw new Error("Unexpected response format from LLM");
        }

        return {
          application: response,
          contentType: "markdown" as const,
        };
      } catch (error) {
        console.error("Failed to apply theory:", error);
        throw new Error(
          `Failed to apply theory: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }),
});
