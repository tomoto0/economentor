import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, Plus, Download, FileText } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { nanoid } from "nanoid";
import { Streamdown } from "streamdown";
import MathGraph from "@/components/MathGraph";
import LearningTabs from "@/components/LearningTabs";

interface GraphData {
  type: "line" | "bar" | "scatter" | "area";
  title: string;
  xAxis: {
    label: string;
    data: (string | number)[];
  };
  yAxis: {
    label: string;
  };
  series: Array<{
    name: string;
    data: (number | null)[];
  }>;
}

interface Message {
  id: string;
  sender: "user" | "assistant";
  content: string;
  contentType: "text" | "json" | "markdown";
  graphData?: GraphData;
}

export default function Home() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // tRPC mutations
  const createSessionMutation = trpc.sessions.create.useMutation();
  const addMessageMutation = trpc.sessions.addMessage.useMutation();
  const sendMessageMutation = trpc.chat.sendMessage.useMutation();
  const getChatLogsQuery = trpc.sessions.getChatLogs.useQuery;

  // Initialize session from localStorage
  useEffect(() => {
    const savedSessionId = localStorage.getItem("mathMentorSessionId");
    if (savedSessionId) {
      setSessionId(savedSessionId);
      loadSession(savedSessionId);
    }
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const loadSession = async (id: string) => {
    try {
      // Use the query hook to fetch chat logs
      const result = await getChatLogsQuery({ sessionId: id });
      if (result.data) {
        setMessages(
          result.data.map((log) => ({
            id: `${log.id}`,
            sender: log.sender,
            content: log.content,
            contentType: log.contentType as "text" | "json" | "markdown",
          }))
        );
      }
      setSessionStarted(true);
    } catch (error) {
      console.error("Failed to load session:", error);
    }
  };

  const startSession = async () => {
    if (!topic.trim()) return;

    try {
      setIsLoading(true);
      const newSession = await createSessionMutation.mutateAsync({
        topic,
        description: undefined,
      });

      const newSessionId = newSession.id;
      setSessionId(newSessionId);
      localStorage.setItem("mathMentorSessionId", newSessionId);
      setSessionStarted(true);
      setMessages([]);

      // Add initial user message
      const userMessage: Message = {
        id: nanoid(),
        sender: "user",
        content: `${topic}について教えてください。`,
        contentType: "text",
      };

      setMessages([userMessage]);
      await addMessageMutation.mutateAsync({
        sessionId: newSessionId,
        sender: "user",
        content: userMessage.content,
        contentType: "text",
      });

      // Get AI response
      let assistantContent = "申し訳ありません。AI応答の取得に失敗しました。";
      let assistantContentType: "text" | "markdown" = "text";

      try {
        const aiResponse = await sendMessageMutation.mutateAsync({
          sessionId: newSessionId,
          message: userMessage.content,
        });

        assistantContent = aiResponse.response || assistantContent;
        assistantContentType = aiResponse.contentType || "markdown";
      } catch (error) {
        console.error("Failed to get AI response:", error);
      }

      const assistantMessage: Message = {
        id: nanoid(),
        sender: "assistant",
        content: assistantContent,
        contentType: assistantContentType,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      try {
        await addMessageMutation.mutateAsync({
          sessionId: newSessionId,
          sender: "assistant",
          content: assistantMessage.content,
          contentType: assistantContentType,
        });
      } catch (error) {
        console.error("Failed to save assistant message:", error);
      }
    } catch (error) {
      console.error("Failed to create session:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !sessionId) return;

    try {
      setIsLoading(true);
      const userMessage: Message = {
        id: nanoid(),
        sender: "user",
        content: inputMessage,
        contentType: "text",
      };

      setMessages((prev) => [...prev, userMessage]);
      setInputMessage("");

      await addMessageMutation.mutateAsync({
        sessionId,
        sender: "user",
        content: userMessage.content,
        contentType: "text",
      });

      // Get AI response
      let assistantContent = "申し訳ありません。AI応答の取得に失敗しました。";
      let assistantContentType: "text" | "markdown" = "text";

      try {
        const aiResponse = await sendMessageMutation.mutateAsync({
          sessionId,
          message: inputMessage,
        });

        assistantContent = aiResponse.response || assistantContent;
        assistantContentType = aiResponse.contentType || "markdown";
      } catch (error) {
        console.error("Failed to get AI response:", error);
      }

      const assistantMessage: Message = {
        id: nanoid(),
        sender: "assistant",
        content: assistantContent,
        contentType: assistantContentType,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      try {
        await addMessageMutation.mutateAsync({
          sessionId,
          sender: "assistant",
          content: assistantMessage.content,
          contentType: assistantContentType,
        });
      } catch (error) {
        console.error("Failed to save assistant message:", error);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const startNewSession = () => {
    setSessionId(null);
    setTopic("");
    setMessages([]);
    setInputMessage("");
    setSessionStarted(false);
    localStorage.removeItem("mathMentorSessionId");
  };

  const exportAsText = () => {
    let text = `Math Mentor - 学習記録\n`;
    text += `トピック: ${topic}\n`;
    text += `作成日時: ${new Date().toLocaleString("ja-JP")}\n`;
    text += `\n${"=".repeat(50)}\n\n`;

    messages.forEach((msg) => {
      text += `${msg.sender === "user" ? "【ユーザー】" : "【AI】"}\n`;
      text += `${msg.content}\n\n`;
    });

    const element = document.createElement("a");
    element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(text));
    element.setAttribute("download", `math-mentor-${Date.now()}.txt`);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  if (!sessionStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-3xl">Math Mentor</CardTitle>
            <CardDescription>
              数学の専門的なトピックをAIと対話しながら学習します
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">学習したいトピック</label>
              <Input
                placeholder="例：微分・積分、確率論、線形代数..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && startSession()}
              />
            </div>
            <Button
              onClick={startSession}
              disabled={!topic.trim() || isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  セッション作成中...
                </>
              ) : (
                "学習を開始"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Math Mentor</h1>
          <p className="text-sm text-gray-600">{topic}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportAsText}>
            <Download className="mr-2 h-4 w-4" />
            テキスト保存
          </Button>
          <Button variant="outline" size="sm" onClick={startNewSession}>
            <Plus className="mr-2 h-4 w-4" />
            新しいセッション
          </Button>
        </div>
      </div>

      {/* Tabs for learning features */}
      {sessionId && (
        <div className="bg-white border-b border-gray-200 p-4 overflow-y-auto flex-shrink-0" style={{ maxHeight: '300px' }}>
          <LearningTabs sessionId={sessionId} topic={topic} />
        </div>
      )}

      {/* Chat Area */}
      <ScrollArea className="flex-1 p-4 overflow-hidden">
        <div className="space-y-4 max-w-4xl mx-auto">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <p>会話を開始しましょう...</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-2xl rounded-lg p-4 ${
                    message.sender === "user"
                      ? "bg-blue-500 text-white"
                      : "bg-white text-gray-900 border border-gray-200"
                  }`}
                >
                  {message.contentType === "markdown" ? (
                    <Streamdown>{message.content}</Streamdown>
                  ) : (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  )}
                  {message.graphData && (
                    <div className="mt-4">
                      <MathGraph data={message.graphData} />
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 p-4 flex-shrink-0">
        <div className="max-w-4xl mx-auto flex gap-2">
          <Input
            placeholder="質問を入力してください..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && !isLoading && sendMessage()}
            disabled={isLoading}
          />
          <Button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
