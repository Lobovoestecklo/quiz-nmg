# PDF Upload & Client-Side Parsing Feature Implementation Plan

## Overview
This plan outlines the steps to implement a client-side PDF upload and parsing feature in the application. The feature will allow users to select a PDF file via a new option in the chat input, have its content parsed *on the client*, and then immediately create a new document entry containing the extracted text using the existing `/api/document` endpoint.

**Goal:** Allow users to select a PDF via the chat input, trigger client-side text extraction using `pdfjs-dist`, and use the extracted text to create a new `document` (kind: 'text') via the `POST /api/document` route, which also posts an update message to the chat. **This plan focuses solely on the client-side parsing and triggering document creation; it does not involve database schema changes or separate file uploads.**

**Target Audience:** This plan is designed to be detailed enough for a developer, including a junior developer, to follow step-by-step. Where project-specific knowledge is needed, it provides guidance on how to find that information.

## Implementation Steps

**Status Overview:** Steps 1-3 Completed.

1.  **Dependencies:**
    *   **File:** `package.json`
    *   **Action:**
        *   Open the `package.json` file.
        *   Add `pdfjs-dist` to the `dependencies` section.
        *   Add `@types/pdfjs-dist` to the `devDependencies` section.
        *   Run `pnpm install` in your terminal to install the new packages.
    *   **Status:** Completed.

2.  **Constants:**
    *   **File:** `lib/constants.ts` (use the existing constants file or create if needed).
    *   **Action:**
        *   Define and export constants for PDF handling:
            ```typescript
            export const PDF_MIME_TYPE = 'application/pdf';
            export const PDF_EXTENSION = '.pdf';
            ```
    *   **Status:** Completed.

3.  **PDF.js Worker Configuration:**
    *   **Sub-step: Copy Worker File:**
        *   **File:** `next.config.ts`
        *   **Action:** Configure `copy-webpack-plugin` to copy `pdf.worker.min.mjs` (Note: filename is `.mjs`) to `/public`.
        *   **Status:** Completed.
    *   **Sub-step: Set `workerSrc`:**
        *   **File:** `app/_components/client-layout-wrapper.tsx` (Created)
        *   **Action:** Create a client component wrapper for layout children. Use `useEffect` to set `pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';`.
        *   **File:** `app/layout.tsx`
        *   **Action:** Import and use `ClientLayoutWrapper` to wrap children. Removed `use client` and `useEffect` from `RootLayout` itself.
        *   **Status:** Completed.

4.  **PDF Parsing Utility:**
    *   **File:** Create `lib/utils/pdf-parser.ts`.
    *   **Action:** Implement and export the `extractTextFromPdf` function.
    *   **Status:** Pending.

