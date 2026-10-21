# WatchListo

Catálogo personal de Netflix, Prime Video, Disney+ y HBO Max en Argentina, con filtros por género, rating (TMDB, IMDb, Rotten Tomatoes, Metacritic), festivales curados por género y listas propias. Se instala como app desde el navegador.

## Seguridad

- El repositorio no contiene ninguna clave. Las claves de TMDB, OMDb y el token de GitHub se guardan solo en el navegador de cada dispositivo.
- La página tiene una política de seguridad de contenido estricta: no ejecuta scripts de terceros ni código embebido, y solo se conecta con TMDB, OMDb y la API de GitHub.
- Las listas se sincronizan en un Gist secreto. El token de GitHub necesita únicamente el permiso **Gists: Read and write**.
- Si perdés un dispositivo, revocá el token en GitHub (Settings → Developer settings → Personal access tokens) y creá uno nuevo.

Este producto usa la API de TMDB pero no está avalado ni certificado por TMDB. Disponibilidad en streaming provista por JustWatch a través de TMDB.

## Curaduría

`curaduria.json` tiene etiquetas hechas a mano (subgénero, temas, tono, sección y parientes) para unos 635 títulos, repartidos en 51 secciones y 15 géneros (terror, ciencia ficción, thriller y crimen, drama, cine argentino y latino, comedia, romance, animación, acción y aventura, fantasía, bélico, western, música, documental y series). Las recomendaciones las usan cuando el título está en la base, y el botón **Festivales** arma un festival a partir de cualquier sección. Se regenera con `python3 tools/build_curaduria.py`, que valida el vocabulario, que cada pariente exista y que cada sección pertenezca a un solo género.

## Festivales y tu gusto

Un festival es una lista con títulos base: se completa sola con parecidas y se guarda y sincroniza igual que cualquier lista. Se arma desde el botón **Festivales** (a mano, con lo que más te gustó o desde una sección prearmada), desde la ficha de un título o desde una lista.

Las vistas y las estrellas afinan las recomendaciones y los festivales: 5★ y 4★ empujan para arriba lo parecido, 2★ y 1★ lo empujan para abajo (y lo puntuado así nunca se recomienda), 3★ es neutro. El efecto crece a medida que puntuás más títulos. Puntuar un título lo marca como visto. En **Listas → Vistas** está "Recomendaciones para vos".
