import { SearchNote } from '../plugins/plugin'
import { BackChannel } from '../../background'
import { warp } from '../../utils/ext'

export function renderList(root: HTMLDivElement, list: SearchNote[]) {
  const html = `<div>
  <h2 class="joplin-header">Obsidian search notes</h2>
  <ul>
    ${list.map((item) => `<li><a href="javascript:void(0)" data-id="${item.id}">${item.title}</a></li>`).join('')}
  </ul>
</div>`
  root.innerHTML = html
  root.addEventListener('click', async (ev) => {
    const el = ev.target
    if (!(el instanceof HTMLElement && el.tagName === 'A')) {
      return
    }
    const back = warp<BackChannel>({ name: 'back' })
    await back.open({
      path: '/note',
      id: el.dataset.id,
    })
  })
}

export function createJoplinElement() {
  const $root = document.createElement('div')
  $root.className = 'joplin-root'

  const $style = document.createElement('style')
  $style.innerHTML = `
  .joplin-root .joplin-header {
    font-size: 18px;
  }
  .joplin-root ul {
    list-style-type: none;
    padding-left: 0;
  }
  
  .joplin-root ul li {
    font-size: 16px;
    margin-bottom: 14px;
  }
  `
  document.head.appendChild($style)
  return $root
}
