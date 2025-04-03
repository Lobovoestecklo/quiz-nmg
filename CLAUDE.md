# Scenario Coach Development Guidelines

## Commands
- `pnpm dev` - Start development server with turbo
- `pnpm build` - Run DB migrations and build the app
- `pnpm lint` - Run Next.js linter and Biome linter
- `pnpm lint:fix` - Fix linting issues
- `pnpm format` - Format code with Biome
- `pnpm test` - Run all Playwright tests
- `pnpm exec playwright test tests/chat.test.ts` - Run a single test

## Code Style
- **TypeScript**: Use strict mode, proper typing
- **Formatting**: 2 spaces, 80 chars max line width, single quotes for JS/TS
- **Imports**: Use absolute imports with '@/' alias
- **Components**: Use functional components with proper typing
- **Error Handling**: Use try/catch with proper error reporting
- **State Management**: Prefer React hooks and context for state
- **Naming**: camelCase for variables/functions, PascalCase for components/types
- **Testing**: Use Playwright for E2E tests

## Database
- Use `pnpm db:migrate` to run migrations
- Use Drizzle ORM for database interactions

## Chat & Document Architecture
- **Chat System**: Uses @ai-sdk/react hooks and Drizzle ORM for data persistence
- **Message Flow**: Messages saved via saveMessages, displayed with Messages component
- **Document Creation**: AI tools (createDocument, updateDocument, getDocument) create and modify documents
- **Documents Types**: Multiple document types supported (text, code, sheet, pdf)
- **Real-time Updates**: DataStreamWriter enables streaming document updates to client
- **Key Components**: Chat, Message, Document, TextEditor, CodeEditor
- **Artifacts**: Document content and metadata stored as artifacts with visibility settings
- **PDF Support**: Upload, parse and extract text from PDFs using pdfjs-dist library

## PDF Feature Implementation
- **Library**: pdfjs-dist for client-side PDF parsing
- **Text Extraction**: Extract text from each page of PDF documents
- **Worker Setup**: Configure PDF.js worker path in Next.js config
- **Previous Implementation**: Based on scenario-dialog.tsx and pdfLoader.ts from original project

### Implementation Tasks
1. **Create New Files**:
   - `lib/utils/pdf-parser.ts` - PDF parsing utility with client & server functions
   - Potentially `components/pdf-viewer.tsx` - Dedicated PDF display component

2. **Update Existing Files**:
   - `app/(chat)/api/files/upload/route.ts` - Handle PDF file uploads
   - `components/document-preview.tsx` - Display PDF content
   - `components/multimodal-input.tsx` - Accept PDF file types (.pdf)
   - `package.json` - Add pdfjs-dist dependency

3. **Key Functions Needed**:
   - Client-side PDF text extraction (similar to handlePdfUpload in previous version)
   - Optional server-side PDF handling with Base64 encoding (like loadPdfAsBase64)