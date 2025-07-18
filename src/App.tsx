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
      const text = ytext.toDelta()
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
      <h1>Rsbuild with React</h1>
      <p>Start building amazing things with Rsbuild.</p>
      <h1>State</h1>
      <pre>{JSON.stringify({ text }, undefined, 2)}</pre>
    </main>
  )
}

interface State {
  text: RichText
}

type RichText = Insert[]

interface Insert {
  text: string
  attributes?: {
    bold?: boolean
    italic?: boolean
    href?: string
  }
}
