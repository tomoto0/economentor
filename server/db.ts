import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, learningSessions, chatLogs, practiceProblems, quizzes, learningNotes, sessionPerformance, InsertLearningSession, InsertChatLog, InsertSessionPerformance } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Learning Sessions queries
export async function createLearningSession(session: InsertLearningSession) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  
  try {
    await db.insert(learningSessions).values(session);
    return session;
  } catch (error) {
    console.error("[Database] Failed to create learning session:", error);
    throw error;
  }
}

export async function getLearningSession(sessionId: string) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  
  try {
    const result = await db
      .select()
      .from(learningSessions)
      .where(eq(learningSessions.id, sessionId))
      .limit(1);
    
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("[Database] Failed to get learning session:", error);
    throw error;
  }
}

// Chat Logs queries
export async function addChatLog(log: InsertChatLog) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  
  try {
    const result = await db.insert(chatLogs).values(log);
    return result;
  } catch (error) {
    console.error("[Database] Failed to add chat log:", error);
    throw error;
  }
}

export async function getChatLogs(sessionId: string) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  
  try {
    const result = await db
      .select()
      .from(chatLogs)
      .where(eq(chatLogs.sessionId, sessionId))
      .orderBy(chatLogs.createdAt);
    
    return result;
  } catch (error) {
    console.error("[Database] Failed to get chat logs:", error);
    throw error;
  }
}


// Practice problems queries
export async function createPracticeProblem(
  sessionId: string,
  problemText: string,
  solution: string,
  difficulty: "easy" | "medium" | "hard" = "medium"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.insert(practiceProblems).values({
    sessionId,
    problemText,
    solution,
    difficulty,
  });
}

export async function getPracticeProblems(sessionId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(practiceProblems).where(eq(practiceProblems.sessionId, sessionId));
}

// Quiz queries
export async function createQuiz(
  sessionId: string,
  question: string,
  options: string[],
  correctAnswer: string,
  explanation: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.insert(quizzes).values({
    sessionId,
    question,
    options: JSON.stringify(options),
    correctAnswer,
    explanation,
  });
}

export async function getQuizzes(sessionId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(quizzes).where(eq(quizzes.sessionId, sessionId));
}

export async function updateQuizAnswer(
  quizId: number,
  userAnswer: string,
  isCorrect: boolean
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.update(quizzes)
    .set({ userAnswer, isCorrect: isCorrect ? 1 : 0 })
    .where(eq(quizzes.id, quizId));
}

// Learning notes queries
export async function createNote(
  sessionId: string,
  noteText: string,
  category?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.insert(learningNotes).values({
    sessionId,
    noteText,
    category,
  });
}

export async function getNotes(sessionId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(learningNotes).where(eq(learningNotes.sessionId, sessionId));
}

export async function deleteNote(noteId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.delete(learningNotes).where(eq(learningNotes.id, noteId));
}


// Session Performance Tracking Functions

export async function getOrCreateSessionPerformance(sessionId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Try to find existing performance record
  const existing = await db
    .select()
    .from(sessionPerformance)
    .where(eq(sessionPerformance.sessionId, sessionId))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  // Create new performance record
  const newPerformance: InsertSessionPerformance = {
    sessionId,
    totalProblems: 0,
    correctAnswers: 0,
    accuracyRate: 0,
    currentDifficulty: "medium",
  };

  await db.insert(sessionPerformance).values(newPerformance);
  
  const created = await db
    .select()
    .from(sessionPerformance)
    .where(eq(sessionPerformance.sessionId, sessionId))
    .limit(1);

  return created[0];
}

export async function updateSessionPerformance(
  sessionId: string,
  isCorrect: boolean
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const performance = await getOrCreateSessionPerformance(sessionId);
  
  const newTotal = performance.totalProblems + 1;
  const newCorrect = isCorrect ? performance.correctAnswers + 1 : performance.correctAnswers;
  const newAccuracy = Math.round((newCorrect / newTotal) * 100);

  // Determine new difficulty based on accuracy
  let newDifficulty = performance.currentDifficulty;
  if (newTotal >= 3) {
    if (newAccuracy >= 80) {
      newDifficulty = "hard";
    } else if (newAccuracy >= 60) {
      newDifficulty = "medium";
    } else {
      newDifficulty = "easy";
    }
  }

  await db
    .update(sessionPerformance)
    .set({
      totalProblems: newTotal,
      correctAnswers: newCorrect,
      accuracyRate: newAccuracy,
      currentDifficulty: newDifficulty,
    })
    .where(eq(sessionPerformance.sessionId, sessionId));

  return {
    totalProblems: newTotal,
    correctAnswers: newCorrect,
    accuracyRate: newAccuracy,
    currentDifficulty: newDifficulty,
  };
}

export async function getSessionPerformance(sessionId: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(sessionPerformance)
    .where(eq(sessionPerformance.sessionId, sessionId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}
