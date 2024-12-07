<template>
  <div class="page-container">
    <header class="content-header">
      <div class="header-content">
        <div class="input-container">
          <button @click="showRawDiffModal = true" class="raw-diff-button">Raw Diff</button>
          <button @click="showFileModal = true" class="raw-diff-button">File Diff</button>
          <input
            v-model="prUrl"
            type="url"
            placeholder="Írd be a GitHub PR URL-t"
            class="pr-input"
            @keyup.enter="handleSubmit"
          />
          <button @click="handleSubmit" :disabled="!isValidUrl || loading" class="submit-button">
            {{ loading ? 'Betöltés...' : 'Betöltés' }}
          </button>
          <button
            @click="showCommentModal = true"
            class="test-button"
            :disabled="loading || !prDetails || !htmlDiff"
            v-tooltip="
              loading ? 'Betöltés folyamatban...' : !prDetails ? 'Először tölts be egy PR-t' : ''
            "
          >
            Add Comment
          </button>
        </div>
      </div>
    </header>

    <div class="analyze-section" v-if="htmlDiff">
      <button
        @click="analyzeDiff"
        class="analyze-button"
      >
        Elemzés
      </button>

      <!-- Progress Bar -->
      <div v-if="showProgressBar" class="simple-progress-container">
        <div class="simple-progress-bar">
          <div 
            class="simple-progress-fill"
            :style="{ width: `${progressValue}%` }"
          ></div>
        </div>
        <div class="simple-progress-text">{{ progressValue }}%</div>
      </div>
    </div>

    <div v-if="showRawDiffModal" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Raw Git Diff Bevitel</h3>
          <button class="close-button" @click="showRawDiffModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <textarea
            v-model="rawDiffText"
            class="raw-diff-textarea"
            placeholder="Másold ide a git diff szöveget..."
          ></textarea>
        </div>
        <div class="modal-footer">
          <button class="cancel-button" @click="showRawDiffModal = false">Mégse</button>
          <button
            class="submit-button"
            @click="handleRawDiffSubmit"
            :disabled="!rawDiffText.trim()"
          >
            Betöltés
          </button>
        </div>
      </div>
    </div>

    <div v-if="showCommentModal" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Add New Comment</h3>
          <button class="close-button" @click="showCommentModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="fileSelect">File:</label>
            <select id="fileSelect" v-model="selectedCommentFile" class="file-select" required>
              <option value="">Select a file</option>
              <option v-for="file in diffFiles" :key="file" :value="file">
                {{ file }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label for="lineNumber">Line Number:</label>
            <input
              type="number"
              id="lineNumber"
              v-model="newCommentLine"
              class="line-input"
              min="1"
            />
          </div>
          <div class="form-group">
            <label for="commentText">Comment:</label>
            <textarea
              id="commentText"
              v-model="newCommentText"
              class="comment-textarea"
              :placeholder="
                enableMarkdown
                  ? 'Enter your comment using Markdown...'
                  : 'Enter your comment here...'
              "
              rows="4"
            ></textarea>
            <div class="markdown-toggle">
              <label>
                <input type="checkbox" v-model="enableMarkdown" />
                Enable Markdown
              </label>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="cancel-button" @click="showCommentModal = false">Cancel</button>
          <button
            class="submit-button"
            @click="handleNewComment"
            :disabled="!selectedCommentFile || !newCommentLine || !newCommentText.trim()"
          >
            Add Comment
          </button>
        </div>
      </div>
    </div>

    <div v-if="showFileModal" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h3>File Diff Betöltése</h3>
          <button class="close-button" @click="showFileModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <input type="file" @change="handleFileSelect" accept=".diff,.patch,text/plain" />
        </div>
        <div class="modal-footer">
          <button class="cancel-button" @click="showFileModal = false">Mégse</button>
          <button class="submit-button" @click="handleFileLoad" :disabled="!selectedFile">
            Betöltés
          </button>
        </div>
      </div>
    </div>

    <p v-if="error" class="error-message">
      {{ error }}
    </p>

    <div v-if="prDetails" class="pr-details">
      <h2>{{ prDetails.title }}</h2>
      <p>Repository: {{ prDetails.repository }} | PR #{{ prDetails.number }}</p>
      <div ref="diffContainer" class="diff-container" v-html="htmlDiff"></div>
    </div>

    <!-- Nasus Avatar -->
    <div class="avatar-container">
      <img 
        src="@/assets/nasus.png" 
        alt="Nasus"
        class="avatar-image"
      >
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { fetchPullRequestDiff } from '@/services/githubService'
import { html, parse } from 'diff2html'
import 'diff2html/bundles/css/diff2html.min.css'
import { marked } from 'marked'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'
import gitDiffParser from 'gitdiff-parser'
import {
  createPatchesFromDiff,
  isHunkIsTooLarge,
  parseReviewResponse,
  reviewFileDiff,
} from '@/services/ai-pr-review/review.ts'

// Marked renderer létrehozása és testreszabása
const renderer = new marked.Renderer()
const originalCodeRenderer = renderer.code.bind(renderer)

renderer.code = (code, language) => {
  // Ha van megadott nyelv és a highlight.js támogatja
  if (language && hljs.getLanguage(language)) {
    try {
      const highlightedCode = hljs.highlight(code, {
        language,
        ignoreIllegals: true,
      }).value
      return `<pre><code class="hljs language-${language}">${highlightedCode}</code></pre>`
    } catch (e) {
      console.warn('Highlight.js error:', e)
    }
  }

  // Ha nincs nyelv megadva vagy nem támogatott
  try {
    const autoHighlighted = hljs.highlightAuto(code).value
    return `<pre><code class="hljs">${autoHighlighted}</code></pre>`
  } catch (e) {
    console.warn('Auto highlight error:', e)
    return originalCodeRenderer(code, language)
  }
}

// Marked beállítások
marked.setOptions({
  renderer: renderer,
  highlight: null, // Ne használja a beépített highlightot
  gfm: true,
  breaks: true,
  sanitize: false,
  smartLists: true,
  smartypants: true,
  xhtml: true,
})

// Refs
const prUrl = ref('')
const error = ref('')
const loading = ref(false)
const diffContainer = ref<HTMLElement | null>(null)

const prDetails = ref<{
  diff: string
  title: string
  number: number
  repository: string
} | null>(null)
const htmlDiff = ref('')

// Új ref-ek a modálhoz
const showCommentModal = ref(false)
const newCommentLine = ref('')
const newCommentText = ref('')
const enableMarkdown = ref(false)

// Új ref-ek a raw diff modalhoz
const showRawDiffModal = ref(false)
const rawDiffText = ref('')

// Új state-ek
const showFileModal = ref(false)
const selectedFile = ref<File | null>(null)

// Új state a fájl választóhoz
const selectedCommentFile = ref('')
const diffFiles = computed(() => {
  if (!diffContainer.value) return []

  const fileElements = diffContainer.value.querySelectorAll(
    '.d2h-wrapper .d2h-file-header .d2h-file-name',
  )
  const files: string[] = []

  fileElements.forEach((el) => {
    const fileName = el.innerHTML.trim()
    if (fileName && !files.includes(fileName)) {
      files.push(fileName)
    }
  })

  return files
})

// Computed properties
const isValidUrl = computed(() => {
  try {
    new URL(prUrl.value)
    return prUrl.value.includes('github.com') && prUrl.value.includes('/pull/')
  } catch {
    return false
  }
})

const isReadyForTest = computed(() => {
  return !loading.value && prDetails.value && htmlDiff.value
})

const handleSubmit = async () => {
  if (!isValidUrl.value) {
    error.value = 'Kérlek adj meg egy érvényes GitHub PR URL-t!'
    return
  }

  error.value = ''
  loading.value = true
  prDetails.value = null
  htmlDiff.value = ''

  try {
    prDetails.value = await fetchPullRequestDiff(prUrl.value)

    // Diff2html konvertálás
    const diffJson = parse(prDetails.value.diff)
    console.log(diffJson)
    htmlDiff.value = html(diffJson, {
      drawFileList: true,
      matching: 'lines',
      outputFormat: 'side-by-side',
      renderNothingWhenEmpty: false,
      colorScheme: 'light',
      highlightCode: true,
    })
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Hiba történt a PR betöltése közben'
  } finally {
    loading.value = false
  }
}

const insertCommentAfterLine = async (
  fileName: string,
  lineNumber: number,
  commentText: string,
  enableMarkdown: boolean = false,
) => {
  if (!isReadyForTest.value) return false

  try {
    await nextTick()
    const diffElement = diffContainer.value
    if (!diffElement) {
      console.error('Diff element not found')
      return false
    }

    // Keressük meg a megfelelő fájlt az új selector használatával
    const fileElements = diffElement.querySelectorAll('.d2h-wrapper .d2h-file-header')
    let targetFileElement: Element | null = null

    for (const fileEl of fileElements) {
      const fileNameEl = fileEl.querySelector('.d2h-file-name')
      if (fileNameEl && fileNameEl.innerHTML.includes(fileName)) {
        targetFileElement = fileEl.closest('.d2h-file-wrapper')
        break
      }
    }

    if (!targetFileElement) {
      console.error(`File not found: ${fileName}`)
      return false
    }

    // Megkeressük mindkét diff táblázatot a fájlon belül
    const fileDiffs = targetFileElement.querySelectorAll('.d2h-file-side-diff')
    const leftDiff = fileDiffs[0]
    const rightDiff = fileDiffs[1]

    if (!leftDiff || !rightDiff) {
      console.error('File diffs not found')
      return false
    }

    // Megkeressük mindkét tbody-t
    const leftTbody = leftDiff.querySelector('.d2h-diff-tbody')
    const rightTbody = rightDiff.querySelector('.d2h-diff-tbody')

    if (!leftTbody || !rightTbody) {
      console.error('Tbody elements not found')
      return false
    }

    // Keressük meg a megfelelő sorokat mindkét oldalon
    const leftRows = Array.from(leftTbody.querySelectorAll('tr'))
    const rightRows = Array.from(rightTbody.querySelectorAll('tr'))
    let targetLeftRow: Element | null = null
    let targetRightRow: Element | null = null
    let targetIndex = -1

    // Jobb oldali sor és index megkeresése
    rightRows.forEach((row, index) => {
      const lineNumberElement = row.querySelector('.d2h-code-side-linenumber')
      if (lineNumberElement) {
        const currentLineNumber = lineNumberElement.textContent?.trim()
        if (currentLineNumber === String(lineNumber)) {
          targetRightRow = row
          targetIndex = index
        }
      }
    })

    // Ha megtaláltuk a jobb oldali sort, akkor a bal oldalon ugyanazt az indexet használjuk
    if (targetIndex !== -1 && targetIndex < leftRows.length) {
      targetLeftRow = leftRows[targetIndex]
    }

    if (!targetRightRow || !targetLeftRow) {
      console.error(`Line ${lineNumber} not found or index mismatch in file ${fileName}`)
      return false
    }

    // A komment szöveg feldolgozása a testreszabott rendererrel
    const processedText = enableMarkdown ? marked(commentText) : commentText

    // Létrehozzuk a jobb oldali komment div-et
    const rightCommentDiv = document.createElement('tr')
    rightCommentDiv.className = 'comment-row'
    rightCommentDiv.innerHTML = `
      <td colspan="4" class="comment-cell">
        <div class="comment-content ${enableMarkdown ? 'markdown-content' : ''}">
          <div class="comment-header">
            <div class="comment-info">
              <span class="comment-file-name">${fileName}</span>
              <span class="comment-line-number">Line ${lineNumber}</span>
              <span class="comment-format">${enableMarkdown ? '(Markdown)' : '(Plain text)'}</span>
            </div>
            <span class="comment-timestamp">${new Date().toLocaleTimeString()}</span>
          </div>
          <div class="comment-text">
            ${processedText}
          </div>
        </div>
      </td>
    `

    // Létrehozzuk a bal oldali placeholder div-et
    const leftCommentDiv = document.createElement('tr')
    leftCommentDiv.className = 'comment-row comment-placeholder'
    leftCommentDiv.innerHTML = `
      <td colspan="4" class="comment-cell">
        <div class="comment-placeholder-content">
          <div class="placeholder-line"></div>
        </div>
      </td>
    `

    // Beszúrjuk mindkét oldalra
    targetRightRow.insertAdjacentElement('afterend', rightCommentDiv)
    targetLeftRow.insertAdjacentElement('afterend', leftCommentDiv)

    // Szinkronizáljuk a magasságokat
    nextTick(() => {
      const rightHeight = rightCommentDiv.offsetHeight
      if (rightHeight > 0) {
        leftCommentDiv.style.height = `${rightHeight}px`
      }
    })

    // Debug információk
    console.log('Comment inserted:', {
      fileName,
      lineNumber,
      targetIndex,
      rightRowFound: !!targetRightRow,
      leftRowFound: !!targetLeftRow,
      rightHeight: rightCommentDiv.offsetHeight,
    })

    return true
  } catch (error) {
    console.error('Error adding comment:', error)
    return false
  }
}

// Új metódus a komment hozzáadásához
const handleNewComment = () => {
  if (selectedCommentFile.value && newCommentLine.value && newCommentText.value.trim()) {
    insertCommentAfterLine(
      selectedCommentFile.value,
      Number(newCommentLine.value),
      newCommentText.value.trim(),
      enableMarkdown.value,
    )
    showCommentModal.value = false
    selectedCommentFile.value = ''
    newCommentLine.value = ''
    newCommentText.value = ''
  }
}

// Új metódus a raw diff kezelésére
const handleRawDiffSubmit = () => {
  if (rawDiffText.value.trim()) {
    htmlDiff.value = html(parse(rawDiffText.value), {
      drawFileList: true,
      matching: 'lines',
      outputFormat: 'side-by-side',
      renderNothingWhenEmpty: false,
      colorScheme: 'light',
      highlightCode: true,
    })

    // Alapértelmezett PR adatok beállítása raw diff esetén
    prDetails.value = {
      diff: rawDiffText.value,
      title: 'Raw Diff Preview',
      number: 0,
      repository: 'Raw Diff',
    }

    showRawDiffModal.value = false
    rawDiffText.value = ''
  }
}

// Új metódusok
const handleFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    selectedFile.value = input.files[0]
  }
}

