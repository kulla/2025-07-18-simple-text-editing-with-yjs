# Prototype: Simple textediting with yjs

A simple text editor built with [Y.Text](https://docs.yjs.dev/api/shared-types/y.text) type of [Yjs](https://yjs.dev).

## Explanation

This prototype demonstrates the editing of a paragraph. Here the text is represented as a list of spans:

```typescript
type Paragraph = Span[]

type Span = {
  insert: string
  attributes?: {
    bold?: boolean
    italic?: boolean
    code?: boolean
  }
}
```

The advantage of this approach is, that no nesting is required. Each position of the cursor in the paragraph can be represented by a number which  corresponds to the index of the character in the whole text. Also applying a different format is easy since the spans can be easily merged and split.

## Limitations

- Formatting is limited to bold, italic and code. Formats like adding links or math code are not supported since it would require nesting of nodes in the paragraph.
- Only one paragraph is supported.
- `Ctrl + C` and `Ctrl + V` are not supported.

## Setup

1. Clone the repository
2. Install the dependencies via `bun install`

## Get started

Start the dev server:

```bash
bun dev
```

Build the app for production:

```bash
bun run build
```

Preview the production build locally:

```bash
bun preview
```

## Maintenance

Update dependencies:

```bash
bun update
```
