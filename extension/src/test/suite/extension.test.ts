import { KnowledgeBase } from '../../knowledge/knowledgeBase';
import { MemoryAnalyzer } from '../../providers/memoryAnalyzer';

// Lightweight test framework definitions for standalone and VS Code test runner
type TestFn = () => void | Promise<void>;

interface ExpectResult {
  toBeDefined(): void;
  toBeUndefined(): void;
  toContain(sub: string): void;
  not: {
    toContain(sub: string): void;
  };
  toBeGreaterThan(val: number): void;
  toBe(val: unknown): void;
}

function expect(actual: unknown): ExpectResult {
  return {
    toBeDefined() {
      if (actual === undefined || actual === null) {
        throw new Error(`Expected defined, got ${actual}`);
      }
    },
    toBeUndefined() {
      if (actual !== undefined) {
        throw new Error(`Expected undefined, got ${actual}`);
      }
    },
    toContain(sub: string) {
      if (typeof actual !== 'string' || !actual.includes(sub)) {
        throw new Error(`Expected to contain "${sub}", got "${actual}"`);
      }
    },
    not: {
      toContain(sub: string) {
        if (typeof actual === 'string' && actual.includes(sub)) {
          throw new Error(`Expected NOT to contain "${sub}"`);
        }
      },
    },
    toBeGreaterThan(val: number) {
      if (typeof actual !== 'number' || actual <= val) {
        throw new Error(`Expected > ${val}, got ${actual}`);
      }
    },
    toBe(val: unknown) {
      if (actual !== val) {
        throw new Error(`Expected ${val}, got ${actual}`);
      }
    },
  };
}

function describe(_name: string, fn: () => void) {
  fn();
}

function it(_name: string, fn: TestFn) {
  fn();
}

