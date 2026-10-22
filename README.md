# WatchListo

Catálogo personal de tus servicios de streaming en Argentina (Netflix, Prime Video, Disney+ y HBO Max de entrada; se suman los que tengas desde Perfil), con filtros por género, rating (TMDB, IMDb, Rotten Tomatoes, Metacritic), festivales curados por género y listas propias. Se instala como app desde el navegador.

## Seguridad

- El repositorio no contiene ninguna clave. Las claves de TMDB y OMDb se guardan en el navegador de cada dispositivo; con cuenta, el administrador las publica en Firestore y solo las leen los invitados.
- La página tiene una política de seguridad de contenido estricta: no ejecuta scripts de terceros ni código embebido, y solo se conecta con TMDB, OMDb, Firebase, Torrentio, Wikidata y el Worker propio que consulta JustWatch. El único contenido externo embebido es el reproductor de tráileres de YouTube (dominio sin cookies, en un marco aislado).
- Las listas se sincronizan con la cuenta de Google (Firestore). La sincronización vieja por GitHub (Gist) y el código QR para vincular dispositivos se sacaron: al abrir la app, el token de GitHub que hubiera quedado guardado se borra del dispositivo.

Este producto usa la API de TMDB pero no está avalado ni certificado por TMDB. Disponibilidad en streaming provista por JustWatch a través de TMDB.

## Curaduría

`curaduria.json` tiene etiquetas hechas a mano (subgénero, temas, tono, sección y parientes) para unos 634 títulos, repartidos en 51 secciones y 15 géneros (terror, ciencia ficción, thriller y crimen, drama, cine argentino y latino, comedia, romance, animación, acción y aventura, fantasía, bélico, western, música, documental y series). Las recomendaciones las usan cuando el título está en la base, y el botón **Festivales** arma un festival a partir de cualquier sección. Se regenera con `python3 tools/build_curaduria.py`, que valida el vocabulario, que cada pariente exista y que cada sección pertenezca a un solo género.

## Festivales y tu gusto

Un festival es una lista con títulos base: se completa sola con parecidas y se guarda y sincroniza igual que cualquier lista. Las pelis base son parte del festival: van primero, con la marca **Base**, y aparecen aunque ya las hayas visto (con su sello de vista). Para sacar una, abrila y tocá "Sacar del festival". Se arma desde el botón **Festivales** (a mano, con lo que más te gustó o desde una sección prearmada), desde la ficha de un título o desde una lista.

Las vistas y las estrellas afinan las recomendaciones y los festivales: 5★ y 4★ empujan para arriba lo parecido, 2★ y 1★ lo empujan para abajo (y lo puntuado así nunca se recomienda), 3★ es neutro. El efecto crece a medida que puntuás más títulos. Puntuar un título lo marca como visto. En **Listas → Vistas** está "Recomendaciones para vos".

## El acomodador

El botón **Random** abre un asistente que pregunta qué tipo de título, con qué ganas, qué género, hace tres duelos entre títulos conocidos ("¿más esta o más aquella?") y pide época, duración y dónde verla. Con las respuestas arma un perfil de etiquetas de la curaduría, elige títulos base y usa el mismo motor de recomendaciones, que ya tiene en cuenta vistas y estrellas. Con varios títulos puntuados ofrece elegir "a ciegas" directo desde tu gusto, y sigue estando la opción de una al azar con los filtros del momento.

## De a dos

Para elegir con otra persona. Cada uno puede generar un link con su gusto (lo que vio y sus estrellas, sin claves ni listas) desde **De a dos → Compartir mi gusto**; al abrirlo en otro WatchListo queda guardado en ese dispositivo. También se puede crear un perfil a mano y marcar en cada ficha lo que vio la otra persona. Con el modo de a dos activo:

- Se oculta solo lo que vieron los dos. Lo que vio uno solo puede aparecer, salvo que lo haya puntuado con 1 o 2 estrellas.
- El perfil de gusto combina a los dos: lo que les gustó a ambos pesa más y lo que a uno no le gustó resta aunque el otro no lo haya visto.
- Recomendaciones, festivales y El acomodador usan ese perfil, y explican si una la vio uno solo ("Juli la vio y le encantó; vos no").

## Otros detalles

