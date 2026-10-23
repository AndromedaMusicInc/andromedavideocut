import asyncio,json
from playwright.async_api import async_playwright
CL="""(id)=>{const e=document.querySelector(`[data-clip^="${id}"]`);const r=e.getBoundingClientRect();return [Math.round(r.left*10)/10,Math.round(r.right*10)/10]}"""
async def drag(pg,id,dx,steps=10):
  l,r=await pg.evaluate(CL,id); y=(await pg.locator(f'[data-clip^="{id}"]').bounding_box())['y']+10
  x=(l+r)/2; await pg.mouse.move(x,y); await pg.mouse.down()
  for i in range(1,steps+1): await pg.mouse.move(x+dx*i/steps,y)
  await pg.wait_for_timeout(100); mid=await pg.evaluate(CL,id); print(await pg.evaluate("JSON.stringify(window.__dbg)"))
  await pg.mouse.up(); await pg.wait_for_timeout(200)
  return mid, await pg.evaluate(CL,id)
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':1440,'height':900})
    await pg.goto('http://localhost:8123/'); await pg.wait_for_timeout(2000)
    await pg.mouse.click(300,250); await pg.wait_for_timeout(3000)
    print('magnet aria-pressed', await pg.locator('button[aria-pressed]').evaluate_all("els=>els.map(e=>[e.getAttribute('aria-label')||e.title,e.getAttribute('aria-pressed')])"))
    print('sticker antes', await pg.evaluate(CL,'d-spar'))
    # mover sticker para que su borde izq quede 4px a la derecha del corte 466
    print('sticker -84 (borde a ~470, corte 466):', await drag(pg,'d-spar',-84))
    print('sub +6 (alejar del fin de titl 347):', await drag(pg,'d-sub',3))
    print('sub tras', await pg.evaluate(CL,'d-sub'), 'titl', await pg.evaluate(CL,'d-titl'))
    await b.close()
asyncio.run(main())
