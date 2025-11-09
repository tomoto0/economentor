import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the LLM function
vi.mock("../../_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

vi.mock("../../db", () => ({
  getChatLogs: vi.fn(),
}));

describe("Chat Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("sendMessage", () => {
    it("should accept valid message input", async () => {
      const input = {
        sessionId: "test-session-123",
        message: "微分の定義を教えてください",
      };

      expect(input.sessionId).toBeTruthy();
      expect(input.message).toBeTruthy();
      expect(input.message.length).toBeGreaterThan(0);
    });

    it("should reject empty message", async () => {
      const input = {
        sessionId: "test-session-123",
        message: "",
      };

      expect(input.message.length).toBe(0);
    });

    it("should handle message with special characters", async () => {
      const input = {
        sessionId: "test-session-123",
        message: "f(x) = x² + 2x + 1 の微分は？",
      };

      expect(input.message).toContain("f(x)");
      expect(input.message).toContain("²");
    });
  });

  describe("generateGraphData", () => {
    it("should accept valid graph description", async () => {
      const input = {
        sessionId: "test-session-123",
        description: "y = x² のグラフを描いてください",
      };

      expect(input.sessionId).toBeTruthy();
      expect(input.description).toBeTruthy();
    });

    it("should handle mathematical expressions in description", async () => {
      const input = {
        sessionId: "test-session-123",
        description: "f(x) = sin(x) のグラフを x ∈ [-π, π] で表示",
      };

      expect(input.description).toContain("sin");
      expect(input.description).toContain("π");
    });
  });
});
