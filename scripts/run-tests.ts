import { KnowledgeBase } from '../extension/src/knowledge/knowledgeBase';
import { MemoryAnalyzer } from '../extension/src/providers/memoryAnalyzer';
import { MentorMode } from '../extension/src/config/mentorConfig';

interface TestResult {
  name: string;
  passed: boolean;
  message?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, testName: string, failMsg?: string) {
  if (condition) {
    results.push({ name: testName, passed: true });
    console.log(`  ✅ PASS: ${testName}`);
  } else {
    results.push({ name: testName, passed: false, message: failMsg });
    console.error(`  ❌ FAIL: ${testName} - ${failMsg}`);
  }
}

async function runTestSuite() {
  console.log('==================================================');
  console.log('🧪 Running CodeMentor Automated Test Suite');
  console.log('==================================================\n');

  const kb = KnowledgeBase.getInstance();

  // Test 1: C malloc completion
  const mallocItem = kb.findSymbol('c', 'malloc');
  assert(
    !!mallocItem && mallocItem.summary.includes('حجز مساحة ذاكرة ديناميكية'),
    'Test 1: C keyword/stdlib completion for malloc with rich metadata'
  );

  // Test 2: Teacher card formatting
  const card = kb.formatTeacherCard(mallocItem!, 'pedagogical');
  assert(
    card.includes('ما هو هذا العنصر') && card.includes('مخاطر الذاكرة والأمان') && card.includes('free'),
    'Test 2: Teacher Card formatting with 10-point pedagogical breakdown'
  );

  // Test 3: C++ std::unique_ptr completion & RAII
  const uniquePtr = kb.findSymbol('cpp', 'std::unique_ptr');
  assert(
    Boolean(!!uniquePtr && uniquePtr.category?.includes('Smart Pointers') && uniquePtr.summary.includes('مؤشر ذكي')),
    'Test 3: C++ std::unique_ptr IntelliSense with RAII semantics'
  );

  // Test 4: Rust Option<T> completion
  const rustOpt = kb.findSymbol('rust', 'Option<T>');
  assert(
    !!rustOpt && rustOpt.summary.includes('Some') && rustOpt.summary.includes('None'),
    'Test 4: Rust Option<T> completion and enum pattern matching'
  );

  // Test 5: Mode toggling (Concise vs Security)
  const conciseCard = kb.formatTeacherCard(mallocItem!, 'concise');
  const secCard = kb.formatTeacherCard(mallocItem!, 'security');
  assert(
    Boolean(conciseCard.includes('الوظيفة:') && !conciseCard.includes('شرح سطرًا بسطر') && secCard.includes('Security Audit')),
    'Test 5: Mode adaptation (Pedagogical vs Concise vs Security)'
  );

  // Test 6: Memory Leak Detection in C
  const leakCode = `
    void test_leak() {
        int *data = malloc(100 * sizeof(int));
        // Missing free(data)
    }
  `;
  const leakFindings = MemoryAnalyzer.analyzeDocument(leakCode, 'c');
  const hasLeak = leakFindings.some((f) => f.id.startsWith('memleak-data') && f.confidence === 'Analyzer Warning');
  assert(hasLeak, 'Test 6: Memory Leak detection for malloc() lacking matching free()');

  // Test 7: Properly freed code does not trigger false positive
  const cleanCode = `
    void test_clean() {
        int *data = malloc(100 * sizeof(int));
        if (data) {
            free(data);
            data = NULL;
        }
    }
  `;
  const cleanFindings = MemoryAnalyzer.analyzeDocument(cleanCode, 'c');
  const cleanLeak = cleanFindings.some((f) => f.id.startsWith('memleak-data'));
  assert(!cleanLeak, 'Test 7: Clean code without leaks passes without false positives');

  // Test 8: Use-After-Free Detection
  const uafCode = `
    void test_uaf() {
        int *val = malloc(sizeof(int));
        *val = 42;
        free(val);
        printf("%d\\n", *val);
    }
  `;
  const uafFindings = MemoryAnalyzer.analyzeDocument(uafCode, 'c');
  const hasUaf = uafFindings.some((f) => f.id.startsWith('uaf-val') && f.confidence === 'Confirmed');
  assert(hasUaf, 'Test 8: Use-After-Free detection with Confirmed confidence');

  // Test 9: Double Free Detection
  const dfCode = `
    void test_df() {
        char *ptr = malloc(10);
        free(ptr);
        free(ptr);
    }
  `;
  const dfFindings = MemoryAnalyzer.analyzeDocument(dfCode, 'c');
  const hasDf = dfFindings.some((f) => f.id.startsWith('double-free-ptr') && f.confidence === 'Confirmed');
  assert(hasDf, 'Test 9: Double Free vulnerability detection');

  // Test 10: Insecure strcpy buffer overflow detection & Quick Fix
  const overflowCode = `
    void test_overflow(const char *input) {
        char buffer[32];
        strcpy(buffer, input);
    }
  `;
  const overflowFindings = MemoryAnalyzer.analyzeDocument(overflowCode, 'c');
  const hasOverflow = overflowFindings.some((f) => f.id.startsWith('insecure-func-strcpy') && f.quickFixReplacement?.includes('snprintf'));
  assert(hasOverflow, 'Test 10: Insecure buffer copy (strcpy) flagged with snprintf Quick Fix');

  // Test 11: C++ RAII check for raw new
  const cppRawCode = `
    void test_cpp() {
        Widget *w = new Widget();
    }
  `;
  const cppFindings = MemoryAnalyzer.analyzeDocument(cppRawCode, 'cpp');
  const hasRawNew = cppFindings.some((f) => f.id.startsWith('cpp-raw-new') && f.quickFixReplacement?.includes('std::make_unique'));
  assert(hasRawNew, 'Test 11: C++ RAII violation (raw new) flagged with std::make_unique Quick Fix');

  // Test 12: Rust unnecessary unsafe detection
  const rustUnsafeCode = `
    fn test_rust() {
        let x = 10;
        let y = unsafe { x + 5 };
    }
  `;
  const rustFindings = MemoryAnalyzer.analyzeDocument(rustUnsafeCode, 'rust');
  const hasUnsafe = rustFindings.some((f) => f.id.startsWith('rust-unnecessary-unsafe'));
  assert(hasUnsafe, 'Test 12: Rust unnecessary unsafe block detected with Suspicion for Review');

  // Test 13: Language isolation
  const cInRust = kb.findSymbol('rust', 'sizeof');
  const rustInC = kb.findSymbol('c', 'Option<T>');
  assert(!cInRust && !rustInC, 'Test 13: Strict language isolation between C, C++, and Rust rules');

  console.log('\n==================================================');
  const passedCount = results.filter((r) => r.passed).length;
  console.log(`📊 Test Results: ${passedCount}/${results.length} PASSED`);
  console.log('==================================================\n');

  if (passedCount !== results.length) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
