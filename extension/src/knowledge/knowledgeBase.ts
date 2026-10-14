import { MentorMode } from '../config/mentorConfig';

export interface KnowledgeItem {
  name: string;
  signature?: string;
  header?: string;
  category?: string;
  kind?: string;
  summary: string;
  explanation: string;
  whenToUse: string;
  syntax: string;
  example: string;
  exampleExplanation?: string;
  commonPitfalls?: string[];
  memoryHazards?: string;
  alternatives?: string;
  docUrl?: string;
  language: 'c' | 'cpp' | 'rust';
}

export interface MemoryHazardItem {
  id: string;
  title: string;
  language: 'c' | 'cpp' | 'rust';
  severity: 'Critical' | 'Error' | 'Warning' | 'Info';
  explanation: string;
  impact: string;
  detectionPattern: string;
  howToFix: string;
  badCode: string;
  goodCode: string;
}

// Embedded knowledge registry for guaranteed offline zero-latency operation
import cStdlib from '../../knowledge/c/stdlib.json';
import cKeywords from '../../knowledge/c/keywords.json';
import cMemory from '../../knowledge/c/memory.json';

import cppStl from '../../knowledge/cpp/stl.json';
import cppKeywords from '../../knowledge/cpp/keywords.json';
import cppMemory from '../../knowledge/cpp/memory_raii.json';

import rustTypes from '../../knowledge/rust/std_types.json';
import rustKeywords from '../../knowledge/rust/keywords.json';
import rustOwnership from '../../knowledge/rust/ownership_borrowing.json';

export class KnowledgeBase {
  private static instance: KnowledgeBase;
  private symbols: Map<string, KnowledgeItem[]> = new Map();
  private hazards: Map<string, MemoryHazardItem[]> = new Map();

  private constructor() {
    this.initDatabase();
  }

  public static getInstance(): KnowledgeBase {
    if (!KnowledgeBase.instance) {
      KnowledgeBase.instance = new KnowledgeBase();
    }
    return KnowledgeBase.instance;
  }

  private initDatabase() {
    // 1. C
    const cItems: KnowledgeItem[] = [
      ...cStdlib.map((item) => ({ ...item, language: 'c' as const })),
      ...cKeywords.map((item) => ({ ...item, language: 'c' as const })),
    ];
    this.symbols.set('c', cItems);
    this.hazards.set('c', cMemory as MemoryHazardItem[]);

    // 2. C++
    const cppItems: KnowledgeItem[] = [
      ...cppStl.map((item) => ({ ...item, language: 'cpp' as const })),
      ...cppKeywords.map((item) => ({ ...item, language: 'cpp' as const })),
    ];
    this.symbols.set('cpp', cppItems);
    this.hazards.set('cpp', cppMemory as MemoryHazardItem[]);

    // 3. Rust
    const rustItems: KnowledgeItem[] = [
      ...rustTypes.map((item) => ({ ...item, language: 'rust' as const })),
      ...rustKeywords.map((item) => ({ ...item, language: 'rust' as const })),
    ];
    this.symbols.set('rust', rustItems);
    this.hazards.set('rust', rustOwnership as MemoryHazardItem[]);
  }

  public getSymbols(lang: 'c' | 'cpp' | 'rust'): KnowledgeItem[] {
    return this.symbols.get(lang) || [];
  }

  public getHazards(lang: 'c' | 'cpp' | 'rust'): MemoryHazardItem[] {
    return this.hazards.get(lang) || [];
  }

  public findSymbol(lang: 'c' | 'cpp' | 'rust', name: string): KnowledgeItem | undefined {
    const list = this.getSymbols(lang);
    const cleanName = name.trim();
    return list.find(
      (item) =>
        item.name.toLowerCase() === cleanName.toLowerCase() ||
        item.name.toLowerCase().endsWith('::' + cleanName.toLowerCase())
    );
  }

  public search(lang: 'c' | 'cpp' | 'rust', prefix: string): KnowledgeItem[] {
    const list = this.getSymbols(lang);
    const p = prefix.trim().toLowerCase();
    if (!p) return list;
    return list.filter((item) => item.name.toLowerCase().includes(p));
  }

