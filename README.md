# L'Espaseta Backyard Ultra Bellpuig

Web estàtica d'una sola pàgina per a la cursa d'ultra resistència **L'Espaseta Backyard Ultra Bellpuig**: una volta de 6,706 km cada hora, fins que només en quedi un en peu.

## Característiques

- Disseny modern amb estètica *developer* i paleta corporativa (`#3f534f`, `#5e7969`, `#dad6c7`)
- Hero amb efecte de constel·lació minimalista interactiu (canvas)
- Efectes *parallax* en fer scroll
- Track del recorregut en SVG generat des del KML oficial, dibuixat progressivament segons el scroll
- Barra de navegació fixa amb menú mòbil i secció activa destacada
- Seccions: Què és una Backyard?, Recorregut, Bellpuig i Contacte
- Optimitzada per a Lighthouse: contrast AA, sense CLS, scripts diferits, `prefers-reduced-motion`, HTML semàntic i accessible

## Estructura

```
index.html              Pàgina única
css/styles.css          Estils (tema, parallax, responsive)
js/main.js              Constel·lació, parallax, track animat, navegació
js/track-data.js        Coordenades del recorregut (extretes del KML)
logo.png                Imatge corporativa
Espaseta Backyard 2025.kml   Traçat original (Google Earth)
```

## Ús local

Obre `index.html` directament al navegador, o serveix la carpeta:

```bash
npx serve .
```

## Desplegament (GitHub Pages)

El workflow `.github/workflows/deploy.yml` desplega automàticament la web a GitHub Pages amb cada `push` a `main`.

Configuració un cop creat el repositori:

1. **Settings → Pages → Build and deployment → Source**: selecciona **GitHub Actions**.
2. Fes push a `main` i la web estarà disponible a `https://<usuari>.github.io/<repositori>/`.

## Contacte

- Instagram: [@backyard_espaseta_bellpuig](https://www.instagram.com/backyard_espaseta_bellpuig/)
- Correu: [espasetabackyard@gmail.com](mailto:espasetabackyard@gmail.com)
