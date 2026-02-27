/**
 * Writes YAML frontmatter back to plan phase files.
 * Preserves markdown body content unchanged.
 */
import matter from 'gray-matter';
import fs from 'fs';

/**
 * Reads a plan phase file, merges updates into its YAML frontmatter, and writes it back.
 * The markdown body content is preserved unchanged.
 */
export function writePhaseStatus(filePath: string, updates: Record<string, unknown>): void {
  let rawContent = '';
  try {
    rawContent = fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    console.error(`[PlanWriter] Failed to read file: ${filePath}`, err);
    return;
  }

  let parsed: matter.GrayMatterFile<string>;
  try {
    parsed = matter(rawContent);
  } catch (err) {
    console.error(`[PlanWriter] Failed to parse frontmatter: ${filePath}`, err);
    return;
  }

  // Merge updates into existing frontmatter data
  const mergedData = { ...parsed.data, ...updates };

  // Re-stringify using gray-matter: preserves body, rebuilds frontmatter
  const newContent = matter.stringify(parsed.content, mergedData);

  try {
    fs.writeFileSync(filePath, newContent, 'utf-8');
  } catch (err) {
    console.error(`[PlanWriter] Failed to write file: ${filePath}`, err);
  }
}

/**
 * Reads a plan file and marks matching checkbox items as checked.
 * Matches items by their text content (partial match).
 */
export function updateCheckboxes(filePath: string, completedItems: string[]): void {
  let content = '';
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    console.error(`[PlanWriter] Failed to read file for checkboxes: ${filePath}`, err);
    return;
  }

  if (completedItems.length === 0) return;

  // Replace unchecked items that match any completedItems text
  const updated = content.replace(/^- \[ \] (.+)$/gm, (line, itemText) => {
    const isCompleted = completedItems.some((ci) =>
      itemText.toLowerCase().includes(ci.toLowerCase())
    );
    return isCompleted ? `- [x] ${itemText}` : line;
  });

  if (updated !== content) {
    try {
      fs.writeFileSync(filePath, updated, 'utf-8');
    } catch (err) {
      console.error(`[PlanWriter] Failed to write checkboxes: ${filePath}`, err);
    }
  }
}
