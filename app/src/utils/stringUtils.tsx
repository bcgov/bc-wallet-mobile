export const startCaseUnicode = (text: string): string => {
  return text
    .split(/[_\s-]/) // Split by underscores (_), spaces ( ), or hyphens (-)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize first letter
    .join(' ') // Join the words with spaces
}
