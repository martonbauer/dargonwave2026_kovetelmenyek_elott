# DragonWave 2026 - Rendszer Dokumentáció

## 1. A szoftver célja
A DragonWave 2026 egy professzionális, életszerű problémára nyújt megoldást: sportversenyek (különösen vízi sportok, mint sárkányhajózás, kajak-kenu, SUP) teljes körű regisztrációs és időmérő rendszere. Lehetővé teszi a versenyzők nevezését, kategóriák szerinti indítását, az eredmények valós idejű követését és az adatok perzisztens tárolását.

## 2. Komponensek és Technológiai Stack
A rendszer egy robusztus, háromrétegű (3-tier) architektúrára épül, amely biztosítja a magas teljesítményt, a skálázhatóságot és a valós idejű működést:

### 2.1 Adatréteg (Data Layer)
- **Supabase (PostgreSQL)**: Biztosítja az adatok perzisztens, biztonságos és strukturált tárolását a felhőben.
- Rövid válaszidők és stabil elérés a verseny teljes időtartama alatt.

### 2.2 Kiszolgáló és Üzleti Logika (Service Layer)
- **Node.js & Express.js**: Villámgyors, aszinkron backend kiszolgáló, amely RESTful API-t biztosít és transzparensen kommunikál a kliensekkel.
- **Valós idejű szinkronizáció (Socket.io)**: Kétirányú kommunikációt biztosít a szerver és a böngészők között. Bármilyen adatváltozás esetén azonnal értesíti a kapcsolódó eszközöket, így minden Admin egyidejűleg a legfrissebb adatokat látja anélkül, hogy frissítené az oldalt.

### 2.3 Felhasználói Felület (UI Layer)
- **Kliens technológiák**: Modern HTML5, Vanilla CSS3 (Glassmorphism design irányzat alkalmazásával), JavaScript (ES6+).
- **Elemzések (Chart.js)**: A felület beépített diagramokkal (Doughnut chartok) biztosít azonnali statisztikai vizuális áttekintést az adminisztrátoroknak a regisztrált kategóriák és versenyállapotok arányairól.
- **Progresszív Webes Kapacitások (PWA)**: A `manifest.json` és `sw.js` (Service Worker) segítségével a rendszer asztali és mobil eszköztől függetlenül alkalmazásként "Telepíthető a kezdőképernyőre" (Add to Home Screen).

## 3. Beépített Funkciók és Iparági Standardok

A rendszer a modern versenyigazgatás és felhasználói élmény követelményeinek megfelelően a következő fejlett funkciókat biztosítja integráltan:
1. **PWA és Telepíthetőség**: App-szerű működés, asztali vagy mobil ikonként futtatható elszeparált keretrendszerben.
2. **Élő Értesítések (Push Notifications)**: Közvetlen böngészős értesítések felugrása rajt vagy egyéb adminisztratív esemény esetén.
3. **Barion Fizetési Kapu Integráció**: A nevezési folyamat éles Barion API-n keresztül végzi a bankkártyás fizetést, intelligens fallback/szimulációs réteggel kiegészítve, amely biztosítja a flow működését tesztkörnyezetben is.
4. **Valós idejű WebSockets Szinkronizáció**: Késleltetésmentes adminisztrációs felület a több felhasználó (párhuzamos ügyintézés) közötti szinkronhoz.
5. **Dinamikus Analytics Vezérlőpult**: Folyamatosan frissülő infografika az adminisztrációs kezdőfelületen, mellyel vezetői rálátás nyerhető.
6. **XLSX Export**: Egyetlen kattintással letölthető az összes regisztrált versenyző és azok végleges időeredménye professzionális Excel formába.

## 4. Működés műszaki feltételei
- **Környezet**: v16.x vagy újabb Node.js a szerver futtatásához és 3001-es port használatához.
- **Kliens**: Modern, JavaScriptet és WebSockets/PWA-t támogató webböngésző (Chrome, Safari, Edge javallott).
- **Függőségek (Backend)**: `express`, `cors`, `@supabase/supabase-js`, `dotenv`, `socket.io`. Telepítésük a gyökérmappában futtatott `npm install` paranccsal történetesíthető meg.
- **Külső Szolgáltatás**: Konfigurált Supabase adatbázis hozzáférés megadása a titkosított `.env` fájl `SUPABASE_URL` és `SUPABASE_KEY` változóiban.

## 5. Használati útmutató és Üzembe helyezés

### Rendszer Telepítése és Futtatása (Helyi Futtatás)
1. Töltse le, esetleg klónozza a projekt teljes forráskódját lokális számítógépére.
2. Nyisson egy dedikált terminált és lépjen a projekt főkönyvtárába.
3. Futtassa le az `npm install` parancsot a `.json` szintű `node_modules` csomagok automatikus telepítéséhez.
4. Adatbázis csatlakozáshoz másolja le vagy hozza létre a környezeti `.env` fájlt (*figyelem: sosem kerül feltöltésre publikus Git tárhelyre!*) és töltse fel az érvényes API kulcsokkal.
5. Indítsa el a szolgáltató állomást a `node server.js` terminál parancs kiadásával.
6. A klienseken tallózza a `http://localhost:3001` (vagy adott gép helyi IP címe:3001) URL címet böngészőből.

### Publikus Versenyzői Regisztráció
- A lenyűgöző dizájnú nyitólapon kattintson a "NEVEZÉS / REGISZTRÁCIÓ" célravezető gombra.
- Válassza ki a versenyszámot, a specifikus kategóriát, majd töltse ki saját adataival az intelligens beviteli mezőket (Név, Születési Dátum alapján kalkulált kategórialimit, Ötpróba ID opcionálisan).
- Az ÁSZF elfogadását követően átirányításra kerül a hitelesített Barion fizetési átjáróhoz, ahol biztonságosan rendezheti a nevezési díjat (teszt környezetben tranzakció szimulációval kiegészítve).
- A sikeres lezárultával Push Notifikáció érkezett üzenetet kap, és az eredménytáblára automatikusan felkerül neve 'Pendig' státuszban.

### Zártkörű Adminisztrációs Rendszer
- Irányítsa böngészőjét a központi bal oldalon található vagy linkelt Adminisztráció (`management.html`) oldalra.
- Adja meg az Adminisztrátor belépőkódot (Alapértelmezett rendszerkód megragadásnál: `dragon2026`).
- **Analitika**: Azonnal rálát a vizuális Chart.js grafikonokra behatoláskor (Adatkezelés menü), ami a résztvevők arányát szűri valósan frissülve.
- **Adatkezelés és Keresés**: Az 'Adatkezelés' menüpont valós idejű, rendkívül gyors keresővel, valamint inline (táblázaton belüli) módosítási és törlési funkcióval rendelkezik az esetleges adathibák másodpercek alatti javítására.
- **Jelenlét és Befizetés követése**: Az admin táblázatban dedikált check-box segítségével pipálható a helyszínen 'Megjelent' státusz, és automatikusan jelzi a Barion-al 'Befizetve' flaget.
- **Rajt Funkciók (Indítópult)**: Élesítheti a versenytávokat kategóriánként - a WebSocket kapcsolat miatt az indítás minden versenyző és adminisztrátor gépre századmásodpercre elterjedően rögzítve jelzi a futó tikkert (órát).
- **Élő Kontroll (Célvonal)**: Érkező hajók regisztrációs számának pontos begépelésével regisztrálható a megállított befutó idő. Rendszere ez alapján azonnali kalkulálással frissíti az eredménytábla (Scoreboard) hivatalos sorrendjét.
