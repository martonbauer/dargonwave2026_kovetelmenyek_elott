# DragonWave 2026 - Dokumentáció

## 1. A szoftver célja
A DragonWave 2026 egy életszerű problémára nyújt megoldást: sportversenyek (különösen vízi sportok, mint sárkányhajózás, kajak-kenu, SUP) teljes körű regisztrációs és időmérő rendszere. Lehetővé teszi a versenyzők nevezését, kategóriák szerinti indítását, az eredmények valós idejű követését és az adatok perzisztens tárolását.

## 2. Komponensek technikai leírása
A rendszer három fő részből áll:

### Backend (Szerver oldal)
- **Technológia**: Node.js + Express.js keretrendszer.
- **Architektúra**: RESTful API, amely szabványos HTTP metódusokon (`GET`, `POST`, `DELETE`) keresztül kommunikál.
- **Adatkezelés**: Supabase (PostgreSQL), amely biztosítja az adatok biztonságos és strukturált tárolását a felhőben.

### Frontend (Kliens oldal)
- **Technológia**: HTML5, Vanilla CSS3 (Modern Glassmorphism design), JavaScript (ES6+).
- **Reszponzivitás**: A felület teljesen reszponzív, asztali gépeken és mobil eszközökön egyaránt optimális felhasználói élményt nyújt.
- **Funkciók**: Online nevezési űrlap, élő eredményjelző tábla, jelszóval védett adminisztrációs felület.
- **GitHub**: A forráskód verziókezelése GitHubon történik.

---

## 3. Működés műszaki feltételei
- **Node.js**: v16.x vagy újabb verzió szükséges.
- **Böngésző**: Modern böngésző támogatás (Chrome, Firefox, Safari, Edge).
- **Függőségek**: `express`, `cors`, `@supabase/supabase-js`, `dotenv`, `body-parser` (telepítés: `npm install`).
- **Supabase Fiók**: Szükséges egy Supabase projekt a `SUPABASE_URL` és `SUPABASE_KEY` értékekkel.

## 4. Használati útmutató

### Telepítés és Indítás
1. Töltse le a forráskódot vagy klónozza a GitHub repository-t.
2. Nyisson egy terminált a mappában.
3. Futtassa az `npm install` parancsot a függőségek telepítéséhez.
4. Másolja le a `.env.example` fájlt `.env` néven, és töltse ki a Supabase adataival.
5. Futtassa a `supabase/schema.sql` tartalmát a Supabase SQL Editorában.
6. Indítsa el a szervert: `npm start` vagy `npm run dev`.
7. Nyissa meg a böngészőben: `http://localhost:3001`.

### Versenyzői oldal
- Válassza ki a kategóriát és a távot.
- Töltse ki a kért adatokat (név, születési dátum, Ötpróba azonosító).
- Kattintson a "Nevezés beküldése" gombra.

### Adminisztrációs oldal
1. Kattintson az "Adminisztráció" gombra a fejlécben.
2. Adja meg az admin jelszót (alapértelmezett: `dragon2026`).
3. Az "Indítópult" segítségével elindíthatja a futamokat.
4. A célba érkező versenyzők rajtszámát a "STOP" mezőbe írva rögzítheti az idejüket.
