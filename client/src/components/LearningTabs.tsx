import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, HelpCircle, FileText, Loader2 } from "lucide-react";
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

  return (
    <Tabs defaultValue="problems" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="problems" className="flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          <span className="hidden sm:inline">練習問題</span>
        </TabsTrigger>
        <TabsTrigger value="quiz" className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4" />
          <span className="hidden sm:inline">クイズ</span>
        </TabsTrigger>
        <TabsTrigger value="notes" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          <span className="hidden sm:inline">ノート</span>
        </TabsTrigger>
      </TabsList>

      {/* Practice Problems Tab */}
      <TabsContent value="problems" className="space-y-4 mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">練習問題生成</CardTitle>
            <CardDescription>
              トピック「{topic}」に関する練習問題を生成します
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">難易度</label>
              <div className="flex gap-2">
                {(["easy", "medium", "hard"] as const).map((level) => (
                  <Button
                    key={level}
                    variant={selectedDifficulty === level ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedDifficulty(level)}
                  >
                    {level === "easy" ? "簡単" : level === "medium" ? "普通" : "難しい"}
                  </Button>
                ))}
              </div>
            </div>

            <Button
              onClick={handleGenerateProblems}
              disabled={generateProblemsQuery.isPending}
              className="w-full"
              size="sm"
            >
              {generateProblemsQuery.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  生成中...
                </>
              ) : (
                "練習問題を生成"
              )}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Quiz Tab */}
      <TabsContent value="quiz" className="space-y-4 mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">クイズ生成</CardTitle>
            <CardDescription>
              理解度を確認するためのクイズを生成します
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleGenerateQuiz}
              disabled={generateQuizQuery.isPending}
              className="w-full"
              size="sm"
            >
              {generateQuizQuery.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  生成中...
                </>
              ) : (
                "クイズを生成"
              )}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Notes Tab */}
      <TabsContent value="notes" className="space-y-4 mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">学習ノート</CardTitle>
            <CardDescription>
              重要なポイントやメモを保存します
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">新しいノート</label>
              <textarea
                placeholder="重要なポイント、公式、例などを記入してください..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                rows={2}
              />
              <Button
                onClick={handleAddNote}
                disabled={!noteText.trim() || createNoteQuery.isPending}
                className="w-full"
                size="sm"
              >
                {createNoteQuery.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    保存中...
                  </>
                ) : (
                  "ノートを保存"
                )}
              </Button>
            </div>

            {/* Display notes */}
            <div className="space-y-2 mt-4 max-h-32 overflow-y-auto">
              {getNotesQuery.data?.map((note) => (
                <div key={note.id} className="bg-yellow-50 p-2 rounded-md text-sm flex justify-between items-start gap-2">
                  <p className="flex-1 whitespace-pre-wrap">{note.noteText}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteNote(note.id)}
                    className="text-red-600 hover:text-red-700 text-xs"
                  >
                    削除
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
