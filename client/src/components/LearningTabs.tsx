import { useState } from "react";
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
  id?: number;
  problem: string;
  solution: string;
}

interface Quiz {
  id?: number;
  question: string;
  options: string[];
  correctAnswer?: string;
  explanation?: string;
}

export default function LearningTabs({ sessionId, topic, onAddMessage }: LearningTabsProps) {
  const [noteText, setNoteText] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [isLoadingProblems, setIsLoadingProblems] = useState(false);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(false);

  const generateProblems = trpc.learning.generatePracticeProblems.useMutation();
  const generateQuizMutation = trpc.learning.generateQuiz.useMutation();
  const createNoteMutation = trpc.learning.createNote.useMutation();

  const handleGenerateProblems = async () => {
    setIsLoadingProblems(true);
    try {
      const result = await generateProblems.mutateAsync({
        sessionId,
        topic,
        difficulty: selectedDifficulty,
        count: 3,
      });

      const problems = result.problems || [];

      if (onAddMessage && problems.length > 0) {
        // 各問題を個別に AI 解答欄に出力
        problems.forEach((problem: Problem, index: number) => {
          onAddMessage(
            `**問題 ${index + 1}:**\n${problem.problem}`,
            "assistant"
          );
        });
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
      const result = await generateQuizMutation.mutateAsync({
        sessionId,
        topic,
        count: 3,
      });

      const quizzes = result.quizzes || [];

      if (onAddMessage && quizzes.length > 0) {
        // 各クイズを個別に AI 解答欄に出力
        quizzes.forEach((quiz: Quiz, index: number) => {
          const optionsText = quiz.options
            .map((opt, i) => `${String.fromCharCode(65 + i)}. ${opt}`)
            .join("\n");
          
          onAddMessage(
            `**クイズ ${index + 1}:**\n${quiz.question}\n\n${optionsText}`,
            "assistant"
          );
        });
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

  const handleCreateNote = async () => {
    if (!noteText.trim()) return;

    try {
      await createNoteMutation.mutateAsync({
        sessionId,
        noteText,
        category: "general",
      });

      setNoteText("");
      if (onAddMessage) {
        onAddMessage(`ノートを作成しました: ${noteText}`, "assistant");
      }
    } catch (error) {
      console.error("Failed to create note:", error);
    }
  };

  return (
    <Tabs defaultValue="practice" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="practice" className="flex items-center gap-2">
          <BookOpen className="w-4 h-4" />
          <span className="hidden sm:inline">練習</span>
        </TabsTrigger>
        <TabsTrigger value="quiz" className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4" />
          <span className="hidden sm:inline">クイズ</span>
        </TabsTrigger>
        <TabsTrigger value="notes" className="flex items-center gap-2">
          <FileText className="w-4 h-4" />
          <span className="hidden sm:inline">ノート</span>
        </TabsTrigger>
        <TabsTrigger value="performance" className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          <span className="hidden sm:inline">成績</span>
        </TabsTrigger>
      </TabsList>

      {/* Practice Problems Tab */}
      <TabsContent value="practice">
        <Card>
          <CardHeader>
            <CardTitle>練習問題</CardTitle>
            <CardDescription>
              {topic}についての練習問題を生成して解いてみましょう
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-2 items-end">
                <div>
                  <label className="block text-sm font-medium mb-2">難易度</label>
                  <select
                    value={selectedDifficulty}
                    onChange={(e) =>
                      setSelectedDifficulty(
                        e.target.value as "easy" | "medium" | "hard"
                      )
                    }
                    className="px-3 py-2 border rounded"
                  >
                    <option value="easy">簡単</option>
                    <option value="medium">普通</option>
                    <option value="hard">難しい</option>
                  </select>
                </div>
                <Button
                  onClick={handleGenerateProblems}
                  disabled={isLoadingProblems}
                  className="w-full"
                >
                  {isLoadingProblems ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    "練習問題を生成"
                  )}
                </Button>
              </div>
              <p className="text-sm text-gray-600">
                「練習問題を生成」をクリックすると、AI が生成した問題が下の会話欄に表示されます。
              </p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Quiz Tab */}
      <TabsContent value="quiz">
        <Card>
          <CardHeader>
            <CardTitle>クイズ</CardTitle>
            <CardDescription>
              {topic}についてのクイズに挑戦してみましょう
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button
                onClick={handleGenerateQuiz}
                disabled={isLoadingQuiz}
                className="w-full"
              >
                {isLoadingQuiz ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    生成中...
                  </>
                ) : (
                  "クイズを生成"
                )}
              </Button>
              <p className="text-sm text-gray-600">
                「クイズを生成」をクリックすると、AI が生成したクイズが下の会話欄に表示されます。
              </p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Notes Tab */}
      <TabsContent value="notes">
        <Card>
          <CardHeader>
            <CardTitle>学習ノート</CardTitle>
            <CardDescription>
              学習中に気づいたことをメモしましょう
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="ノートの内容を入力..."
                  className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                />
              </div>
              <Button
                onClick={handleCreateNote}
                disabled={!noteText.trim()}
                className="w-full"
              >
                ノートを保存
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Performance Tab */}
      <TabsContent value="performance">
        <Card>
          <CardHeader>
            <CardTitle>学習成績</CardTitle>
            <CardDescription>
              あなたの学習進度を確認しましょう
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-center">
              <p className="text-gray-500">
                まだ成績データはありません。練習問題やクイズに挑戦してください。
              </p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
