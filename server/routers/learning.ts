import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { invokeLLM, Message } from "../_core/llm";
import {
  createPracticeProblem,
  getPracticeProblems,
  createQuiz,
  getQuizzes,
  updateQuizAnswer,
  createNote,
  getNotes,
  deleteNote,
  getChatLogs,
  getOrCreateSessionPerformance,
  updateSessionPerformance,
  getSessionPerformance,
} from "../db";

/**
 * Learning features router handles:
 * - Practice problem generation
 * - Quiz creation and grading
 * - Learning notes management
 */
export const learningRouter = router({
  // Generate practice problems
  generatePracticeProblems: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
        topic: z.string(),
        difficulty: z.enum(["easy", "medium", "hard"]).optional(),
        count: z.number().min(1).max(5).default(3),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const chatHistory = await getChatLogs(input.sessionId);

        const systemPrompt = `You are a mathematics educator. Generate exactly ${input.count} practice problems for the topic "${input.topic}" at ${input.difficulty || "medium"} difficulty level.

IMPORTANT FORMATTING RULES:
- Do NOT use LaTeX notation (no $...$ or \\...)
- Do NOT use mathematical symbols like \\cos, \\sin, \\theta, \\pi, etc.
- Write all mathematical expressions in plain text
- Examples of correct formatting:
  - Instead of "$\\cos\\theta$", write "cos(theta)" or "コサインシータ"
  - Instead of "$x^2$", write "xの2乗" or "x squared"
  - Instead of "$\\frac{1}{2}$", write "1/2" or "2分の1"
  - Instead of "$\\sqrt{x}$", write "xの平方根" or "sqrt(x)"
  - Instead of "$\\pi$", write "円周率π" or "pi"

For each problem, provide the problem statement and solution with step-by-step explanation in plain text.

You MUST respond with ONLY a valid JSON array. Each object must have exactly these two fields:
- "problem": the problem statement (string, plain text only)
- "solution": the step-by-step solution (string, plain text only)

Example:
[{"problem":"xの2乗を微分してください","solution":"べき乗の法則を使って: d/dx(xの2乗) = 2x"}]

Respond with ONLY the JSON array, no additional text.`;

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
          maxTokens: 3000,
        });

        if (!result || !result.choices || result.choices.length === 0) {
          console.error("Invalid LLM response:", result);
          return {
            problems: [],
            count: 0,
          };
        }

        const response = result.choices[0]?.message?.content;

        if (!response || typeof response !== "string") {
          console.error("Invalid response content:", response);
          return {
            problems: [],
            count: 0,
          };
        }

        // Parse the JSON response
        let problems: Array<{ problem: string; solution: string }> = [];
        try {
          console.log("LLM Response length:", response.length);
          console.log("LLM Response (first 300 chars):", response.substring(0, 300));
          
          // Try to extract JSON from the response
          const jsonMatch = response.match(/\[\s*\{[\s\S]*\}\s*\]/);
          const jsonStr = jsonMatch ? jsonMatch[0] : response;
          console.log("Extracted JSON length:", jsonStr.length);
          
          problems = JSON.parse(jsonStr);
          console.log("Parsed problems count:", problems.length);
          
          if (!Array.isArray(problems)) {
            console.error("Parsed response is not an array:", problems);
            problems = [];
          }
        } catch (e) {
          console.error("Failed to parse problems JSON:", e);
          console.error("Response preview:", response.substring(0, 500));
          problems = [];
        }

        // Save problems to database
        const savedProblems = [];
        for (const problem of problems) {
          try {
            await createPracticeProblem(
              input.sessionId,
              problem.problem,
              problem.solution,
              input.difficulty || "medium"
            );
            savedProblems.push(problem);
          } catch (error) {
            console.error("Failed to save problem:", error);
          }
        }

        return {
          problems: savedProblems,
          count: savedProblems.length,
        };
      } catch (error) {
        console.error("Failed to generate practice problems:", error);
        throw new Error(
          `Failed to generate practice problems: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }),

  // Get practice problems for a session
  getPracticeProblems: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input }) => {
      try {
        return await getPracticeProblems(input.sessionId);
      } catch (error) {
        console.error("Failed to get practice problems:", error);
        throw new Error("Failed to get practice problems");
      }
    }),

  // Generate quiz questions
  generateQuiz: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
        topic: z.string(),
        count: z.number().min(1).max(5).default(3),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const chatHistory = await getChatLogs(input.sessionId);

        const systemPrompt = `You are a mathematics educator. Create ${input.count} multiple-choice quiz questions about "${input.topic}".

IMPORTANT FORMATTING RULES:
- Do NOT use LaTeX notation (no $...$ or \\...)
- Do NOT use mathematical symbols like \\cos, \\sin, \\theta, \\pi, etc.
- Write all mathematical expressions in plain text
- Examples of correct formatting:
  - Instead of "$\\cos\\theta$", write "cos(theta)" or "コサインシータ"
  - Instead of "$x^2$", write "xの2乗" or "x squared"
  - Instead of "$\\frac{1}{2}$", write "1/2" or "2分の1"
  - Instead of "$\\sqrt{x}$", write "xの平方根" or "sqrt(x)"
  - Instead of "$\\pi$", write "円周率π" or "pi"

For each question, provide: (1) The question text in plain text, (2) Four options WITHOUT labels in plain text, (3) The correct answer as index (0, 1, 2, or 3), (4) Brief explanation in plain text.

You MUST respond with ONLY a valid JSON array. Each object must have exactly these fields:
- "question": the question text (string, plain text only)
- "options": array of 4 strings (the option texts WITHOUT any labels, plain text only)
- "correctAnswer": the index of correct answer (0, 1, 2, or 3)
- "explanation": brief explanation (string, plain text only)

Respond with ONLY the JSON array, no additional text.`;

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
          maxTokens: 3000,
        });

        if (!result || !result.choices || result.choices.length === 0) {
          console.error("Invalid LLM response:", result);
          return {
            quizzes: [],
            count: 0,
          };
        }

        const response = result.choices[0]?.message?.content;

        if (!response || typeof response !== "string") {
          console.error("Invalid response content:", response);
          return {
            quizzes: [],
            count: 0,
          };
        }

        // Parse the JSON response
        let quizzes: Array<{
          question: string;
          options: string[];
          correctAnswer: string;
          explanation: string;
        }> = [];
        try {
          const jsonMatch = response.match(/\[\s*\{[\s\S]*\}\s*\]/);
          const jsonStr = jsonMatch ? jsonMatch[0] : response;
          quizzes = JSON.parse(jsonStr);
          
          if (!Array.isArray(quizzes)) {
            console.error("Parsed response is not an array:", quizzes);
            quizzes = [];
          }
        } catch (e) {
          console.error("Failed to parse quiz JSON:", e, "Response:", response);
          quizzes = [];
        }

        // Save quizzes to database
        const savedQuizzes = [];
        for (const quiz of quizzes) {
          try {
            await createQuiz(
              input.sessionId,
              quiz.question,
              quiz.options,
              quiz.correctAnswer,
              quiz.explanation
            );
            savedQuizzes.push({
              question: quiz.question,
              options: quiz.options,
              explanation: quiz.explanation,
            });
          } catch (error) {
            console.error("Failed to save quiz:", error);
          }
        }

        return {
          quizzes: savedQuizzes,
          count: savedQuizzes.length,
        };
      } catch (error) {
        console.error("Failed to generate quiz:", error);
        throw new Error(
          `Failed to generate quiz: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }),

  // Get quizzes for a session
  getQuizzes: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input }) => {
      try {
        const quizzes = await getQuizzes(input.sessionId);
        return quizzes.map((q) => ({
          ...q,
          options: JSON.parse(q.options),
        }));
      } catch (error) {
        console.error("Failed to get quizzes:", error);
        throw new Error("Failed to get quizzes");
      }
    }),

  // Submit quiz answer
  submitQuizAnswer: publicProcedure
    .input(
      z.object({
        quizId: z.number(),
        userAnswer: z.string(),
        sessionId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Get the quiz to check the answer
        const quizzes = await getQuizzes(input.sessionId);
        const quiz = quizzes.find((q) => q.id === input.quizId);

        if (!quiz) {
          throw new Error("Quiz not found");
        }

        const isCorrect = quiz.correctAnswer === input.userAnswer;
        await updateQuizAnswer(input.quizId, input.userAnswer, isCorrect);
        
        // Update session performance
        await updateSessionPerformance(input.sessionId, isCorrect);

        return {
          isCorrect,
          correctAnswer: quiz.correctAnswer,
          explanation: quiz.explanation,
        };
      } catch (error) {
        console.error("Failed to submit quiz answer:", error);
        throw new Error("Failed to submit quiz answer");
      }
    }),

  // Create a learning note
  createNote: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
        noteText: z.string(),
        category: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        await createNote(input.sessionId, input.noteText, input.category);
        return { success: true };
      } catch (error) {
        console.error("Failed to create note:", error);
        throw new Error("Failed to create note");
      }
    }),

  // Get learning notes for a session
  getNotes: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input }) => {
      try {
        return await getNotes(input.sessionId);
      } catch (error) {
        console.error("Failed to get notes:", error);
        throw new Error("Failed to get notes");
      }
    }),

  // Delete a learning note
  deleteNote: publicProcedure
    .input(z.object({ noteId: z.number() }))
    .mutation(async ({ input }) => {
      try {
        await deleteNote(input.noteId);
        return { success: true };
      } catch (error) {
        console.error("Failed to delete note:", error);
        throw new Error("Failed to delete note");
      }
    }),

  // Get session performance
  getSessionPerformance: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input }) => {
      try {
        const performance = await getSessionPerformance(input.sessionId);
        if (!performance) {
          return await getOrCreateSessionPerformance(input.sessionId);
        }
        return performance;
      } catch (error) {
        console.error("Failed to get session performance:", error);
        throw new Error("Failed to get session performance");
      }
    }),

  // Update session performance after answering
  updateSessionPerformance: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
        isCorrect: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const updated = await updateSessionPerformance(input.sessionId, input.isCorrect);
        return updated;
      } catch (error) {
        console.error("Failed to update session performance:", error);
        throw new Error("Failed to update session performance");
      }
    }),
});
