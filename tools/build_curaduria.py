"""Construye curaduria.json: etiquetas de curaduría para recomendar.

Formato de cada línea (separado por |):
  id | título internacional | título original o - | año | m (peli) o t (serie) | subgéneros | temas | tono | sección | parientes

Los parientes son ids de otras líneas. El script valida el vocabulario y los parientes.
Uso: python3 tools/build_curaduria.py
"""
import json, os, sys

LABELS = {
    'sub': {
        'folk': 'Folk horror', 'cosmico': 'Horror cósmico', 'autor': 'Terror de autor', 'sobrenatural': 'Sobrenatural',
        'posesion': 'Posesión', 'brujeria': 'Brujería', 'sectas': 'Sectas', 'casa': 'Casa embrujada', 'fantasmas': 'Fantasmas',
        'slasher': 'Slasher', 'giallo': 'Giallo', 'body': 'Body horror', 'found': 'Found footage', 'criaturas': 'Criaturas',
        'vampiros': 'Vampiros', 'zombis': 'Zombis', 'licantropos': 'Licántropos', 'psicologico': 'Psicológico', 'gotico': 'Gótico',
        'jhorror': 'J-horror', 'khorror': 'Terror coreano', 'survival': 'Supervivencia', 'invasion': 'Invasión de hogar',
        'antologia': 'Antología', 'comedia': 'Comedia de terror', 'scifi': 'Ciencia ficción', 'religioso': 'Terror religioso',
        'satanico': 'Satanismo', 'apocaliptico': 'Apocalíptico', 'psicodelico': 'Psicodélico', 'ecologico': 'Naturaleza hostil',
        'thriller': 'Thriller', 'satira': 'Sátira', 'mockumentary': 'Falso documental', 'animacion': 'Animación', 'western': 'Western',
    },
    'tem': {
        'duelo': 'duelo', 'maternidad': 'maternidad', 'paternidad': 'paternidad', 'familia': 'familia', 'fe': 'fe', 'culpa': 'culpa',
        'aislamiento': 'aislamiento', 'locura': 'locura', 'paranoia': 'paranoia', 'trauma': 'trauma', 'adolescencia': 'adolescencia',
        'infancia': 'infancia', 'pareja': 'pareja', 'comunidad': 'comunidad', 'ritual': 'ritual', 'naturaleza': 'naturaleza',
        'bosque': 'bosque', 'mar': 'mar', 'invierno': 'invierno', 'tecnologia': 'tecnología', 'medios': 'medios', 'cine': 'cine',
        'arte': 'arte', 'identidad': 'identidad', 'cuerpo': 'cuerpo', 'memoria': 'memoria', 'tiempo': 'tiempo', 'suenos': 'sueños',
        'clase': 'clase social', 'racismo': 'racismo', 'deseo': 'deseo', 'sexualidad': 'sexualidad', 'enfermedad': 'enfermedad',
        'vejez': 'vejez', 'herencia': 'herencia', 'soledad': 'soledad', 'obsesion': 'obsesión', 'venganza': 'venganza',
        'tradicion': 'tradición', 'colonialismo': 'colonialismo', 'guerra': 'guerra', 'ciencia': 'ciencia', 'apocalipsis': 'fin del mundo',
        'adiccion': 'adicción', 'violencia': 'violencia', 'amistad': 'amistad', 'poder': 'poder', 'politica': 'política',
        'genero': 'género', 'consumo': 'consumo', 'muerte': 'muerte',
    },
    'ton': {
        'lento': 'lento', 'atmosferico': 'atmosférico', 'perturbador': 'perturbador', 'sangriento': 'sangriento', 'ludico': 'lúdico',
        'onirico': 'onírico', 'sombrio': 'sombrío', 'tenso': 'tenso', 'bizarro': 'bizarro', 'melancolico': 'melancólico',
        'visceral': 'visceral', 'satirico': 'satírico', 'angustiante': 'angustiante', 'contemplativo': 'contemplativo', 'pulp': 'pulp',
    },
    'sec': {
        'folk': 'Folk y ritual', 'cosmos': 'Horror cósmico', 'duelo': 'Duelo y familia', 'cuerpos': 'Cuerpos que mutan',
        'clasicos': 'Gótico y clásicos', 'asia': 'Nueva ola asiática', 'found': 'Metraje encontrado', 'slashers': 'Slashers y giallo',
        'pesadilla': 'Psicodelia y pesadilla', 'espanol': 'Terror iberoamericano', 'mente': 'Mente rota', 'fe': 'Fe, demonios y posesión',
        'encierro': 'Encierro y supervivencia', 'satira': 'Sátira y horror social', 'risas': 'Risas y sangre', 'casas': 'Casas y fantasmas',
        'criaturas': 'Criaturas', 'antologias': 'Antologías', 'series': 'Series', 'vampiros': 'Colmillos',
    },
}