5.  **Multimodal Input Component & Document Creation:**
    *   **File:** `components/multimodal-input.tsx`
    *   **Action:** Modify the component to handle the new PDF option, parse the file, and call the document creation API.
        *   **Sub-step: Add New Dropdown Option:**
            *   Locate the `AttachmentsButton` component and the `DropdownMenu` structure within it (likely uses `<DropdownMenuTrigger>`, `<DropdownMenuContent>`, `<DropdownMenuItem>`).
            *   Add a new `<DropdownMenuItem>` for "Вставить pdf файл".
            *   In the `onSelect` handler for this new item, trigger a click on a hidden file input specifically configured for PDFs.
                ```typescript
                // Inside AttachmentsButton component...
                 const pdfInputRef = useRef<HTMLInputElement>(null); // Add a separate ref for PDF input

                 // Needed props passed down from parent (e.g., Chat component)
                 // const { chatId, messages, setMessages } = props;
                 // Ensure generateUUID is imported or available
                 // import { generateUUID } from '@/lib/utils';

                 // ... later in the JSX ...

                 {/* Hidden input specifically for PDF selection */}
                 <input
                    type="file"
                    ref={pdfInputRef}
                    className="hidden" // Keep it hidden
                    accept={PDF_MIME_TYPE + ',' + PDF_EXTENSION} // Accept only PDF
                    onChange={handlePdfFileChange} // Use the dedicated handler
                    multiple={false} // Handle one PDF at a time
                 />

                 // ... inside DropdownMenuContent ...
                 <DropdownMenuItem
                    onSelect={() => {
                      setOpen(false); // Close dropdown
                      startTransition(() => {
                          pdfInputRef.current?.click(); // Trigger the dedicated PDF input
                      });
                    }}
                    asChild
                  >
                    {/* Button/content for "Вставить pdf файл" */}
                    <button type="button" className="...">
                       <div>Вставить pdf файл</div>
                       <div className="text-xs text-muted-foreground">Текст будет извлечен и сохранен</div>
                    </button>
                  </DropdownMenuItem>
                ```
        *   **Sub-step: Modify File Input `accept`:**
            *   Review the `accept` attribute of any *other* file inputs (like `fileInputRef` for image attachments) to ensure they don't unintentionally trigger the PDF flow.
        *   **Sub-step: Implement PDF File Handler (`handlePdfFileChange`):**
            *   Create a new async function (e.g., `handlePdfFileChange`) triggered by the `onChange` of the dedicated PDF input (`pdfInputRef`). This function will need access to `chatId` and `setMessages` from component props (passed down from `useChat`).
            *   Inside this handler:
                1.  Get the selected `File` object. Validate it's a single PDF.
                2.  **Show Loading State:** Indicate processing, e.g., using a `toast.loading()` notification.
                3.  **Step 1: Parse (Client-side):** Call `extractTextFromPdf(file)`. Await the extracted text. Handle parsing errors (show error toast, stop loading).
                ```typescript
                 // Example start of handlePdfFileChange
                 const handlePdfFileChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
                    const file = event.target.files?.[0];
                    if (!file || file.type !== PDF_MIME_TYPE) {
                        toast.error('Пожалуйста, выберите PDF файл.');
                        return;
                    }
                    event.target.value = ''; // Reset input

                    const loadingToastId = toast.loading(`Извлечение текста из ${file.name}...`);

                    let extractedText: string | null = null;
                    try {
                       extractedText = await extractTextFromPdf(file);
                    } catch (error) {
                        console.error("Parsing error:", error);
                        toast.error('Ошибка извлечения текста из PDF.', { id: loadingToastId });
                        return; // Stop processing
                    }

                    if (extractedText === null || extractedText.trim() === '') {
                         toast.error('Не удалось извлечь текст или PDF пустой.', { id: loadingToastId });
                         return;
                    }
                    // Parsing successful, proceed to document creation...
                    toast.loading('Сохранение документа... ', { id: loadingToastId });

                 }, [chatId, setMessages /* other dependencies */]);
                ```
                4.  **Step 2: Create Document via API:** Call `POST /api/document`. Generate a new UUID for the document `id` client-side.
                    *   The API endpoint needs the `id`, `chatId` and `is_manual=1` as query parameters.
                    *   The body should contain `content: extractedText`, `title: file.name` (or a derived title), and `kind: 'text'`. The `description` might be added automatically by the API if `is_manual=1`.
                    *   Handle API call errors (update toast). Await the response.
                ```typescript
                 // ... continuing handlePdfFileChange ...
                 const documentId = generateUUID(); // Generate ID client-side
                 try {
                    const response = await fetch(`/api/document?id=${documentId}&chatId=${chatId}&is_manual=1`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        content: extractedText,
                        title: file.name || 'Загруженный PDF',
                        kind: 'text',
                        // description might be added by API for is_manual=1
                      }),
                    });

                    if (!response.ok) {
                       const errorData = await response.json().catch(() => ({})); // Try to get error details
                       throw new Error(errorData.error || `Failed to create document (${response.status})`);
                    }

                    const result = await response.json();
                    // Document created successfully

                    // The API for is_manual=1 should return the messageParts
                    if (result.messageId && result.messageParts) {
                        // Add the assistant message (containing the tool result) to the chat
                        const assistantMessage: UIMessage = {
                           id: result.messageId,
                           role: 'assistant',
                           display: result.messageParts, // API returns parts ready for display
                           createdAt: new Date(),
                           // Add other necessary fields if any
                        };
                        setMessages(currentMessages => [...currentMessages, assistantMessage]);
                        toast.success('Документ успешно создан и добавлен в чат.', { id: loadingToastId });
                    } else {
                       // Fallback if API doesn't return message details as expected
                       toast.success('Документ успешно создан.', { id: loadingToastId });
                       console.warn('API did not return message details for automatic chat update.');
                    }

                 } catch (error) {
                     console.error("Document creation error:", error);
                     toast.error(`Ошибка сохранения документа: ${error.message}`, { id: loadingToastId });
                 }

                }, [chatId, setMessages /* other dependencies */]); // End of handlePdfFileChange
                ```
        *   **Sub-step: Remove Attachment Logic:** Since the PDF content is processed immediately into a document, remove any logic that adds the PDF file or its extracted text to the `attachments` state managed by `useState<Array<Attachment>>`. This state is likely only needed for image uploads or other attachment types that *are* sent with the user's next message.

6.  **Integration & Verification:**
    *   **Files:** `components/multimodal-input.tsx`, `app/(chat)/api/document/route.ts`, Database (`Document`, `Message_v2` tables).
    *   **Action:**
        *   **Verify API Call:**
            1.  Use browser dev tools (Network tab) to inspect the `POST /api/document?id=...&chatId=...&is_manual=1` request when a PDF is processed.
            2.  Confirm the request body contains the correct `content` (extracted text), `title`, and `kind: 'text'`.
            3.  Verify the API response is successful (status 200) and contains the expected document data and message details (`messageId`, `messageParts`).
        *   **Verify Database State:**
            1.  Use DBeaver or similar to query the `Document` table. Confirm a new row exists with the generated `id`, correct `userId`, `kind='text'`, `title`, and the full `content` matching the extracted PDF text.
            2.  Query the `Message_v2` table for the `chatId`. Confirm a new assistant message exists with the `messageId` returned by the API, `role='assistant'`, and `parts` matching the `messageParts` from the API response (which should include the `tool-invocation` for `updateDocument`).
        *   **Verify UI Update:**
            1.  Confirm that after the processing finishes, a new assistant message appears in the chat UI, indicating the document update (as generated by `createDocumentUpdateMessage` in the API route).

