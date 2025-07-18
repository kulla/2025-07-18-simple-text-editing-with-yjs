import * as R from 'ramda'
import * as Y from 'yjs'
import './App.css'
import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'

const ydoc = new Y.Doc()
const ystate = ydoc.getMap('state')
const ytext = new Y.Text()

ystate.set('text', ytext)
ystate.set('cursor', null)

ytext.insert(0, 'Hello ')
ytext.insert(ytext.length, 'World', { bold: true })
ytext.insert(ytext.length, '! ', {})
ytext.insert(ytext.length, 'A sentence with a ', {})
ytext.insert(ytext.length, 'link', { href: 'https://example.com' })
ytext.insert(ytext.length, ' and some ', {})
ytext.insert(ytext.length, 'italic text', { italic: true })

export default function App() {
  const prevState = useRef<State>(null)
  const { text, cursor } = useSyncExternalStore(
    (callback) => {
      ystate.observeDeep(callback)

      return () => {
        ystate.unobserveDeep(callback)
      }
    },
    () => {
      const text = ytext.toDelta() as RichText
      const cursor = ystate.get('cursor') as Cursor | null
      const state = { text, cursor }

      if (prevState.current !== null && R.equals(prevState.current, state)) {
        return prevState.current
      }

      prevState.current = state
      return state
    },
  )

  const handleSelectionChange = useCallback(() => {
    const selection = window.getSelection()

    const newCursor = getCursor(selection)

    console.log('Selection changed:', newCursor)

    if (R.equals(newCursor, ystate.get('cursor'))) return

    ystate.set('cursor', newCursor)
  }, [])

  useEffect(() => {
    console.log('App mounted, adding selectionchange listener')
    document.addEventListener('selectionchange', handleSelectionChange)

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange)
    }
  }, [handleSelectionChange])

  return (
    <main className="prose p-10">
      <h1>Richtext element:</h1>
      <ContentEditable />
      <h1>State:</h1>
      <pre>{JSON.stringify({ cursor, text }, undefined, 2)}</pre>
    </main>
  )

  function ContentEditable() {
    return (
      <p
        id="contenteditable"
        className="border p-4 rounded"
        contentEditable
        suppressContentEditableWarning
        spellCheck="false"
      >
        <RichTextForEditMode />
      </p>
    )
  }

  function RichTextForEditMode() {
    let position = 0
    const spans = []

    for (const insert of text) {
      spans.push(
        <span
          key={position}
          className={getClassNames(insert)}
          data-position={position}
        >
          {insert.insert}
        </span>,
      )

      position += insert.insert.length
    }

    return spans
  }

  function getClassNames(insert: Insert): string {
    const classes = []
    if (insert.attributes?.bold) classes.push('font-bold')
    if (insert.attributes?.italic) classes.push('italic')
    if (insert.attributes?.href) classes.push('text-blue-500 underline')

    return classes.join(' ')
  }
}

function getCursor(selection: Selection | null): Cursor | null {
  if (selection === null || selection.rangeCount === 0) return null

  const range = selection.getRangeAt(0)
  const startNode = range.startContainer
  const endNode = range.endContainer
  const startOffset = range.startOffset
  const endOffset = range.endOffset

  const startPosition = getPosition(startNode, startOffset)
  const endPosition = getPosition(endNode, endOffset)

  if (startPosition === null || endPosition === null) return null

  return startPosition <= endPosition
    ? { start: startPosition, end: endPosition }
    : { start: endPosition, end: startPosition }
}

function getPosition(node: Node | null, offset: number | null): number | null {
  if (node === null || offset === null) return null
  if (node.nodeType !== Node.TEXT_NODE) return null

  if (node.parentElement?.parentElement?.id !== 'contenteditable') return null

  const { position } = node.parentElement.dataset

  if (position === undefined) return null

  const pos = Number.parseInt(position, 10)

  if (Number.isNaN(pos)) return null

  return pos + offset
}

interface State {
  cursor: Cursor | null
  text: RichText
}

interface Cursor {
  start: number
  end: number
}

type RichText = Insert[]

interface Insert {
  insert: string
  attributes?: {
    bold?: boolean
    italic?: boolean
    href?: string
  }
}
