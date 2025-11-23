import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Learning sessions table - stores information about each learning session
 */
export const learningSessions = mysqlTable("learning_sessions", {
  id: varchar("id", { length: 64 }).primaryKey(), // UUID generated on frontend
  topic: varchar("topic", { length: 255 }).notNull(), // e.g., "微分・積分", "確率論"
  description: text("description"), // Optional description of the topic
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LearningSession = typeof learningSessions.$inferSelect;
export type InsertLearningSession = typeof learningSessions.$inferInsert;

/**
 * Chat logs table - stores conversation history between user and AI
 */
export const chatLogs = mysqlTable("chat_logs", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 64 })
    .notNull()
    .references(() => learningSessions.id, { onDelete: "cascade" }),
  sender: mysqlEnum("sender", ["user", "assistant"]).notNull(), // who sent the message
  content: text("content").notNull(), // the message content
  contentType: mysqlEnum("contentType", ["text", "json", "markdown"]).default("text").notNull(), // format of content
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChatLog = typeof chatLogs.$inferSelect;
export type InsertChatLog = typeof chatLogs.$inferInsert;

/**
 * Practice problems table - stores AI-generated practice problems
 */
export const practiceProblems = mysqlTable("practice_problems", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 64 })
    .notNull()
    .references(() => learningSessions.id, { onDelete: "cascade" }),
  problemText: text("problemText").notNull(), // The problem statement
  solution: text("solution"), // The solution/answer
  difficulty: mysqlEnum("difficulty", ["easy", "medium", "hard"]).default("medium").notNull(),
  solved: int("solved").default(0).notNull(), // 0 = not solved, 1 = solved
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PracticeProblem = typeof practiceProblems.$inferSelect;
export type InsertPracticeProblem = typeof practiceProblems.$inferInsert;

/**
 * Quiz table - stores quiz questions and answers
 */
export const quizzes = mysqlTable("quizzes", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 64 })
    .notNull()
    .references(() => learningSessions.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  options: text("options").notNull(), // JSON array of options
  correctAnswer: varchar("correctAnswer", { length: 255 }).notNull(),
  explanation: text("explanation"), // Explanation of the correct answer
  userAnswer: varchar("userAnswer", { length: 255 }), // User's answer
  isCorrect: int("isCorrect"), // 1 = correct, 0 = incorrect, null = not answered
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Quiz = typeof quizzes.$inferSelect;
export type InsertQuiz = typeof quizzes.$inferInsert;

/**
 * Learning notes table - stores user's notes and highlights
 */
export const learningNotes = mysqlTable("learning_notes", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 64 })
    .notNull()
    .references(() => learningSessions.id, { onDelete: "cascade" }),
  noteText: text("noteText").notNull(), // The note content
  category: varchar("category", { length: 100 }), // e.g., "important", "example", "formula"
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LearningNote = typeof learningNotes.$inferSelect;
export type InsertLearningNote = typeof learningNotes.$inferInsert;
/**
 * Session performance tracking - stores accuracy rate and difficulty level per session
 */
export const sessionPerformance = mysqlTable("session_performance", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 64 })
    .notNull()
    .references(() => learningSessions.id, { onDelete: "cascade" }),
  totalProblems: int("totalProblems").default(0).notNull(), // Total problems attempted
  correctAnswers: int("correctAnswers").default(0).notNull(), // Number of correct answers
  accuracyRate: int("accuracyRate").default(0).notNull(), // Percentage (0-100)
  currentDifficulty: mysqlEnum("currentDifficulty", ["easy", "medium", "hard"]).default("medium").notNull(), // Current difficulty level
  lastUpdated: timestamp("lastUpdated").defaultNow().onUpdateNow().notNull(),
});

export type SessionPerformance = typeof sessionPerformance.$inferSelect;
export type InsertSessionPerformance = typeof sessionPerformance.$inferInsert;