const handleFileLoad = async () => {
  if (!selectedFile.value) return

  try {
    const text = await selectedFile.value.text()
    htmlDiff.value = html(parse(text), {
      drawFileList: true,
      matching: 'lines',
      outputFormat: 'side-by-side',
      renderNothingWhenEmpty: false,
      colorScheme: 'light',
      highlightCode: true,
    })

    prDetails.value = {
      diff: text,
      title: `File: ${selectedFile.value.name}`,
      number: 0,
      repository: 'Local File',
    }

    showFileModal.value = false
    selectedFile.value = null
  } catch (error) {
    console.error('Error reading file:', error)
    error.value = 'Hiba történt a fájl beolvasása közben'
  }
}

// Komponens exportálása
defineExpose({
  insertCommentAfterLine,
})

const analyzeDiff = async () => {
  const { diff } = prDetails.value
  const files = gitDiffParser.parse(diff)
  toggleProgressBar(true)

  const patches = files
    .map((file) => ({
      fileName: file.newPath || file.oldPath,
      patch: createPatchesFromDiff(file.hunks),
    }))
    .filter((it) => isHunkIsTooLarge(it.patch) === false)

  let completedPatches = 0
  const totalPatches = patches.length

  await Promise.all(
    patches.map(async (patch) => {
      const diffReview = await reviewFileDiff(patch.patch, patch.fileName)
      if (diffReview.response !== 'LGTM!') {
        const response = parseReviewResponse(diffReview.response, patch.fileName)
        // Százalék számítás
        completedPatches++
        const percentage = Math.floor((completedPatches / totalPatches) * 100)
        updateProgress(percentage)
        
        response.forEach((it) => {
          const { lineEnd, commentText, fileName, diff } = it
          const comment = `${commentText}\n${diff}`
          if (!isNaN(it.lineEnd)) {
            insertCommentAfterLine(fileName, lineEnd, comment, true)
          }
        })
      } else {
        // Ha LGTM, akkor is számoljuk a progress-t
        completedPatches++
        const percentage = Math.floor((completedPatches / totalPatches) * 100)
        updateProgress(percentage)
      }
    }),
  )

  toggleProgressBar(false)
}

