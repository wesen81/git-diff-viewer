import { describe, it, expect } from 'vitest'
import { createPatchesFromDiff, parseReviewResponse, reviewFileDiff } from '@/services/ai-pr-review/review.ts'
import diffTxt from './diff.txt'
import * as fs from 'node:fs'
import gitDiffParser from 'gitdiff-parser'

describe('HelloWorld', () => {
  it("read diff file", async () => {
    const fileContent = fs.readFileSync('./src/services/ai-pr-review/diff.txt', 'utf8')
    const files = gitDiffParser.parse(fileContent)
    const patches = files.map((file) => ({
      fileName: file.newPath || file.oldPath,
      patch: createPatchesFromDiff(file.hunks)
    }))
    const reviewResponses = (await Promise.all(patches.map(async (patch) => {
        return await reviewFileDiff(patch.patch, patch.fileName)
      })
    )).filter(it => it.response !== "LGTM!")
    const parsedResponses = reviewResponses.map(it => parseReviewResponse(it.response, it.fileName))
    console.log(parsedResponses)
  })
  it('renders properly', async () => {


    const gitDiffText = "31-31:\\nThere's a typo in the component name; it should be `AppProviders` instead of `AppProvider`.\\n```diff\\n-           <AppProvider>{children}</AppProvider s>\\n+           <AppProviders>{children}</AppProviders>\\n```\\n---\\n34-34:\\nLGTM!\\n---"

    expect(await reviewFileDiff(diffTxt, "test.ts")).toBe(true);
  })
  it('parse review comment', () => {
    const response =`31-31:
There's a typo in the component name; it should be \`AppProviders\` instead of \`AppProvider\`.
\`\`\`diff
-           <AppProvider>{children}</AppProvider s>
+           <AppProviders>{children}</AppProviders>
\`\`\`
---
34-34:
LGTM!
---`

    const expected = [
      {
        lineStart: 31,
        lineEnd: 31,
        commentText: "There's a typo in the component name; it should be `AppProviders` instead of `AppProvider`.",
        diff: `\`\`\`diff
-           <AppProvider>{children}</AppProvider s>
+           <AppProviders>{children}</AppProviders>
\`\`\``
      },
      {
        lineStart: 34,
        lineEnd: 34,
        commentText: "LGTM!",
        diff: ""
      }
    ]

    expect(parseReviewResponse(response)).toEqual(expected)
  })
})