- **Ojito de vistas:** al lado del orden (y de Filtros en el celu) hay un botón con un ojo que oculta o muestra lo que ya viste, el mismo filtro que está en el costado.
- **Cine de la India:** el filtro "Ocultar cine de la India" (activado por defecto) saca Bollywood y las demás industrias indias por idioma original, en catálogo, recomendaciones y festivales. Las búsquedas por título y tus listas no se filtran.
- **Botón Atrás:** cada ficha, diálogo o vista especial suma una entrada al historial, así Atrás vuelve a la pantalla anterior (por ejemplo, de "Más como esta" a la ficha de la que venías). En la pantalla principal hay que tocarlo dos veces seguidas para salir.
- **Rumbo de un festival:** cada festival muestra las etiquetas de sus pelis base. Sacar una oculta los títulos en los que lo sacado pesa más que lo que queda (por ejemplo, sin "Bélico" se van las de guerra y acción y quedan los dramas de guerra) y orienta lo que se suma después. Es reversible y se sincroniza con la lista.
- **Perfil:** vistas recientes, listas y festivales, watch buddies y un resumen de tu gusto (género, etiquetas, tono y década favoritas, horas en pantalla, promedio, joya escondida, opinión impopular).
- **En el celu:** barra inferior con Catálogo, Listas, Random, Festivales y Perfil; Ajustes está dentro de Perfil.

## Cuentas (Firebase, por invitación)

Opcional: sin sesión todo sigue funcionando en el dispositivo. Con **Entrar con Google** (en Perfil o en la bienvenida):

- Tus listas, vistas y estrellas se guardan en tu cuenta y se mezclan con las del dispositivo sin pisar nada.
- Las claves de TMDB y OMDb llegan configuradas a los invitados (las publica el administrador).
- **Watch buddies:** invitación por link; cada uno decide quién ve su gusto. Aparecen en De a dos.
- **Listas y festivales compartidos:** desde la barra de listas, "Compartir" con uno o más buddies. Cada cambio se guarda campo por campo, así dos personas pueden editar a la vez. Un festival compartido de a dos se programa con el gusto de los dos.
- **OMDb compartido:** cada puntaje se consulta una vez y queda guardado para todos.
- **Invitados:** el administrador los maneja desde Perfil → Invitados. Solo esos mails pueden entrar.
- **Pedidos de acceso:** quien entra con Google sin estar invitado toca **Pedir acceso**. El pedido aparece arriba de todo en Perfil del administrador (con un aviso rojo en la pestaña Perfil); al aprobarlo, la otra persona entra sola, sin volver a loguearse.
- **Links para compartir:** la invitación a watch buddy y el link para invitados van con un mensaje corto que cuenta qué hace la app.

La configuración web de Firebase está en `app.js` (no es secreta). Quién puede leer y escribir qué lo deciden las reglas de `firestore.rules`, que se pegan en Firebase → Firestore → Reglas.

## Instalación

Abierta desde el navegador de un celular, la app pide instalarse primero (en Android con un toque; en iPhone desde Compartir → Agregar a inicio). Se puede seguir en el navegador igual.

## Estrellas

1 **Mala** (no me gustó, no la recomendaría) · 2 **Decente** (no es para mí, aunque no la pasé mal) · 3 **Buena** (la disfruté; tiene sus defectos, pero cumple) · 4 **Excelente** (me encantó, la recomiendo sin dudar) · 5 **Increíble** (memorable, un clásico que marca un antes y un después). Pasando el mouse o deslizando el dedo sobre las estrellas aparece qué significa cada una. Para las recomendaciones, 3 ya suma un poco, 4 y 5 suman fuerte, 2 resta un poco y 1 resta fuerte.

## Personas

Las fichas muestran dirección, guion, música y fotografía. Cada nombre abre su filmografía por rol y desde ahí se arma una **Retrospectiva** (su obra, lo mejor primero) o un **Festival en su onda** (arranca de sus mejores títulos y se completa con parecidos).

## Tus servicios

En **Perfil → Tus servicios** se prenden los que tenés, de la lista de servicios por suscripción que JustWatch informa para Argentina (las variantes con anuncios se agrupan, las tiendas de alquiler y los canales no aparecen). El catálogo, los filtros, el acomodador y los badges usan solo esos. La elección viaja con tus datos, así que vale en todos tus dispositivos.

## Stremio (vía Torrentio)

Con Stremio prendido en Tus servicios, cada título que aparece en pantalla se consulta en Torrentio, el addon de Stremio. Si tiene fuentes, la tarjeta muestra **Stremio** con la mejor calidad (y **LAT** si hay audio latino) y la ficha detalla calidad, HDR o Dolby Vision, audio latino, castellano o multiaudio, y botones para abrir en Stremio. Si no hay nada, no se muestra. Las consultas van de a dos, solo para lo visible, y quedan guardadas unos días en el dispositivo. Torrentio ve qué títulos consultás y desde qué IP; se apaga con el mismo botón.

