# WatchListo

Catálogo personal de Netflix, Prime Video, Disney+ y HBO Max en Argentina, con filtros por género, rating (TMDB, IMDb, Rotten Tomatoes, Metacritic), festivales curados por género y listas propias. Se instala como app desde el navegador.

## Seguridad

- El repositorio no contiene ninguna clave. Las claves de TMDB, OMDb y el token de GitHub se guardan solo en el navegador de cada dispositivo.
- La página tiene una política de seguridad de contenido estricta: no ejecuta scripts de terceros ni código embebido, y solo se conecta con TMDB, OMDb y la API de GitHub.
- Las listas se sincronizan en un Gist secreto. El token de GitHub necesita únicamente el permiso **Gists: Read and write**.
- Si perdés un dispositivo, revocá el token en GitHub (Settings → Developer settings → Personal access tokens) y creá uno nuevo.

Este producto usa la API de TMDB pero no está avalado ni certificado por TMDB. Disponibilidad en streaming provista por JustWatch a través de TMDB.

## Curaduría

`curaduria.json` tiene etiquetas hechas a mano (subgénero, temas, tono, sección y parientes) para unos 634 títulos, repartidos en 51 secciones y 15 géneros (terror, ciencia ficción, thriller y crimen, drama, cine argentino y latino, comedia, romance, animación, acción y aventura, fantasía, bélico, western, música, documental y series). Las recomendaciones las usan cuando el título está en la base, y el botón **Festivales** arma un festival a partir de cualquier sección. Se regenera con `python3 tools/build_curaduria.py`, que valida el vocabulario, que cada pariente exista y que cada sección pertenezca a un solo género.

## Festivales y tu gusto

Un festival es una lista con títulos base: se completa sola con parecidas y se guarda y sincroniza igual que cualquier lista. Se arma desde el botón **Festivales** (a mano, con lo que más te gustó o desde una sección prearmada), desde la ficha de un título o desde una lista.

Las vistas y las estrellas afinan las recomendaciones y los festivales: 5★ y 4★ empujan para arriba lo parecido, 2★ y 1★ lo empujan para abajo (y lo puntuado así nunca se recomienda), 3★ es neutro. El efecto crece a medida que puntuás más títulos. Puntuar un título lo marca como visto. En **Listas → Vistas** está "Recomendaciones para vos".

## El acomodador

"Elegime una" abre un asistente que pregunta qué tipo de título, con qué ganas, qué género, hace tres duelos entre títulos conocidos ("¿más esta o más aquella?") y pide época, duración y dónde verla. Con las respuestas arma un perfil de etiquetas de la curaduría, elige títulos base y usa el mismo motor de recomendaciones, que ya tiene en cuenta vistas y estrellas. Con varios títulos puntuados ofrece elegir "a ciegas" directo desde tu gusto, y sigue estando la opción de una al azar con los filtros del momento.

## De a dos

Para elegir con otra persona. Cada uno puede generar un link con su gusto (lo que vio y sus estrellas, sin claves ni listas) desde **De a dos → Compartir mi gusto**; al abrirlo en otro WatchListo queda guardado en ese dispositivo. También se puede crear un perfil a mano y marcar en cada ficha lo que vio la otra persona. Con el modo de a dos activo:

- Se oculta solo lo que vieron los dos. Lo que vio uno solo puede aparecer, salvo que lo haya puntuado con 1 o 2 estrellas.
- El perfil de gusto combina a los dos: lo que les gustó a ambos pesa más y lo que a uno no le gustó resta aunque el otro no lo haya visto.
- Recomendaciones, festivales y El acomodador usan ese perfil, y explican si una la vio uno solo ("Juli la vio y le encantó; vos no").

## Otros detalles

- **Cine de la India:** el filtro "Ocultar cine de la India" (activado por defecto) saca Bollywood y las demás industrias indias por idioma original, en catálogo, recomendaciones y festivales. Las búsquedas por título y tus listas no se filtran.
- **Botón Atrás:** cada ficha, diálogo o vista especial suma una entrada al historial, así Atrás vuelve a la pantalla anterior (por ejemplo, de "Más como esta" a la ficha de la que venías). En la pantalla principal hay que tocarlo dos veces seguidas para salir.
- **Rumbo de un festival:** cada festival muestra las etiquetas de sus pelis base. Sacar una oculta los títulos en los que lo sacado pesa más que lo que queda (por ejemplo, sin "Bélico" se van las de guerra y acción y quedan los dramas de guerra) y orienta lo que se suma después. Es reversible y se sincroniza con la lista.
- **Perfil:** vistas recientes, listas y festivales, watch buddies y un resumen de tu gusto (género, etiquetas, tono y década favoritas, horas en pantalla, promedio, joya escondida, opinión impopular).
- **En el celu:** barra inferior con Catálogo, Listas, Elegime, Festivales y Perfil; Ajustes está dentro de Perfil.
