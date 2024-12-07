import gitDiffParser, { Hunk } from 'gitdiff-parser'
import { ChatOpenAI } from '@langchain/openai'
import { ChatPromptTemplate, PromptTemplate } from '@langchain/core/prompts'
import { reviewFileDiffPrompt } from '@/services/ai-pr-review/reviewPrompts.ts'
import { getTokenCount } from '@/services/ai-pr-review/tokinzer.ts'


const TOKEN_LIMIT = 20000

export const createPatchesFromDiff = (hunks: Hunk[]): string => {
  const getLineNumber = (number?: string) => {
    if(number === undefined) return '';
    return number + ": ";
  }

  const oldHunks = hunks.map((hunk) => hunk.changes.filter(it => it.type != "insert").map((change) => change.content).join("\n")).join("\n");
  const newHunks = hunks.map((hunk) => hunk.changes.filter(it => it.type != "delete").map((change) => getLineNumber(change.lineNumber) + change.content).join("\n")).join("\n");
  console.log(oldHunks)
  console.log("new hunks: \n")
  console.log(newHunks)
  return `---new_hunk---
  ${newHunks}

  ---old_hunk---
  ${oldHunks}`
}

const chatModel = new ChatOpenAI({
  model: 'gpt-4o-mini',
  temperature: 0,
  apiKey: import.meta.env.VITE_OPENAI_API_KEY
});
const reviewPromptTemplate = PromptTemplate.fromTemplate(reviewFileDiffPrompt)
const reviewChain = reviewPromptTemplate.pipe(chatModel)



export const isHunkIsTooLarge = (hunk: string): boolean => {
  return getTokenCount(hunk) > TOKEN_LIMIT
}

export const reviewFileDiff = async (patches: string, filename: string): Promise<{
  fileName: string,
  response: string
}> => {
  return { fileName: filename, response: (await reviewChain.invoke({ patches, filename })).content
}
}

export interface ReviewComment {
  lineStart: number;
  lineEnd: number;
  commentText: string;
  diff: string;
  fileName: string;
}

export const parseReviewResponse = (responseText: string, fileName: string): ReviewComment[] => {
  const comments = responseText.split('---').map(it => it.trim()).filter(it => it.length > 0);
  const commentObjects = comments.map(comment => {
    const [lineRange, commentText, ...diff] = comment.split('\n').map(it => it.trim()).filter(it => it.length > 0)
    return {
      lineStart: parseInt(lineRange.split('-')[0]),
      lineEnd: parseInt(lineRange.split('-')[1]),
      commentText,
      diff: diff.join('\n'),
      fileName
    }
  })
  return commentObjects.filter(it => it.commentText !== "LGTM!")
}




