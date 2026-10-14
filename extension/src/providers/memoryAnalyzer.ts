export type ConfidenceLevel = 'Confirmed' | 'Analyzer Warning' | 'Suspicion for Review';

export interface MemoryFinding {
  id: string;
  title: string;
  message: string;
  language: 'c' | 'cpp' | 'rust';
  severity: 'Error' | 'Warning' | 'Information';
  confidence: ConfidenceLevel;
  line: number; // 0-based
  character: number;
  endLine: number;
  endCharacter: number;
  whyItHappened: string;
  impact: string;
  howToFix: string;
  codeBefore?: string;
  codeAfter?: string;
  quickFixReplacement?: string;
  quickFixTitle?: string;
}

export class MemoryAnalyzer {
  public static analyzeDocument(
    text: string,
    languageId: string
  ): MemoryFinding[] {
    const findings: MemoryFinding[] = [];
    const lines = text.split('\n');

    const lang: 'c' | 'cpp' | 'rust' =
      languageId === 'rust' ? 'rust' : languageId === 'cpp' ? 'cpp' : 'c';

    if (lang === 'c' || lang === 'cpp') {
      this.analyzeCAndCpp(lines, text, lang, findings);
    } else if (lang === 'rust') {
      this.analyzeRust(lines, text, findings);
    }

    return findings;
  }

