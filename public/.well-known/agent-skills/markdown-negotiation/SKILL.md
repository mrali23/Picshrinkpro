# Markdown negotiation support

Every public page has a compact Markdown version generated at build time.

Request it with the `Accept: text/markdown` header, or by adding `?format=markdown` to the page URL.
Browsers keep receiving HTML.

## Example

```http
GET /compressor HTTP/1.1
Host: picshrinkpro.com
Accept: text/markdown
```

## Notes

- The response has `Content-Type: text/markdown` and `Vary: Accept`.
- It starts with front matter (`title`, `description`, `url`), followed by the page's headings, paragraphs and lists.
- Pages without a Markdown version (for example `/admin`) return HTML.
