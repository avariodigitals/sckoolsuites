export type ExtractedComments = {
  classTeacherComment: string | null;
  principalComment: string | null;
};

const COMMENT_LABELS = {
  classTeacher: [
    "class teacher's comment",
    "class teacher comment",
    "teacher's comment",
    "teacher comment",
    "form teacher's comment",
    "form teacher comment",
    "class teacher's remarks",
    "class teacher remarks",
    "teacher's remarks",
    "teacher remarks",
  ],
  principal: [
    "principal's comment",
    "principal comment",
    "principal's remarks",
    "principal remarks",
    "headmaster's comment",
    "headmaster comment",
    "headmistress's comment",
    "headmistress comment",
    "head teacher's comment",
    "head teacher comment",
  ],
};

function extractCommentAfterLabel(
  text: string,
  labels: string[]
): string | null {
  for (const label of labels) {
    // Build a regex that matches the label followed by optional punctuation
    // and then captures the text on the same line and/or subsequent lines
    // until we hit another known field label or end of meaningful content.
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(
      `${escaped}\\s*[:\\-–—]?\\s*(.+?)(?:\\n\\s*(?:principal|head|class|form|teacher|remark|comment|attendance|conduct|grade|next|term|session|total|average|gpa|position|subject|score|result|report|date|signature|name|class|arm|school|student|pupil|parent)\\b|$)`,
      "is"
    );

    const match = text.match(regex);
    if (match && match[1]) {
      const comment = match[1]
        .replace(/\s+/g, " ")
        .trim();
      // Filter out empty or placeholder comments
      if (
        comment.length > 2 &&
        !/^\s*$/.test(comment) &&
        !/^(n\/a|nil|none|-|\.+)$/.test(comment)
      ) {
        return comment;
      }
    }

    // Try a simpler approach: label on one line, comment on the next
    const lineRegex = new RegExp(
      `${escaped}\\s*[:\\-–—]?\\s*$`,
      "i"
    );
    const lines = text.split("\n");
    for (let i = 0; i < lines.length - 1; i++) {
      if (lineRegex.test(lines[i].trim())) {
        const nextLine = lines[i + 1].trim();
        if (
          nextLine.length > 2 &&
          !/^(n\/a|nil|none|-|\.+)$/.test(nextLine) &&
          !COMMENT_LABELS.principal.some((l) =>
            nextLine.toLowerCase().startsWith(l)
          ) &&
          !COMMENT_LABELS.classTeacher.some((l) =>
            nextLine.toLowerCase().startsWith(l)
          )
        ) {
          return nextLine.replace(/\s+/g, " ").trim();
        }
      }
    }
  }
  return null;
}

export async function extractCommentsFromPdf(
  buffer: Buffer
): Promise<ExtractedComments> {
  try {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    const text = result.text || "";

    if (!text.trim()) {
      return { classTeacherComment: null, principalComment: null };
    }

    const classTeacherComment = extractCommentAfterLabel(
      text,
      COMMENT_LABELS.classTeacher
    );
    const principalComment = extractCommentAfterLabel(
      text,
      COMMENT_LABELS.principal
    );

    return { classTeacherComment, principalComment };
  } catch (error) {
    console.error("[pdf-comment-extractor]", error);
    return { classTeacherComment: null, principalComment: null };
  }
}