  /**
   * Format teacher markdown card tailored to mentor mode
   */
  public formatTeacherCard(item: KnowledgeItem, mode: MentorMode = 'pedagogical'): string {
    const langBadge = item.language.toUpperCase();
    const title = item.signature ? `\`${item.signature}\`` : `\`${item.name}\``;

    // 1. Concise Mode: Short and direct
    if (mode === 'concise') {
      let md = `### 💡 ${item.name} (${langBadge})\n`;
      md += `**الوظيفة:** ${item.summary}\n\n`;
      if (item.syntax) md += `**الصيغة:** \`${item.syntax}\`\n\n`;
      if (item.docUrl) md += `[التوثيق الرسمي ↗](${item.docUrl})`;
      return md;
    }

    // 2. Security Mode: Focuses on memory safety, CVEs, and hazards
    if (mode === 'security') {
      let md = `### 🛡️ CodeMentor Security Audit: ${item.name} (${langBadge})\n\n`;
      md += `> **ملخص أمني:** ${item.summary}\n\n`;
      md += `#### 🚨 مخاطر الذاكرة والثغرات المحتملة:\n`;
      md += `${item.memoryHazards || 'لا توجد مخاطر ذاكرة حرجة معروفة عند الاستخدام القياسي.'}\n\n`;
      if (item.commonPitfalls && item.commonPitfalls.length > 0) {
        md += `#### ⚠️ الأخطاء والمزالق الشائعة:\n`;
        item.commonPitfalls.forEach((pitfall) => {
          md += `- ${pitfall}\n`;
        });
        md += '\n';
      }
      if (item.alternatives) {
        md += `#### 🔒 البدائل الآمنة والموصى بها:\n${item.alternatives}\n\n`;
      }
      if (item.example) {
        md += `#### 🧪 الكود الآمن المعتمد:\n\`\`\`${item.language}\n${item.example}\n\`\`\`\n`;
      }
      return md;
    }

    // 3. Advanced Mode: Deep technical mechanics & assembly/allocator details
    if (mode === 'advanced') {
      let md = `### ⚡ ${title} — ${langBadge} Deep Dive\n\n`;
      md += `**Category:** ${item.category || item.kind || 'Core Element'}\n\n`;
      if (item.header) md += `**Header:** \`${item.header}\`\n\n`;
      md += `#### 🔍 التفاصيل التقنية والميكانيكا الداخلية:\n${item.explanation}\n\n`;
      md += `#### 🎯 متى يُنصح بالاستخدام؟\n${item.whenToUse}\n\n`;
      md += `#### 📋 الصيغة الصحيحة (Syntax):\n\`\`\`${item.language}\n${item.syntax}\n\`\`\`\n\n`;
      md += `#### 💾 إدارة الموارد وتكلفة الأداء (Performance & Memory):\n${item.memoryHazards || 'تكلفة صفرية (Zero-cost abstraction).'}\n\n`;
      if (item.example) {
        md += `#### 💻 مثال متقدم:\n\`\`\`${item.language}\n${item.example}\n\`\`\`\n\n`;
      }
      if (item.docUrl) md += `🔗 [Official Reference Docs](${item.docUrl})`;
      return md;
    }

    // 4. Pedagogical Mode (Default): Full Teacher Card with line-by-line breakdown
    let md = `## 🎓 CodeMentor: ${item.name}\n\n`;
    md += `*${item.summary}*\n\n`;
    md += `**اللغة والتصنيف:** ${langBadge} • ${item.category || item.kind || 'رمز قياسي'}\n\n`;
    if (item.header) md += `**المكتبة / الترويسة:** \`${item.header}\`\n\n`;
    md += `---\n\n`;
    md += `### ❓ ما هو هذا العنصر وماذا يفعل؟\n${item.explanation}\n\n`;
    md += `### 🎯 متى تحتاجه وتستخدمه؟\n${item.whenToUse}\n\n`;
    md += `### 📝 الصيغة الصحيحة لكتابته:\n\`\`\`${item.language}\n${item.syntax}\n\`\`\`\n\n`;

    if (item.example) {
      md += `### 💡 مثال عملي:\n\`\`\`${item.language}\n${item.example}\n\`\`\`\n\n`;
    }

    if (item.exampleExplanation) {
      md += `### 🔍 شرح المثال سطرًا بسطر:\n`;
      const lines = item.exampleExplanation.split('\n');
      lines.forEach((line) => {
        md += `${line}\n`;
      });
      md += '\n';
    }

    if (item.commonPitfalls && item.commonPitfalls.length > 0) {
      md += `### ⚠️ الأخطاء الشائعة التي يجب تجنبها:\n`;
      item.commonPitfalls.forEach((pitfall) => {
        md += `- ${pitfall}\n`;
      });
      md += '\n';
    }

    if (item.memoryHazards) {
      md += `### 🚨 مخاطر الذاكرة والأمان:\n> ⚠️ **تنبيه:** ${item.memoryHazards}\n\n`;
    }

    if (item.alternatives) {
      md += `### 🔄 بدائل أفضل أو حديثة:\n${item.alternatives}\n\n`;
    }

    if (item.docUrl) {
      md += `🌐 [التوثيق الرسمي وقواعد المعيار](${item.docUrl})\n`;
    }

    return md;
  }
}
