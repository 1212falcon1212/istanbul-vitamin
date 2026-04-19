import DOMPurify from "isomorphic-dompurify";

/**
 * HTML içeriğini XSS'e karşı sanitize eder. Admin panelinden gelen
 * product.description / page.content gibi güvensiz alanlar için kullan.
 *
 * İzin verilen: p, br, strong, em, u, h1-h6, ul, ol, li, a, img, blockquote,
 * code, pre, span, div, table, thead, tbody, tr, th, td, hr.
 * Tehlikeli: script, iframe, style, event handler'lar hepsi stripped.
 */
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return "";
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "em", "b", "i", "u",
      "h1", "h2", "h3", "h4", "h5", "h6",
      "ul", "ol", "li",
      "a", "img",
      "blockquote", "code", "pre",
      "span", "div",
      "table", "thead", "tbody", "tr", "th", "td",
      "hr",
    ],
    ALLOWED_ATTR: [
      "href", "target", "rel",
      "src", "alt", "title",
      "class", "id",
      "colspan", "rowspan",
    ],
    ALLOW_DATA_ATTR: false,
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "style"],
  });
}
