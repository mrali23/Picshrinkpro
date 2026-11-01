# Markdown negotiation support

This site supports content negotiation for agent clients and other automated tools.

When a client sends `Accept: text/markdown` or `Accept: text/x-markdown`, the server returns a compact Markdown representation of the requested page instead of the browser-heavy HTML view.

Use the normal site routes, but request Markdown via the HTTP `Accept` header when your client is an agent or scanner.

## Example

```http
GET / HTTP/1.1
Accept: text/markdown
```

## Notes

- HTML remains the default for browsers.
- Markdown output is designed for agent consumption and formatted content extraction.
- These responses are intentionally compact and easier to parse than full webpage DOM output.