This updated plan focuses on the client-side workflow using direct document creation via the existing API. Remember to commit changes frequently and test each step!

## Implementation Notes & Deviations (Steps 1-3)

*   **Build Verification Issues:** Encountered build failures while verifying Step 3.
    *   **`metadata` Export:** Resolved by moving the client-side `useEffect` for `workerSrc` from `app/layout.tsx` (which needs to export `metadata` as a Server Component) into a new dedicated client component `app/_components/client-layout-wrapper.tsx`.
    *   **Worker Filename:** The correct worker filename was `pdf.worker.min.mjs`, not `.js`. Updated paths in `next.config.ts` and `client-layout-wrapper.tsx`.
    *   **`@ai-sdk/ui-utils` Type Conflict:** Resolved a persistent type error caused by the `ai` package pulling in an older version of `@ai-sdk/ui-utils` (`1.2.0`) conflicting with the version required by `@ai-sdk/react` (`1.2.4`). Steps taken:
        1.  Aligned `@ai-sdk/*` dependencies to `^1.2.3` in `package.json`.
        2.  Performed a clean install (`rm -rf node_modules pnpm-lock.yaml && pnpm install`).
        3.  Updated the `ai` package from `4.2.0` to `^4.2.11` in `package.json`.
        4.  Ran `pnpm install` again. This successfully aligned all relevant dependencies to `@ai-sdk/ui-utils@1.2.4`.
    *   **`DOMMatrix` Prerender Error:** The build now passes compilation and type checking but fails during prerendering due to `ReferenceError: DOMMatrix is not defined` originating from the `/_not-found` page. This appears unrelated to the PDF feature and does not block further implementation steps for now. It should be investigated separately.

## Implementation Process & Testing Strategy

Follow these guidelines for a smooth implementation:

**1. Sequential Implementation:**
   *   Implement the steps in the order outlined above. Each step builds upon the previous ones.
   *   Verify each step works before proceeding to the next (e.g., ensure the PDF worker is correctly configured and loaded before implementing the parsing utility).

**2. Atomic Commits:**
   *   Make small, logical commits after completing each major step or sub-step.
   *   Use clear commit messages that describe the change (e.g., "feat: add pdfjs-dist dependency", "chore: configure pdfjs worker in next.config", "feat: implement pdf parsing utility", "feat: add PDF dropdown option to multimodal input", "feat: implement PDF parsing and document creation flow").
   *   This makes reviewing changes easier and allows for simpler rollbacks if needed.

**3. Testing Strategy:**
   *   **Unit Testing:**
      *   Write unit tests for the `extractTextFromPdf` utility function (`lib/utils/pdf-parser.ts`). Mock `pdfjs-dist` or use sample PDF data (if feasible in the testing environment) to test successful parsing and error handling (e.g., for corrupted files).
   *   **Component Testing:**
      *   Write tests for the modified `AttachmentsButton` / `MultimodalInput` (`components/multimodal-input.tsx`).
      *   Test the rendering of the new "Вставить pdf файл" dropdown item.
      *   Test the `handlePdfFileChange` function:
         *   Mock the `extractTextFromPdf` function.
         *   Mock the `fetch` call to `/api/document`.
         *   Verify that the correct API endpoint is called with the correct parameters and body.
         *   Verify loading states (e.g., toasts) are triggered.
         *   Verify `setMessages` is called correctly with the assistant message parts received from the mocked API response.
         *   Test error handling paths (parsing errors, API errors).
   *   **End-to-End (E2E) Testing:**
      *   Add an E2E test case (e.g., using Playwright if that's the project standard) that covers the full user flow:
         1.  Navigate to the chat page.
         2.  Click the paperclip icon.
         3.  Click the "Вставить pdf файл" option.
         4.  Upload a sample PDF file using the file chooser.
         5.  (Optional) Assert that a loading indicator/toast appears.
         6.  Assert that an appropriate success toast appears.
         7.  Assert that a new assistant message appears in the chat list, indicating the document creation/update (check for text like "Сценарий обновлен" or similar, based on `createDocumentUpdateMessage`).
         8.  (Optional) If the UI allows viewing documents, navigate to verify the created document's content matches the sample PDF's text.
   *   **Manual Testing:**
      *   Thoroughly test manually with various valid PDFs (different sizes, text layouts).
      *   Test with invalid or corrupted PDFs to ensure graceful error handling (e.g., clear error messages via toast).
      *   Test network error scenarios (e.g., using browser dev tools to simulate offline or failed API calls).

**4. Debugging:**
   *   Utilize `console.log` statements liberally during development to trace data flow (e.g., log the selected file, extracted text, API request body, API response).
   *   Use browser developer tools (Network tab, Console tab) extensively to inspect API calls, responses, and client-side errors.