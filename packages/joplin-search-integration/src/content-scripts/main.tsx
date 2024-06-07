import { config } from 'joplin-api'
import { loadConfig } from '../options/utils/loadConfig'
import { google } from './plugins/google'
import { SearchNote, SearchPlugin } from './plugins/plugin'
import { bing } from './plugins/bing'
import { baidu } from './plugins/baidu'
import { duckduckgo } from './plugins/duckduckgo'
import { searx } from './plugins/searx'
import { metagar } from './plugins/metagar'
import { you } from './plugins/you'
import { brave } from './plugins/brave'
import type { BackChannel } from '../background'
import { warp } from '../utils/ext'
import { render } from 'preact'
import { useMount } from 'react-use'
import { Loading, useAsyncFn } from '../components/loading'
import css from './index.css?inline'
import init, { cut_for_search } from 'jieba-wasm'

function NoteList(props: { list: SearchNote[] }) {
  function onGotoNoteView(it: SearchNote) {
    return async () => {
      const back = warp<BackChannel>({ name: 'back' })
      await back.open({
        path: '/note',
        id: it.id,
      })
    }
  }
  return (
    <ul
      className={'note-list'}
      style={{
        fontSize: '16px',
        gap: '8px',
      }}
    >
      {props.list.map((it) => (
        <li key={it.id}>
          <a href="javascript:void(0)" onClick={onGotoNoteView(it)}>
            {it.title}
          </a>
        </li>
      ))}
    </ul>
  )
}

function SearchPanel(props: { plugin: SearchPlugin }) {
  const { state, execute } = useAsyncFn(async () => {
    console.debug('load config')
    const c = await loadConfig()
    if (!c.token) {
      throw new Error('Please configure the token first')
    }
    config.token = c.token
    config.baseUrl = c.baseUrl
    console.debug('get query')
    let keyword = props.plugin.getQuery()
    if (!keyword) {
      throw new Error('Do not get search keyword')
    }
    // is chinese
    if (!keyword.includes(':') && /[\u4E00-\u9FFF]/.test(keyword)) {
      await (init as any)()
      keyword = cut_for_search(keyword, true).join(' ')
      console.info(`chinese search keywrod: ${keyword}`)
    }
    console.debug('search notes')
    let list: SearchNote[]
    try {
      list = await back.search(keyword)
    } catch (err) {
      console.error('search notes error', err)
      if (typeof err === 'object' && (err as any).code === 'JoplinWebClipperNotEnabled') {
        throw new Error(`Please enable Obsidian RestApi service. check: ${c.baseUrl}/ping`)
      }
      return
    }
    console.debug('search: ', keyword, list)
    console.debug('render start')
    return list
  })
  useMount(execute)
  return (
    <div class={'joplin-root'}>
      <style>{css}</style>
      <h2 class={'joplin-header'}>Obsidian search notes</h2>
      <section>
        {state.loading.value && <div>Loading...</div>}
        {state.error.value && <div class={'text-red-500'}>Error: {(state.error.value as Error).message}</div>}
        {state.value.value && <NoteList list={state.value.value} />}
      </section>
    </div>
  )
}

const plugins: SearchPlugin[] = [google(), bing(), baidu(), duckduckgo(), searx(), metagar(), you(), brave()]

function findPlugin() {
  const u = new URL(location.href)
  return plugins.find((item) => item.match(u))
}

const back = warp<BackChannel>({ name: 'back' })

async function main() {
  console.debug('load plugin')
  const plugin = findPlugin()
  if (!plugin) {
    console.info('找不到合适的插件')
    return
  }

  function renderRoot(plugin: SearchPlugin) {
    const id = 'joplin-root'
    let $root = document.getElementById(id)
    if (!$root) {
      $root = plugin.createRenderRoot()
      $root.id = 'joplin-root'
      $root.classList.add('joplin-root')
    }
    render(<SearchPanel plugin={plugin} />, $root)
  }

  renderRoot(plugin)
  plugin.observe?.(() => renderRoot(plugin))
  console.debug('render end')
}

main()