  private static analyzeCAndCpp(
    lines: string[],
    fullText: string,
    lang: 'c' | 'cpp',
    findings: MemoryFinding[]
  ) {
    // 1. Detect malloc/calloc without corresponding free (Memory Leak)
    // Matches: int *data = malloc(...), char* p = malloc(...), or var = malloc(...)
    const mallocPattern = /(?:(?:\*|\b)(\w+)\s*=\s*(?:\([a-zA-Z0-9_*]+\))?\s*(?:malloc|calloc)\s*\()/g;
    let match: RegExpExecArray | null;

    lines.forEach((lineText, lineIdx) => {
      // Avoid comments
      const trimmed = lineText.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('/*')) return;

      while ((match = mallocPattern.exec(lineText)) !== null) {
        const varName = match[1];
        if (varName) {
          // Check if free(varName) exists in the subsequent lines of the function or file (excluding comments)
          const textWithoutComments = fullText
            .replace(/\/\/.*$/gm, '')
            .replace(/\/\*[\s\S]*?\*\//g, '');
          const freeRegex = new RegExp(`\\bfree\\s*\\(\\s*${varName}\\s*\\)`);
          const hasFree = freeRegex.test(textWithoutComments);

          if (!hasFree) {
            findings.push({
              id: `memleak-${varName}-${lineIdx}`,
              title: 'احتمال تسرب ذاكرة (Memory Leak)',
              message: `تم حجز الذاكرة للمؤشر '${varName}' بواسطة malloc/calloc دون وجود استدعاء مطابق لـ free(${varName}).`,
              language: lang,
              severity: 'Error',
              confidence: 'Analyzer Warning',
              line: lineIdx,
              character: match.index,
              endLine: lineIdx,
              endCharacter: match.index + match[0].length,
              whyItHappened: `تم استدعاء تخصيص الذاكرة الديناميكية للمؤشر '${varName}' على الكومة (Heap)، ولكن لم يتم العثور على تحرير له بواسطة free() في مسارات التنفيذ.`,
              impact: 'تسرب الذاكرة واستهلاك متزايد لذاكرة الوصول العشوائي (RAM) حتى نفاد موارد النظام.',
              howToFix: `أضف free(${varName}); مع تصفير المؤشر ${varName} = NULL فور انتهاء الحاجة للبيانات.`,
              codeBefore: `${lineText}\n// ... كود البرنامج بدون تحرير الذاكرة`,
              codeAfter: `${lineText}\n// ... استخدام البيانات ...\nfree(${varName});\n${varName} = NULL;`,
              quickFixTitle: `💡 إضافة تحرير الذاكرة free(${varName}) وتصفير المؤشر`,
              quickFixReplacement: `\n    free(${varName});\n    ${varName} = NULL;`,
            });
          }
        }
      }
    });

    // 2. Detect Use-After-Free
    const freePattern = /free\s*\(\s*(\w+)\s*\)/g;
    lines.forEach((lineText, lineIdx) => {
      let freeMatch: RegExpExecArray | null;
      while ((freeMatch = freePattern.exec(lineText)) !== null) {
        const freedVar = freeMatch[1];
        // Scan subsequent lines for dereference or usage of freedVar
        for (let i = lineIdx + 1; i < Math.min(lineIdx + 30, lines.length); i++) {
          const nextLine = lines[i];
          if (nextLine.includes('}') && !nextLine.includes('{')) {
            // Function likely ended
            break;
          }
          const derefPattern = new RegExp(`(?:\\*${freedVar}|${freedVar}\\[|${freedVar}->)`);
          const derefMatch = derefPattern.exec(nextLine);
          if (derefMatch) {
            findings.push({
              id: `uaf-${freedVar}-${i}`,
              title: 'خطر استخدام الذاكرة بعد التحرير (Use-After-Free)',
              message: `محاولة الوصول إلى المؤشر المحرر '${freedVar}' في السطر ${i + 1} بعد أن تم تحريره في السطر ${lineIdx + 1}.`,
              language: lang,
              severity: 'Error',
              confidence: 'Confirmed',
              line: i,
              character: derefMatch.index,
              endLine: i,
              endCharacter: derefMatch.index + derefMatch[0].length,
              whyItHappened: `تم استدعاء free(${freedVar}) في السطر ${lineIdx + 1}، مما أعاد عنوان الذاكرة لنظام التشغيل، ولكن الكود لا يزال يحاول القراءة أو الكتابة عبره.`,
              impact: 'سلوك غير معرّف (Undefined Behavior)، احتمالية انهيار فوري (Segfault) أو استغلال أمني خطير لاختراق النظام.',
              howToFix: `احذف الاستخدام غير الصالح، أو أعد هيكلة الكود ليتم استخدام المؤشر قبل استدعاء free()، وضع ${freedVar} = NULL بعد التحرير.`,
              codeBefore: `${lines[lineIdx]}\n${nextLine}`,
              codeAfter: `// تم استخدام المؤشر أولاً ثم:\nfree(${freedVar});\n${freedVar} = NULL;`,
            });
          }
        }
      }
    });

    // 3. Detect Double Free
    lines.forEach((lineText, lineIdx) => {
      let freeMatch: RegExpExecArray | null;
      while ((freeMatch = freePattern.exec(lineText)) !== null) {
        const freedVar = freeMatch[1];
        for (let i = lineIdx + 1; i < Math.min(lineIdx + 20, lines.length); i++) {
          const nextLine = lines[i];
          const secondFreePattern = new RegExp(`free\\s*\\(\\s*${freedVar}\\s*\\)`);
          if (secondFreePattern.test(nextLine)) {
            findings.push({
              id: `double-free-${freedVar}-${i}`,
              title: 'تحرير مزدوج خطير للذاكرة (Double Free)',
              message: `تم استدعاء free(${freedVar}) مجدداً في السطر ${i + 1} بعد أن تم تحريره مسبقاً في السطر ${lineIdx + 1}.`,
              language: lang,
              severity: 'Error',
              confidence: 'Confirmed',
              line: i,
              character: 0,
              endLine: i,
              endCharacter: nextLine.length,
              whyItHappened: `تكرار عملية تحرير نفس كتلة الذاكرة مرتين.`,
              impact: 'إفساد جداول تخصيص الذاكرة للنواة والمكتبة البرمجية، وانهيار فوري للبرنامج.',
              howToFix: `احذف استدعاء free الثاني وضع ${freedVar} = NULL بعد التحرير الأول.`,
              codeBefore: `${lines[lineIdx]}\n${nextLine}`,
              codeAfter: `${lines[lineIdx]}\n${freedVar} = NULL; // يمنع Double Free`,
            });
          }
        }
      }
    });

    // 4. Insecure buffer copy (strcpy / gets / sprintf)
    lines.forEach((lineText, lineIdx) => {
      const strcpyMatch = /\b(strcpy|gets|strcat)\s*\(\s*(\w+)/.exec(lineText);
      if (strcpyMatch) {
        const funcName = strcpyMatch[1];
        const destVar = strcpyMatch[2];
        findings.push({
          id: `insecure-func-${funcName}-${lineIdx}`,
          title: `دالة غير آمنة ومخاطر تجاوز السعة (Buffer Overflow via ${funcName})`,
          message: `الدالة '${funcName}' لا تفحص حدود المصفوفة الهدف '${destVar}' وتعد ثغرة أمنية تاريخية شائعة.`,
          language: lang,
          severity: 'Error',
          confidence: 'Confirmed',
          line: lineIdx,
          character: strcpyMatch.index,
          endLine: lineIdx,
          endCharacter: strcpyMatch.index + strcpyMatch[0].length,
          whyItHappened: `الدوال مثل strcpy و gets تنسخ المحارف دون فحص سعة المخزن المؤقت، مما يتيح تجاوز مساحة الذاكرة إذا كان الإدخال طويلاً.`,
          impact: 'تجاوز حدود المكدس (Stack Smashing)، تلف المتغيرات المحلية، وسهولة تنفيذ ثغرات الاختراق وحقن الأكواد.',
          howToFix: `استبدل '${funcName}' بالدوال الآمنة snprintf أو strncpy مع ضمان إضافة '\\0' في النهاية.`,
          codeBefore: lineText.trim(),
          codeAfter: `snprintf(${destVar}, sizeof(${destVar}), \"%s\", src);`,
          quickFixTitle: `🛡️ استبدال ${funcName} بـ snprintf الآمنة`,
          quickFixReplacement: `snprintf(${destVar}, sizeof(${destVar}), \"%s\", src);`,
        });
      }
    });

    // 5. C++ RAII check: Raw 'new' without smart pointer
    if (lang === 'cpp') {
      lines.forEach((lineText, lineIdx) => {
        const newMatch = /(?:(\w+)\s*=\s*)?new\s+([a-zA-Z0-9_:]+)\s*\((.*?)\)/.exec(lineText);
        if (newMatch && !lineText.includes('unique_ptr') && !lineText.includes('shared_ptr')) {
          const varName = newMatch[1] || 'item';
          const typeName = newMatch[2];
          findings.push({
            id: `cpp-raw-new-${lineIdx}`,
            title: 'تخصيص يدوي عبر new وانتهاك نمط RAII',
            message: `يوصى في C++ الحديثة باستخدام std::make_unique<${typeName}> بدلاً من new اليدوي لضمان تحرير الذاكرة عند حدوث استثناء.`,
            language: 'cpp',
            severity: 'Warning',
            confidence: 'Analyzer Warning',
            line: lineIdx,
            character: newMatch.index,
            endLine: lineIdx,
            endCharacter: newMatch.index + newMatch[0].length,
            whyItHappened: `استخدام new الخام يتطلب استدعاء delete يدوي مطابق، وهو عرضة لتسرب الذاكرة في حال رمي أي استثناء برمجياً.`,
            impact: 'تسرب الذاكرة وعدم الأمان ضد الاستثناءات (Exception Unsafe).',
            howToFix: `استخدم std::make_unique<${typeName}>() الذي يدير عمر الكائن وتحريره تلقائياً.`,
            codeBefore: lineText.trim(),
            codeAfter: `auto ${varName} = std::make_unique<${typeName}>(${newMatch[3]});`,
            quickFixTitle: `⚡ تحويل إلى std::make_unique<${typeName}> الآمن`,
            quickFixReplacement: `auto ${varName} = std::make_unique<${typeName}>(${newMatch[3]});`,
          });
        }
      });
    }
  }

  private static analyzeRust(
    lines: string[],
    fullText: string,
    findings: MemoryFinding[]
  ) {
    // 1. Detect unnecessary unsafe blocks
    lines.forEach((lineText, lineIdx) => {
      const unsafeMatch = /\bunsafe\s*\{/.exec(lineText);
      if (unsafeMatch) {
        // Look ahead inside the unsafe block
        const blockSlice = lines.slice(lineIdx, lineIdx + 8).join('\n');
        // Check if there are raw pointer dereferences (*ptr) or extern FFI
        const hasRawDeref = /\*(\w+)\b/.test(blockSlice);
        const hasFfi = /\b(extern|transmute)\b/.test(blockSlice);

        if (!hasRawDeref && !hasFfi) {
          findings.push({
            id: `rust-unnecessary-unsafe-${lineIdx}`,
            title: 'استخدام غير ضروري لكتلة unsafe (Suspicious Unsafe Block)',
            message: 'لا تظهر الكتلة فك إشارة مؤشر خام أو استدعاء FFI خارجي؛ يفضل الاعتماد على كود Rust الآمن القياسي.',
            language: 'rust',
            severity: 'Warning',
            confidence: 'Suspicion for Review',
            line: lineIdx,
            character: unsafeMatch.index,
            endLine: lineIdx,
            endCharacter: unsafeMatch.index + unsafeMatch[0].length,
            whyItHappened: 'تم وضع كود داخل unsafe دون وجود عمليات تتطلب صلاحيات الـ unsafe الفعلية.',
            impact: 'تعطيل بعض ضمانات الأمان بدون سبب مقنع وزيادة العبء في تدقيق الكود.',
            howToFix: 'احذف كلمة unsafe واكتب العمليات باستخدام توابع المكتبة القياسية الآمنة.',
            codeBefore: lineText.trim(),
            codeAfter: lineText.replace(/unsafe\s*\{/, '{').trim(),
            quickFixTitle: '🛡️ إزالة كتلة unsafe غير الضرورية',
            quickFixReplacement: lineText.replace(/unsafe\s*\{/, '{'),
          });
        }
      }
    });

    // 2. Detect unwrap() which can panic
    lines.forEach((lineText, lineIdx) => {
      const unwrapMatch = /\b(\w+)\.unwrap\(\)/.exec(lineText);
      if (unwrapMatch) {
        const varName = unwrapMatch[1];
        findings.push({
          id: `rust-unwrap-panic-${lineIdx}`,
          title: 'استخدام .unwrap() وخطر التوقف المفاجئ (Panic Hazard)',
          message: `استدعاء .unwrap() على '${varName}' قد يسبب ذعر البرنامج وتوقفه فوراً إذا كانت القيمة None أو Err.`,
          language: 'rust',
          severity: 'Warning',
          confidence: 'Analyzer Warning',
          line: lineIdx,
          character: unwrapMatch.index,
          endLine: lineIdx,
          endCharacter: unwrapMatch.index + unwrapMatch[0].length,
          whyItHappened: 'يقوم unwrap باستخراج القيمة مباشرة، لكن في حال الفشل يقوم باستدعاء panic! مما يوقف العملية بالكامل.',
          impact: 'انهيار التطبيق في بيئة الإنتاج وعدم القدرة على استرداد الخطأ بأمان.',
          howToFix: 'استخدم نمط if let أو match أو المعامل ? لنشر الخطأ.',
          codeBefore: lineText.trim(),
          codeAfter: `if let Some(val) = ${varName} {\n    // معالجة آمنة\n}`,
          quickFixTitle: `💡 استبدال unwrap بنمط if let الآمن`,
          quickFixReplacement: `if let Some(val) = ${varName} {`,
        });
      }
    });
  }
}
