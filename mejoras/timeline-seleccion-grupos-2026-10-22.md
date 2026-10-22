# Timeline: selección, grupos y compuestos · 2026-10-22
Investigación de CapCut, DaVinci Resolve y Premiere, cruzada con el código (solo lectura) y con 2026-10-22.md y capcut-historial-2025-2026.md.

## Hallazgos clave
- CapCut PC: Agrupar (Ctrl+G / Ctrl+Shift+G) solo mueve juntos; Clip compuesto (Alt+G / Alt+Shift+G) los vuelve un objeto editable con doble clic que acepta velocidad, color, máscara y tracking. https://editlogic.io/capcut-keyboard-shortcuts-pc/ · https://www.tourboxtech.com/en/news/capcut-what-is-a-compound-clip.html · https://filmora.wondershare.com/video-editing/compound-clip-capcut.html
- CapCut móvil: sin compuesto ni selección múltiple real; truco: exportar e importar el tramo. https://www.capeditcut.com/community/video-editing/is-compound-clip-available-on-capcut-mobile/ (no oficial) · https://www.reddit.com/r/CapCut/comments/10ne7r1/
- Fallas 2026: clips agrupados pueden no aceptar keyframes (ayuda oficial, 19 mar 2026) https://www.capcut.com/help/keyframes-in-capcut-pc ; compuestos que dejan de crearse (v7.9.0, 20 ene) https://www.reddit.com/r/CapCut/comments/1qihsg2/ ; keyframes que vuelven al 100 % (feb) https://www.reddit.com/r/CapCut/comments/1qux5i0/ · https://www.reddit.com/r/CapCut/comments/1r28d40/
- Resolve: compuesto fijo vs línea de tiempo anidada ligada; bloqueo de pista por atajo que también bloquea el Inspector. https://davinciresolve21.com/blog/compound-clip-vs-nested-timeline-davinci-resolve-which-should-i-use · https://docs.imaster.org/davinci-resolve-21-manual/part-6-edit/ch.-43-editing-basics
- Premiere: el grupo no acepta efectos (se anida); capa de ajuste para varias pistas. https://helpx.adobe.com/premiere/desktop/edit-projects/change-clip-sequence/group-clips.html · https://helpx.adobe.com/premiere-pro/using/help-tutorials-adjustment-layers.html
- Tracking sobre grupos: solo truco de foro (compuesto + tracking al overlay). https://www.capeditcut.com/community/video-editing/motion-tracking-feature/

## Atajos CapCut PC (editlogic, defkey)
Ctrl+A todo · [ / ] seleccionar izq./der. del cabezal · Shift+X / Alt+X · A / B selección/corte · Ctrl+G / Ctrl+Shift+G · Alt+G / Alt+Shift+G · Q / W borrar izq./der. · Flechas arriba/abajo entre cortes · Alt+K keyframes · P imán, N ajuste auto.

## Lo que ya tenemos
Selección múltiple y mover juntos (store.ts:61-67, 208; Editor.tsx:210-214); imán solo a bordes y beats (Timeline.tsx:228-231, 258-269); silenciar pista (store.ts:69, 89); desactivar clip con V (store.ts:111); marcas, borrar cerrando hueco, congelar, invertir (store.ts:76, 117-119); extraer audio (store.ts:113); copiar/pegar estilo; máx. 4 capas de video (tracks.ts:3-4).
Faltan: grupo, compuesto, bloqueo, ocultar pista, selección por recuadro (clic en vacío borra la selección, Timeline.tsx:308-313).

## Propuestas por impacto
1. P1 · Agrupar/desagrupar Ctrl+G / Ctrl+Shift+G con contorno común (sustituye #20 de 2026-10-22.md). M · Web + PC
2. P1 · Bloquear pista con candado (no mover, cortar ni editar en Inspector). S · Web + PC
3. P1 · Ocultar pista con el ojo (distinto de silenciar). S · Web + PC
4. P1 · Selección por recuadro en zona vacía y Mayús+clic para rango. M · Web + PC
5. P1 · Imán también al cabezal y marcas, con N. S · Web + PC
6. P2 · [ / ] seleccionar y Q / W borrar a cada lado del cabezal. S · Web + PC
7. P2 · Clip compuesto (doble clic para abrir, Alt+Shift+G deshacer; velocidad, filtro, transformación, transición). L · Web + PC
8. P2 · Alinear y distribuir en el visor. M · Web + PC
9. P3 · Capa de ajuste (verificar placeAdjust, store.ts:125). M · Web + PC
10. P3 · Más de 4 capas y compuestos anidados con proxies. L · Solo PC

## Huecos
Sin página oficial de CapCut sobre agrupar/compuesto; alinear/distribuir en CapCut sin fuente directa; sin docs oficiales de tracking en grupos, easing en grupo ni export de compuestos; fuentes de móvil contradictorias.
