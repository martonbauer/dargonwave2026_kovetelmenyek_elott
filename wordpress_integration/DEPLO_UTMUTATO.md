# Útmutató az Élőbe Állításhoz (WordPress / Render)

Ezt a mappát (`wordpress_integration`) azért hoztuk létre, hogy elkülönítsük az élő oldalhoz szükséges fájlokat.

## 1. Lépés: Backend (Szerver) feltöltése
1. Helyezd el a következő fájlokat a GitHub repozitóriumban (a `dragonwave_nagy_prijet_munka` mappából):
   - `server.js`
   - `database.js` (Kritikus!)
   - `package.json`
   - `db.json` (Vagy a meglévő `dragonwave.db`)
2. A **Render.com**-on hozz létre egy új **Web Service**-t ebből a repóból.
3. Amikor elkészült, kapsz egy címet (pl. `https://dragonwave-api.onrender.com`).

## 2. Lépés: WordPress beágyazás
1. Töltsd fel a frontend fájlokat egy statikus tárhelyre (pl. GitHub Pages):
   - `index.html`
   - `dragon.js`
   - `drgon.css`
   - `dragonwave_2026_photo.jpg`
2. A WordPress-ben a **Custom HTML** blokkba ezt illeszd be:

```html
<!-- API Cím beállítása (cseréld le a Rendertől kapott címedre!) -->
<script>
    window.DRAGONWAVE_API_URL = "https://dragonwave-api.onrender.com/api";
</script>

<iframe src="https://a-te-feltoltott-weboldalad-cime.hu" 
        style="width:100%; height:1200px; border:none;" 
        title="DragonWave 2026"></iframe>
```