// Új progress változók
const showProgressBar = ref(false)
const progressValue = ref(0)

// Példa függvény a progress bar teszteléséhez
const updateProgress = (value: number) => {
  progressValue.value = Math.min(100, Math.max(0, value))
}

const toggleProgressBar = (show: boolean) => {
  showProgressBar.value = show
}
</script>

<style lang="scss" scoped>
.page-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: var(--background-color);
  width: 100%;
}

.content-header {
  background-color: var(--background-color);
  padding: 1rem 0;
  border-bottom: 1px solid var(--border-color);
  width: 100%;

  .header-content {
    width: 100%;
    margin: 0 auto;
    padding: 0 2rem;
    box-sizing: border-box;
  }
}

.main-content {
  flex: 1;
  width: 100%;
  padding: 2rem;
  box-sizing: border-box;
  overflow-x: auto;
}

.pr-details {
  width: 100%;

  .pr-info {
    width: 100%;
    background-color: var(--background-color);
    padding: 1.5rem;
    border-radius: 6px;
    margin-bottom: 1.5rem;
    border: 1px solid var(--border-color);
    box-sizing: border-box;
  }

  .diff-container {
    width: 100%;
    background-color: var(--background-color);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    overflow-x: auto;
    box-sizing: border-box;

    :deep() {
      .d2h-wrapper {
        width: 100%;
        margin: 0;
      }

      .d2h-file-header {
        width: 100%;
        box-sizing: border-box;
      }

      .d2h-diff-table {
        width: 100%;
        box-sizing: border-box;
      }

      .d2h-file-list-wrapper {
        width: 100%;
        box-sizing: border-box;
      }

      .d2h-file-list {
        width: 100%;
        box-sizing: border-box;
      }
    }
  }
}

