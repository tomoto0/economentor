import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, HelpCircle, FileText, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface LearningTabsProps {
  sessionId: string;
  topic: string;
}

export default function LearningTabs({ sessionId, topic }: LearningTabsProps) {
  const [noteText, setNoteText] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<"easy" | "medium" | "hard">("medium");

  // tRPC hooks
  const generateProblemsQuery = trpc.learning.generatePracticeProblems.useMutation();
  const getProblemsQuery = trpc.learning.getPracticeProblems.useQuery({ sessionId });
  const generateQuizQuery = trpc.learning.generateQuiz.useMutation();
  const getQuizzesQuery = trpc.learning.getQuizzes.useQuery({ sessionId });
  const createNoteQuery = trpc.learning.createNote.useMutation();
  const getNotesQuery = trpc.learning.getNotes.useQuery({ sessionId });
  const deleteNoteQuery = trpc.learning.deleteNote.useMutation();

  const handleGenerateProblems = async () => {
    try {
      await generateProblemsQuery.mutateAsync({
        sessionId,
        topic,
        difficulty: selectedDifficulty,
        count: 3,
      });
      getProblemsQuery.refetch();
    } catch (error) {
      console.error("Failed to generate problems:", error);
    }
  };

  const handleGenerateQuiz = async () => {
    try {
      await generateQuizQuery.mutateAsync({
        sessionId,
        topic,
        count: 3,
      });
      getQuizzesQuery.refetch();
    } catch (error) {
      console.error("Failed to generate quiz:", error);
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
    } catch (error) {
      console.error("Failed to add note:", error);
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
      <TabsContent value="problems" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>練習問題</CardTitle>
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

            {/* Display generated problems */}
            <div className="space-y-3 mt-4">
              {getProblemsQuery.data?.map((problem) => (
                <Card key={problem.id} className="bg-gray-50">
                  <CardContent className="pt-4">
                    <p className="font-medium mb-2">{problem.problemText}</p>
                    <details className="text-sm">
                      <summary className="cursor-pointer text-blue-600 hover:underline">
                        解答を表示
                      </summary>
                      <p className="mt-2 text-gray-700 whitespace-pre-wrap">{problem.solution}</p>
                    </details>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Quiz Tab */}
      <TabsContent value="quiz" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>クイズ</CardTitle>
            <CardDescription>
              理解度を確認するためのクイズを生成します
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleGenerateQuiz}
              disabled={generateQuizQuery.isPending}
              className="w-full"
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

            {/* Display quizzes */}
            <div className="space-y-4 mt-4">
              {getQuizzesQuery.data?.map((quiz) => (
                <Card key={quiz.id} className="bg-gray-50">
                  <CardContent className="pt-4">
                    <p className="font-medium mb-3">{quiz.question}</p>
                    <div className="space-y-2">
                      {quiz.options?.map((option: string, idx: number) => (
                        <Button
                          key={idx}
                          variant="outline"
                          className="w-full justify-start text-left"
                          onClick={() => {
                            // Handle quiz answer submission
                            console.log("Selected:", option);
                          }}
                        >
                          {String.fromCharCode(65 + idx)}: {option}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Notes Tab */}
      <TabsContent value="notes" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>学習ノート</CardTitle>
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
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
              <Button
                onClick={handleAddNote}
                disabled={!noteText.trim() || createNoteQuery.isPending}
                className="w-full"
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
            <div className="space-y-2 mt-4">
              {getNotesQuery.data?.map((note) => (
                <Card key={note.id} className="bg-yellow-50">
                  <CardContent className="pt-4 flex justify-between items-start gap-2">
                    <p className="text-sm flex-1 whitespace-pre-wrap">{note.noteText}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteNote(note.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      削除
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
