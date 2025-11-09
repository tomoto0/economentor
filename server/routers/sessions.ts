import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { createLearningSession, getLearningSession, addChatLog, getChatLogs } from "../db";
import { nanoid } from "nanoid";

export const sessionsRouter = router({
  // Create a new learning session
  create: publicProcedure
    .input(
      z.object({
        topic: z.string().min(1, "Topic is required"),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const sessionId = nanoid();
      const session = await createLearningSession({
        id: sessionId,
        topic: input.topic,
        description: input.description,
      });
      return session;
    }),

  // Get a learning session by ID
  get: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input }) => {
      const session = await getLearningSession(input.sessionId);
      if (!session) {
        throw new Error("Session not found");
      }
      return session;
    }),

  // Get chat logs for a session
  getChatLogs: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input }) => {
      const logs = await getChatLogs(input.sessionId);
      return logs;
    }),

  // Add a chat message
  addMessage: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
        sender: z.enum(["user", "assistant"]),
        content: z.string(),
        contentType: z.enum(["text", "json", "markdown"]).default("text"),
      })
    )
    .mutation(async ({ input }) => {
      const result = await addChatLog({
        sessionId: input.sessionId,
        sender: input.sender,
        content: input.content,
        contentType: input.contentType,
      });
      return result;
    }),
});
