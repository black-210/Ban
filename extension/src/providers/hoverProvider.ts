import * as vscode from 'vscode';
import { KnowledgeBase } from '../knowledge/knowledgeBase';
import { MentorMode } from '../config/mentorConfig';

export class CodeMentorHoverProvider implements vscode.HoverProvider {
  private kb: KnowledgeBase;
  private currentMode: () => MentorMode;

  constructor(currentMode: () => MentorMode) {
    this.kb = KnowledgeBase.getInstance();
    this.currentMode = currentMode;
  }

  public provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Hover> {
    const range = document.getWordRangeAtPosition(position, /[a-zA-Z0-9_:]+/);
    if (!range) return null;

    const word = document.getText(range);
    const languageId = document.languageId;
    const lang = languageId === 'rust' ? 'rust' : languageId === 'cpp' ? 'cpp' : 'c';

    // 1. Try finding in known symbols database
    const item = this.kb.findSymbol(lang, word);
    if (item) {
      const mode = this.currentMode();
      const card = this.kb.formatTeacherCard(item, mode);
      const md = new vscode.MarkdownString(card);
      md.isTrusted = true;
      md.supportHtml = true;
      return new vscode.Hover(md, range);
    }

    // 2. Check if it is a user-defined function or variable in the current document
    const lineText = document.lineAt(position).text;
    const fullText = document.getText();

    // Check for function definition pattern: return_type func_name(...)
    const funcDefPattern = new RegExp(`(?:([a-zA-Z0-9_*&:]+)\\s+)?\\b${word}\\s*\\(([^)]*)\\)`);
    const match = funcDefPattern.exec(fullText);

    if (match) {
      const returnType = match[1] || 'void';
      const params = match[2] || '';

      let userCard = `### 📌 رمز محلي مُعرّف في المشروع: \`${word}\`\n\n`;
      userCard += `**اللغة:** ${lang.toUpperCase()} • **التصنيف:** دالة / كائن في المشروع الحالي\n\n`;
      userCard += `**التوقيع المُستخرج:**\n\`\`\`${lang}\n${returnType} ${word}(${params});\n\`\`\`\n\n`;
      userCard += `> *ملاحظة CodeMentor:* تم استخراج توقيع هذا الرمز بأمان من شجرة الكود المصدرية الخاصة بك دون الحاجة لأي تحليل خارجي غير مؤكد.`;

      const md = new vscode.MarkdownString(userCard);
      md.isTrusted = true;
      return new vscode.Hover(md, range);
    }

    return null;
  }
}