## Calidad e idiomas por servicio (JustWatch)

La ficha muestra, por cada servicio, la mejor calidad (SD, HD, 4K), Dolby Vision o HDR, Atmos o 5.1, y los idiomas de audio y subtítulos. Marca **Solo doblada** cuando una peli que no es en español solo tiene audio en español, y **Sin audio en español** cuando no lo tiene. El dato es de JustWatch; algunos servicios (Netflix, por ejemplo) no informan idiomas.

JustWatch no deja que otras páginas lo consulten desde el navegador, así que la app le pregunta a un Worker de Cloudflare propio (`tools/justwatch-worker.js`): solo le responde a esta página, no usa claves y guarda cada respuesta un día. Para instalarlo: Cloudflare → Workers & Pages → Create Worker, pegar el archivo y publicar. Su dirección va en `JW_PROXY` (`app.js`) y en `connect-src` de `index.html`. Sin Worker configurado, la ficha muestra la lista simple de servicios y un link a JustWatch.

**Respaldo de puntajes.** El Worker (versión 2) también devuelve los puntajes de IMDb y Rotten Tomatoes que tiene JustWatch. Cuando OMDb llega al tope de consultas del día (o rechaza la clave), la app sigue con JustWatch sin que haya que hacer nada: primero mira los puntajes de OMDb que ya consultó alguien de la app y, si no están, le pregunta al Worker. A JustWatch le falta el Tomatometer de algunas películas conocidas (Talk to Me, El conjuro) y no tiene Metacritic: eso se busca en Wikidata, la base de datos abierta de Wikipedia (sin clave, datos de uso libre), que los tiene para muchas películas aunque a veces con unos meses de atraso. Lo que viene de JustWatch o de Wikidata queda marcado (la ficha dice «vía JustWatch» o «vía JustWatch y Wikidata») y OMDb lo completa o lo corrige al día siguiente si es el puntaje que se está filtrando, o al abrir la ficha. Si el Worker publicado es el viejo, el panel de filtros avisa que hay que volver a pegar `tools/justwatch-worker.js` en Cloudflare.

## Ocultar lo que no te interesa

**No me interesa** (en el + de cada póster, en la ficha o en los resultados del acomodador) saca un título del catálogo, las recomendaciones, los festivales y el acomodador. Cuenta como un "no" suave para tu perfil de gusto. Las ocultas quedan en **Listas → Ocultas**, desde donde se vuelven a mostrar. Se sincronizan como el resto de tus datos.

## Ficha

Arriba, el póster con el título y cuatro íconos: Mi lista, vista, **+** (sumar a cualquier lista o crear una) y **⋯** (No me interesa y, en un festival, usar como base o sacar). Después: puntajes en chico con las etiquetas de la curaduría, tus estrellas (con **Quitar** si te equivocaste; si la vista se había marcado sola al puntuar, se desmarca), tagline, sinopsis, tráiler, ficha técnica (equipo, sección de la curaduría y parientes), tus listas con **Armar festival con esta**, dónde verla y, al pie, **Más como esta**: un carrusel que se busca recién cuando llegás ahí, con **Ver todas** para la vista completa.

- **Tráiler:** se ve en la misma ficha (miniatura con play). Sigue andando aunque puntúes o sumes a una lista, y se corta al cerrar.
- **Volver y cerrar:** el botón de cerrar queda siempre visible arriba (también debajo de la isla del iPhone). Si la ficha se abrió desde otra pantalla (por ejemplo, Random), aparece además un botón para volver. Instalada en iPhone, deslizar desde el borde izquierdo hace lo mismo que el Atrás de Android. Las vistas de una persona, "Más como esta" y las búsquedas tienen **Volver** arriba a la izquierda.

## Listas

Arriba, pestañas para elegir la lista (más **+ Nueva**). Debajo del título, qué es la lista (festival, compartida) y sus acciones: Parecidas y Armar festival, o Sumar 10 más en un festival; lo demás (compartir, renombrar, borrar o salir) está en **⋯**. El rumbo de un festival se despliega cuando hace falta.

## Más resultados

Al llegar al final, si lo que hay no alcanza, la app le pide a TMDB otra tanda de tus servicios con los filtros puestos (género, años, duración, rating de TMDB y orden), hasta avisar que no hay más. Con un mínimo de IMDb, Rotten Tomatoes o Metacritic, los puntajes que faltan se traen solos para lo que cumple el resto de los filtros: de OMDb mientras tenga consultas, y de JustWatch cuando se le acaban (IMDb y Rotten Tomatoes).
