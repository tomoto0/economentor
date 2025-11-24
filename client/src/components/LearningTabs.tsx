import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, HelpCircle, FileText, Loader2, TrendingUp } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface LearningTabsProps {
  sessionId: string;
  topic: string;
  onAddMessage?: (content: string, sender: "user" | "assistant") => void;
}

interface Problem {
  id: number;
  problem: string;
  solution: string;
}

interface Quiz {
  id: number;
  question: string;
  options: string[];
  correctAnswer: string;
}

export default function LearningTabs({ sessionId, topic, onAddMessage }: LearningTabsProps) {
  const [noteText, setNoteText] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [generatedProblems, setGeneratedProblems] = useState<Problem[]>([]);
  const [generatedQuizzes, setGeneratedQuizzes] = useState<Quiz[]>([]);
  const [userAnswers, setUserAnswers] = useState<{ [key: number]: string }>({});
  const [isLoadingProblems, setIsLoadingProblems] = useState(false);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(false);

  const handleGenerateProblems = async () => {
    setIsLoadingProblems(true);
    try {
      const response = await fetch("/api/trpc/learning.generatePracticeProblems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          topic,
          difficulty: selectedDifficulty,
          count: 3,
        }),
      });

      const data = await response.json();
      if (data.result?.data) {
        const problems = data.result.data.problems || [];
        setGeneratedProblems(problems);

        if (onAddMessage && problems.length > 0) {
          const problemsText = problems
            .map((p: Problem, i: number) => `**問題 ${i + 1}:**\n${p.problem}`)
            .join("\n\n---\n\n");

          onAddMessage(
            `${selectedDifficulty === "easy" ? "簡単" : selectedDifficulty === "medium" ? "普通" : "難しい"}レベルの練習問題を${problems.length}問生成しました：\n\n${problemsText}\n\n各問題の下に回答を入力してください。`,
            "assistant"
          );
        }
      }
    } catch (error) {
      console.error("Failed to generate problems:", error);
      if (onAddMessage) {
        onAddMessage("練習問題の生成に失敗しました。", "assistant");
      }
    } finally {
      setIsLoadingProblems(false);
    }
  };

  const handleGenerateQuiz = async () => {
    setIsLoadingQuiz(true);
    try {
      const response = await fetch("/api/trpc/learning.generateQuiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          topic,
          count: 3,
        }),
      });

      const data = await response.json();
      if (data.result?.data) {
        const quizzes = data.result.data.quizzes || [];
        setGeneratedQuizzes(quizzes);

        if (onAddMessage && quizzes.length > 0) {
          const quizzesText = quizzes
            .map((q: Quiz, i: number) => `**クイズ ${i + 1}:**\n${q.question}`)
            .join("\n\n---\n\n");

          onAddMessage(
            `${quizzes.length}問のクイズを生成しました：\n\n${quizzesText}\n\n各クイズの選択肢から正解を選んでください。`,
            "assistant"
          );
        }
      }
    } catch (error) {
      console.error("Failed to generate quiz:", error);
      if (onAddMessage) {
        onAddMessage("クイズの生成に失敗しました。", "assistant");
      }
    } finally {
      setIsLoadingQuiz(false);
    }
  };

  const handleSubmitAnswer = async (problemId: number) => {
    const answer = userAnswers[problemId];
    if (!answer) return;

    const problem = generatedProblems.find((p) => p.id === problemId);
    if (!problem) return;

    if (onAddMessage) {
      onAddMessage(`あなたの回答：${answer}`, "user");

      // AI による指導
      const feedbackPrompt = `以下の数学の問題に対するユーザーの回答を評価してください：\n\n問題：${problem.problem}\n\nユーザーの回答：${answer}\n\n正解：${problem.solution}\n\n回答が正しいかどうかを判定し、詳しい解説と改善点を提供してください。`;

      try {
        const response = await fetch("/api/trpc/chat.sendMessage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            message: feedbackPrompt,
          }),
        });

        const data = await response.json();
        if (data.result?.data?.response) {
          onAddMessage(data.result.data.response, "assistant");
        }
      } catch (error) {
        console.error("Failed to get AI feedback:", error);
      }
    }

    setUserAnswers({ ...userAnswers, [problemId]: "" });
  };

  const handleSubmitQuizAnswer = async (quizId: number, selectedOption: string) => {
    const quiz = generatedQuizzes.find((q) => q.id === quizId);
    if (!quiz) return;

    const isCorrect = selectedOption === quiz.correctAnswer;

    if (onAddMessage) {
      onAddMessage(`あなたの回答：${selectedOption}`, "user");

      const feedbackPrompt = `以下のクイズに対するユーザーの回答を評価してください：\n\nクイズ：${quiz.question}\n\nユーザーの選択：${selectedOption}\n\n正解：${quiz.correctAnswer}\n\n${isCorrect ? "正解です！" : "残念ながら不正解です。"} 詳しい解説をお願いします。`;

      try {
        const response = await fetch("/api/trpc/chat.sendMessage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            message: feedbackPrompt,
          }),
        });

        const data = await response.json();
        if (data.result?.data?.response) {
          onAddMessage(data.result.data.response, "assistant");
        }
      } catch (error) {
        console.error("Failed to get AI feedback:", error);
      }
    }
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;

    try {
      const response = await fetch("/api/trpc/learning.createNote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          noteText,
          category: "general",
        }),
      });

      if (response.ok) {
        setNoteText("");
        if (onAddMessage) {
          onAddMessage(`ノートに保存しました：\n\n${noteText}`, "assistant");
        }
      }
    } catch (error) {
      console.error("Failed to add note:", error);
      if (onAddMessage) {
        onAddMessage("ノートの保存に失敗しました。", "assistant");
      }
    }
  };

  return (
    <div className="w-full">
      <Tabs defaultValue="problems" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="problems" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">練習問題</span>
          </TabsTrigger>
          <TabsTrigger value="quiz" className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4" />
            <span className="hidden sm:inline">クイズ</span>
          </TabsTrigger>
          <TabsTrigger value="notes" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">ノート</span>
          </TabsTrigger>
        </TabsList>

        {/* Practice Problems Tab */}
        <TabsContent value="problems" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>練習問題を生成</CardTitle>
              <CardDescription>難易度を選択して練習問題を生成します</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                {(["easy", "medium", "hard"] as const).map((level) => (
                  <Button
                    key={level}
                    variant={selectedDifficulty === level ? "default" : "outline"}
                    onClick={() => setSelectedDifficulty(level)}
                  >
                    {level === "easy" ? "簡単" : level === "medium" ? "普通" : "難しい"}
                  </Button>
                ))}
              </div>
              <Button
                onClick={handleGenerateProblems}
                disabled={isLoadingProblems}
                className="w-full"
              >
                {isLoadingProblems && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                練習問題を生成
              </Button>

              {/* Display generated problems */}
              {generatedProblems.length > 0 && (
                <div className="space-y-4 mt-4">
                  {generatedProblems.map((problem) => (
                    <Card key={problem.id} className="p-4">
                      <p className="font-semibold mb-2">{problem.problem}</p>
                      <textarea
                        value={userAnswers[problem.id] || ""}
                        onChange={(e) =>
                          setUserAnswers({ ...userAnswers, [problem.id]: e.target.value })
                        }
                        placeholder="あなたの回答を入力..."
                        className="w-full p-2 border rounded mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={3}
                      />
                      <Button
                        onClick={() => handleSubmitAnswer(problem.id)}
                        disabled={!userAnswers[problem.id]?.trim()}
                        className="w-full"
                      >
                        回答を送信
                      </Button>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quiz Tab */}
        <TabsContent value="quiz" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>クイズを生成</CardTitle>
              <CardDescription>理解度を確認するためのクイズを生成します</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={handleGenerateQuiz}
                disabled={isLoadingQuiz}
                className="w-full"
              >
                {isLoadingQuiz && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                クイズを生成
              </Button>

              {/* Display generated quizzes */}
              {generatedQuizzes.length > 0 && (
                <div className="space-y-4 mt-4">
                  {generatedQuizzes.map((quiz) => (
                    <Card key={quiz.id} className="p-4">
                      <p className="font-semibold mb-3">{quiz.question}</p>
                      <div className="space-y-2">
                        {quiz.options.map((option, idx) => (
                          <Button
                            key={idx}
                            variant="outline"
                            className="w-full justify-start"
                            onClick={() => handleSubmitQuizAnswer(quiz.id, option)}
                          >
                            {option}
                          </Button>
                        ))}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>学習ノート</CardTitle>
              <CardDescription>重要なポイントをメモに保存します</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="ノートの内容を入力..."
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
              />
              <Button
                onClick={handleAddNote}
                disabled={!noteText.trim()}
                className="w-full"
              >
                ノートに保存
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