DATA = r"""
wicker-man|The Wicker Man|-|1973|m|folk,sectas|ritual,fe,comunidad,sexualidad|atmosferico,perturbador|folk|midsommar,the-witch,apostle,blood-satans-claw,kill-list
blood-satans-claw|The Blood on Satan's Claw|-|1971|m|folk,satanico|ritual,adolescencia,comunidad,fe|atmosferico,perturbador|folk|wicker-man,witchfinder-general,the-witch,a-field-in-england
witchfinder-general|Witchfinder General|-|1968|m|folk,brujeria|fe,poder,violencia,guerra|sombrio,visceral|folk|blood-satans-claw,the-witch,a-field-in-england,hagazussa
the-witch|The Witch|-|2015|m|folk,brujeria,autor|fe,familia,aislamiento,adolescencia,bosque|lento,atmosferico,perturbador|folk|wicker-man,hagazussa,the-lighthouse,hereditary,witchfinder-general,you-wont-be-alone
midsommar|Midsommar|-|2019|m|folk,sectas,autor|duelo,pareja,ritual,comunidad|perturbador,contemplativo|folk|wicker-man,hereditary,apostle,the-witch,men
apostle|Apostle|-|2018|m|folk,sectas|fe,comunidad,ritual,aislamiento|sangriento,sombrio|folk|wicker-man,midsommar,kill-list,the-ritual,dagon
kill-list|Kill List|-|2011|m|folk,sectas,thriller|culpa,violencia,ritual,pareja|perturbador,sombrio|folk|wicker-man,a-field-in-england,apostle,in-the-earth
a-field-in-england|A Field in England|-|2013|m|folk,psicodelico|guerra,locura,poder|bizarro,onirico|folk|witchfinder-general,kill-list,enys-men,in-the-earth
the-ritual|The Ritual|-|2017|m|folk,criaturas,survival|duelo,culpa,amistad,bosque|tenso,atmosferico|folk|the-descent,apostle,blair-witch,midsommar,the-empty-man
enys-men|Enys Men|-|2022|m|folk,psicodelico|aislamiento,memoria,tiempo,naturaleza|onirico,contemplativo,lento|folk|a-field-in-england,wicker-man,men,the-lighthouse
men|Men|-|2022|m|folk,body,autor|duelo,culpa,genero,naturaleza|perturbador,onirico|folk|enys-men,midsommar,mother,antichrist
lamb|Lamb|Dýrið|2021|m|folk,autor|duelo,maternidad,naturaleza,pareja|lento,contemplativo,bizarro|folk|the-witch,men,hagazussa,enys-men
hagazussa|Hagazussa|-|2017|m|folk,brujeria|maternidad,aislamiento,locura,naturaleza|lento,atmosferico,perturbador|folk|the-witch,you-wont-be-alone,lamb,witchfinder-general
you-wont-be-alone|You Won't Be Alone|-|2022|m|folk,brujeria,autor|identidad,cuerpo,soledad|contemplativo,onirico|folk|hagazussa,the-witch,lamb
gretel-hansel|Gretel & Hansel|-|2020|m|folk,brujeria|infancia,familia,bosque|atmosferico,sombrio|folk|the-witch,hagazussa,you-wont-be-alone
in-the-earth|In the Earth|-|2021|m|folk,psicodelico|ciencia,naturaleza,bosque,enfermedad|bizarro,perturbador|folk|a-field-in-england,kill-list,the-ritual,gaia
gaia|Gaia|-|2021|m|ecologico,body,folk|naturaleza,fe,familia|atmosferico,perturbador|folk|in-the-earth,annihilation,the-ritual
the-craft|The Craft|-|1996|m|brujeria|adolescencia,amistad,poder|ludico|folk|the-love-witch,suspiria-77
the-love-witch|The Love Witch|-|2016|m|brujeria,satira|deseo,genero|ludico,bizarro|pesadilla|suspiria-77,pearl,the-craft
lords-of-salem|The Lords of Salem|-|2012|m|brujeria,satanico|adiccion,herencia|onirico,bizarro|fe|the-witch,suspiria-18,rosemarys-baby
cuando-acecha|When Evil Lurks|Cuando acecha la maldad|2023|m|posesion,apocaliptico,folk|familia,paternidad,culpa,comunidad|sangriento,angustiante|espanol|the-wailing,aterrados,exhuma,talk-to-me,evil-dead-rise
exhuma|Exhuma|파묘|2024|m|khorror,folk,sobrenatural|herencia,ritual,familia,tradicion|tenso,atmosferico|asia|the-wailing,cuando-acecha,noroi
the-wailing|The Wailing|곡성|2016|m|khorror,posesion,folk|fe,paternidad,paranoia,comunidad|angustiante,perturbador|asia|exhuma,cuando-acecha,the-exorcist,noroi,incantation
noroi|Noroi: The Curse|ノロイ|2005|m|found,jhorror,folk|ritual,medios,obsesion|perturbador,angustiante|found|lake-mungo,incantation,the-wailing,blair-witch
annihilation|Annihilation|-|2018|m|scifi,cosmico,body|identidad,cuerpo,duelo,naturaleza|onirico,perturbador|cosmos|color-out-of-space,under-the-skin,the-endless,the-thing,in-the-earth
color-out-of-space|Color Out of Space|-|2019|m|cosmico,body|familia,locura,naturaleza|bizarro,perturbador|cosmos|annihilation,the-void,from-beyond,mandy,the-thing
the-thing|The Thing|-|1982|m|criaturas,body,scifi|paranoia,aislamiento,invierno,identidad|tenso,visceral|cosmos|alien,in-the-mouth-of-madness,the-void,annihilation,event-horizon
in-the-mouth-of-madness|In the Mouth of Madness|-|1994|m|cosmico,psicologico|locura,arte,identidad|bizarro,perturbador|cosmos|prince-of-darkness,the-thing,the-endless,the-empty-man
prince-of-darkness|Prince of Darkness|-|1987|m|cosmico,religioso|fe,ciencia|tenso,sombrio|cosmos|in-the-mouth-of-madness,the-thing,the-void
the-void|The Void|-|2016|m|cosmico,body,sectas|fe,muerte,duelo|visceral,sangriento|cosmos|color-out-of-space,the-thing,hellraiser,prince-of-darkness
the-endless|The Endless|-|2017|m|cosmico,sectas,scifi|tiempo,familia,comunidad|tenso,bizarro|cosmos|resolution,the-void,coherence,annihilation
resolution|Resolution|-|2012|m|cosmico,psicologico|adiccion,amistad,medios|tenso,bizarro|cosmos|the-endless,coherence
the-empty-man|The Empty Man|-|2020|m|cosmico,sectas|duelo,obsesion,identidad|atmosferico,perturbador|cosmos|the-ritual,in-the-mouth-of-madness,it-follows,the-endless
event-horizon|Event Horizon|-|1997|m|scifi,cosmico|culpa,locura|sangriento,tenso|cosmos|the-thing,alien,hellraiser,the-void
from-beyond|From Beyond|-|1986|m|cosmico,body|ciencia,deseo|bizarro,sangriento|cosmos|re-animator,color-out-of-space,hellraiser,dagon
dagon|Dagon|-|2001|m|cosmico,sectas|mar,comunidad,herencia|atmosferico,bizarro|cosmos|from-beyond,the-lighthouse,re-animator,apostle
the-mist|The Mist|-|2007|m|criaturas,cosmico|fe,comunidad,paranoia|angustiante,sombrio|criaturas|the-thing,a-quiet-place,pontypool
under-the-skin|Under the Skin|-|2013|m|scifi,autor|identidad,cuerpo,soledad|contemplativo,perturbador|cosmos|annihilation,possessor,beyond-black-rainbow
coherence|Coherence|-|2013|m|scifi,psicologico|identidad,pareja,amistad|tenso|cosmos|the-endless,resolution,possessor
underwater|Underwater|-|2020|m|criaturas,cosmico|mar,aislamiento|tenso|criaturas|alien,the-descent,event-horizon
alien|Alien|-|1979|m|scifi,criaturas|cuerpo,aislamiento,tecnologia|tenso,atmosferico|criaturas|the-thing,event-horizon,the-descent
nope|Nope|-|2022|m|criaturas,scifi|medios,cine,familia|tenso,ludico|criaturas|jaws,get-out,us,the-birds
mandy|Mandy|-|2018|m|psicodelico,sectas|duelo,venganza,pareja|onirico,sangriento|pesadilla|beyond-black-rainbow,color-out-of-space,the-void,in-the-earth
beyond-black-rainbow|Beyond the Black Rainbow|-|2010|m|psicodelico,scifi|identidad,ciencia,adolescencia|onirico,lento|pesadilla|mandy,under-the-skin,possessor,i-saw-the-tv-glow
pontypool|Pontypool|-|2008|m|zombis,cosmico|medios,comunidad|tenso,bizarro|encierro|the-mist,28-days-later,rec
hereditary|Hereditary|-|2018|m|autor,sectas,sobrenatural|duelo,familia,maternidad,herencia|perturbador,angustiante|duelo|the-witch,midsommar,rosemarys-baby,the-babadook,the-dark-and-the-wicked,talk-to-me
the-babadook|The Babadook|-|2014|m|psicologico,sobrenatural|duelo,maternidad,culpa|angustiante,atmosferico|duelo|hereditary,goodnight-mommy,relic,the-orphanage
relic|Relic|-|2020|m|psicologico,casa|vejez,memoria,enfermedad,familia|lento,melancolico|duelo|the-babadook,the-night-house,hereditary,the-others
the-orphanage|The Orphanage|El orfanato|2007|m|fantasmas,casa|maternidad,duelo,infancia|melancolico,atmosferico|duelo|the-others,the-devils-backbone,the-babadook,the-innocents
dont-look-now|Don't Look Now|-|1973|m|psicologico,sobrenatural|duelo,pareja|atmosferico,melancolico|duelo|the-babadook,the-night-house,the-changeling,deep-red
pet-sematary|Pet Sematary|-|1989|m|sobrenatural|duelo,muerte,familia|sombrio|duelo|hereditary,the-dark-and-the-wicked,the-babadook
the-dark-and-the-wicked|The Dark and the Wicked|-|2020|m|sobrenatural,folk|familia,duelo,fe,culpa|sombrio,perturbador|duelo|hereditary,the-lodge,pet-sematary,the-witch
talk-to-me|Talk to Me|-|2022|m|posesion,sobrenatural|duelo,adolescencia,culpa|tenso,visceral|duelo|hereditary,bring-her-back,it-follows,smile
bring-her-back|Bring Her Back|-|2025|m|sectas,sobrenatural|duelo,maternidad,infancia|perturbador,visceral|duelo|talk-to-me,hereditary,the-babadook
the-lodge|The Lodge|-|2019|m|psicologico,sectas|duelo,fe,aislamiento,invierno|sombrio,lento|mente|goodnight-mommy,hereditary,the-dark-and-the-wicked,saint-maud
goodnight-mommy|Goodnight Mommy|Ich seh, Ich seh|2014|m|psicologico|maternidad,identidad,infancia|perturbador,lento|mente|the-lodge,the-babadook,speak-no-evil,a-tale-of-two-sisters
speak-no-evil|Speak No Evil|Gæsterne|2022|m|psicologico,thriller|clase,familia,poder|angustiante,perturbador|satira|funny-games,the-strangers,goodnight-mommy
saint-maud|Saint Maud|-|2019|m|religioso,psicologico,autor|fe,soledad,locura|perturbador,contemplativo|mente|the-lodge,repulsion,immaculate,mother
smile|Smile|-|2022|m|sobrenatural,psicologico|trauma,culpa,paranoia|tenso|mente|it-follows,talk-to-me,ringu
it-follows|It Follows|-|2014|m|sobrenatural|sexualidad,adolescencia,paranoia|atmosferico,tenso|mente|smile,the-empty-man,halloween,talk-to-me
the-night-house|The Night House|-|2020|m|fantasmas,psicologico|duelo,pareja,memoria|atmosferico,sombrio|casas|relic,a-ghost-story,dont-look-now,the-babadook
a-ghost-story|A Ghost Story|-|2017|m|fantasmas,autor|tiempo,duelo,memoria|contemplativo,melancolico|casas|the-night-house,the-others,skinamarink
lake-mungo|Lake Mungo|-|2008|m|found,mockumentary,fantasmas|duelo,familia,memoria|melancolico,angustiante|found|noroi,a-ghost-story,the-babadook,host
the-exorcist|The Exorcist|-|1973|m|posesion,religioso|fe,maternidad,infancia|angustiante,perturbador|fe|the-omen,rosemarys-baby,emily-rose,the-wailing,the-first-omen
the-omen|The Omen|-|1976|m|satanico,religioso|paternidad,fe,infancia|tenso,sombrio|fe|the-exorcist,rosemarys-baby,the-first-omen
rosemarys-baby|Rosemary's Baby|-|1968|m|satanico,psicologico,sectas|maternidad,paranoia,cuerpo|tenso,perturbador|fe|hereditary,the-omen,repulsion,immaculate,the-first-omen
emily-rose|The Exorcism of Emily Rose|-|2005|m|posesion,religioso|fe,ciencia|tenso|fe|the-exorcist,veronica,talk-to-me
the-first-omen|The First Omen|-|2024|m|religioso,satanico|fe,maternidad,cuerpo|perturbador,atmosferico|fe|the-omen,immaculate,rosemarys-baby,possession-81
immaculate|Immaculate|-|2024|m|religioso|maternidad,fe,cuerpo|sangriento,tenso|fe|the-first-omen,rosemarys-baby,saint-maud
late-night-devil|Late Night with the Devil|-|2023|m|posesion,mockumentary,found|medios,poder,culpa|tenso,pulp|fe|historia-de-lo-oculto,host,the-exorcist,lake-mungo
evil-dead-13|Evil Dead|-|2013|m|posesion,survival|adiccion,familia,bosque|sangriento,visceral|fe|evil-dead-81,evil-dead-rise,the-exorcist
evil-dead-rise|Evil Dead Rise|-|2023|m|posesion,survival|maternidad,familia|sangriento,visceral|fe|evil-dead-13,evil-dead-81,cuando-acecha,talk-to-me
the-conjuring|The Conjuring|-|2013|m|posesion,casa,sobrenatural|familia,fe|tenso|casas|insidious,sinister,poltergeist,the-exorcist
insidious|Insidious|-|2010|m|sobrenatural,casa|familia,suenos|tenso|casas|the-conjuring,poltergeist,sinister
sinister|Sinister|-|2012|m|sobrenatural,found|obsesion,familia,medios|tenso,perturbador|casas|the-conjuring,insidious,lake-mungo
poltergeist|Poltergeist|-|1982|m|casa,sobrenatural|familia,infancia,medios|tenso,ludico|casas|the-conjuring,insidious,the-changeling
evil-dead-81|The Evil Dead|-|1981|m|posesion,survival|amistad,bosque|sangriento,visceral|encierro|evil-dead-2,evil-dead-13,evil-dead-rise,cabin-in-the-woods,braindead
evil-dead-2|Evil Dead II|-|1987|m|posesion,comedia|bosque,locura|sangriento,ludico|risas|evil-dead-81,army-of-darkness,braindead,re-animator
army-of-darkness|Army of Darkness|-|1992|m|comedia,posesion|tiempo,violencia|ludico,pulp|risas|evil-dead-2,evil-dead-81,braindead
suspiria-77|Suspiria|-|1977|m|giallo,brujeria|arte,poder|onirico,sangriento|slashers|suspiria-18,deep-red,tenebrae,the-love-witch
suspiria-18|Suspiria|-|2018|m|brujeria,autor|culpa,maternidad,arte,guerra|perturbador,contemplativo|pesadilla|suspiria-77,hereditary,mother,the-love-witch
veronica|Veronica|Verónica|2017|m|posesion,sobrenatural|adolescencia,familia|tenso|espanol|emily-rose,the-orphanage,talk-to-me
nosferatu-22|Nosferatu|Nosferatu, eine Symphonie des Grauens|1922|m|vampiros,gotico|muerte,deseo,enfermedad|atmosferico|clasicos|nosferatu-79,nosferatu-24,vampyr,dracula-31
nosferatu-79|Nosferatu the Vampyre|Nosferatu: Phantom der Nacht|1979|m|vampiros,gotico|muerte,soledad,enfermedad|melancolico,contemplativo|clasicos|nosferatu-22,nosferatu-24,vampyr
nosferatu-24|Nosferatu|-|2024|m|vampiros,gotico,autor|deseo,obsesion,enfermedad|sombrio,atmosferico|clasicos|nosferatu-22,nosferatu-79,the-witch,the-lighthouse,crimson-peak
dracula-31|Dracula|-|1931|m|vampiros,gotico|deseo|atmosferico|clasicos|nosferatu-22,frankenstein-31
frankenstein-31|Frankenstein|-|1931|m|gotico,criaturas|ciencia,identidad|atmosferico|clasicos|bride-of-frankenstein,dracula-31,eyes-without-a-face
bride-of-frankenstein|Bride of Frankenstein|-|1935|m|gotico,criaturas,comedia|soledad,ciencia|ludico,atmosferico|clasicos|frankenstein-31,dracula-31
vampyr|Vampyr|-|1932|m|vampiros,gotico|muerte,suenos|onirico,lento|clasicos|nosferatu-22,haxan,carnival-of-souls
haxan|Häxan|-|1922|m|brujeria,mockumentary|fe,poder,genero|bizarro|clasicos|vampyr,witchfinder-general,the-witch
the-innocents|The Innocents|-|1961|m|fantasmas,gotico|infancia,sexualidad,locura|atmosferico,perturbador|clasicos|the-haunting,the-others,the-orphanage
the-haunting|The Haunting|-|1963|m|casa,fantasmas|soledad,locura|atmosferico,tenso|casas|the-innocents,the-others,the-changeling,hill-house
the-others|The Others|-|2001|m|fantasmas,gotico,casa|maternidad,fe,duelo|atmosferico,lento|casas|the-orphanage,the-innocents,the-haunting,crimson-peak
the-changeling|The Changeling|-|1980|m|fantasmas,casa|duelo,culpa|atmosferico|casas|the-haunting,the-others,dont-look-now
crimson-peak|Crimson Peak|-|2015|m|gotico,fantasmas|deseo,herencia|atmosferico|casas|the-others,the-innocents,nosferatu-24,the-devils-backbone
psycho|Psycho|-|1960|m|slasher,psicologico|identidad,maternidad|tenso|clasicos|halloween,repulsion,black-christmas
black-sunday|Black Sunday|La maschera del demonio|1960|m|gotico,brujeria|venganza,herencia|atmosferico|clasicos|black-sabbath,blood-and-black-lace,nosferatu-22
eyes-without-a-face|Eyes Without a Face|Les Yeux sans visage|1960|m|body,gotico|identidad,culpa,ciencia|melancolico,perturbador|cuerpos|frankenstein-31,the-fly,titane
carnival-of-souls|Carnival of Souls|-|1962|m|fantasmas,psicologico|soledad,muerte|onirico,atmosferico|clasicos|vampyr,the-innocents,the-others
night-living-dead|Night of the Living Dead|-|1968|m|zombis,survival|racismo,comunidad|tenso,sombrio|encierro|dawn-of-the-dead,28-days-later,rec
the-shining|The Shining|-|1980|m|casa,psicologico|locura,familia,aislamiento,invierno|tenso,perturbador|mente|the-lighthouse,session-9,the-haunting,repulsion
the-birds|The Birds|-|1963|m|ecologico|aislamiento,naturaleza|tenso|criaturas|jaws,nope,the-mist
jaws|Jaws|-|1975|m|criaturas|mar,comunidad|tenso|criaturas|the-host,nope,the-birds,alien
kwaidan|Kwaidan|怪談|1964|m|antologia,fantasmas,jhorror|tradicion,soledad|contemplativo,atmosferico|asia|onibaba,kuroneko,black-sabbath
onibaba|Onibaba|鬼婆|1964|m|jhorror,folk|guerra,deseo,maternidad|perturbador,atmosferico|asia|kuroneko,kwaidan
kuroneko|Kuroneko|藪の中の黒猫|1968|m|jhorror,fantasmas|venganza,guerra|atmosferico,melancolico|asia|onibaba,kwaidan
audition|Audition|オーディション|1999|m|psicologico,jhorror|soledad,deseo,venganza|perturbador,lento|asia|cure,tetsuo,ringu
ringu|Ringu|リング|1998|m|jhorror,sobrenatural|medios,maternidad,tecnologia|atmosferico,tenso|asia|ju-on,pulse,dark-water,noroi
ju-on|Ju-on: The Grudge|呪怨|2002|m|jhorror,casa,fantasmas|venganza,familia|tenso,perturbador|asia|ringu,dark-water,pulse
pulse|Pulse|回路|2001|m|jhorror,apocaliptico|tecnologia,soledad|melancolico,atmosferico|asia|ringu,cure,ju-on,skinamarink
cure|Cure|CURE|1997|m|psicologico,jhorror|identidad,paranoia,violencia|lento,perturbador|asia|pulse,audition,the-wailing,longlegs
dark-water|Dark Water|仄暗い水の底から|2002|m|jhorror,fantasmas|maternidad,soledad|melancolico,atmosferico|asia|ringu,ju-on,the-orphanage
hausu|House|ハウス|1977|m|comedia,psicodelico,casa|adolescencia,duelo|bizarro,ludico|pesadilla|evil-dead-2,suspiria-77,tetsuo
tetsuo|Tetsuo: The Iron Man|鉄男|1989|m|body,psicodelico|tecnologia,cuerpo|visceral,bizarro|cuerpos|videodrome,eraserhead,titane
train-to-busan|Train to Busan|부산행|2016|m|zombis,survival|paternidad,clase|tenso|asia|28-days-later,the-host,rec
the-host|The Host|괴물|2006|m|criaturas,satira|familia,politica|tenso,ludico|asia|train-to-busan,jaws,nope
i-saw-the-devil|I Saw the Devil|악마를 보았다|2010|m|thriller|venganza,violencia|visceral,perturbador|asia|the-wailing,cure,audition
a-tale-of-two-sisters|A Tale of Two Sisters|장화, 홍련|2003|m|khorror,psicologico,fantasmas|familia,trauma,culpa|melancolico,atmosferico|asia|the-orphanage,goodnight-mommy,ju-on
thirst|Thirst|박쥐|2009|m|vampiros,khorror|fe,deseo,culpa|perturbador|vampiros|let-the-right-one-in,nosferatu-24,cronos
incantation|Incantation|咒|2022|m|found,religioso|maternidad,culpa,ritual|perturbador,angustiante|found|noroi,the-wailing,lake-mungo,hereditary
halloween|Halloween|-|1978|m|slasher|adolescencia|tenso|slashers|black-christmas,tcm,friday-13th,it-follows,scream
tcm|The Texas Chain Saw Massacre|-|1974|m|slasher,survival|familia,clase|visceral,angustiante|slashers|halloween,x,black-christmas
black-christmas|Black Christmas|-|1974|m|slasher|adolescencia,genero|tenso|slashers|halloween,tcm,psycho
nightmare-elm|A Nightmare on Elm Street|-|1984|m|slasher,sobrenatural|suenos,adolescencia|ludico,tenso|slashers|halloween,scream,it-follows
scream|Scream|-|1996|m|slasher,comedia|medios,cine,adolescencia|ludico,tenso|slashers|halloween,nightmare-elm,cabin-in-the-woods,bodies-bodies-bodies
friday-13th|Friday the 13th|-|1980|m|slasher|adolescencia,venganza|sangriento|slashers|halloween,bay-of-blood,black-christmas
deep-red|Deep Red|Profondo rosso|1975|m|giallo|arte,memoria,infancia|tenso,sangriento|slashers|suspiria-77,tenebrae,bay-of-blood,blood-and-black-lace,dont-look-now
tenebrae|Tenebrae|Tenebre|1982|m|giallo|arte,obsesion|sangriento|slashers|deep-red,suspiria-77
bay-of-blood|A Bay of Blood|Reazione a catena|1971|m|giallo,slasher|poder,violencia|sangriento|slashers|friday-13th,deep-red,blood-and-black-lace
blood-and-black-lace|Blood and Black Lace|Sei donne per l'assassino|1964|m|giallo|arte,violencia|sangriento,atmosferico|slashers|deep-red,bay-of-blood,black-sunday
x|X|-|2022|m|slasher|vejez,deseo,cine|sangriento,ludico|slashers|pearl,tcm,maxxxine
pearl|Pearl|-|2022|m|slasher,psicologico|deseo,soledad,cine|perturbador,ludico|slashers|x,maxxxine,the-love-witch
maxxxine|MaXXXine|-|2024|m|slasher|cine,medios|pulp|slashers|x,pearl,tenebrae
longlegs|Longlegs|-|2024|m|psicologico,satanico,thriller|maternidad,culpa,fe|perturbador,atmosferico|mente|cure,hereditary,the-empty-man,smile
barbarian|Barbarian|-|2022|m|casa,criaturas|genero,violencia|tenso,bizarro|casas|the-strangers,hush,the-descent
hush|Hush|-|2016|m|invasion,survival|soledad|tenso|encierro|the-strangers,youre-next,green-room
youre-next|You're Next|-|2011|m|invasion,comedia|familia,clase|sangriento,ludico|risas|ready-or-not,the-strangers,hush
the-strangers|The Strangers|-|2008|m|invasion|pareja|tenso,angustiante|encierro|funny-games,hush,youre-next
funny-games|Funny Games|-|1997|m|invasion,thriller|medios,violencia,clase|perturbador|satira|the-strangers,speak-no-evil,us
bodies-bodies-bodies|Bodies Bodies Bodies|-|2022|m|slasher,comedia,satira|amistad,clase|ludico,satirico|satira|ready-or-not,scream,the-menu
ready-or-not|Ready or Not|-|2019|m|comedia,sectas,satira|clase,familia,pareja|sangriento,ludico|satira|youre-next,the-menu,get-out,bodies-bodies-bodies
blair-witch|The Blair Witch Project|-|1999|m|found,folk|bosque,paranoia,amistad|angustiante|found|noroi,lake-mungo,the-ritual,rec
rec|[REC]|[REC]|2007|m|found,zombis,posesion|comunidad,medios|tenso,visceral|found|night-living-dead,train-to-busan,pontypool,blair-witch
paranormal-activity|Paranormal Activity|-|2007|m|found,casa|pareja|tenso|found|blair-witch,insidious,hell-house-llc
host|Host|-|2020|m|found,posesion|tecnologia,amistad|tenso|found|late-night-devil,paranormal-activity,talk-to-me
creep|Creep|-|2014|m|found,psicologico|soledad,obsesion|ludico,perturbador|found|host,blair-witch
cloverfield|Cloverfield|-|2008|m|found,criaturas|amistad|tenso|criaturas|rec,the-host,nope
hell-house-llc|Hell House LLC|-|2015|m|found,casa|amistad|tenso|found|paranormal-activity,blair-witch,lake-mungo
troll-hunter|Trollhunter|Trolljegeren|2010|m|found,criaturas,folk|naturaleza,tradicion|ludico|criaturas|blair-witch,cloverfield
skinamarink|Skinamarink|-|2022|m|psicodelico,casa|infancia,suenos|onirico,lento|pesadilla|a-ghost-story,pulse,i-saw-the-tv-glow
vhs|V/H/S|-|2012|m|antologia,found|medios,violencia|sangriento|antologias|vhs2,vhs94,vhs99,southbound
vhs2|V/H/S/2|-|2013|m|antologia,found|medios,fe|sangriento,bizarro|antologias|vhs,vhs94,vhs99
vhs94|V/H/S/94|-|2021|m|antologia,found|medios,fe|sangriento,bizarro|antologias|vhs,vhs2,vhs99,vhs85
vhs99|V/H/S/99|-|2022|m|antologia,found|medios,adolescencia|sangriento,ludico|antologias|vhs94,vhs85,vhs
vhs85|V/H/S/85|-|2023|m|antologia,found|medios|sangriento|antologias|vhs99,vhs94
trick-r-treat|Trick 'r Treat|-|2007|m|antologia,comedia|tradicion,infancia|ludico|antologias|creepshow,vhs,southbound
creepshow|Creepshow|-|1982|m|antologia,comedia|venganza|ludico,pulp|antologias|trick-r-treat,black-sabbath
southbound|Southbound|-|2015|m|antologia|culpa|tenso,bizarro|antologias|vhs,trick-r-treat
black-sabbath|Black Sabbath|I tre volti della paura|1963|m|antologia,gotico|muerte|atmosferico|antologias|kwaidan,black-sunday,dead-of-night
dead-of-night|Dead of Night|-|1945|m|antologia,psicologico|suenos,locura|atmosferico|antologias|black-sabbath,kwaidan
eraserhead|Eraserhead|-|1977|m|body,psicodelico|paternidad,soledad,cuerpo|onirico,bizarro|pesadilla|tetsuo,lost-highway,skinamarink
lost-highway|Lost Highway|-|1997|m|psicologico,psicodelico|identidad,pareja,culpa|onirico,perturbador|pesadilla|eraserhead,jacobs-ladder,possession-81
jacobs-ladder|Jacob's Ladder|-|1990|m|psicologico|guerra,trauma,duelo|onirico,angustiante|mente|lost-highway,the-lighthouse,session-9
i-saw-the-tv-glow|I Saw the TV Glow|-|2024|m|psicodelico,autor|identidad,medios,adolescencia|onirico,melancolico|pesadilla|skinamarink,beyond-black-rainbow,lost-highway
possession-81|Possession|-|1981|m|body,psicologico|pareja,locura,deseo|perturbador,visceral|cuerpos|the-brood,antichrist,repulsion,mother
hellraiser|Hellraiser|-|1987|m|body,cosmico,satanico|deseo,obsesion,familia|sangriento,perturbador|cuerpos|the-void,event-horizon,from-beyond,the-fly
re-animator|Re-Animator|-|1985|m|body,comedia|ciencia,muerte|sangriento,ludico|risas|from-beyond,braindead,evil-dead-2,dagon
videodrome|Videodrome|-|1983|m|body,scifi|medios,tecnologia,deseo|bizarro,perturbador|cuerpos|the-fly,possessor,tetsuo,the-brood
the-fly|The Fly|-|1986|m|body,scifi|cuerpo,enfermedad,pareja,ciencia|visceral,melancolico|cuerpos|videodrome,the-brood,the-substance,eyes-without-a-face
the-brood|The Brood|-|1979|m|body,psicologico|maternidad,trauma,familia|perturbador|cuerpos|the-fly,videodrome,possession-81,the-babadook
possessor|Possessor|-|2020|m|body,scifi|identidad,tecnologia,violencia|visceral,perturbador|cuerpos|videodrome,infinity-pool,under-the-skin
raw|Raw|Grave|2016|m|body,autor|identidad,adolescencia,deseo|visceral,perturbador|cuerpos|titane,the-substance,the-fly
titane|Titane|-|2021|m|body,autor|identidad,paternidad,cuerpo|visceral,bizarro|cuerpos|raw,tetsuo,eyes-without-a-face
the-substance|The Substance|-|2024|m|body,satira|cuerpo,vejez,medios|visceral,satirico|cuerpos|the-fly,society,titane,infinity-pool
society|Society|-|1989|m|body,satira|clase,familia|bizarro,visceral|satira|the-substance,get-out,ready-or-not
infinity-pool|Infinity Pool|-|2023|m|body,satira|clase,identidad|bizarro,visceral|satira|possessor,the-menu,the-substance
get-out|Get Out|-|2017|m|thriller,satira|racismo,clase|tenso,satirico|satira|us,ready-or-not,nope,society
us|Us|-|2019|m|invasion,satira|identidad,clase|tenso|satira|get-out,nope,funny-games
the-menu|The Menu|-|2022|m|thriller,satira|clase,arte|satirico,tenso|satira|ready-or-not,infinity-pool,el-hoyo
el-hoyo|The Platform|El hoyo|2019|m|scifi,satira,survival|clase,consumo|visceral|satira|the-menu,get-out,infinity-pool
repulsion|Repulsion|-|1965|m|psicologico|soledad,sexualidad,locura|perturbador,lento|mente|rosemarys-baby,possession-81,black-swan,saint-maud
black-swan|Black Swan|-|2010|m|psicologico,body|arte,identidad,obsesion|tenso,perturbador|mente|repulsion,perfect-blue,suspiria-18
perfect-blue|Perfect Blue|パーフェクトブルー|1997|m|psicologico,animacion|identidad,medios,obsesion|perturbador|mente|black-swan,cure,i-saw-the-tv-glow
session-9|Session 9|-|2001|m|casa,psicologico|locura,culpa|atmosferico,lento|mente|the-shining,jacobs-ladder,the-haunting
mother|mother!|-|2017|m|psicologico,religioso,autor|pareja,fe,arte|perturbador,angustiante|mente|rosemarys-baby,antichrist,possession-81,men
antichrist|Antichrist|-|2009|m|psicologico,autor,folk|duelo,pareja,naturaleza,culpa|perturbador,visceral|mente|mother,possession-81,men,hagazussa
shutter-island|Shutter Island|-|2010|m|psicologico,thriller|culpa,trauma,locura|tenso,atmosferico|mente|jacobs-ladder,the-shining,session-9
censor|Censor|-|2021|m|psicologico|cine,trauma,memoria|perturbador|mente|perfect-blue,deep-red,maxxxine
the-lighthouse|The Lighthouse|-|2019|m|psicologico,gotico,autor|locura,aislamiento,mar,genero|bizarro,onirico|mente|the-witch,the-shining,dagon,enys-men,nosferatu-24
oddity|Oddity|-|2024|m|sobrenatural,casa|duelo,venganza|tenso,atmosferico|casas|caveat,the-night-house,relic
caveat|Caveat|-|2020|m|psicologico,casa|aislamiento,memoria|atmosferico,tenso|casas|oddity,session-9,skinamarink
the-descent|The Descent|-|2005|m|criaturas,survival|duelo,amistad|angustiante,visceral|encierro|the-ritual,alien,the-thing,green-room
green-room|Green Room|-|2015|m|survival,thriller|violencia,amistad|visceral,tenso|encierro|the-descent,hush,bone-tomahawk
a-quiet-place|A Quiet Place|-|2018|m|criaturas,survival|familia,paternidad|tenso|encierro|the-mist,nope,28-days-later
28-days-later|28 Days Later|-|2002|m|zombis,apocaliptico|comunidad,violencia|tenso,visceral|encierro|dawn-of-the-dead,night-living-dead,train-to-busan,rec
dawn-of-the-dead|Dawn of the Dead|-|1978|m|zombis,satira|consumo,comunidad|sangriento,satirico|encierro|night-living-dead,28-days-later,shaun-of-the-dead
bone-tomahawk|Bone Tomahawk|-|2015|m|survival,western|violencia,amistad|lento,visceral|encierro|green-room,the-descent
braindead|Braindead|-|1992|m|zombis,comedia|maternidad,familia|sangriento,ludico|risas|evil-dead-2,re-animator,shaun-of-the-dead
shaun-of-the-dead|Shaun of the Dead|-|2004|m|zombis,comedia|amistad,pareja|ludico|risas|braindead,dawn-of-the-dead,what-we-do
what-we-do|What We Do in the Shadows|-|2014|m|vampiros,comedia,mockumentary|amistad,soledad|ludico|risas|shaun-of-the-dead,an-american-werewolf
cabin-in-the-woods|The Cabin in the Woods|-|2011|m|comedia,satira|medios,ritual|ludico,sangriento|risas|evil-dead-81,scream,tucker-dale
tucker-dale|Tucker and Dale vs. Evil|-|2010|m|comedia,slasher|amistad,clase|ludico,sangriento|risas|cabin-in-the-woods,shaun-of-the-dead
drag-me-to-hell|Drag Me to Hell|-|2009|m|sobrenatural,comedia|culpa,clase|ludico,pulp|risas|evil-dead-2,army-of-darkness
an-american-werewolf|An American Werewolf in London|-|1981|m|licantropos,comedia|amistad,cuerpo|ludico,visceral|criaturas|what-we-do,the-fly,good-manners
aterrados|Terrified|Aterrados|2017|m|sobrenatural,casa|comunidad,ciencia|tenso,perturbador|espanol|cuando-acecha,insidious,the-conjuring,historia-de-lo-oculto
historia-de-lo-oculto|History of the Occult|Historia de lo oculto|2020|m|satanico,psicologico|medios,politica,poder|atmosferico,tenso|espanol|late-night-devil,aterrados,cuando-acecha
la-llorona|La Llorona|La llorona|2019|m|fantasmas,autor|memoria,colonialismo,politica|lento,atmosferico|espanol|tigers-not-afraid,the-devils-backbone,the-orphanage
tigers-not-afraid|Tigers Are Not Afraid|Vuelven|2017|m|fantasmas|infancia,violencia,politica|melancolico,onirico|espanol|the-devils-backbone,la-llorona
cronos|Cronos|-|1993|m|vampiros|vejez,adiccion,familia|melancolico|vampiros|thirst,let-the-right-one-in,the-devils-backbone
the-devils-backbone|The Devil's Backbone|El espinazo del diablo|2001|m|fantasmas,gotico|guerra,infancia|melancolico,atmosferico|espanol|the-orphanage,tigers-not-afraid,crimson-peak,cronos
tenemos-la-carne|We Are the Flesh|Tenemos la carne|2016|m|psicodelico,body|deseo,apocalipsis|bizarro,perturbador|pesadilla|muere-monstruo,eraserhead,possession-81
good-manners|Good Manners|As Boas Maneiras|2017|m|licantropos,autor|maternidad,clase|melancolico,bizarro|espanol|tigers-not-afraid,an-american-werewolf,la-llorona
al-morir-la-matinee|Red Screening|Al morir la matinée|2020|m|slasher,giallo|cine|sangriento|espanol|tenebrae,scream,deep-red
muere-monstruo|Murder Me, Monster|Muere, monstruo, muere|2018|m|criaturas,psicodelico|genero,violencia|bizarro,perturbador|espanol|tenemos-la-carne,aterrados,men
la-casa-lobo|The Wolf House|La casa lobo|2018|m|animacion,psicodelico|memoria,infancia,politica|onirico,perturbador|espanol|tenemos-la-carne,skinamarink,tigers-not-afraid
quien-puede-matar|Who Can Kill a Child?|¿Quién puede matar a un niño?|1976|m|survival,folk|infancia,violencia|angustiante|espanol|wicker-man,the-birds,night-living-dead
let-the-right-one-in|Let the Right One In|Låt den rätte komma in|2008|m|vampiros|infancia,soledad,amistad|melancolico,contemplativo|vampiros|thirst,martin,near-dark,cronos
near-dark|Near Dark|-|1987|m|vampiros,western|familia,deseo|atmosferico|vampiros|let-the-right-one-in,sinners,only-lovers
martin|Martin|-|1977|m|vampiros,psicologico|identidad,soledad|melancolico|vampiros|let-the-right-one-in,cronos
only-lovers|Only Lovers Left Alive|-|2013|m|vampiros,autor|arte,pareja,tiempo|contemplativo,melancolico|vampiros|near-dark,thirst,let-the-right-one-in
sinners|Sinners|-|2025|m|vampiros,thriller|racismo,comunidad,arte|tenso,pulp|vampiros|near-dark,get-out
hill-house|The Haunting of Hill House|-|2018|t|casa,fantasmas|familia,duelo,trauma|melancolico,atmosferico|series|bly-manor,midnight-mass,the-haunting
bly-manor|The Haunting of Bly Manor|-|2020|t|fantasmas,gotico|duelo,memoria,pareja|melancolico|series|hill-house,the-innocents,usher
midnight-mass|Midnight Mass|-|2021|t|religioso,vampiros|fe,comunidad,culpa|lento,melancolico|series|hill-house,usher,the-wailing
usher|The Fall of the House of Usher|-|2023|t|gotico,sobrenatural|familia,poder,herencia|sombrio,satirico|series|midnight-mass,hill-house,crimson-peak
cabinet|Guillermo del Toro's Cabinet of Curiosities|-|2022|t|antologia,gotico,cosmico|muerte,obsesion|atmosferico|series|channel-zero,creepshow,vhs
channel-zero|Channel Zero|-|2016|t|antologia,psicodelico|infancia,memoria,medios|onirico,perturbador|series|cabinet,archive-81,skinamarink
true-detective|True Detective|-|2014|t|thriller,cosmico,folk|culpa,obsesion,fe|lento,sombrio|series|kill-list,longlegs,cure
archive-81|Archive 81|-|2022|t|found,sectas,cosmico|obsesion,medios|atmosferico|series|channel-zero,lake-mungo,the-endless
marianne|Marianne|-|2019|t|brujeria,sobrenatural|culpa,arte,infancia|perturbador|series|hill-house,the-witch,midnight-mass
penny-dreadful|Penny Dreadful|-|2014|t|gotico,vampiros|fe,identidad|atmosferico|series|crimson-peak,usher,dracula-31
from|From|-|2022|t|sobrenatural,survival|comunidad,aislamiento|tenso|series|the-endless,the-mist,channel-zero
twin-peaks|Twin Peaks|-|1990|t|psicodelico,thriller|comunidad,identidad,suenos|onirico,bizarro|series|lost-highway,channel-zero,true-detective
"""