describe('CodeMentor Test Suite', () => {
  const kb = KnowledgeBase.getInstance();

  it('1. C completion: suggests malloc with teacher markdown card', () => {
    const item = kb.findSymbol('c', 'malloc');
    expect(item).toBeDefined();
    expect(item?.summary).toContain('حجز مساحة ذاكرة ديناميكية');
    expect(item?.syntax).toContain('malloc');

    const card = kb.formatTeacherCard(item!, 'pedagogical');
    expect(card).toContain('ما هو هذا العنصر');
    expect(card).toContain('متى تحتاجه وتستخدمه');
    expect(card).toContain('مخاطر الذاكرة والأمان');
    expect(card).toContain('free');
  });

  it('2. C++ completion: suggests std::unique_ptr with RAII explanations', () => {
    const item = kb.findSymbol('cpp', 'std::unique_ptr');
    expect(item).toBeDefined();
    expect(item?.summary).toContain('مؤشر ذكي');
    expect(item?.category).toContain('RAII');

    const card = kb.formatTeacherCard(item!, 'pedagogical');
    expect(card).toContain('std::make_unique');
    expect(card).toContain('std::move');
  });

  it('3. Rust completion: suggests Option<T> and explains Some/None', () => {
    const item = kb.findSymbol('rust', 'Option<T>');
    expect(item).toBeDefined();
    expect(item?.summary).toContain('Some');
    expect(item?.summary).toContain('None');

    const card = kb.formatTeacherCard(item!, 'pedagogical');
    expect(card).toContain('match');
    expect(card).toContain('if let');
  });

  it('4. Hover provider: formats concise mode without long explanations', () => {
    const item = kb.findSymbol('c', 'malloc')!;
    const conciseCard = kb.formatTeacherCard(item, 'concise');
    expect(conciseCard).toContain('الوظيفة:');
    expect(conciseCard).not.toContain('شرح سطرًا بسطر');
  });

  it('5. Hover provider: formats security mode focusing on memory CVEs', () => {
    const item = kb.findSymbol('c', 'malloc')!;
    const secCard = kb.formatTeacherCard(item, 'security');
    expect(secCard).toContain('Security Audit');
    expect(secCard).toContain('مخاطر الذاكرة');
    expect(secCard).toContain('Null Pointer Dereference');
  });

  it('6. Memory Analyzer: detects memory leak for malloc without free', () => {
    const code = `
    void test_leak() {
        int *data = malloc(100 * sizeof(int));
    }
    `;
    const findings = MemoryAnalyzer.analyzeDocument(code, 'c');
    expect(findings.length).toBeGreaterThan(0);
    const leak = findings.find((f) => f.id.startsWith('memleak-data'));
    expect(leak).toBeDefined();
    expect(leak?.title).toContain('تسرب ذاكرة');
    expect(leak?.confidence).toBe('Analyzer Warning');
    expect(leak?.quickFixTitle).toContain('free(data)');
  });

  it('7. Memory Analyzer: does not flag when free is properly called', () => {
    const code = `
    void test_clean() {
        int *data = malloc(100 * sizeof(int));
        if (data) {
            free(data);
            data = NULL;
        }
    }
    `;
    const findings = MemoryAnalyzer.analyzeDocument(code, 'c');
    const leak = findings.find((f) => f.id.startsWith('memleak-data'));
    expect(leak).toBeUndefined();
  });

  it('8. Memory Analyzer: detects Use-After-Free', () => {
    const code = `
    void test_uaf() {
        int *val = malloc(sizeof(int));
        *val = 42;
        free(val);
        printf("%d\\n", *val);
    }
    `;
    const findings = MemoryAnalyzer.analyzeDocument(code, 'c');
    const uaf = findings.find((f) => f.id.startsWith('uaf-val'));
    expect(uaf).toBeDefined();
    expect(uaf?.confidence).toBe('Confirmed');
    expect(uaf?.severity).toBe('Error');
  });

  it('9. Memory Analyzer: detects Double Free', () => {
    const code = `
    void test_df() {
        char *ptr = malloc(10);
        free(ptr);
        free(ptr);
    }
    `;
    const findings = MemoryAnalyzer.analyzeDocument(code, 'c');
    const df = findings.find((f) => f.id.startsWith('double-free-ptr'));
    expect(df).toBeDefined();
    expect(df?.confidence).toBe('Confirmed');
  });

  it('10. Memory Analyzer: flags insecure strcpy and offers snprintf quick fix', () => {
    const code = `
    void test_overflow(const char *input) {
        char buffer[32];
        strcpy(buffer, input);
    }
    `;
    const findings = MemoryAnalyzer.analyzeDocument(code, 'c');
    const overflow = findings.find((f) => f.id.startsWith('insecure-func-strcpy'));
    expect(overflow).toBeDefined();
    expect(overflow?.quickFixReplacement).toContain('snprintf');
  });

  it('11. C++ RAII check: flags raw new without smart pointers', () => {
    const code = `
    void test_cpp() {
        Widget *w = new Widget();
    }
    `;
    const findings = MemoryAnalyzer.analyzeDocument(code, 'cpp');
    const rawNew = findings.find((f) => f.id.startsWith('cpp-raw-new'));
    expect(rawNew).toBeDefined();
    expect(rawNew?.quickFixReplacement).toContain('std::make_unique');
  });

  it('12. Rust check: flags unnecessary unsafe block', () => {
    const code = `
    fn test_rust() {
        let x = 10;
        let y = unsafe { x + 5 };
    }
    `;
    const findings = MemoryAnalyzer.analyzeDocument(code, 'rust');
    const unsafeBlock = findings.find((f) => f.id.startsWith('rust-unnecessary-unsafe'));
    expect(unsafeBlock).toBeDefined();
    expect(unsafeBlock?.severity).toBe('Warning');
  });

  it('13. Language separation: C keywords not returned in Rust queries', () => {
    const cItemInRust = kb.findSymbol('rust', 'sizeof');
    expect(cItemInRust).toBeUndefined();

    const rustItemInC = kb.findSymbol('c', 'Option<T>');
    expect(rustItemInC).toBeUndefined();
  });
});
