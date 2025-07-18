import * as R from 'ramda'
import * as Y from 'yjs'
import './App.css'
import { useRef, useSyncExternalStore } from 'react'

const ydoc = new Y.Doc()
const ystate = ydoc.getMap('state')
const ytext = new Y.Text()

ystate.set('text', ytext)

ytext.insert(0, 'Hello ')
ytext.insert(ytext.length, 'World', { bold: true })
ytext.insert(ytext.length, '! ', {})
ytext.insert(ytext.length, 'A sentence with a ', {})
ytext.insert(ytext.length, 'link', { href: 'https://example.com' })
ytext.insert(ytext.length, ' and some ', {})
ytext.insert(ytext.length, 'italic text', { italic: true })

export default function App() {
  const prevState = useRef<State>(null)
  const { text } = useSyncExternalStore(
    (callback) => {
      ystate.observeDeep(callback)

      return () => {
        ystate.unobserveDeep(callback)
      }
    },
    () => {
      const text = ytext.toDelta() as RichText
      const state = { text }

      if (prevState.current !== null && R.equals(prevState.current, state)) {
        return prevState.current
      }

      prevState.current = state
      return state
    },
  )

  return (
    <main className="prose p-10">
      <h1>Richtext element:</h1>
      <ContentEditable />
      <h1>State:</h1>
      <pre>{JSON.stringify({ text }, undefined, 2)}</pre>
    </main>
  )

  function ContentEditable() {
    return (
      <p
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
    return (
      <>
        {text.map((insert, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
          <span key={index} className={getClassNames(insert)}>
            {insert.insert}
          </span>
        ))}
      </>
    )
  }

  function getClassNames(insert: Insert): string {
    const classes = []
    if (insert.attributes?.bold) classes.push('font-bold')
    if (insert.attributes?.italic) classes.push('italic')
    if (insert.attributes?.href) classes.push('text-blue-500 underline')

    return classes.join(' ')
  }
}

interface State {
  text: RichText
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
