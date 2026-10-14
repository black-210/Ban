cmake_minimum_required(VERSION 3.20)
project(CodeMentorNativeCore LANGUAGES C CXX)

set(CMAKE_C_STANDARD 11)
set(CMAKE_C_STANDARD_REQUIRED ON)
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Optional Native AST / Clang LibTooling analyzer engine
option(ENABLE_CLANG_ANALYZER "Build with LLVM/Clang LibTooling analyzer integration" OFF)

if(ENABLE_CLANG_ANALYZER)
    find_package(Clang REQUIRED CONFIG)
    message(STATUS "Found Clang ${CLANG_PACKAGE_VERSION}")
endif()

add_library(codementor_core STATIC
    native/src/memory_model.c
    native/src/raii_analyzer.cpp
)

target_include_directories(codementor_core PUBLIC
    native/include
)

# Test target
enable_testing()
add_executable(codementor_tests
    native/tests/test_memory_rules.cpp
)
target_link_libraries(codementor_tests PRIVATE codementor_core)
add_test(NAME CoreMemoryRuleTests COMMAND codementor_tests)
