# 📋 Hướng dẫn CI/CD: Jest + GitHub Actions + SonarCloud

> **Dự án:** ScrapTech Mobile (React Native / Expo)  
> **Mục tiêu:** Tự động chạy Unit Test và phân tích chất lượng code mỗi khi push lên GitHub

---

## 📌 Mục lục

1. [Tổng quan hệ thống](#1-tổng-quan-hệ-thống)
2. [Jest & React Testing Library](#2-jest--react-testing-library)
3. [GitHub Actions CI/CD](#3-github-actions-cicd)
4. [SonarCloud — Phân tích chất lượng code](#4-sonarcloud--phân-tích-chất-lượng-code)
5. [Luồng hoạt động end-to-end](#5-luồng-hoạt-động-end-to-end)
6. [Các lỗi thường gặp & cách fix](#6-các-lỗi-thường-gặp--cách-fix)

---

## 1. Tổng quan hệ thống

```
Developer push code
        │
        ▼
┌─────────────────────┐
│   GitHub Actions    │  ← Tự động trigger khi push lên main/develop
│                     │
│  1. npm install     │
│  2. jest --coverage │  ← Chạy test, sinh lcov.info
│  3. sonar-scanner   │  ← Gửi kết quả lên SonarCloud
└─────────────────────┘
        │
        ▼
┌─────────────────────┐
│     SonarCloud      │  ← Dashboard phân tích code
│                     │
│  • Coverage %       │
│  • Bugs             │
│  • Code Smells      │
│  • Quality Gate     │
└─────────────────────┘
```

---

## 2. Jest & React Testing Library

### 2.1 Jest là gì?

**Jest** là framework testing phổ biến nhất cho JavaScript/TypeScript.  
Dùng để viết và chạy **Unit Test** — kiểm tra từng component/hàm hoạt động đúng không.

### 2.2 React Testing Library là gì?

**@testing-library/react-native** giúp render component React Native trong môi trường test và tìm kiếm các phần tử UI theo cách người dùng thực tế tương tác.

### 2.3 Cấu trúc file test

```
ScrapTech/
├── __tests__/
│   ├── HomeScreen.test.tsx       ← Test cho MyOrdersScreen
│   ├── OnboardingScreen.test.tsx ← Test cho Onboarding1Screen
│   └── SETUP_GUIDE.md            ← File này
├── __mocks__/
│   ├── fileMock.js               ← Mock file ảnh/font
│   └── expoWinterMock.js         ← Mock Expo runtime
├── jest.config.js                ← Cấu hình Jest
└── jest.setup.js                 ← Setup trước khi test chạy
```

### 2.4 Cấu hình Jest (`jest.config.js`)

```js
module.exports = {
  preset: "jest-expo",           // Dùng preset của Expo

  // Bỏ qua native modules, chỉ transform code cần thiết
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native|expo|@expo|expo-router))"
  ],

  moduleNameMapper: {
    "^expo/src/winter(.*)$": "<rootDir>/__mocks__/expoWinterMock.js", // Fix Expo ESM
    "^@/(.*)$": "<rootDir>/$1",                                        // Alias @/
    "\\.(png|jpg|svg)$": "<rootDir>/__mocks__/fileMock.js"            // Mock ảnh
  },

  setupFiles: ["<rootDir>/jest.setup.js"],

  // Đo coverage cho app/ và src/
  collectCoverageFrom: [
    "app/**/*.{ts,tsx}",
    "src/**/*.{ts,tsx}",
    "!**/*.d.ts",
    "!**/node_modules/**"
  ],
  coverageReporters: ["lcov", "text", "text-summary"],  // lcov cho SonarCloud
  coverageDirectory: "coverage",
};
```

### 2.5 Viết Unit Test cơ bản

```tsx
// __tests__/MyComponent.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import MyComponent from '../app/MyComponent';

// Mock các dependency bên ngoài
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

describe('MyComponent', () => {

  // Test 1: Render không crash
  it('render thành công', () => {
    const { getByText } = render(<MyComponent />);
    expect(getByText('Hello')).toBeTruthy();
  });

  // Test 2: Kiểm tra tương tác
  it('bấm nút không crash', () => {
    const { getByText } = render(<MyComponent />);
    expect(() => fireEvent.press(getByText('Bấm'))).not.toThrow();
  });

  // Test 3: Kiểm tra dữ liệu async (Supabase)
  it('hiển thị tên từ API', async () => {
    const { getByText } = render(<MyComponent />);
    await waitFor(() => {
      expect(getByText('Trần Văn Mạnh')).toBeTruthy();
    });
  });
});
```

### 2.6 Mock Supabase trong test

```tsx
// Mock toàn bộ module @/src/api
jest.mock('@/src/api', () => ({
  supabase: {
    from: jest.fn((table) => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { full_name: 'Trần Văn Mạnh' },
        error: null,
      }),
    })),
  },
}));
```

### 2.7 Chạy test

```bash
# Chạy tất cả test
npx jest

# Chạy với coverage
npx jest --coverage

# Chạy 1 file test cụ thể
npx jest __tests__/HomeScreen.test.tsx

# Chạy watch mode (tự động re-run khi thay đổi)
npx jest --watch
```

### 2.8 Đọc kết quả coverage

```
File                  | % Stmts | % Branch | % Funcs | % Lines
----------------------|---------|----------|---------|--------
MyOrdersScreen.tsx    |   92.75 |    53.12 |     100 |   93.93  ← Tốt
Onboarding1Screen.tsx |     100 |      100 |     100 |     100  ← Xuất sắc
```

| Màu | Ý nghĩa |
|-----|---------|
| 🟢 Xanh (dòng code) | Được test chạy qua |
| 🔴 Đỏ (dòng code) | Chưa được test |

---

## 3. GitHub Actions CI/CD

### 3.1 GitHub Actions là gì?

**GitHub Actions** là hệ thống CI/CD tích hợp trong GitHub.  
Mỗi khi bạn **push code**, nó tự động chạy các bước được cấu hình trong file YAML.

### 3.2 File workflow (`.github/workflows/ci.yml`)

```yaml
name: CI — Test & SonarCloud Analysis

on:
  push:
    branches: [main, develop]     # Trigger khi push lên main hoặc develop
  pull_request:
    branches: [main]              # Trigger khi tạo Pull Request vào main

jobs:
  test-and-analyze:
    runs-on: ubuntu-latest        # Chạy trên máy ảo Ubuntu

    steps:
      # Bước 1: Lấy code về
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0          # Lấy toàn bộ git history (SonarCloud cần)

      # Bước 2: Setup Node.js 20
      - name: Setup Node.js 20
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      # Bước 3: Cài đặt dependencies
      - name: Install dependencies
        run: npm install --legacy-peer-deps   # --legacy-peer-deps để tránh conflict

      # Bước 4: Chạy Jest và sinh coverage
      - name: Run Jest with coverage
        run: npx jest --coverage --coverageReporters=lcov --passWithNoTests
        env:
          EXPO_PUBLIC_SUPABASE_URL: https://placeholder.supabase.co
          EXPO_PUBLIC_SUPABASE_KEY: placeholder_key

      # Bước 5: Upload coverage artifact (xem được trên GitHub)
      - name: Upload coverage report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage-report
          path: coverage/lcov.info
          retention-days: 7

      # Bước 6: Cài sonar-scanner
      - name: Install SonarQube Scanner
        run: npm install -g sonarqube-scanner

      # Bước 7: Gửi kết quả lên SonarCloud
      - name: SonarCloud Scan
        run: sonar-scanner
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}   # Tự động có sẵn
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}      # Phải tạo và thêm vào Secrets
          SONAR_HOST_URL: https://sonarcloud.io
```

### 3.3 Thêm SONAR_TOKEN vào GitHub Secrets

1. Vào SonarCloud → **My Account → Security → Generate Token**
2. Copy token
3. Vào GitHub repo → **Settings → Secrets and variables → Actions**
4. Click **New repository secret**
5. Name: `SONAR_TOKEN`, Value: dán token vừa copy
6. Click **Add secret**

### 3.4 Xem kết quả Actions

```
GitHub → Repository → Tab "Actions"
→ Click vào run mới nhất
→ Xem từng step ✅/❌
```

---

## 4. SonarCloud — Phân tích chất lượng code

### 4.1 SonarCloud là gì?

**SonarCloud** là dịch vụ phân tích chất lượng code trên cloud (miễn phí cho public repo).  
Nó phát hiện: **Bugs, Code Smells, Security issues, Coverage thấp, Duplicated code**.

### 4.2 Cấu hình (`sonar-project.properties`)

```properties
# Định danh dự án — phải khớp với trên SonarCloud
sonar.projectKey=Flappy-Devs_ScrapTech
sonar.organization=flappy-devs

sonar.projectName=ScrapTech Mobile
sonar.projectVersion=1.0.0

# Thư mục source code
sonar.sources=app,src

# File test
sonar.tests=__tests__
sonar.test.inclusions=**/__tests__/**/*.test.tsx,**/__tests__/**/*.test.ts

# Bỏ qua các thư mục không cần phân tích
sonar.exclusions=**/node_modules/**,**/coverage/**,**/*.d.ts,**/assets/**

# Coverage report từ Jest
sonar.javascript.lcov.reportPaths=coverage/lcov.info

# Encoding
sonar.sourceEncoding=UTF-8
```

### 4.3 Thiết lập SonarCloud lần đầu

1. Đăng nhập tại [sonarcloud.io](https://sonarcloud.io) bằng GitHub
2. Click **+ → Analyze new project**
3. Chọn repository **`Flappy-Devs/ScrapTech`**
4. Chọn phương thức: **"With GitHub Actions"** (KHÔNG dùng Automatic Analysis)
5. Copy **Project Key** → điền vào `sonar-project.properties`
6. Tạo **SONAR_TOKEN** → thêm vào GitHub Secrets

> ⚠️ **Quan trọng:** Phải tắt "Automatic Analysis" trong  
> `SonarCloud → Administration → Analysis Method`  
> Nếu bật cả 2 (Automatic + CI), SonarCloud sẽ báo lỗi conflict.

### 4.4 Đọc dashboard SonarCloud

| Metric | Ý nghĩa | Mức tốt |
|--------|---------|---------|
| **Quality Gate** | Passed/Failed — tổng đánh giá | Passed ✅ |
| **Coverage** | % code được test | > 80% |
| **Bugs** | Lỗi logic trong code | 0 |
| **Code Smells** | Code khó đọc/bảo trì | Ít nhất |
| **Duplications** | % code bị lặp | < 3% |
| **Security Hotspots** | Điểm cần kiểm tra bảo mật | 0 |

### 4.5 Rating A/B/C/D/E

| Rating | Ý nghĩa |
|--------|---------|
| 🟢 **A** | Xuất sắc |
| 🟡 **B** | Tốt |
| 🟠 **C** | Trung bình |
| 🔴 **D** | Kém |
| ⚫ **E** | Rất kém |

---

## 5. Luồng hoạt động end-to-end

```
1. Developer viết code + test
        │
        ▼
2. git push lên GitHub
        │
        ▼
3. GitHub Actions tự động trigger
   ├── npm install --legacy-peer-deps
   ├── npx jest --coverage          → sinh coverage/lcov.info
   └── sonar-scanner                → đọc lcov.info + gửi lên SonarCloud
        │
        ├── ✅ Tất cả bước xanh → Pipeline PASSED
        └── ❌ Có bước đỏ      → Pipeline FAILED → xem log để fix
        │
        ▼
4. SonarCloud xử lý và hiển thị
   → https://sonarcloud.io/dashboard?id=Flappy-Devs_ScrapTech
        │
        ├── Quality Gate Passed ✅ → Code đạt tiêu chuẩn
        └── Quality Gate Failed ❌ → Cần fix issues
```

---

## 6. Các lỗi thường gặp & cách fix

### Lỗi 1: `npm ci` fail do peer dependencies

```
npm warn Could not resolve dependency: peer react@"^16.8.0"
```

**Fix:** Dùng `npm install --legacy-peer-deps` thay vì `npm ci`

---

### Lỗi 2: `import.meta` trong Jest

```
ReferenceError: You are trying to `import` a file outside of the scope
  at expo/src/winter/installGlobal.ts
```

**Fix:** Thêm vào `jest.config.js`:
```js
moduleNameMapper: {
  "^expo/src/winter(.*)$": "<rootDir>/__mocks__/expoWinterMock.js",
}
```
Và tạo `__mocks__/expoWinterMock.js`:
```js
module.exports = {};
```

---

### Lỗi 3: `Automatic Analysis` conflict

```
ERROR: You are running CI analysis while Automatic Analysis is enabled.
```

**Fix:** Vào SonarCloud → project → **Administration → Analysis Method** → tắt **Automatic Analysis** toggle

---

### Lỗi 4: Node.js version không tương thích

```
ERROR: SyntaxError: Invalid regular expression flags
ERROR: Node.js v18.20.1
```

**Fix:** Dùng `sonarqube-scanner` npm thay vì Docker action:
```yaml
- run: npm install -g sonarqube-scanner
- run: sonar-scanner
```

---

### Lỗi 5: `Can't access .root on unmounted test renderer`

```
Can't access .root on unmounted test renderer
```

**Fix:** KHÔNG render trong `act()` với biến ngoài scope.  
Dùng pattern đúng:
```tsx
// ❌ SAI
let component;
await act(async () => { component = render(<Screen />); });
component.getByText('...');  // lỗi!

// ✅ ĐÚNG
const { getByText } = render(<Screen />);
await waitFor(() => { expect(getByText('...')).toBeTruthy(); });
```

---

### Lỗi 6: GitHub Actions bị locked (billing)

```
The job was not started because your account is locked due to a billing issue.
```

**Fix:** Owner của GitHub Organization cần cập nhật thông tin thanh toán tại:  
`github.com/organizations/[org-name]/settings/billing`

---