def main():
    films, ids, errors = [], set(), []
    rows = [l.strip() for l in DATA.strip().splitlines() if l.strip()]
    for n, line in enumerate(rows, 1):
        parts = [p.strip() for p in line.split('|')]
        if len(parts) != 10:
            errors.append('línea %d: %d campos' % (n, len(parts))); continue
        fid, t, ot, y, kind, sub, tem, ton, sec, rel = parts
        if fid in ids: errors.append('id repetido: ' + fid)
        ids.add(fid)
        f = {'id': fid, 't': t, 'y': int(y), 'sub': sub.split(','), 'tem': tem.split(','), 'ton': ton.split(','), 'sec': sec, 'rel': [r for r in rel.split(',') if r]}
        if ot != '-': f['ot'] = ot
        if kind == 't': f['tv'] = 1
        for field in ('sub', 'tem', 'ton'):
            for v in f[field]:
                if v not in LABELS[field]: errors.append('%s: %s desconocido: %s' % (fid, field, v))
        if sec not in LABELS['sec']: errors.append('%s: sección desconocida: %s' % (fid, sec))
        films.append(f)
    for f in films:
        for r in f['rel']:
            if r not in ids: errors.append('%s: pariente inexistente: %s' % (f['id'], r))
            if r == f['id']: errors.append('%s: es pariente de sí misma' % f['id'])
    if errors:
        print('\n'.join(errors)); sys.exit(1)
    out = {'v': 1, 'labels': LABELS, 'films': films}
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'curaduria.json')
    with open(path, 'w', encoding='utf-8') as fh:
        json.dump(out, fh, ensure_ascii=False, separators=(',', ':'))
    secs = {}
    for f in films: secs[f['sec']] = secs.get(f['sec'], 0) + 1
    print('ok: %d títulos, %d bytes' % (len(films), os.path.getsize(path)))
    print('por sección:', ', '.join('%s %d' % (LABELS['sec'][k], v) for k, v in sorted(secs.items(), key=lambda x: -x[1])))

if __name__ == '__main__':
    main()
