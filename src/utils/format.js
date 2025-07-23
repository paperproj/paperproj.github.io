// Insert a space between lowercase-uppercase text (i.e. JournalArticle -> Journal Article)
export function formatType(type) {
  return type.replace(/([a-z])([A-Z])/g, "$1 $2");
}