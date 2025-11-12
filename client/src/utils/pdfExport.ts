import { jsPDF } from "jspdf";

interface Message {
  id: string;
  sender: "user" | "assistant";
  content: string;
  contentType: "text" | "json" | "markdown";
}

export function exportToPDF(
  topic: string,
  messages: Message[],
  fileName: string = `math-mentor-${Date.now()}.pdf`
) {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const maxWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  // Title
  pdf.setFontSize(18);
  pdf.setFont("", "bold");
  pdf.text("Math Mentor - 学習記録", margin, yPosition);
  yPosition += 10;

  // Topic
  pdf.setFontSize(12);
  pdf.setFont("", "normal");
  pdf.text(`トピック: ${topic}`, margin, yPosition);
  yPosition += 8;

  // Date
  const dateStr = new Date().toLocaleString("ja-JP");
  pdf.setFontSize(10);
  pdf.text(`作成日時: ${dateStr}`, margin, yPosition);
  yPosition += 12;

  // Separator
  pdf.setDrawColor(200);
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 8;

  // Messages
  messages.forEach((message) => {
    const isUser = message.sender === "user";
    const label = isUser ? "【ユーザー】" : "【AI】";

    // Check if we need a new page
    if (yPosition > pageHeight - margin - 20) {
      pdf.addPage();
      yPosition = margin;
    }

    // Sender label
    pdf.setFontSize(11);
    pdf.setFont("", "bold");
    pdf.setTextColor(isUser ? 30 : 50, isUser ? 100 : 50, isUser ? 200 : 50);
    pdf.text(label, margin, yPosition);
    yPosition += 6;

    // Message content
    pdf.setFontSize(10);
    pdf.setFont("", "normal");
    pdf.setTextColor(0, 0, 0);

    // Split long text into multiple lines
    const lines = pdf.splitTextToSize(message.content, maxWidth) as string[];
    lines.forEach((line) => {
      if (yPosition > pageHeight - margin - 10) {
        pdf.addPage();
        yPosition = margin;
      }
      pdf.text(line, margin + 5, yPosition);
      yPosition += 5;
    });

    yPosition += 4;
  });

  // Save the PDF
  pdf.save(fileName);
}
