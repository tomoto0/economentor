import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { invokeLLM, Message } from "../_core/llm";
import { getChatLogs } from "../db";

const SYSTEM_PROMPT = `You are Math Mentor, an expert mathematics tutor. Your role is to help students understand mathematical concepts clearly and comprehensively.

Guidelines:
1. Provide clear, step-by-step explanations
2. Use appropriate mathematical notation and formulas
3. Include practical examples when relevant
4. Break down complex concepts into simpler parts
5. Encourage understanding over memorization
6. Respond in Japanese when the user communicates in Japanese
7. Format your responses with proper markdown for readability
8. Include diagrams or visual descriptions when helpful

When the user asks for graphs or visualizations, provide data in a structured format (JSON) that can be used to generate charts.`;

export const chatRouter = router({
  // Send a message and get AI response
  sendMessage: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
        message: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Get previous chat history
        const chatHistory = await getChatLogs(input.sessionId);

        // Build message history for LLM
        const messages: Message[] = [
          {
            role: "system",
            content: SYSTEM_PROMPT,
          },
          ...chatHistory.map((log) => ({
            role: log.sender === "user" ? ("user" as const) : ("assistant" as const),
            content: log.content,
          })),
          {
            role: "user",
            content: input.message,
          },
        ];

        // Call LLM API
        const result = await invokeLLM({
          messages,
          maxTokens: 2048,
        });

        // Extract response
        const assistantMessage = result.choices[0]?.message?.content || "";

        if (typeof assistantMessage !== "string") {
          throw new Error("Unexpected response format from LLM");
        }

        return {
          response: assistantMessage,
          contentType: "markdown" as const,
        };
      } catch (error) {
        console.error("Failed to get AI response:", error);
        throw new Error(
          `Failed to get AI response: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }),

  // Generate graph data for visualization
  generateGraphData: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
        description: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Get chat history for context
        const chatHistory = await getChatLogs(input.sessionId);

        const messages: Message[] = [
          {
            role: "system",
            content: `You are a mathematics visualization expert. Generate JSON data for graphs and charts based on mathematical concepts.
            
When asked to create a graph, respond with ONLY valid JSON in this format:
{
  "type": "line|bar|scatter|area",
  "title": "Graph Title",
  "xAxis": { "label": "X Axis Label", "data": [...] },
  "yAxis": { "label": "Y Axis Label" },
  "series": [
    {
      "name": "Series Name",
      "data": [...]
    }
  ]
}

Make sure the JSON is valid and complete.`,
          },
          ...chatHistory.map((log) => ({
            role: log.sender === "user" ? ("user" as const) : ("assistant" as const),
            content: log.content,
          })),
          {
            role: "user",
            content: `Generate graph data for: ${input.description}`,
          },
        ];

        const result = await invokeLLM({
          messages,
          maxTokens: 2048,
          responseFormat: { type: "json_object" },
        });

        const responseText = result.choices[0]?.message?.content || "";

        if (typeof responseText !== "string") {
          throw new Error("Unexpected response format from LLM");
        }

        // Parse JSON response
        const graphData = JSON.parse(responseText);

        return graphData;
      } catch (error) {
        console.error("Failed to generate graph data:", error);
        throw new Error(
          `Failed to generate graph data: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }),
});
