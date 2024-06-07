import { NoteProperties, TypeEnum, config } from 'joplin-api'
import { LocalConfig } from './options/utils/loadConfig'
import { trimTitleStart } from './content-scripts/utils/trim'
import Browser from 'webextension-polyfill'
import { Channel, register } from './utils/ext'
import { omit } from 'lodash-es'

export interface BackChannel extends Channel<'back'> {
  open(args: { path: string } & Record<string, string | number>): Promise<void>
  search(keyword: string): Promise<Pick<NoteProperties, 'id' | 'title'>[]>
}

register<BackChannel>({
  name: 'back',
  async open(args) {
    const p = new URLSearchParams(location.search)
    Object.entries(omit(args, 'path')).forEach(([k, v]) =>
      Array.isArray(v) ? v.forEach((i) => p.set(k, i)) : p.set(k, String(v)),
    )
    const url = Browser.runtime.getURL(`/src/options/index.html#${args.path}?${p.toString()}`)
    const t = (await Browser.tabs.query({ active: true, currentWindow: true }))[0]
    await Browser.tabs.create({ url, active: true, index: (t?.index ?? 0) + 1 })
  },
  async search(keyword) {
    const c = ((await Browser.storage.local.get(['baseUrl', 'token'])) ?? {}) as LocalConfig
    config.baseUrl = c.baseUrl ?? 'http://127.0.0.1:27123'
    config.token = c.token!
    try {
      const res = await fetch(config.baseUrl + '/search/simple/?contextLength=100&query=' + keyword, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + config.token,
        },
      })
      const info = await res.json()
      return info.map((item) => ({
        ...item,
        title: item.filename,
        id: item.filename,
      }))
    } catch (err) {
      throw {
        code: 'Obsidian API NotEnabled',
      }
    }
  },
})

Browser.runtime.onInstalled.addListener(function (details) {
  if (details.reason == 'install') {
    const url = Browser.runtime.getURL(`/src/options/index.html`)
    console.log('First install!')
    Browser.tabs.create({ url, active: true })
  } else if (details.reason == 'update') {
    var thisVersion = Browser.runtime.getManifest().version
    console.log('Updated from ' + details.previousVersion + ' to ' + thisVersion + '!')
  }
})
