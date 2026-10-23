import asyncio,json
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':1440,'height':900})
    errs=[]; pg.on('pageerror',lambda e: errs.append(str(e)))
    await pg.goto('http://localhost:8123/'); await pg.wait_for_timeout(2000)
    await pg.mouse.click(300,250); await pg.wait_for_timeout(3000)
    await pg.get_by_text('Fundidos').first.click(); await pg.wait_for_timeout(500)
    names=await pg.evaluate("[...document.querySelectorAll('[data-lib-item^=\"transition:\"]')].map(e=>e.innerText)"); print(names)
    print('joins antes', await pg.evaluate("[...document.querySelectorAll('[data-timeline] [title], [data-timeline] [aria-label]')].map(e=>e.getAttribute('title')||e.getAttribute('aria-label')).filter(t=>/Corte|Fund|Trans|Barrido|Desliz/.test(t))"))
    it=pg.locator("[data-lib-item=\"transition:wipe\"]:visible").first; bb=await it.bounding_box()
    sx,sy=bb['x']+bb['width']/2,bb['y']+bb['height']/2
    await pg.mouse.move(sx,sy); await pg.mouse.down()
    for i in range(1,21): await pg.mouse.move(sx+(466-sx)*i/20, sy+(834-sy)*i/20)
    await pg.wait_for_timeout(200); await pg.screenshot(path='trans-drag.png'); await pg.mouse.up(); await pg.wait_for_timeout(500)
    print('joins despues', await pg.evaluate("[...document.querySelectorAll('[data-timeline] [title], [data-timeline] [aria-label]')].map(e=>e.getAttribute('title')||e.getAttribute('aria-label')).filter(t=>/Corte|Fund|Trans|Barrido|Desliz/.test(t))"))
    await pg.screenshot(path='trans-after.png'); print(errs)
    await b.close()
asyncio.run(main())

async def render():
  async with async_playwright() as p:
    b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':1440,'height':900})
    await pg.goto('http://localhost:8123/'); await pg.wait_for_timeout(2000)
    await pg.mouse.click(300,250); await pg.wait_for_timeout(3000)
    ruler=await pg.locator('[data-timeline]').bounding_box()
    for x in [440,462,470,480,490,500]:
      await pg.mouse.click(x, ruler['y']+45); await pg.wait_for_timeout(400)
      s=await pg.evaluate("""(()=>{const c=[...document.querySelectorAll('canvas')].sort((a,b)=>b.width*b.height-a.width*a.height)[0];const g=c.getContext('2d');const f=(x)=>[...g.getImageData(Math.floor(c.width*x),Math.floor(c.height/2),1,1).data].slice(0,3).join(',');return [f(.1),f(.5),f(.9)]})()""")
      await pg.screenshot(path=f'r{x}.png'); print(x,s)
    await b.close()
asyncio.run(render())
