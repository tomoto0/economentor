import React, { useState, useEffect } from "react";
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

export default function LearningTabs({ sessionId, topic, onAddMessage }: LearningTabsProps) {
  const [noteText, setNoteText] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<"easy" | "medium" | "hard">("medium");

  // tRPC hooks
  const generateProblemsQuery = trpc.learning.generatePracticeProblems.useMutation();
  const generateQuizQuery = trpc.learning.generateQuiz.useMutation();
  const createNoteQuery = trpc.learning.createNote.useMutation();
  const getNotesQuery = trpc.learning.getNotes.useQuery({ sessionId });
  const deleteNoteQuery = trpc.learning.deleteNote.useMutation();
  const performanceQuery = trpc.learning.getSessionPerformance.useQuery({ sessionId });
  const updatePerformanceQuery = trpc.learning.updateSessionPerformance.useMutation();

  // Auto-adjust difficulty based on performance
  useEffect(() => {
    if (performanceQuery.data) {
      setSelectedDifficulty(performanceQuery.data.currentDifficulty);
    }
  }, [performanceQuery.data?.currentDifficulty]);

  const handleGenerateProblems = async () => {
    try {
      const result = await generateProblemsQuery.mutateAsync({
        sessionId,
        topic,
        difficulty: selectedDifficulty,
        count: 3,
      });

      // Add to chat as assistant message
      if (onAddMessage && result.problems.length > 0) {
        const problemsText = result.problems
          .map((p, i) => `**問題 ${i + 1}:**\n${p.problem}\n\n**解答:**\n${p.solution}`)
          .join("\n\n---\n\n");
        
        onAddMessage(
          `${selectedDifficulty === "easy" ? "簡単" : selectedDifficulty === "medium" ? "普通" : "難しい"}レベルの練習問題を${result.count}問生成しました：\n\n${problemsText}`,
          "assistant"
        );
      }
    } catch (error) {
      console.error("Failed to generate problems:", error);
      if (onAddMessage) {
        onAddMessage("練習問題の生成に失敗しました。", "assistant");
      }
    }
  };

  const handleGenerateQuiz = async () => {
    try {
      const result = await generateQuizQuery.mutateAsync({
        sessionId,
        topic,
        count: 3,
      });

      // Add to chat as assistant message
      if (onAddMessage && result.quizzes.length > 0) {
        const quizzesText = result.quizzes
          .map((q, i) => `**クイズ ${i + 1}:**\n${q.question}`)
          .join("\n\n---\n\n");
        
        onAddMessage(
          `${result.count}問のクイズを生成しました：\n\n${quizzesText}`,
          "assistant"
        );
      }
    } catch (error) {
      console.error("Failed to generate quiz:", error);
      if (onAddMessage) {
        onAddMessage("クイズの生成に失敗しました。", "assistant");
      }
    }
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;

    try {
      await createNoteQuery.mutateAsync({
        sessionId,
        noteText,
        category: "general",
      });
      setNoteText("");
      getNotesQuery.refetch();
      
      if (onAddMessage) {
        onAddMessage(`ノートに保存しました：\n\n${noteText}`, "assistant");
      }
    } catch (error) {
      console.error("Failed to add note:", error);
      if (onAddMessage) {
        onAddMessage("ノートの保存に失敗しました。", "assistant");
      }
    }
  };

  const handleDeleteNote = async (noteId: number) => {
    try {
      await deleteNoteQuery.mutateAsync({ noteId });
      getNotesQuery.refetch();
    } catch (error) {
      console.error("Failed to delete note:", error);
    }
  };

  const handleAnswerCorrect = async (isCorrect: boolean) => {
    try {
      const updated = await updatePerformanceQuery.mutateAsync({
        sessionId,
        isCorrect,
      });
      
      // Refetch performance data
      performanceQuery.refetch();
      
      if (onAddMessage) {
        const accuracyText = `正解率: ${updated.accuracyRate}% | 難易度: ${
          updated.currentDifficulty === "easy" ? "簡単" : 
          updated.currentDifficulty === "medium" ? "普通" : 
          "難しい"
        }`;
        onAddMessage(accuracyText, "assistant");
      }
    } catch (error) {
      console.error("Failed to update performance:", error);
    }
  };

  return (
    <div className="w-full">
      <Tabs defaultValue="problems" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
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
          <TabsTrigger value="progress" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            <span className="hidden sm:inline">進捗</span>
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
                disabled={generateProblemsQuery.isPending}
                className="w-full"
              >
                {generateProblemsQuery.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                練習問題を生成
              </Button>
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
            <CardContent>
              <Button 
                onClick={handleGenerateQuiz} 
                disabled={generateQuizQuery.isPending}
                className="w-full"
              >
                {generateQuizQuery.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                クイズを生成
              </Button>
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
                disabled={createNoteQuery.isPending || !noteText.trim()}
                className="w-full"
              >
                {createNoteQuery.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                ノートに保存
              </Button>

              {/* Display saved notes */}
              {getNotesQuery.data && getNotesQuery.data.length > 0 && (
                <div className="space-y-2 mt-4">
                  <h3 className="font-semibold">保存されたノート</h3>
                  {getNotesQuery.data.map((note) => (
                    <Card key={note.id} className="p-3">
                      <div className="flex justify-between items-start">
                        <p className="text-sm">{note.noteText}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteNote(note.id)}
                        >
                          削除
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Progress Tab */}
        <TabsContent value="progress" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>学習進捗</CardTitle>
              <CardDescription>正解率と難易度の自動調整</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {performanceQuery.data ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-gray-600">正解数</p>
                      <p className="text-2xl font-bold">{performanceQuery.data.correctAnswers}/{performanceQuery.data.totalProblems}</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-sm text-gray-600">正解率</p>
                      <p className="text-2xl font-bold">{performanceQuery.data.accuracyRate}%</p>
                    </div>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <p className="text-sm text-gray-600">現在の難易度</p>
                    <p className="text-lg font-semibold">
                      {performanceQuery.data.currentDifficulty === "easy" ? "簡単" : 
                       performanceQuery.data.currentDifficulty === "medium" ? "普通" : 
                       "難しい"}
                    </p>
                  </div>

                  {/* Answer buttons for testing */}
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => handleAnswerCorrect(true)} 
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      正解
                    </Button>
                    <Button 
                      onClick={() => handleAnswerCorrect(false)} 
                      className="flex-1 bg-red-600 hover:bg-red-700"
                    >
                      不正解
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">進捗データを読み込み中...</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
