#!/usr/bin/env python3
import os
import zipfile
import json
import hashlib

def create_vsix(output_path="codementor-native-1.0.0.vsix"):
    print(f"[*] Packaging CodeMentor VSIX into: {output_path}")
    
    vsix_manifest = """<?xml version="1.0" encoding="utf-8"?>
<PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011" xmlns:d="http://schemas.microsoft.com/developer/vsx-schema-design/2011">
  <Metadata>
    <Identity Id="codementor-native" Version="1.0.0" Publisher="codementor" Language="en-US" />
    <DisplayName>CodeMentor - C, C++ &amp; Rust Assistant</DisplayName>
    <Description xml:space="preserve">Interactive mentor-style IntelliSense, memory leak analysis, hover teacher cards, and real-time quick fixes for C, C++, and Rust in Visual Studio Code.</Description>
    <Tags>c,cpp,c++,rust,intellisense,memory-leak,raii,mentor,pedagogical</Tags>
    <Categories>Programming Languages,Linters,Snippets,Education</Categories>
    <GalleryFlags>Public</GalleryFlags>
    <Properties>
      <Property Id="Microsoft.VisualStudio.Code.Engine" Value="^1.85.0" />
      <Property Id="Microsoft.VisualStudio.Code.ExtensionDependencies" Value="" />
      <Property Id="Microsoft.VisualStudio.Code.ExtensionPack" Value="" />
      <Property Id="Microsoft.VisualStudio.Code.LocalizedLanguages" Value="" />
    </Properties>
    <License>extension/LICENSE</License>
  </Metadata>
  <Installation>
    <InstallationTarget Id="Microsoft.VisualStudio.Code" />
  </Installation>
  <Dependencies />
  <Assets>
    <Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="extension/package.json" Addressable="true" />
    <Asset Type="Microsoft.VisualStudio.Services.Content.Details" Path="extension/README.md" Addressable="true" />
    <Asset Type="Microsoft.VisualStudio.Services.Content.Changelog" Path="extension/CHANGELOG.md" Addressable="true" />
    <Asset Type="Microsoft.VisualStudio.Services.Content.License" Path="extension/LICENSE" Addressable="true" />
  </Assets>
</PackageManifest>"""

    content_types = """<?xml version="1.0" encoding="utf-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="json" ContentType="application/json" />
  <Default Extension="js" ContentType="application/javascript" />
  <Default Extension="ts" ContentType="application/typescript" />
  <Default Extension="md" ContentType="text/markdown" />
  <Default Extension="txt" ContentType="text/plain" />
  <Default Extension="png" ContentType="image/png" />
  <Default Extension="vsixmanifest" ContentType="text/xml" />
  <Override PartName="/extension.vsixmanifest" ContentType="text/xml" />
  <Override PartName="/[Content_Types].xml" ContentType="application/xml" />
</Types>"""

    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    extension_dir = os.path.join(base_dir, "extension")
    
    with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as zf:
        # 1. Root XML manifest files
        zf.writestr("[Content_Types].xml", content_types)
        zf.writestr("extension.vsixmanifest", vsix_manifest)
        
        # 2. Add all extension files under 'extension/'
        files_to_pack = [
            ("extension/package.json", "package.json"),
            ("extension/dist/extension.js", "dist/extension.js"),
            ("extension/README.md", "README.md"),
            ("extension/CHANGELOG.md", "../CHANGELOG.md"),
            ("extension/LICENSE", "LICENSE"),
            ("extension/knowledge/c/stdlib.json", "knowledge/c/stdlib.json"),
            ("extension/knowledge/c/keywords.json", "knowledge/c/keywords.json"),
            ("extension/knowledge/c/memory.json", "knowledge/c/memory.json"),
            ("extension/knowledge/cpp/stl.json", "knowledge/cpp/stl.json"),
            ("extension/knowledge/cpp/keywords.json", "knowledge/cpp/keywords.json"),
            ("extension/knowledge/cpp/memory_raii.json", "knowledge/cpp/memory_raii.json"),
            ("extension/knowledge/rust/std_types.json", "knowledge/rust/std_types.json"),
            ("extension/knowledge/rust/keywords.json", "knowledge/rust/keywords.json"),
            ("extension/knowledge/rust/ownership_borrowing.json", "knowledge/rust/ownership_borrowing.json"),
        ]
        
        for arc_name, rel_path in files_to_pack:
            real_path = os.path.normpath(os.path.join(extension_dir, rel_path))
            if os.path.exists(real_path):
                zf.write(real_path, arc_name)
                print(f"  + Added: {arc_name}")
            else:
                print(f"  ! Warning: missing {real_path}")

    # Copy to public folder as well so preview app can serve it directly
    public_copy = os.path.join(base_dir, "public", "codementor-native-1.0.0.vsix")
    with open(output_path, "rb") as src, open(public_copy, "wb") as dst:
        dst.write(src.read())

    # Calculate SHA256 checksum
    hasher = hashlib.sha256()
    with open(output_path, "rb") as f:
        hasher.update(f.read())
    sha256 = hasher.hexdigest()
    file_size = os.path.getsize(output_path)
    
    print(f"\n[SUCCESS] Built VSIX package: {output_path}")
    print(f"File Size: {file_size} bytes ({file_size / 1024:.2f} KB)")
    print(f"SHA256: {sha256}")
    
    # Save package info JSON
    info = {
        "fileName": "codementor-native-1.0.0.vsix",
        "fileSize": file_size,
        "sha256": sha256,
        "version": "1.0.0",
        "publisher": "codementor",
        "engine": "^1.85.0",
        "buildDate": "2026-10-14",
    }
    with open(os.path.join(base_dir, "public", "package-info.json"), "w") as f:
        json.dump(info, f, indent=2)

if __name__ == "__main__":
    create_vsix()
