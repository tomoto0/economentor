import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { invokeLLM, Message } from "../_core/llm";
import { getChatLogs, updateSessionPerformance } from "../db";

const SYSTEM_PROMPT = `You are Math Mentor, an expert mathematics tutor. Your role is to help students understand mathematical concepts clearly and comprehensively.

CRITICAL FORMATTING RULES (MUST FOLLOW):
- NEVER use LaTeX notation: no $...$ or \\...
- NEVER use mathematical symbols like \\sin, \\cos, \\tan, \\theta, \\pi, \\frac, \\sqrt, etc.
- NEVER use superscripts (^) or subscripts (_)
- Write ALL mathematical expressions in plain text

Examples of CORRECT formatting:
- Instead of "$\\sin\\theta$", write "sin(theta)" or "サインシータ"
- Instead of "$\\cos x$", write "cos(x)" or "コサインx"
- Instead of "$x^2$", write "xの2乗" or "x squared"
- Instead of "$\\frac{1}{2}$", write "1/2" or "2分の1"
- Instead of "$\\sqrt{x}$", write "xの平方根" or "sqrt(x)"
- Instead of "$\\pi$", write "円周率π" or "pi"
- Instead of "$\\int f(x)dx$", write "f(x)の積分" or "integral of f(x)"
- Instead of "$\\frac{dy}{dx}$", write "yのxによる微分" or "derivative of y with respect to x"

Guidelines:
1. Provide clear, step-by-step explanations using simple text
2. Include practical examples when relevant
3. Break down complex concepts into simpler parts
4. Encourage understanding over memorization
5. Respond in Japanese when the user communicates in Japanese
6. Use clear, descriptive language to explain mathematical ideas
7. When the user asks for graphs or visualizations, provide data in a structured format (JSON) that can be used to generate charts

Remember: Your goal is to make mathematics accessible and understandable through clear language, not through mathematical notation. NEVER use $ symbols or LaTeX commands.`;

// Helper function to detect if a user answer is correct
function detectAnswerCorrectness(userMessage: string, aiResponse: string): boolean | null {
  // Check for explicit correctness indicators in AI response
  // Order matters: check incorrect patterns FIRST to avoid false positives
  
  // Incorrect patterns - check these first
  const incorrectPatterns = [
    /不正解/i,
    /間違い/i,
    /残念/i,
    /惜しい/i,
    /もう少し/i,
    /違います/i,
    /正しくありません/i,
    /正しくない/i,
    /誤り/i,
    /違って/i,
    /ではありません/i,
    /ではない/i,
    /ちょっと違/i,
    /実は/i,
    /正解は/i,
    /incorrect/i,
    /wrong/i,
    /not correct/i,
    /not right/i,
    /not quite/i,
    /unfortunately/i,
  ];
  
  for (const pattern of incorrectPatterns) {
    if (pattern.test(aiResponse)) {
      return false;
    }
  }
  
  // Correct patterns - check these after incorrect patterns
  const correctPatterns = [
    /正解です/i,
    /正しいです/i,
    /その通り/i,
    /完璧/i,
    /素晴らしい/i,
    /よくできました/i,
    /お見事/i,
    /正解！/i,
    /合っています/i,
    /excellent/i,
    /correct/i,
    /that's right/i,
    /well done/i,
    /good job/i,
    /exactly/i,
  ];
  
  for (const pattern of correctPatterns) {
    if (pattern.test(aiResponse)) {
      return true;
    }
  }
  
  // If no explicit indicator, return null (no answer detected)
  return null;
}

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

        if (!result || !result.choices || result.choices.length === 0) {
          console.error("Invalid LLM response:", result);
          throw new Error("Failed to get AI response: Invalid LLM response");
        }

        // Extract response
        const assistantMessage = result.choices[0]?.message?.content;

        if (!assistantMessage || typeof assistantMessage !== "string") {
          console.error("Invalid response content:", assistantMessage);
          throw new Error("Failed to get AI response: Empty or invalid response content");
        }

        // Detect if this is an answer evaluation
        const isAnswerCorrect = detectAnswerCorrectness(input.message, assistantMessage);
        
        // If an answer was detected, update session performance
        if (isAnswerCorrect !== null) {
          try {
            await updateSessionPerformance(input.sessionId, isAnswerCorrect);
          } catch (error) {
            console.error("Failed to update session performance:", error);
            // Continue anyway, don't fail the response
          }
        }
        
        return {
          response: assistantMessage,
          contentType: "markdown" as const,
          isAnswerEvaluation: isAnswerCorrect !== null,
          isCorrect: isAnswerCorrect,
        };
      } catch (error) {
        console.error("Failed to get AI response:", error);
        throw new Error(
          `Failed to get AI response: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }),

  // Evaluate a quiz/practice answer
  evaluateAnswer: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
        question: z.string(),
        userAnswer: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Get chat history for context
        const chatHistory = await getChatLogs(input.sessionId);

        const systemPrompt = `You are a mathematics educator evaluating student answers.

Evaluate the student's answer to the following question:
Question: ${input.question}
Student's Answer: ${input.userAnswer}

Respond with:
1. Whether the answer is correct (start with "正解です" for correct or "不正解です" for incorrect)
2. Brief explanation of why it's correct or incorrect
3. If incorrect, provide guidance on the correct approach

Be encouraging and supportive in your response.`;

        const messages: Message[] = [
          {
            role: "system",
            content: systemPrompt,
          },
          ...chatHistory.map((log) => ({
            role: log.sender === "user" ? ("user" as const) : ("assistant" as const),
            content: log.content,
          })),
        ];

        const result = await invokeLLM({
          messages,
          maxTokens: 1024,
        });

        if (!result || !result.choices || result.choices.length === 0) {
          throw new Error("Failed to get AI evaluation");
        }

        const evaluation = result.choices[0]?.message?.content;

        if (!evaluation || typeof evaluation !== "string") {
          throw new Error("Invalid evaluation response");
        }

        // Detect correctness from evaluation
        const isCorrect = detectAnswerCorrectness(input.userAnswer, evaluation);

        // Update session performance
        if (isCorrect !== null) {
          try {
            await updateSessionPerformance(input.sessionId, isCorrect);
          } catch (error) {
            console.error("Failed to update session performance:", error);
          }
        }

        return {
          evaluation,
          isCorrect: isCorrect ?? false,
        };
      } catch (error) {
        console.error("Failed to evaluate answer:", error);
        throw new Error(
          `Failed to evaluate answer: ${error instanceof Error ? error.message : "Unknown error"}`
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
