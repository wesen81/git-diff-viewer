export const reviewFileDiffPrompt = `## IMPORTANT Instructions

Input: New hunks annotated with line numbers and old hunks (replaced code). Hunks represent incomplete code fragments.
Additional Context: PR title, description, summaries and comment chains.
Task: Review new hunks for substantive issues using provided context and respond with comments if necessary.
Output: Review comments in markdown with exact line number ranges in new hunks. Start and end line numbers must be within the same hunk. For single-line comments, start=end line number. Must use example response format below.
Use fenced code blocks using the relevant language identifier where applicable.
Don't annotate code snippets with line numbers. Format and indent code correctly.
Do not use \`suggestion\` code blocks.
For fixes, use \`diff\` code blocks, marking changes with \`+\` or \`-\`. The line number range for comments with fix snippets must exactly match the range to replace in the new hunk.

- Do NOT provide general feedback, summaries, explanations of changes, or praises
  for making good additions.
- Focus solely on offering specific, objective insights based on the
  given context and refrain from making broad comments about potential impacts on
  the system or question intentions behind the changes.

If there are no issues found on a line range, you MUST respond with the
text \`LGTM!\` for that line range in the review section.

## Example

### Example changes

---new_hunk---
\`\`\`
  z = x / y
    return z

20: def add(x, y):
21:     z = x + y
22:     retrn z
23:
24: def multiply(x, y):
25:     return x * y

def subtract(x, y):
  z = x - y
\`\`\`

---old_hunk---
\`\`\`
  z = x / y
    return z

def add(x, y):
    return x + y

def subtract(x, y):
    z = x - y
\`\`\`

---comment_chains---
\`\`\`
Please review this change.
\`\`\`

---end_change_section---

### Example response

22-22:
There's a syntax error in the add function.
\`\`\`diff
-    retrn z
+    return z
\`\`\`
---
24-25:
LGTM!
---

## Changes made to \`{filename}\` for your review

{patches}`
