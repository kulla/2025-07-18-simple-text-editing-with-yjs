import * as R from 'ramda'
import * as Y from 'yjs'
import './App.css'
import {
  type KeyboardEventHandler,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from 'react'

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

  const handleKeyDown: KeyboardEventHandler = useCallback(
    (event) => {
      if (cursor == null) return
      if (event.key.startsWith('Arrow')) return
      if (event.ctrlKey && event.key === 'r') return

      const { start, end } = cursor
      const isCollapsed = start === end

      event.preventDefault()

      if (event.key === 'Backspace') {
        if (isCollapsed && start > 0) {
          ytext.delete(start - 1, 1)
          ystate.set('cursor', { start: start - 1, end: start - 1 })
        } else if (!isCollapsed) {
          deleteSelection()
        }
      } else if (event.key === 'Delete') {
        if (isCollapsed && end < ytext.length) {
          ytext.delete(end, 1)
          ystate.set('cursor', { start: end, end: end })
        } else if (!isCollapsed) {
          deleteSelection()
        }
      } else if (
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        event.key.length === 1
      ) {
        if (isCollapsed) {
          // Insert character at the cursor position
          ytext.insert(start, event.key)
          ystate.set('cursor', { start: start + 1, end: start + 1 })
        }
      }

      function deleteSelection() {
        if (isCollapsed) return
        ytext.delete(start, end - start)
        ystate.set('cursor', { start, end: start })
      }
    },
    [cursor],
  )

  useLayoutEffect(() => {
    const selection = window.getSelection()

    if (selection == null) return
    if (R.equals(getCursor(selection), cursor)) return

    selection.removeAllRanges()

    const range = getRange(cursor)

    if (range == null) return

    selection.addRange(range)
  }, [cursor])

  const handleSelectionChange = useCallback(() => {
    const selection = window.getSelection()

    const newCursor = getCursor(selection)

    if (R.equals(newCursor, ystate.get('cursor'))) return

    ystate.set('cursor', newCursor)
  }, [])

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange)

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange)
    }
  }, [handleSelectionChange])

  return (
    <main className="prose p-10">
      <h1>Richtext element:</h1>
      {renderContentEditable()}
      <h1>State:</h1>
      <pre>{JSON.stringify({ cursor, text }, undefined, 2)}</pre>
    </main>
  )

  function renderContentEditable() {
    return (
      <p
        id="contenteditable"
        className="border p-4 rounded"
        contentEditable
        suppressContentEditableWarning
        spellCheck="false"
        onKeyDown={handleKeyDown}
      >
        {renderRichText()}
      </p>
    )
  }

  function renderRichText() {
    let position = 0
    const spans = []

    for (const element of text) {
      spans.push(
        <span
          key={element.insert}
          className={getClassNames(element)}
          data-position={position}
        >
          {element.insert}
        </span>,
      )

      position += element.insert.length
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

function getRange(cursor: Cursor | null): Range | null {
  if (cursor === null) return null

  const contentEditable = document.getElementById('contenteditable')
  if (contentEditable === null) return null

  const start = getElementAndOffset(cursor.start)
  const end = getElementAndOffset(cursor.end)

  if (start === null || end === null) return null

  const range = document.createRange()
  range.setStart(start.node, start.offset)
  range.setEnd(end.node, end.offset)

  return range
}

function getElementAndOffset(
  position: number,
): { node: Node; offset: number } | null {
  const contentEditable = document.getElementById('contenteditable')
  if (contentEditable === null) return null

  const elements = contentEditable.querySelectorAll('span')

  for (let i = 0; i < elements.length; i++) {
    const element = elements.item(i)
    const elementPosition = Number.parseInt(element.dataset.position ?? '', 10)
    if (Number.isNaN(elementPosition)) continue

    const textContent = element.textContent || ''
    if (
      elementPosition <= position &&
      position < elementPosition + textContent.length
    ) {
      const offset = position - elementPosition
      if (element.firstChild) {
        return { node: element.firstChild, offset }
      }
    }
  }

  return null
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
