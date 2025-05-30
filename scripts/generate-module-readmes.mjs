import fs from 'fs';
import path from 'path';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 모듈 디렉토리 찾기
const srcDir = path.join(__dirname, '../src');
const moduleDirectories = fs
  .readdirSync(srcDir, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name);

// 각 모듈 디렉토리에 대해
moduleDirectories.forEach(moduleDir => {
  const fullPath = path.join(srcDir, moduleDir);
  const readmePath = path.join(fullPath, 'README.md');
  
  // README가 이미 있다면 건너뛰기
  if (fs.existsSync(readmePath)) {
    console.log(`README already exists for ${moduleDir}`);
    return;
  }
  
  // 모듈 파일 찾기
  const moduleFile = fs.readdirSync(fullPath)
    .find(file => file.endsWith('.module.ts'));
  
  if (!moduleFile) {
    console.log(`No module file found in ${moduleDir}`);
    return;
  }
  
  // 컨트롤러 파일 찾기
  const controllerFiles = fs.readdirSync(fullPath)
    .filter(file => file.endsWith('.controller.ts'));
  
  // 서비스 파일 찾기
  const serviceFiles = fs.readdirSync(fullPath)
    .filter(file => file.endsWith('.service.ts'));
  
  // README 내용 생성
  const readmeContent = `# ${moduleDir.charAt(0).toUpperCase() + moduleDir.slice(1)} 모듈

## 개요
${moduleDir} 기능과 관련된 모듈입니다.

## 구성요소

### 모듈
- \`${moduleFile}\`: 모듈 정의 및 종속성 설정

${controllerFiles.length > 0 ? `### 컨트롤러
${controllerFiles.map(file => `- \`${file}\`: API 엔드포인트 정의`).join('\n')}` : ''}

${serviceFiles.length > 0 ? `### 서비스
${serviceFiles.map(file => `- \`${file}\`: 비즈니스 로직 구현`).join('\n')}` : ''}

## 주요 기능
- [이곳에 주요 기능 설명 추가]

## 사용 예시
\`\`\`typescript
// 사용 예시 코드 추가
\`\`\`
`;

  // README 파일 작성
  fs.writeFileSync(readmePath, readmeContent);
  console.log(`Created README for ${moduleDir}`);
});