import asyncio, json
from playwright.async_api import async_playwright
URL="https://andromedamusicinc.github.io/andromedavideocut/preview/"
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch()
    pg=await b.new_page(viewport={'width':1366,'height':800})
    logs=[]
    pg.on('console',lambda m: logs.append(f'{m.type}: {m.text}'))
    pg.on('pageerror',lambda e: logs.append(f'PAGEERROR: {e}'))
    await pg.goto(URL,wait_until='networkidle')
    await pg.wait_for_timeout(2000)
    await pg.screenshot(path='capturas/01-inicio.png')
    print(await pg.inner_text('body'))
    els=await pg.eval_on_selector_all('button,a,[role=button],input,select',"es=>es.map(e=>[e.tagName,e.innerText.trim().slice(0,40),e.getAttribute('aria-label'),e.getAttribute('title')])")
    print(json.dumps(els,ensure_ascii=False))
    print('\n'.join(logs))
    await b.close()
asyncio.run(main())