.input-container {
  display: flex;
  gap: 0.5rem;
  width: 100%;
  box-sizing: border-box;
  align-items: center;

  .pr-input {
    flex: 1;
    height: 40px;
  }

  button {
    height: 40px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

.error-message {
  width: 100%;
  box-sizing: border-box;
}

.test-button {
  padding: 0.75rem 1.5rem;
  background-color: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-color);
  cursor: pointer;
  font-size: 0.875rem;
  white-space: nowrap;
  transition: all 0.2s ease;
  position: relative;

  &:hover:not(:disabled) {
    background-color: var(--hover-color);
    border-color: var(--primary-color);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background-color: var(--surface-color);
    border-color: var(--border-color);
  }

  &:disabled::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 1rem;
    height: 1rem;
    border: 2px solid transparent;
    border-top-color: var(--text-secondary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    display: none;
  }

  &:disabled.loading::after {
    display: block;
  }
}

@keyframes spin {
  to {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}

.comment-bubble {
  .comment-content {
    padding: 0.75rem;
    color: var(--text-color);
    white-space: normal;

    .custom-block {
      background-color: var(--surface-color);
      border: 1px solid var(--border-color);
      border-radius: 4px;
      padding: 1rem;
      margin: 0.5rem 0;

      h4 {
        margin: 0 0 0.5rem 0;
        color: var(--primary-color);
      }

      ul {
        margin: 0.5rem 0;
        padding-left: 1.5rem;
      }

      .block-footer {
        margin-top: 0.5rem;
        padding-top: 0.5rem;
        border-top: 1px solid var(--border-color);
        font-size: 0.75rem;
        color: var(--text-secondary);
      }
    }
  }
}

[v-tooltip] {
  position: relative;

  &:disabled:hover::before {
    content: attr(v-tooltip);
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    padding: 0.5rem;
    background-color: var(--secondary-color);
    color: white;
    font-size: 0.75rem;
    border-radius: 4px;
    white-space: nowrap;
    pointer-events: none;
    margin-bottom: 0.5rem;
    z-index: 1000;
  }

  &:disabled:hover::after {
    content: '';
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 5px solid transparent;
    border-top-color: var(--secondary-color);
    margin-bottom: -5px;
    pointer-events: none;
    z-index: 1000;
  }
}

:deep() {
  .comment-row {
    background-color: var(--surface-color);
    border-bottom: 1px solid var(--border-color);

    .comment-cell {
      padding: 8px;
      background-color: var(--background-color);
    }

    .comment-content {
      padding: 12px;
      background-color: var(--surface-color);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      color: var(--text-color);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      font-size: 12px;

      .comment-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
        padding-bottom: 8px;
        border-bottom: 1px solid var(--border-color);

        .comment-line-number {
          font-weight: 600;
          color: var(--primary-color);
        }

        .comment-timestamp {
          color: var(--text-secondary);
          font-size: 11px;
        }
      }

      .comment-text {
        white-space: pre-wrap;
        word-break: break-word;
        line-height: 1.5;
      }

      &.markdown-content {
        .comment-text {
          // Kód blokkok módosított stílusa
          pre {
            margin: 1em 0;
            padding: 1em;
            border-radius: 6px;
            background-color: var(--surface-color); // Használjuk a felület színét
            border: 1px solid var(--border-color); // Adjunk hozzá keretet
            overflow-x: auto;
            position: relative;

            code {
              padding: 0;
              background-color: transparent;
              border-radius: 0;
              font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
              font-size: 85%;
              line-height: 1.45;
              tab-size: 2;
              hyphens: none;
              white-space: pre;
              word-spacing: normal;
              word-break: normal;
              word-wrap: normal;
            }

            // Highlight.js alapstílusa
            .hljs {
              background: transparent;
              padding: 0;
              color: var(--text-color);
            }
          }

          // Inline kód stílusa
          code:not(pre code) {
            padding: 0.2em 0.4em;
            margin: 0;
            background-color: var(--surface-color);
            border: 1px solid var(--border-color);
            border-radius: 3px;
            font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
            font-size: 85%;
            color: var(--text-color);
          }
        }
      }
    }

    &.comment-placeholder {
      background-color: transparent;
      border: none;

      .comment-cell {
        padding: 0;
        background-color: transparent;
      }

      .comment-placeholder-content {
        height: 100%;
        display: flex;
        align-items: center;
        padding: 8px;
        background-color: var(--surface-color);
        opacity: 0.5;
        border: 1px dashed var(--border-color);
        border-radius: 4px;
        margin: 8px;

        .placeholder-line {
          width: 100%;
          height: 2px;
          background-color: var(--border-color);
          opacity: 0.5;
        }
      }
    }
  }
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: var(--background-color);
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.modal-header {
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;

  h3 {
    margin: 0;
    font-size: 1.25rem;
    color: var(--text-color);
  }

  .close-button {
    background: none;
    border: none;
    font-size: 1.5rem;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 0.5rem;
    line-height: 1;

    &:hover {
      color: var(--text-color);
    }
  }
}

.modal-body {
  padding: 1rem;

  .form-group {
    margin-bottom: 1rem;

    label {
      display: block;
      margin-bottom: 0.5rem;
      color: var(--text-color);
      font-weight: 500;
    }

    .line-input {
      width: 100%;
      padding: 0.5rem;
      border: 1px solid var(--border-color);
      border-radius: 4px;
      font-size: 0.875rem;

      &:focus {
        outline: none;
        border-color: var(--primary-color);
        box-shadow: 0 0 0 3px rgba(9, 105, 218, 0.1);
      }
    }

    .comment-textarea {
      width: 100%;
      padding: 0.5rem;
      border: 1px solid var(--border-color);
      border-radius: 4px;
      font-size: 0.875rem;
      resize: vertical;

      &:focus {
        outline: none;
        border-color: var(--primary-color);
        box-shadow: 0 0 0 3px rgba(9, 105, 218, 0.1);
      }
    }
  }
}

.modal-footer {
  padding: 1rem;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;

  button {
    padding: 0.5rem 1rem;
    border-radius: 4px;
    font-size: 0.875rem;
    cursor: pointer;

    &.cancel-button {
      background-color: var(--surface-color);
      border: 1px solid var(--border-color);
      color: var(--text-color);

      &:hover {
        background-color: var(--hover-color);
      }
    }

    &.submit-button {
      background-color: var(--primary-color);
      border: 1px solid var(--primary-color);
      color: white;

      &:hover:not(:disabled) {
        background-color: var(--primary-hover);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
  }
}

.markdown-toggle {
  margin-top: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--text-secondary);

  input[type='checkbox'] {
    margin: 0;
  }
}

.raw-diff-button {
  padding: 0.75rem 1.5rem;
  background-color: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-color);
  cursor: pointer;
  font-size: 0.875rem;
  white-space: nowrap;
  transition: all 0.2s ease;

  &:hover {
    background-color: var(--hover-color);
    border-color: var(--primary-color);
  }
}

.raw-diff-textarea {
  width: 100%;
  height: 100%;
  min-height: 400px;
  padding: 1rem;
  margin: 1rem 0;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-family: monospace;
  font-size: 14px;
  resize: none;
  background-color: var(--surface-color);
  color: var(--text-color);

  &:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 2px rgba(var(--primary-color-rgb), 0.1);
  }
}

.file-select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--background-color);
  color: var(--text-color);
  font-size: 0.875rem;
  margin-bottom: 1rem;

  &:focus {
    outline: none;
    border-color: var(--primary-color);
  }

  option {
    padding: 0.5rem;
  }
}

.form-group {
  margin-bottom: 1rem;

  label {
    display: block;
    margin-bottom: 0.5rem;
    color: var(--text-color);
    font-size: 0.875rem;
  }
}

.analyze-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  margin: 2rem 0;
}

.analyze-button {
  padding: 0.75rem 2rem;
  background-color: var(--success-color, #28a745);
  border: 1px solid var(--success-color, #28a745);
  border-radius: 6px;
  color: white;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.simple-progress-container {
  width: 100%;
  max-width: 500px;
}

.simple-progress-bar {
  width: 100%;
  height: 4px;
  background-color: var(--border-color);
  border-radius: 2px;
  overflow: hidden;
}

.simple-progress-fill {
  height: 100%;
  background-color: var(--success-color, #28a745);
  transition: width 0.3s ease;
}

.simple-progress-text {
  text-align: center;
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: var(--text-color);
}

.avatar-container {
  display: flex;
  justify-content: center;
  margin: 2rem 0;
}

.avatar-image {
  width: 150px;
  height: 150px;
  border-radius: 50%;
  object-fit: cover;
  border: 4px solid var(--primary-color, #42b883);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease, box-shadow 0.3s ease;

  &:hover {
    transform: scale(1.05);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
  }
}
</style>
