"""Construye curaduria.json: etiquetas de curaduría para recomendar.

Formato de cada línea (separado por |):
  id | título internacional | título original o - | año | m (peli) o t (serie) | subgéneros | temas | tono | sección | parientes

Los parientes son ids de otras líneas. El script valida el vocabulario y los parientes.
Uso: python3 tools/build_curaduria.py
"""
import json, os, sys

LABELS = {
    'sub': {
        'folk': 'Folk horror', 'cosmico': 'Horror cósmico', 'autor': 'Cine de autor', 'sobrenatural': 'Sobrenatural',
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
        'criaturas': 'Criaturas', 'antologias': 'Antologías', 'series': 'Series de terror', 'vampiros': 'Colmillos',
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

LABELS['sub'].update({
    'espacio': 'Espacio', 'drama': 'Drama', 'viajes-tiempo': 'Viajes en el tiempo', 'distopia': 'Distopía', 'romance': 'Romance',
    'cyberpunk': 'Cyberpunk', 'noir': 'Noir', 'neonoir': 'Neo-noir', 'anime': 'Anime', 'accion': 'Acción', 'aventura': 'Aventura',
    'epico': 'Épico', 'policial': 'Policial', 'surrealista': 'Surrealismo', 'humor': 'Comedia', 'humor-negro': 'Humor negro',
    'mafia': 'Mafia', 'biografico': 'Biográfico', 'atracos': 'Atracos y estafas', 'neowestern': 'Neo-western', 'social': 'Drama social',
    'coming-of-age': 'Coming of age', 'historico': 'Histórico', 'road-movie': 'Road movie', 'judicial': 'Judicial', 'politico': 'Político',
    'absurdo': 'Absurdo', 'romcom': 'Comedia romántica', 'musical': 'Musical', 'stop-motion': 'Stop motion',
    'artes-marciales': 'Artes marciales', 'samurai': 'Samuráis', 'wuxia': 'Wuxia', 'belico': 'Bélico', 'documental': 'Documental',
    'fantasia': 'Fantasía', 'cuento': 'Cuento de hadas', 'espias': 'Espías',
})
LABELS['tem'].update({
    'humanidad': 'humanidad', 'ia': 'inteligencia artificial', 'amor': 'amor', 'desamor': 'desamor', 'supervivencia': 'supervivencia',
    'destino': 'destino', 'ambicion': 'ambición', 'traicion': 'traición', 'crimen': 'crimen', 'lealtad': 'lealtad', 'corrupcion': 'corrupción',
    'dinero': 'dinero', 'frontera': 'frontera', 'ciudad': 'ciudad', 'justicia': 'justicia', 'redencion': 'redención', 'libertad': 'libertad',
    'control': 'control', 'rebelion': 'rebelión', 'burocracia': 'burocracia', 'migracion': 'migración', 'trabajo': 'trabajo', 'fama': 'fama',
    'crecer': 'crecer', 'exilio': 'exilio', 'dictadura': 'dictadura', 'musica': 'música', 'deporte': 'deporte', 'animales': 'animales',
    'nostalgia': 'nostalgia', 'honor': 'honor', 'viaje': 'viaje',
})
LABELS['ton'].update({
    'cerebral': 'cerebral', 'epico': 'épico', 'emotivo': 'emotivo', 'luminoso': 'luminoso', 'divertido': 'divertido', 'elegante': 'elegante',
    'estiloso': 'estiloso', 'crudo': 'crudo', 'frenetico': 'frenético', 'ingenioso': 'ingenioso', 'tierno': 'tierno', 'romantico': 'romántico',
    'agridulce': 'agridulce', 'nostalgico': 'nostálgico',
})
LABELS['sec'].update({
    'sf-espacio': 'Espacio profundo', 'sf-filo': 'Ciencia ficción filosófica', 'sf-distopia': 'Distopías', 'sf-cyber': 'Cyberpunk y máquinas',
    'noir': 'Noir y neo-noir', 'thriller-mente': 'Thriller psicológico', 'crimen': 'Crimen y mafias',
    'drama-familia': 'Retratos de familia', 'drama-social': 'Cine social', 'drama-autor': 'Autores y laberintos', 'epicas': 'Épicas',
    'argentino': 'Cine argentino', 'latam': 'Cine latinoamericano',
    'comedia-absurda': 'Absurdo y nonsense', 'comedia-satira': 'Sátira y poder', 'comedia-humana': 'Comedias humanas', 'comedia-negra': 'Comedia negra',
    'romance-imposible': 'Amores imposibles', 'romcom': 'Comedias románticas', 'musica': 'Música y musicales',
    'anim-japon': 'Animación japonesa', 'anim-autor': 'Animación de autor',
    'accion': 'Acción pura', 'aventura': 'Grandes aventuras', 'espadas': 'Espadas de Oriente',
    'belico': 'Cine bélico', 'western': 'Westerns', 'docu': 'Documentales', 'fantasia': 'Fantasía',
    'series-drama': 'Series de prestigio', 'series-comedia': 'Series de comedia',
})
GROUPS = [
    ('Terror', ['folk', 'cosmos', 'duelo', 'fe', 'casas', 'mente', 'cuerpos', 'pesadilla', 'clasicos', 'asia', 'espanol', 'found', 'slashers', 'criaturas', 'encierro', 'vampiros', 'antologias', 'satira', 'risas']),
    ('Ciencia ficción', ['sf-espacio', 'sf-filo', 'sf-distopia', 'sf-cyber']),
    ('Thriller y crimen', ['thriller-mente', 'noir', 'crimen']),
    ('Drama', ['drama-familia', 'drama-social', 'drama-autor', 'epicas']),
    ('Cine argentino y latino', ['argentino', 'latam']),
    ('Comedia', ['comedia-humana', 'comedia-absurda', 'comedia-negra', 'comedia-satira']),
    ('Romance', ['romance-imposible', 'romcom']),
    ('Animación', ['anim-japon', 'anim-autor']),
    ('Acción y aventura', ['accion', 'aventura', 'espadas']),
    ('Fantasía', ['fantasia']),
    ('Bélico', ['belico']),
    ('Western', ['western']),
    ('Música', ['musica']),
    ('Documental', ['docu']),
    ('Series', ['series-drama', 'series-comedia', 'series']),
]

DATA2 = r"""
space-odyssey|2001: A Space Odyssey|-|1968|m|scifi,espacio|humanidad,tecnologia,ia,tiempo|contemplativo,cerebral|sf-espacio|solaris,interstellar,stalker,arrival,moon
solaris|Solaris|Солярис|1972|m|scifi,espacio,drama|memoria,duelo,amor,humanidad|contemplativo,melancolico|sf-espacio|space-odyssey,stalker,interstellar,high-life
interstellar|Interstellar|-|2014|m|scifi,espacio|tiempo,paternidad,humanidad,supervivencia|epico,emotivo|sf-espacio|space-odyssey,contact,arrival,gravity,the-martian
sunshine|Sunshine|-|2007|m|scifi,espacio,thriller|supervivencia,fe,humanidad|tenso,epico|sf-espacio|event-horizon,interstellar,alien,moon
gravity|Gravity|-|2013|m|scifi,espacio,thriller|supervivencia,duelo|tenso|sf-espacio|interstellar,the-martian,sunshine
the-martian|The Martian|-|2015|m|scifi,espacio,aventura|supervivencia,ciencia,soledad|luminoso,divertido|sf-espacio|interstellar,gravity,moon
moon|Moon|-|2009|m|scifi,espacio|identidad,soledad,trabajo|melancolico,cerebral|sf-espacio|space-odyssey,solaris,gattaca,the-martian
contact|Contact|-|1997|m|scifi,espacio|fe,ciencia,paternidad|emotivo,cerebral|sf-espacio|interstellar,arrival,space-odyssey
high-life|High Life|-|2018|m|scifi,espacio,autor|sexualidad,paternidad,soledad|perturbador,contemplativo|sf-espacio|solaris,under-the-skin,stalker
dune-21|Dune|-|2021|m|scifi,aventura,epico|poder,colonialismo,destino|epico,contemplativo|sf-espacio|dune-2,lawrence-of-arabia,blade-runner-2049
dune-2|Dune: Part Two|-|2024|m|scifi,aventura,epico|poder,fe,colonialismo,destino|epico|sf-espacio|dune-21,lawrence-of-arabia,ran
stalker|Stalker|Сталкер|1979|m|scifi,autor|fe,deseo,humanidad|contemplativo,lento|sf-filo|solaris,annihilation,arrival,la-jetee
arrival|Arrival|-|2016|m|scifi,drama|tiempo,duelo,maternidad,humanidad|contemplativo,emotivo|sf-filo|contact,interstellar,stalker,eternal-sunshine
primer|Primer|-|2004|m|scifi,viajes-tiempo|amistad,ambicion,tiempo|cerebral|sf-filo|coherence,predestination,la-jetee
gattaca|Gattaca|-|1997|m|scifi,distopia|identidad,ambicion,cuerpo|elegante,melancolico|sf-filo|moon,never-let-me-go,minority-report
her|Her|-|2013|m|scifi,romance|amor,soledad,ia,tecnologia|melancolico,tierno|sf-filo|ex-machina,eternal-sunshine,lost-in-translation,blade-runner-2049
la-jetee|La Jetée|-|1962|m|scifi,viajes-tiempo|memoria,tiempo,amor|melancolico|sf-filo|12-monkeys,primer,stalker
12-monkeys|12 Monkeys|-|1995|m|scifi,viajes-tiempo,distopia|locura,tiempo,apocalipsis|frenetico,bizarro|sf-filo|la-jetee,brazil,children-of-men,primer
the-fountain|The Fountain|-|2006|m|scifi,fantasia,romance|muerte,amor,duelo|onirico,emotivo|sf-filo|solaris,eternal-sunshine,arrival
predestination|Predestination|-|2014|m|scifi,viajes-tiempo|identidad,tiempo,destino|cerebral|sf-filo|primer,12-monkeys,looper
looper|Looper|-|2012|m|scifi,viajes-tiempo,accion|tiempo,violencia,destino|tenso|sf-filo|predestination,12-monkeys,minority-report
brazil|Brazil|-|1985|m|scifi,distopia,satira|burocracia,control,suenos|bizarro,ingenioso|sf-distopia|12-monkeys,children-of-men,the-truman-show,a-clockwork-orange
children-of-men|Children of Men|-|2006|m|scifi,distopia|apocalipsis,migracion,maternidad|crudo,tenso|sf-distopia|brazil,12-monkeys,snowpiercer,district-9
a-clockwork-orange|A Clockwork Orange|-|1971|m|scifi,distopia,satira|violencia,control,libertad|perturbador,estiloso|sf-distopia|brazil,metropolis,they-live
metropolis|Metropolis|-|1927|m|scifi,distopia|clase,tecnologia,trabajo|epico,elegante|sf-distopia|brazil,blade-runner,a-clockwork-orange
snowpiercer|Snowpiercer|-|2013|m|scifi,distopia,accion|clase,rebelion,supervivencia|frenetico,crudo|sf-distopia|children-of-men,el-hoyo,parasite,mad-max-fury-road
minority-report|Minority Report|-|2002|m|scifi,thriller|control,destino,justicia|tenso|sf-distopia|gattaca,blade-runner,looper
they-live|They Live|-|1988|m|scifi,satira,accion|consumo,control,clase|ludico,pulp|sf-distopia|robocop,a-clockwork-orange,get-out
never-let-me-go|Never Let Me Go|-|2010|m|scifi,drama,romance|muerte,amor,identidad|melancolico|sf-distopia|gattaca,moon,her
district-9|District 9|-|2009|m|scifi,accion,satira|racismo,migracion,cuerpo|crudo,frenetico|sf-distopia|children-of-men,robocop,the-fly
v-for-vendetta|V for Vendetta|-|2005|m|scifi,distopia,accion|rebelion,control,politica|epico|sf-distopia|children-of-men,the-matrix,brazil
blade-runner|Blade Runner|-|1982|m|scifi,cyberpunk,noir|ia,identidad,memoria,muerte|atmosferico,melancolico|sf-cyber|blade-runner-2049,ghost-in-the-shell,akira,metropolis,ex-machina
blade-runner-2049|Blade Runner 2049|-|2017|m|scifi,cyberpunk,noir|ia,identidad,memoria,soledad|contemplativo,melancolico|sf-cyber|blade-runner,her,dune-21,arrival
ghost-in-the-shell|Ghost in the Shell|攻殻機動隊|1995|m|scifi,cyberpunk,anime|identidad,ia,cuerpo,tecnologia|cerebral,atmosferico|sf-cyber|blade-runner,akira,the-matrix,paprika
akira|Akira|AKIRA|1988|m|scifi,cyberpunk,anime|poder,adolescencia,apocalipsis|frenetico,visceral|sf-cyber|ghost-in-the-shell,blade-runner,tetsuo,the-matrix
the-matrix|The Matrix|-|1999|m|scifi,cyberpunk,accion|identidad,control,libertad|frenetico,estiloso|sf-cyber|ghost-in-the-shell,akira,ex-machina,terminator-2
ex-machina|Ex Machina|-|2014|m|scifi,thriller|ia,poder,identidad|cerebral,tenso|sf-cyber|her,blade-runner,under-the-skin,the-matrix
robocop|RoboCop|-|1987|m|scifi,accion,satira|corrupcion,identidad,violencia|visceral,satirico|sf-cyber|terminator,they-live,district-9,total-recall
terminator|The Terminator|-|1984|m|scifi,accion,thriller|destino,supervivencia,ia|tenso,pulp|sf-cyber|terminator-2,robocop,aliens
terminator-2|Terminator 2: Judgment Day|-|1991|m|scifi,accion|ia,maternidad,destino|epico,frenetico|sf-cyber|terminator,the-matrix,aliens
total-recall|Total Recall|-|1990|m|scifi,accion|memoria,identidad|pulp,visceral|sf-cyber|robocop,blade-runner,the-matrix
upgrade|Upgrade|-|2018|m|scifi,accion,cyberpunk|ia,venganza,cuerpo|visceral,frenetico|sf-cyber|robocop,ex-machina,john-wick
double-indemnity|Double Indemnity|-|1944|m|noir,policial|deseo,traicion,crimen|elegante,sombrio|noir|the-maltese-falcon,out-of-the-past,sunset-boulevard,chinatown
the-maltese-falcon|The Maltese Falcon|-|1941|m|noir,policial|ambicion,traicion|elegante,ingenioso|noir|double-indemnity,the-big-sleep,out-of-the-past
the-big-sleep|The Big Sleep|-|1946|m|noir,policial|deseo,crimen|ingenioso,elegante|noir|the-maltese-falcon,double-indemnity,chinatown
out-of-the-past|Out of the Past|-|1947|m|noir|destino,traicion,deseo|melancolico,sombrio|noir|double-indemnity,the-maltese-falcon,touch-of-evil
the-third-man|The Third Man|-|1949|m|noir,thriller|amistad,traicion,guerra|atmosferico,elegante|noir|touch-of-evil,chinatown,casablanca
sunset-boulevard|Sunset Boulevard|-|1950|m|noir,drama|fama,cine,obsesion|sombrio,elegante|noir|double-indemnity,mulholland-drive,citizen-kane
touch-of-evil|Touch of Evil|-|1958|m|noir,policial|corrupcion,frontera,justicia|atmosferico,sombrio|noir|the-third-man,chinatown,no-country-for-old-men
chinatown|Chinatown|-|1974|m|neonoir,policial|corrupcion,poder,familia|sombrio,elegante|noir|la-confidential,double-indemnity,the-long-goodbye
the-long-goodbye|The Long Goodbye|-|1973|m|neonoir,policial|amistad,traicion|melancolico,ingenioso|noir|chinatown,the-big-lebowski,inherent-vice
la-confidential|L.A. Confidential|-|1997|m|neonoir,policial|corrupcion,justicia,ambicion|tenso,elegante|noir|chinatown,heat,the-departed
inherent-vice|Inherent Vice|-|2014|m|neonoir,humor|nostalgia,amor,corrupcion|bizarro,onirico|noir|the-long-goodbye,the-big-lebowski,chinatown
drive|Drive|-|2011|m|neonoir,accion|soledad,violencia,amor|estiloso,visceral|noir|collateral,heat,taxi-driver,john-wick
collateral|Collateral|-|2004|m|neonoir,thriller|ciudad,destino,violencia|tenso,estiloso|noir|heat,drive,taxi-driver
mulholland-drive|Mulholland Drive|-|2001|m|neonoir,psicologico,surrealista|identidad,cine,deseo,fama|onirico,perturbador|thriller-mente|lost-highway,sunset-boulevard,persona,perfect-blue
se7en|Se7en|-|1995|m|thriller,policial|culpa,violencia,ciudad|sombrio,crudo|thriller-mente|zodiac,the-silence-of-the-lambs,prisoners,memories-of-murder
zodiac|Zodiac|-|2007|m|thriller,policial|obsesion,medios,crimen|tenso,cerebral|thriller-mente|se7en,memories-of-murder,prisoners
the-silence-of-the-lambs|The Silence of the Lambs|-|1991|m|thriller,psicologico,policial|identidad,genero,trauma|tenso,perturbador|thriller-mente|se7en,cure,longlegs,zodiac
prisoners|Prisoners|-|2013|m|thriller,policial|paternidad,fe,venganza|sombrio,angustiante|thriller-mente|se7en,zodiac,memories-of-murder
gone-girl|Gone Girl|-|2014|m|thriller,psicologico|pareja,medios,identidad|cerebral,tenso|thriller-mente|zodiac,the-talented-mr-ripley,double-indemnity
memento|Memento|-|2000|m|thriller,psicologico,neonoir|memoria,duelo,venganza|cerebral,tenso|thriller-mente|the-prestige,oldboy,mulholland-drive,shutter-island
the-prestige|The Prestige|-|2006|m|thriller,drama|obsesion,identidad,arte|cerebral,elegante|thriller-mente|memento,inception,primer
inception|Inception|-|2010|m|scifi,thriller,accion|suenos,duelo,culpa|epico,cerebral|thriller-mente|memento,the-prestige,paprika,the-matrix
vertigo|Vertigo|-|1958|m|thriller,psicologico|obsesion,identidad,deseo|onirico,elegante|thriller-mente|rear-window,mulholland-drive,psycho,double-indemnity
rear-window|Rear Window|-|1954|m|thriller|obsesion,ciudad,pareja|tenso,ingenioso|thriller-mente|vertigo,psycho,blow-up
blow-up|Blow-Up|-|1966|m|thriller,autor|arte,identidad,obsesion|cerebral,estiloso|thriller-mente|rear-window,the-conversation,mulholland-drive
the-conversation|The Conversation|-|1974|m|thriller,psicologico|paranoia,culpa,tecnologia|tenso,melancolico|thriller-mente|blow-up,rear-window,zodiac
oldboy|Oldboy|올드보이|2003|m|thriller,neonoir|venganza,culpa,familia|visceral,perturbador|thriller-mente|i-saw-the-devil,memento,memories-of-murder,the-handmaiden
memories-of-murder|Memories of Murder|살인의 추억|2003|m|thriller,policial,humor-negro|justicia,culpa,dictadura|sombrio,agridulce|thriller-mente|zodiac,se7en,the-wailing,mother-09
mother-09|Mother|마더|2009|m|thriller,drama|maternidad,culpa,justicia|perturbador,sombrio|thriller-mente|memories-of-murder,parasite,oldboy
the-handmaiden|The Handmaiden|아가씨|2016|m|thriller,romance,historico|deseo,traicion,poder|elegante,perturbador|thriller-mente|oldboy,portrait-of-a-lady-on-fire,thirst
enemy|Enemy|-|2013|m|thriller,psicologico,surrealista|identidad,pareja,deseo|onirico,perturbador|thriller-mente|mulholland-drive,prisoners,lost-highway
nightcrawler|Nightcrawler|-|2014|m|thriller,satira|ambicion,medios,ciudad|tenso,perturbador|thriller-mente|taxi-driver,network,drive
taxi-driver|Taxi Driver|-|1976|m|drama,neonoir,psicologico|soledad,violencia,ciudad|crudo,perturbador|thriller-mente|nightcrawler,drive,the-conversation
the-talented-mr-ripley|The Talented Mr. Ripley|-|1999|m|thriller,psicologico|identidad,deseo,clase|elegante,tenso|thriller-mente|gone-girl,double-indemnity,vertigo
the-godfather|The Godfather|-|1972|m|mafia,drama,epico|familia,poder,lealtad|epico,sombrio|crimen|the-godfather-2,goodfellas,once-upon-a-time-in-america
the-godfather-2|The Godfather Part II|-|1974|m|mafia,drama,epico|familia,poder,traicion,migracion|epico,melancolico|crimen|the-godfather,once-upon-a-time-in-america,there-will-be-blood
goodfellas|Goodfellas|-|1990|m|mafia,biografico|ambicion,lealtad,dinero|frenetico,estiloso|crimen|the-godfather,casino,the-departed,el-clan
casino|Casino|-|1995|m|mafia|dinero,ambicion,traicion|frenetico,estiloso|crimen|goodfellas,the-godfather-2
once-upon-a-time-in-america|Once Upon a Time in America|-|1984|m|mafia,epico|amistad,memoria,traicion|melancolico,epico|crimen|the-godfather-2,once-upon-a-time-in-the-west,goodfellas
heat|Heat|-|1995|m|atracos,policial,accion|obsesion,soledad,ciudad|tenso,elegante|crimen|collateral,la-confidential,the-departed
pulp-fiction|Pulp Fiction|-|1994|m|humor-negro,neonoir|violencia,redencion,destino|ingenioso,estiloso|crimen|reservoir-dogs,fargo,kill-bill
reservoir-dogs|Reservoir Dogs|-|1992|m|atracos,neonoir|lealtad,traicion,violencia|crudo,ingenioso|crimen|pulp-fiction,heat,nueve-reinas
no-country-for-old-men|No Country for Old Men|-|2007|m|neowestern,thriller|violencia,destino,vejez|tenso,sombrio|crimen|fargo,hell-or-high-water,sicario
infernal-affairs|Infernal Affairs|無間道|2002|m|policial,thriller|identidad,lealtad,traicion|tenso,elegante|crimen|the-departed,heat,hard-boiled
the-departed|The Departed|-|2006|m|policial,mafia,thriller|identidad,lealtad,traicion|tenso,crudo|crimen|infernal-affairs,goodfellas,heat
sicario|Sicario|-|2015|m|thriller,policial|frontera,violencia,justicia|tenso,sombrio|crimen|no-country-for-old-men,heat,hell-or-high-water
uncut-gems|Uncut Gems|-|2019|m|thriller,drama|dinero,adiccion,familia|frenetico,angustiante|crimen|good-time,goodfellas,casino
good-time|Good Time|-|2017|m|thriller,atracos|familia,ciudad,culpa|frenetico,crudo|crimen|uncut-gems,taxi-driver,drive
city-of-god|City of God|Cidade de Deus|2002|m|policial,drama,social|violencia,adolescencia,clase,ciudad|frenetico,crudo|latam|amores-perros,goodfellas,pizza-birra-faso
fargo|Fargo|-|1996|m|humor-negro,policial|dinero,ambicion,invierno|agridulce,ingenioso|comedia-negra|no-country-for-old-men,in-bruges,burn-after-reading,the-big-lebowski
tokyo-story|Tokyo Story|東京物語|1953|m|drama|familia,vejez,ciudad|contemplativo,melancolico|drama-familia|shoplifters,aftersun,minari
shoplifters|Shoplifters|万引き家族|2018|m|drama,social|familia,clase,infancia|tierno,melancolico|drama-familia|tokyo-story,parasite,the-florida-project,roma
aftersun|Aftersun|-|2022|m|drama,coming-of-age|paternidad,memoria,duelo|melancolico,contemplativo|drama-familia|manchester-by-the-sea,past-lives,the-florida-project
manchester-by-the-sea|Manchester by the Sea|-|2016|m|drama|duelo,culpa,familia|melancolico|drama-familia|aftersun,a-separation,minari
fanny-and-alexander|Fanny and Alexander|Fanny och Alexander|1982|m|drama,autor|familia,infancia,fe|elegante,melancolico|drama-familia|persona,the-seventh-seal,festen
festen|The Celebration|Festen|1998|m|drama,humor-negro|familia,trauma,culpa|crudo,tenso|drama-familia|fanny-and-alexander,a-separation,the-royal-tenenbaums
a-separation|A Separation|جدایی نادر از سیمین|2011|m|drama,social|familia,justicia,fe,pareja|tenso,crudo|drama-familia|festen,manchester-by-the-sea,shoplifters
minari|Minari|-|2020|m|drama|familia,migracion,tradicion|tierno,luminoso|drama-familia|past-lives,tokyo-story,aftersun
marriage-story|Marriage Story|-|2019|m|drama|pareja,desamor,familia|agridulce,emotivo|drama-familia|before-midnight,a-separation
roma|Roma|-|2018|m|drama,social|clase,maternidad,memoria|contemplativo,melancolico|latam|shoplifters,y-tu-mama,la-cienaga,tokyo-story
the-florida-project|The Florida Project|-|2017|m|drama,social,coming-of-age|infancia,clase,maternidad|luminoso,crudo|drama-social|shoplifters,aftersun,nomadland
bicycle-thieves|Bicycle Thieves|Ladri di biciclette|1948|m|drama,social|clase,paternidad,trabajo|melancolico,crudo|drama-social|rosetta,i-daniel-blake,mundo-grua
rosetta|Rosetta|-|1999|m|drama,social|trabajo,clase,soledad|crudo|drama-social|bicycle-thieves,i-daniel-blake,mundo-grua
i-daniel-blake|I, Daniel Blake|-|2016|m|drama,social|burocracia,clase,vejez|crudo,emotivo|drama-social|rosetta,bicycle-thieves,nomadland
nomadland|Nomadland|-|2020|m|drama,social,road-movie|soledad,trabajo,duelo,viaje|contemplativo,melancolico|drama-social|the-florida-project,paris-texas,i-daniel-blake
parasite|Parasite|기생충|2019|m|thriller,satira,humor-negro|clase,familia,dinero|tenso,ingenioso|drama-social|snowpiercer,the-host,shoplifters,us,the-menu
do-the-right-thing|Do the Right Thing|-|1989|m|drama,social|racismo,ciudad,comunidad,violencia|frenetico,crudo|drama-social|la-haine,city-of-god,get-out
la-haine|La Haine|-|1995|m|drama,social|violencia,ciudad,clase,racismo|crudo,tenso|drama-social|do-the-right-thing,city-of-god,rosetta
moonlight|Moonlight|-|2016|m|drama,coming-of-age|identidad,sexualidad,soledad,clase|melancolico,tierno|drama-social|in-the-mood-for-love,call-me-by-your-name,the-florida-project
8-half|8½|-|1963|m|drama,autor,surrealista|arte,cine,deseo,memoria|onirico,elegante|drama-autor|la-dolce-vita,persona,synecdoche,mulholland-drive
la-dolce-vita|La Dolce Vita|La dolce vita|1960|m|drama,autor|fama,deseo,soledad|elegante,melancolico|drama-autor|8-half,the-great-beauty,lost-in-translation
the-great-beauty|The Great Beauty|La grande bellezza|2013|m|drama,autor|arte,vejez,nostalgia|elegante,melancolico|drama-autor|la-dolce-vita,8-half
persona|Persona|-|1966|m|drama,autor,psicologico|identidad,soledad,arte|perturbador,contemplativo|drama-autor|the-seventh-seal,mulholland-drive,fanny-and-alexander
the-seventh-seal|The Seventh Seal|Det sjunde inseglet|1957|m|drama,autor,fantasia|muerte,fe,guerra|contemplativo,sombrio|drama-autor|persona,wild-strawberries,stalker
wild-strawberries|Wild Strawberries|Smultronstället|1957|m|drama,autor,road-movie|vejez,memoria,culpa|melancolico,onirico|drama-autor|the-seventh-seal,tokyo-story,persona
synecdoche|Synecdoche, New York|-|2008|m|drama,surrealista|arte,muerte,identidad|melancolico,bizarro|drama-autor|8-half,being-john-malkovich,eternal-sunshine,anomalisa
the-tree-of-life|The Tree of Life|-|2011|m|drama,autor|fe,duelo,familia,infancia|contemplativo,onirico|drama-autor|space-odyssey,the-thin-red-line,the-fountain
the-master|The Master|-|2012|m|drama,autor|fe,soledad,poder,guerra|perturbador,elegante|drama-autor|there-will-be-blood,the-tree-of-life
paris-texas|Paris, Texas|-|1984|m|drama,road-movie|familia,soledad,memoria|melancolico,contemplativo|drama-autor|wings-of-desire,nomadland,in-the-mood-for-love
wings-of-desire|Wings of Desire|Der Himmel über Berlin|1987|m|drama,fantasia,autor|amor,soledad,ciudad,humanidad|contemplativo,tierno|drama-autor|paris-texas,her,the-seventh-seal
jeanne-dielman|Jeanne Dielman, 23 quai du Commerce, 1080 Bruxelles|Jeanne Dielman, 23, quai du Commerce, 1080 Bruxelles|1975|m|drama,autor|soledad,trabajo,genero|lento,contemplativo|drama-autor|la-cienaga,cleo-from-5-to-7,persona
cleo-from-5-to-7|Cléo from 5 to 7|Cléo de 5 à 7|1962|m|drama,autor|muerte,ciudad,identidad|elegante,melancolico|drama-autor|jeanne-dielman,la-dolce-vita,before-sunset
citizen-kane|Citizen Kane|-|1941|m|drama,epico|poder,memoria,soledad,medios|elegante,epico|epicas|there-will-be-blood,the-godfather,sunset-boulevard
there-will-be-blood|There Will Be Blood|-|2007|m|drama,epico,neowestern|ambicion,fe,poder,dinero|epico,sombrio|epicas|the-master,the-godfather-2,citizen-kane,no-country-for-old-men
lawrence-of-arabia|Lawrence of Arabia|-|1962|m|epico,aventura,biografico|identidad,colonialismo,guerra|epico,contemplativo|epicas|dune-21,ran,there-will-be-blood,apocalypse-now
barry-lyndon|Barry Lyndon|-|1975|m|historico,drama,epico|ambicion,clase,destino|elegante,contemplativo|epicas|lawrence-of-arabia,amadeus
la-cienaga|La Ciénaga|La ciénaga|2001|m|drama,autor|familia,clase,infancia|atmosferico,perturbador|argentino|la-mujer-sin-cabeza,zama,roma,jeanne-dielman
la-mujer-sin-cabeza|The Headless Woman|La mujer sin cabeza|2008|m|drama,autor,psicologico|culpa,clase,identidad|perturbador,atmosferico|argentino|la-cienaga,zama,el-aura
zama|Zama|-|2017|m|historico,autor,drama|colonialismo,soledad,tiempo|onirico,contemplativo|argentino|la-cienaga,aguirre,la-mujer-sin-cabeza
relatos-salvajes|Wild Tales|Relatos salvajes|2014|m|humor-negro,antologia|venganza,violencia,clase|visceral,ingenioso|argentino|nueve-reinas,fargo,el-ciudadano-ilustre,in-bruges
el-secreto|The Secret in Their Eyes|El secreto de sus ojos|2009|m|thriller,drama,policial|justicia,memoria,amor,dictadura|melancolico,tenso|argentino|nueve-reinas,argentina-1985,memories-of-murder,el-aura
nueve-reinas|Nine Queens|Nueve reinas|2000|m|atracos,humor|dinero,traicion,ciudad|ingenioso,tenso|argentino|el-secreto,reservoir-dogs,relatos-salvajes,el-aura
el-clan|The Clan|El Clan|2015|m|policial,biografico,drama|familia,dictadura,crimen|sombrio,tenso|argentino|el-secreto,goodfellas,nueve-reinas
argentina-1985|Argentina, 1985|-|2022|m|historico,judicial,drama|justicia,dictadura,memoria|emotivo,tenso|argentino|el-secreto,la-historia-oficial,el-clan
la-historia-oficial|The Official Story|La historia oficial|1985|m|drama,historico|dictadura,maternidad,memoria|emotivo,crudo|argentino|argentina-1985,el-secreto,camila
camila|Camila|-|1984|m|romance,historico,drama|amor,fe,poder|romantico,melancolico|argentino|la-historia-oficial,el-secreto
el-aura|The Aura|El aura|2005|m|thriller,neonoir|obsesion,crimen,identidad|atmosferico,tenso|argentino|nueve-reinas,la-mujer-sin-cabeza,el-secreto
leonera|Lion's Den|Leonera|2008|m|drama,social|maternidad,justicia,violencia|crudo|argentino|la-historia-oficial,elefante-blanco,carancho
carancho|Carancho|-|2010|m|thriller,neonoir|corrupcion,ciudad,amor|crudo,tenso|argentino|elefante-blanco,el-aura,nueve-reinas
elefante-blanco|White Elephant|Elefante blanco|2012|m|drama,social|fe,clase,violencia|crudo|argentino|carancho,leonera,city-of-god
la-odisea-de-los-giles|Heroic Losers|La odisea de los giles|2019|m|atracos,humor|comunidad,dinero,venganza|divertido,agridulce|argentino|nueve-reinas,relatos-salvajes,el-hijo-de-la-novia
el-ciudadano-ilustre|The Distinguished Citizen|El ciudadano ilustre|2016|m|humor-negro,satira|arte,comunidad,fama|ingenioso,agridulce|argentino|relatos-salvajes,un-cuento-chino,the-great-beauty
esperando-la-carroza|Waiting for the Hearse|Esperando la carroza|1985|m|humor,humor-negro|familia,vejez,clase|divertido,bizarro|argentino|el-hijo-de-la-novia,relatos-salvajes,festen
el-hijo-de-la-novia|Son of the Bride|El hijo de la novia|2001|m|drama,humor|familia,vejez,trabajo|agridulce,emotivo|argentino|the-royal-tenenbaums,un-cuento-chino,esperando-la-carroza
un-cuento-chino|Chinese Take-Away|Un cuento chino|2011|m|humor,drama|soledad,migracion,amistad|tierno,agridulce|argentino|el-hijo-de-la-novia,el-ciudadano-ilustre,lost-in-translation
historias-extraordinarias|Extraordinary Stories|Historias extraordinarias|2008|m|autor,thriller|destino,identidad,viaje|ingenioso,contemplativo|argentino|la-flor,el-aura,zama
la-flor|La flor|-|2018|m|autor,antologia|arte,cine,amistad|ludico,cerebral|argentino|historias-extraordinarias,8-half,synecdoche
pizza-birra-faso|Pizza, Beer, and Cigarettes|Pizza, birra, faso|1998|m|drama,social,policial|ciudad,clase,adolescencia|crudo|argentino|mundo-grua,city-of-god,amores-perros
mundo-grua|Crane World|Mundo grúa|1999|m|drama,social|trabajo,clase,vejez|melancolico,crudo|argentino|rosetta,bicycle-thieves,pizza-birra-faso
el-estudiante|The Student|El estudiante|2011|m|drama,politico|poder,ambicion,politica|tenso,cerebral|argentino|el-clan,carancho,argentina-1985
los-delincuentes|The Delinquents|Los delincuentes|2023|m|atracos,autor,drama|libertad,trabajo,dinero|contemplativo,luminoso|argentino|la-flor,historias-extraordinarias,mundo-grua,nueve-reinas
xxy|XXY|-|2007|m|drama,coming-of-age|identidad,cuerpo,adolescencia|melancolico|argentino|la-cienaga,moonlight,call-me-by-your-name
puan|Puan|-|2023|m|humor,satira|trabajo,amistad,politica|divertido,ingenioso|argentino|el-ciudadano-ilustre,el-hijo-de-la-novia,la-odisea-de-los-giles
amores-perros|Amores perros|-|2000|m|drama,thriller|violencia,amor,ciudad,clase|crudo,frenetico|latam|city-of-god,y-tu-mama,pizza-birra-faso
y-tu-mama|Y tu mamá también|-|2001|m|road-movie,drama,coming-of-age|amistad,deseo,clase,viaje|luminoso,melancolico|latam|amores-perros,roma,the-motorcycle-diaries
central-station|Central Station|Central do Brasil|1998|m|road-movie,drama|infancia,soledad,viaje|emotivo,tierno|latam|y-tu-mama,un-cuento-chino,roma
a-fantastic-woman|A Fantastic Woman|Una mujer fantástica|2017|m|drama|identidad,duelo,genero|melancolico|latam|xxy,moonlight,roma
no-2012|No|-|2012|m|drama,politico,satira|dictadura,medios,politica|ingenioso,luminoso|latam|argentina-1985,el-estudiante,network
embrace-of-the-serpent|Embrace of the Serpent|El abrazo de la serpiente|2015|m|aventura,autor,historico|colonialismo,naturaleza,memoria|contemplativo,onirico|latam|aguirre,zama,fitzcarraldo
bacurau|Bacurau|-|2019|m|western,satira,thriller|comunidad,colonialismo,violencia|bizarro,visceral|latam|the-wild-bunch,embrace-of-the-serpent,us
whisky|Whisky|-|2004|m|humor,drama|soledad,familia,trabajo|agridulce,lento|latam|el-hijo-de-la-novia,un-cuento-chino,mundo-grua
the-motorcycle-diaries|The Motorcycle Diaries|Diarios de motocicleta|2004|m|road-movie,biografico|viaje,amistad,clase|luminoso,emotivo|latam|y-tu-mama,central-station
the-milk-of-sorrow|The Milk of Sorrow|La teta asustada|2009|m|drama,autor|trauma,maternidad,memoria|contemplativo,melancolico|latam|roma,la-cienaga,la-llorona
monty-python-holy-grail|Monty Python and the Holy Grail|-|1975|m|humor,absurdo|poder,fe|bizarro,divertido|comedia-absurda|life-of-brian,airplane,the-big-lebowski
life-of-brian|Life of Brian|-|1979|m|humor,absurdo,satira|fe,poder,politica|divertido,satirico|comedia-absurda|monty-python-holy-grail,dr-strangelove,airplane
airplane|Airplane!|-|1980|m|humor,absurdo|cine,medios|divertido,bizarro|comedia-absurda|the-naked-gun,monty-python-holy-grail,hot-fuzz
the-naked-gun|The Naked Gun: From the Files of Police Squad!|-|1988|m|humor,absurdo,policial|cine,justicia|divertido,bizarro|comedia-absurda|airplane,hot-fuzz
the-big-lebowski|The Big Lebowski|-|1998|m|humor,neonoir,absurdo|amistad,dinero,identidad|divertido,bizarro|comedia-absurda|fargo,the-long-goodbye,inherent-vice,burn-after-reading
being-john-malkovich|Being John Malkovich|-|1999|m|humor,surrealista,fantasia|identidad,deseo,fama|bizarro,ingenioso|comedia-absurda|eternal-sunshine,synecdoche,the-lobster
the-lobster|The Lobster|-|2015|m|humor-negro,distopia,absurdo|amor,soledad,control|bizarro,perturbador|comedia-absurda|being-john-malkovich,brazil,poor-things
poor-things|Poor Things|-|2023|m|humor,fantasia,surrealista|identidad,deseo,libertad,cuerpo|bizarro,luminoso|comedia-absurda|the-lobster,frankenstein-31,amelie
hot-fuzz|Hot Fuzz|-|2007|m|humor,accion,policial|comunidad,amistad|divertido,frenetico|comedia-absurda|shaun-of-the-dead,the-naked-gun,wicker-man
dr-strangelove|Dr. Strangelove or: How I Learned to Stop Worrying and Love the Bomb|-|1964|m|humor,satira|guerra,poder,apocalipsis|satirico,bizarro|comedia-satira|network,in-the-loop,the-death-of-stalin,life-of-brian
network|Network|-|1976|m|satira,drama|medios,poder,locura|satirico,tenso|comedia-satira|nightcrawler,dr-strangelove,the-truman-show
the-truman-show|The Truman Show|-|1998|m|satira,drama,scifi|medios,libertad,identidad|luminoso,melancolico|comedia-satira|network,groundhog-day,being-there
being-there|Being There|-|1979|m|satira,humor|poder,medios,identidad|ingenioso,agridulce|comedia-satira|the-truman-show,dr-strangelove
in-the-loop|In the Loop|-|2009|m|satira,humor|politica,poder,guerra|ingenioso,frenetico|comedia-satira|dr-strangelove,the-death-of-stalin
the-death-of-stalin|The Death of Stalin|-|2017|m|satira,humor-negro,historico|poder,dictadura,politica|ingenioso,satirico|comedia-satira|in-the-loop,dr-strangelove
triangle-of-sadness|Triangle of Sadness|-|2022|m|satira,humor-negro|clase,dinero,genero|satirico,bizarro|comedia-satira|the-square,the-menu,parasite
the-square|The Square|-|2017|m|satira,humor|arte,clase,culpa|satirico,bizarro|comedia-satira|triangle-of-sadness,toni-erdmann,the-great-beauty
the-apartment|The Apartment|-|1960|m|romcom,drama|soledad,trabajo,amor|agridulce,tierno|comedia-humana|some-like-it-hot,annie-hall,lost-in-translation
some-like-it-hot|Some Like It Hot|-|1959|m|humor,romcom|genero,identidad,amor|divertido,ingenioso|comedia-humana|the-apartment,the-philadelphia-story
little-miss-sunshine|Little Miss Sunshine|-|2006|m|humor,road-movie|familia,viaje|agridulce,emotivo|comedia-humana|the-royal-tenenbaums,el-hijo-de-la-novia,the-holdovers
the-royal-tenenbaums|The Royal Tenenbaums|-|2001|m|humor,drama|familia,paternidad,soledad|agridulce,ingenioso|comedia-humana|the-grand-budapest-hotel,little-miss-sunshine,festen,el-hijo-de-la-novia
the-grand-budapest-hotel|The Grand Budapest Hotel|-|2014|m|humor,aventura|amistad,nostalgia,guerra|ingenioso,elegante|comedia-humana|the-royal-tenenbaums,fantastic-mr-fox,isle-of-dogs
groundhog-day|Groundhog Day|-|1993|m|humor,romcom,fantasia|tiempo,redencion,amor|tierno,ingenioso|comedia-humana|palm-springs,eternal-sunshine,the-truman-show
frances-ha|Frances Ha|-|2012|m|humor,drama|amistad,crecer,ciudad|luminoso,agridulce|comedia-humana|annie-hall,lady-bird,the-worst-person
lady-bird|Lady Bird|-|2017|m|coming-of-age,humor|maternidad,adolescencia,clase|tierno,agridulce|comedia-humana|frances-ha,aftersun,the-worst-person
the-worst-person|The Worst Person in the World|Verdens verste menneske|2021|m|romance,drama,humor|amor,identidad,crecer|agridulce,melancolico|comedia-humana|frances-ha,lady-bird,before-sunset
sideways|Sideways|-|2004|m|humor,road-movie|amistad,soledad,vejez|agridulce|comedia-humana|the-holdovers,little-miss-sunshine
toni-erdmann|Toni Erdmann|-|2016|m|humor,drama|paternidad,trabajo,soledad|agridulce,bizarro|comedia-humana|the-square,el-hijo-de-la-novia,sideways
the-holdovers|The Holdovers|-|2023|m|humor,drama|soledad,duelo,crecer|agridulce,tierno,nostalgico|comedia-humana|sideways,little-miss-sunshine
intouchables|The Intouchables|Intouchables|2011|m|humor,drama|amistad,clase,cuerpo|emotivo,divertido|comedia-humana|little-miss-sunshine,el-hijo-de-la-novia
in-bruges|In Bruges|-|2008|m|humor-negro,policial|culpa,redencion,amistad|agridulce,ingenioso|comedia-negra|the-banshees-of-inisherin,fargo,relatos-salvajes
the-banshees-of-inisherin|The Banshees of Inisherin|-|2022|m|humor-negro,drama|amistad,soledad,violencia|agridulce,melancolico|comedia-negra|in-bruges,fargo,the-lighthouse
burn-after-reading|Burn After Reading|-|2008|m|humor-negro,espias|poder,medios|bizarro,ingenioso|comedia-negra|fargo,the-big-lebowski,in-the-loop
delicatessen|Delicatessen|-|1991|m|humor-negro,distopia,surrealista|consumo,comunidad|bizarro,ludico|comedia-negra|brazil,amelie,the-lobster
in-the-mood-for-love|In the Mood for Love|花樣年華|2000|m|romance,drama,autor|amor,soledad,memoria|melancolico,elegante|romance-imposible|past-lives,brief-encounter,lost-in-translation,chungking-express
chungking-express|Chungking Express|重慶森林|1994|m|romance,autor|amor,soledad,ciudad|estiloso,tierno|romance-imposible|in-the-mood-for-love,lost-in-translation,amelie
brief-encounter|Brief Encounter|-|1945|m|romance,drama|amor,culpa,pareja|melancolico,elegante|romance-imposible|in-the-mood-for-love,casablanca,the-apartment
casablanca|Casablanca|-|1942|m|romance,drama,belico|amor,guerra,lealtad|romantico,elegante|romance-imposible|brief-encounter,the-third-man,roman-holiday
before-sunrise|Before Sunrise|-|1995|m|romance|amor,viaje,tiempo|romantico,tierno|romance-imposible|before-sunset,before-midnight,past-lives,lost-in-translation
before-sunset|Before Sunset|-|2004|m|romance|amor,tiempo,memoria|romantico,melancolico|romance-imposible|before-sunrise,before-midnight,in-the-mood-for-love
before-midnight|Before Midnight|-|2013|m|romance,drama|pareja,tiempo,familia|agridulce|romance-imposible|before-sunset,before-sunrise,marriage-story
past-lives|Past Lives|-|2023|m|romance,drama|amor,migracion,destino,memoria|melancolico,tierno|romance-imposible|in-the-mood-for-love,before-sunrise,minari,lost-in-translation
lost-in-translation|Lost in Translation|-|2003|m|drama,romance,humor|soledad,amistad,ciudad|melancolico,tierno|romance-imposible|her,in-the-mood-for-love,past-lives,before-sunrise
eternal-sunshine|Eternal Sunshine of the Spotless Mind|-|2004|m|romance,scifi,surrealista|memoria,amor,desamor|melancolico,onirico|romance-imposible|her,being-john-malkovich,before-sunset,arrival
portrait-of-a-lady-on-fire|Portrait of a Lady on Fire|Portrait de la jeune fille en feu|2019|m|romance,historico,autor|amor,arte,memoria,genero|contemplativo,romantico|romance-imposible|carol,call-me-by-your-name,in-the-mood-for-love,the-handmaiden
carol|Carol|-|2015|m|romance,drama|amor,sexualidad,clase|elegante,melancolico|romance-imposible|portrait-of-a-lady-on-fire,brokeback-mountain,in-the-mood-for-love
call-me-by-your-name|Call Me by Your Name|-|2017|m|romance,coming-of-age|amor,deseo,crecer|luminoso,melancolico|romance-imposible|portrait-of-a-lady-on-fire,moonlight,before-sunrise
brokeback-mountain|Brokeback Mountain|-|2005|m|romance,drama,western|amor,sexualidad,soledad|melancolico|romance-imposible|carol,moonlight,the-power-of-the-dog
cold-war|Cold War|Zimna wojna|2018|m|romance,musical,drama|amor,exilio,musica|melancolico,elegante|romance-imposible|the-umbrellas-of-cherbourg,in-the-mood-for-love
annie-hall|Annie Hall|-|1977|m|romcom|amor,desamor,ciudad|ingenioso,agridulce|romcom|when-harry-met-sally,frances-ha,the-apartment
when-harry-met-sally|When Harry Met Sally...|-|1989|m|romcom|amor,amistad,tiempo|ingenioso,tierno|romcom|annie-hall,notting-hill,before-sunrise
notting-hill|Notting Hill|-|1999|m|romcom|amor,fama|tierno,divertido|romcom|four-weddings,when-harry-met-sally,roman-holiday
four-weddings|Four Weddings and a Funeral|-|1994|m|romcom|amor,amistad|divertido,agridulce|romcom|notting-hill,when-harry-met-sally
roman-holiday|Roman Holiday|-|1953|m|romcom|amor,libertad,viaje|luminoso,tierno|romcom|notting-hill,casablanca,before-sunrise
it-happened-one-night|It Happened One Night|-|1934|m|romcom,road-movie|amor,clase,viaje|ingenioso,divertido|romcom|the-philadelphia-story,roman-holiday
the-philadelphia-story|The Philadelphia Story|-|1940|m|romcom|amor,clase|ingenioso,elegante|romcom|it-happened-one-night,some-like-it-hot
amelie|Amélie|Le Fabuleux Destin d'Amélie Poulain|2001|m|romcom,fantasia|amor,soledad,ciudad|luminoso,tierno|romcom|chungking-express,delicatessen,medianeras
ten-things|10 Things I Hate About You|-|1999|m|romcom,coming-of-age|amor,adolescencia|divertido,tierno|romcom|when-harry-met-sally,lady-bird
palm-springs|Palm Springs|-|2020|m|romcom,viajes-tiempo|amor,tiempo,soledad|divertido,tierno|romcom|groundhog-day,eternal-sunshine
medianeras|Sidewalls|Medianeras|2011|m|romance,humor|soledad,ciudad,amor,tecnologia|tierno,agridulce|romcom|her,lost-in-translation,un-cuento-chino
the-umbrellas-of-cherbourg|The Umbrellas of Cherbourg|Les Parapluies de Cherbourg|1964|m|musical,romance|amor,guerra,destino|romantico,melancolico|musica|la-la-land,cold-war,singin-in-the-rain
la-la-land|La La Land|-|2016|m|musical,romance|amor,ambicion,arte|romantico,agridulce|musica|the-umbrellas-of-cherbourg,singin-in-the-rain,whiplash
singin-in-the-rain|Singin' in the Rain|-|1952|m|musical,humor|cine,amor,fama|luminoso,divertido|musica|la-la-land,the-umbrellas-of-cherbourg
west-side-story|West Side Story|-|1961|m|musical,romance|amor,racismo,violencia|romantico,epico|musica|la-la-land,the-umbrellas-of-cherbourg,do-the-right-thing
cabaret|Cabaret|-|1972|m|musical,drama|politica,deseo,identidad|estiloso,melancolico|musica|all-that-jazz,the-umbrellas-of-cherbourg
all-that-jazz|All That Jazz|-|1979|m|musical,drama,autor|arte,muerte,obsesion|estiloso,frenetico|musica|cabaret,8-half,whiplash
whiplash|Whiplash|-|2014|m|drama,thriller|musica,obsesion,poder|tenso,frenetico|musica|black-swan,tar,all-that-jazz,la-la-land
tar|Tár|-|2022|m|drama,psicologico|musica,poder,identidad|elegante,perturbador|musica|whiplash,black-swan,the-master
amadeus|Amadeus|-|1984|m|biografico,drama|musica,obsesion,fe|epico,elegante|musica|tar,barry-lyndon,whiplash
inside-llewyn-davis|Inside Llewyn Davis|-|2013|m|drama,humor|musica,soledad,duelo,ciudad|melancolico,agridulce|musica|once,the-big-lebowski,paris-texas
once|Once|-|2007|m|musical,romance|musica,amor,ciudad|tierno,melancolico|musica|sing-street,before-sunrise,inside-llewyn-davis
sing-street|Sing Street|-|2016|m|musical,coming-of-age,humor|musica,adolescencia,familia|luminoso,tierno|musica|once,lady-bird,back-to-the-future
dancer-in-the-dark|Dancer in the Dark|-|2000|m|musical,drama|maternidad,justicia,suenos|melancolico,crudo|musica|the-umbrellas-of-cherbourg,i-daniel-blake
spirited-away|Spirited Away|千と千尋の神隠し|2001|m|anime,fantasia|crecer,identidad,trabajo|onirico,luminoso|anim-japon|my-neighbor-totoro,princess-mononoke,howls-moving-castle,the-boy-and-the-heron
my-neighbor-totoro|My Neighbor Totoro|となりのトトロ|1988|m|anime,fantasia|infancia,familia,naturaleza|tierno,luminoso|anim-japon|spirited-away,grave-of-the-fireflies
princess-mononoke|Princess Mononoke|もののけ姫|1997|m|anime,fantasia,epico|naturaleza,guerra,tecnologia|epico,crudo|anim-japon|nausicaa,spirited-away,wolfwalkers
nausicaa|Nausicaä of the Valley of the Wind|風の谷のナウシカ|1984|m|anime,fantasia,scifi|naturaleza,guerra,apocalipsis|epico,luminoso|anim-japon|princess-mononoke,spirited-away
howls-moving-castle|Howl's Moving Castle|ハウルの動く城|2004|m|anime,fantasia,romance|guerra,amor,vejez|romantico,luminoso|anim-japon|spirited-away,the-boy-and-the-heron
the-boy-and-the-heron|The Boy and the Heron|君たちはどう生きるか|2023|m|anime,fantasia|duelo,crecer,familia|onirico,melancolico|anim-japon|spirited-away,howls-moving-castle,pans-labyrinth
grave-of-the-fireflies|Grave of the Fireflies|火垂るの墓|1988|m|anime,belico,drama|guerra,infancia,muerte|melancolico,crudo|anim-japon|my-neighbor-totoro,come-and-see
your-name|Your Name.|君の名は。|2016|m|anime,romance,fantasia|amor,tiempo,identidad|romantico,luminoso|anim-japon|spirited-away,howls-moving-castle,before-sunrise
paprika|Paprika|パプリカ|2006|m|anime,scifi,surrealista|suenos,identidad,tecnologia|onirico,frenetico|anim-japon|perfect-blue,inception,millennium-actress,ghost-in-the-shell
millennium-actress|Millennium Actress|千年女優|2001|m|anime,romance|cine,memoria,amor|onirico,melancolico|anim-japon|paprika,perfect-blue,tokyo-godfathers
tokyo-godfathers|Tokyo Godfathers|東京ゴッドファーザーズ|2003|m|anime,humor|familia,ciudad,redencion|tierno,divertido|anim-japon|millennium-actress,paprika
fantastic-mr-fox|Fantastic Mr. Fox|-|2009|m|animacion,stop-motion,humor|familia,animales|ingenioso,divertido|anim-autor|isle-of-dogs,the-grand-budapest-hotel,coraline
isle-of-dogs|Isle of Dogs|-|2018|m|animacion,stop-motion,aventura|animales,lealtad,politica|ingenioso,tierno|anim-autor|fantastic-mr-fox,the-grand-budapest-hotel
coraline|Coraline|-|2009|m|animacion,stop-motion,fantasia|familia,infancia,identidad|onirico,atmosferico|anim-autor|pinocchio-22,spirited-away
anomalisa|Anomalisa|-|2015|m|animacion,stop-motion,drama|soledad,identidad,amor|melancolico|anim-autor|synecdoche,mary-and-max,lost-in-translation
mary-and-max|Mary and Max|-|2009|m|animacion,stop-motion,drama|amistad,soledad|tierno,agridulce|anim-autor|anomalisa,up
pinocchio-22|Guillermo del Toro's Pinocchio|-|2022|m|animacion,stop-motion,fantasia|paternidad,muerte,guerra|melancolico,tierno|anim-autor|coraline,pans-labyrinth,the-iron-giant
spider-verse|Spider-Man: Into the Spider-Verse|-|2018|m|animacion,accion,aventura|identidad,crecer,familia|frenetico,estiloso|anim-autor|the-iron-giant,klaus
wall-e|WALL·E|-|2008|m|animacion,scifi,romance|soledad,consumo,naturaleza,amor|tierno,luminoso|anim-autor|up,the-iron-giant,her
up|Up|-|2009|m|animacion,aventura|duelo,vejez,amistad|emotivo,tierno|anim-autor|wall-e,mary-and-max,ratatouille
ratatouille|Ratatouille|-|2007|m|animacion,humor|arte,ambicion,amistad|divertido,tierno|anim-autor|up,fantastic-mr-fox
inside-out|Inside Out|-|2015|m|animacion,humor|crecer,familia,memoria|emotivo,divertido|anim-autor|up,toy-story
toy-story|Toy Story|-|1995|m|animacion,aventura|amistad,crecer|divertido,tierno|anim-autor|inside-out,up,the-iron-giant
the-iron-giant|The Iron Giant|-|1999|m|animacion,scifi|amistad,infancia,guerra|emotivo,tierno|anim-autor|wall-e,spider-verse,pinocchio-22
persepolis|Persepolis|-|2007|m|animacion,biografico,drama|exilio,dictadura,crecer|melancolico,ingenioso|anim-autor|waltz-with-bashir,grave-of-the-fireflies
waltz-with-bashir|Waltz with Bashir|-|2008|m|animacion,documental,belico|guerra,memoria,trauma|onirico,crudo|anim-autor|persepolis,come-and-see,apocalypse-now
song-of-the-sea|Song of the Sea|-|2014|m|animacion,fantasia|familia,duelo,tradicion|tierno,onirico|anim-autor|wolfwalkers,my-neighbor-totoro
wolfwalkers|Wolfwalkers|-|2020|m|animacion,fantasia,aventura|naturaleza,colonialismo,familia|luminoso,epico|anim-autor|song-of-the-sea,princess-mononoke
klaus|Klaus|-|2019|m|animacion,humor|comunidad,amistad,redencion|tierno,divertido|anim-autor|the-iron-giant,spider-verse
the-triplets-of-belleville|The Triplets of Belleville|Les Triplettes de Belleville|2003|m|animacion,humor,absurdo|familia,deporte,musica|bizarro,tierno|anim-autor|isle-of-dogs,mary-and-max
flow|Flow|Straume|2024|m|animacion,aventura|naturaleza,supervivencia,animales|contemplativo,luminoso|anim-autor|wolfwalkers,wall-e,song-of-the-sea
mad-max-fury-road|Mad Max: Fury Road|-|2015|m|accion,distopia|libertad,supervivencia,rebelion|frenetico,epico|accion|the-raid,terminator-2,aliens,snowpiercer
the-raid|The Raid|-|2011|m|accion,artes-marciales|supervivencia,violencia,familia|frenetico,visceral|accion|mad-max-fury-road,john-wick,hard-boiled
die-hard|Die Hard|-|1988|m|accion,thriller|supervivencia,pareja|frenetico,divertido|accion|aliens,terminator-2,john-wick
john-wick|John Wick|-|2014|m|accion,neonoir|venganza,duelo,violencia|estiloso,frenetico|accion|the-raid,hard-boiled,drive
hard-boiled|Hard Boiled|辣手神探|1992|m|accion,policial|lealtad,violencia|frenetico,visceral|accion|the-raid,john-wick,infernal-affairs
aliens|Aliens|-|1986|m|accion,scifi,criaturas|maternidad,supervivencia|frenetico,tenso|accion|alien,terminator-2,predator,die-hard
predator|Predator|-|1987|m|accion,scifi,criaturas|supervivencia,violencia|tenso,pulp|accion|aliens,die-hard,the-thing
mission-impossible-fallout|Mission: Impossible - Fallout|-|2018|m|accion,espias|lealtad,traicion|frenetico|accion|top-gun-maverick,john-wick,die-hard
top-gun-maverick|Top Gun: Maverick|-|2022|m|accion,aventura|duelo,lealtad,vejez|epico,emotivo|accion|mission-impossible-fallout,mad-max-fury-road
kill-bill|Kill Bill: Vol. 1|-|2003|m|accion,artes-marciales|venganza,maternidad|estiloso,sangriento|accion|lady-snowblood,john-wick,pulp-fiction
raiders|Raiders of the Lost Ark|-|1981|m|aventura,accion|fe,poder|divertido,pulp|aventura|jurassic-park,back-to-the-future,the-princess-bride
jurassic-park|Jurassic Park|-|1993|m|aventura,scifi,criaturas|ciencia,naturaleza,paternidad|epico,tenso|aventura|raiders,jaws
back-to-the-future|Back to the Future|-|1985|m|aventura,viajes-tiempo,humor|familia,tiempo,adolescencia|divertido,luminoso|aventura|raiders,groundhog-day
the-princess-bride|The Princess Bride|-|1987|m|aventura,fantasia,humor|amor,venganza|divertido,romantico|aventura|raiders,monty-python-holy-grail,labyrinth
master-and-commander|Master and Commander: The Far Side of the World|-|2003|m|aventura,historico,belico|lealtad,mar,guerra|epico,contemplativo|aventura|lawrence-of-arabia,fitzcarraldo,jaws
fitzcarraldo|Fitzcarraldo|-|1982|m|aventura,autor|obsesion,naturaleza,arte|epico,bizarro|aventura|aguirre,embrace-of-the-serpent,master-and-commander
aguirre|Aguirre, the Wrath of God|Aguirre, der Zorn Gottes|1972|m|aventura,autor,historico|locura,poder,colonialismo|onirico,perturbador|aventura|fitzcarraldo,embrace-of-the-serpent,zama,apocalypse-now
seven-samurai|Seven Samurai|七人の侍|1954|m|samurai,accion,epico|honor,comunidad,clase|epico|espadas|yojimbo,ran,harakiri
yojimbo|Yojimbo|用心棒|1961|m|samurai,accion,humor-negro|poder,dinero|ingenioso,estiloso|espadas|seven-samurai,the-good-the-bad
harakiri|Harakiri|切腹|1962|m|samurai,drama|honor,venganza,poder|sombrio,elegante|espadas|seven-samurai,13-assassins,ran
ran|Ran|乱|1985|m|epico,samurai,drama|poder,familia,guerra,vejez|epico,sombrio|espadas|seven-samurai,lawrence-of-arabia,the-godfather
13-assassins|13 Assassins|十三人の刺客|2010|m|samurai,accion|honor,violencia,poder|visceral,epico|espadas|seven-samurai,harakiri
lady-snowblood|Lady Snowblood|修羅雪姫|1973|m|samurai,accion|venganza,maternidad|estiloso,sangriento|espadas|kill-bill,harakiri
crouching-tiger|Crouching Tiger, Hidden Dragon|臥虎藏龍|2000|m|wuxia,romance|amor,honor,libertad|elegante,epico|espadas|hero,the-assassin
hero|Hero|英雄|2002|m|wuxia,epico|poder,honor,arte|elegante,epico|espadas|crouching-tiger,the-assassin
the-assassin|The Assassin|刺客聶隱娘|2015|m|wuxia,autor|honor,amor,soledad|contemplativo,elegante|espadas|crouching-tiger,hero
lotr-fellowship|The Lord of the Rings: The Fellowship of the Ring|-|2001|m|fantasia,aventura,epico|amistad,poder,destino|epico|fantasia|lotr-two-towers,lotr-return,the-green-knight
lotr-two-towers|The Lord of the Rings: The Two Towers|-|2002|m|fantasia,aventura,epico|guerra,amistad,lealtad|epico|fantasia|lotr-fellowship,lotr-return
lotr-return|The Lord of the Rings: The Return of the King|-|2003|m|fantasia,aventura,epico|guerra,amistad,destino|epico,emotivo|fantasia|lotr-fellowship,lotr-two-towers
pans-labyrinth|Pan's Labyrinth|El laberinto del fauno|2006|m|fantasia,belico,cuento|infancia,guerra,dictadura|onirico,melancolico|fantasia|the-devils-backbone,pinocchio-22,spirited-away,the-boy-and-the-heron
labyrinth|Labyrinth|-|1986|m|fantasia,musical,aventura|crecer,adolescencia|ludico,onirico|fantasia|the-dark-crystal,the-princess-bride,spirited-away
the-dark-crystal|The Dark Crystal|-|1982|m|fantasia,aventura|destino,poder,naturaleza|onirico,atmosferico|fantasia|labyrinth,nausicaa
big-fish|Big Fish|-|2003|m|fantasia,drama|paternidad,memoria,muerte|tierno,luminoso|fantasia|edward-scissorhands,the-fall,amelie
edward-scissorhands|Edward Scissorhands|-|1990|m|fantasia,romance,gotico|soledad,identidad,comunidad|tierno,melancolico|fantasia|big-fish,frankenstein-31,the-iron-giant
the-green-knight|The Green Knight|-|2021|m|fantasia,aventura,autor|honor,muerte,identidad|onirico,contemplativo|fantasia|the-seventh-seal,monty-python-holy-grail,the-witch,lotr-fellowship
the-fall|The Fall|-|2006|m|fantasia,aventura,drama|infancia,amistad,muerte|onirico,emotivo|fantasia|big-fish,pans-labyrinth
apocalypse-now|Apocalypse Now|-|1979|m|belico,autor|locura,guerra,colonialismo|onirico,perturbador|belico|platoon,full-metal-jacket,aguirre,the-thin-red-line
come-and-see|Come and See|Иди и смотри|1985|m|belico,drama|guerra,infancia,trauma|perturbador,angustiante|belico|ivans-childhood,grave-of-the-fireflies,the-zone-of-interest,iluminados-por-el-fuego
ivans-childhood|Ivan's Childhood|Иваново детство|1962|m|belico,drama|guerra,infancia,suenos|melancolico,onirico|belico|come-and-see,grave-of-the-fireflies
paths-of-glory|Paths of Glory|-|1957|m|belico,drama|guerra,justicia,poder|sombrio|belico|full-metal-jacket,all-quiet-22,1917
full-metal-jacket|Full Metal Jacket|-|1987|m|belico|guerra,violencia,identidad|crudo,ingenioso|belico|platoon,apocalypse-now,paths-of-glory
platoon|Platoon|-|1986|m|belico|guerra,culpa,violencia|crudo|belico|full-metal-jacket,apocalypse-now,the-deer-hunter
the-deer-hunter|The Deer Hunter|-|1978|m|belico,drama|guerra,amistad,trauma|melancolico,crudo|belico|platoon,apocalypse-now
saving-private-ryan|Saving Private Ryan|-|1998|m|belico,accion|guerra,lealtad,muerte|visceral,epico|belico|the-thin-red-line,1917,dunkirk
the-thin-red-line|The Thin Red Line|-|1998|m|belico,autor|guerra,naturaleza,fe|contemplativo|belico|saving-private-ryan,apocalypse-now,the-tree-of-life
dunkirk|Dunkirk|-|2017|m|belico,thriller|supervivencia,guerra,tiempo|tenso|belico|1917,saving-private-ryan,das-boot
1917|1917|-|2019|m|belico|guerra,amistad,supervivencia|tenso,epico|belico|dunkirk,paths-of-glory,all-quiet-22
all-quiet-22|All Quiet on the Western Front|Im Westen nichts Neues|2022|m|belico|guerra,adolescencia,muerte|crudo,sombrio|belico|1917,paths-of-glory,come-and-see
das-boot|Das Boot|-|1981|m|belico,thriller|guerra,mar,supervivencia|tenso,angustiante|belico|dunkirk,master-and-commander
the-zone-of-interest|The Zone of Interest|-|2023|m|belico,historico,autor|violencia,familia,poder|perturbador,contemplativo|belico|come-and-see,jeanne-dielman
iluminados-por-el-fuego|Blessed by Fire|Iluminados por el fuego|2005|m|belico,drama|guerra,trauma,memoria|crudo,emotivo|belico|come-and-see,platoon,full-metal-jacket
the-good-the-bad|The Good, the Bad and the Ugly|Il buono, il brutto, il cattivo|1966|m|western,aventura|dinero,traicion,guerra|epico,ingenioso|western|once-upon-a-time-in-the-west,yojimbo,the-wild-bunch
once-upon-a-time-in-the-west|Once Upon a Time in the West|C'era una volta il West|1968|m|western,epico|venganza,poder,tiempo|epico,elegante|western|the-good-the-bad,once-upon-a-time-in-america,the-searchers
the-searchers|The Searchers|-|1956|m|western|racismo,familia,obsesion|epico,sombrio|western|unforgiven,rio-bravo,once-upon-a-time-in-the-west
unforgiven|Unforgiven|-|1992|m|western|violencia,culpa,vejez|sombrio,melancolico|western|the-searchers,the-wild-bunch,no-country-for-old-men
high-noon|High Noon|-|1952|m|western|justicia,comunidad,tiempo|tenso|western|rio-bravo,the-searchers
rio-bravo|Rio Bravo|-|1959|m|western|amistad,lealtad,justicia|divertido,elegante|western|high-noon,the-searchers
the-wild-bunch|The Wild Bunch|-|1969|m|western|violencia,vejez,lealtad|visceral,melancolico|western|unforgiven,the-good-the-bad,bacurau
true-grit|True Grit|-|2010|m|western|venganza,adolescencia,justicia|ingenioso,sombrio|western|unforgiven,no-country-for-old-men,the-searchers
jesse-james|The Assassination of Jesse James by the Coward Robert Ford|-|2007|m|western,biografico|fama,obsesion,traicion|contemplativo,melancolico|western|mccabe,unforgiven,dead-man
dead-man|Dead Man|-|1995|m|western,surrealista|muerte,viaje,colonialismo|onirico,contemplativo|western|jesse-james,mccabe
mccabe|McCabe & Mrs. Miller|-|1971|m|western,romance|ambicion,amor,comunidad|melancolico,atmosferico|western|jesse-james,dead-man,the-power-of-the-dog
the-power-of-the-dog|The Power of the Dog|-|2021|m|western,drama,psicologico|genero,familia,deseo|tenso,contemplativo|western|brokeback-mountain,there-will-be-blood,mccabe
the-proposition|The Proposition|-|2005|m|western|violencia,familia,colonialismo|visceral,sombrio|western|unforgiven,bone-tomahawk,the-wild-bunch
django-unchained|Django Unchained|-|2012|m|western,accion|racismo,venganza,libertad|estiloso,sangriento|western|the-good-the-bad,kill-bill,the-hateful-eight
the-hateful-eight|The Hateful Eight|-|2015|m|western,thriller|racismo,traicion,violencia|tenso,sangriento|western|django-unchained,reservoir-dogs,the-thing
first-cow|First Cow|-|2019|m|western,drama|amistad,clase,naturaleza|contemplativo,tierno|western|mccabe,dead-man
hell-or-high-water|Hell or High Water|-|2016|m|neowestern,atracos|familia,clase,dinero|melancolico,tenso|western|no-country-for-old-men,sicario,true-grit
stop-making-sense|Stop Making Sense|-|1984|m|documental,musical|musica,arte|luminoso,frenetico|docu|amy,searching-for-sugar-man,sing-street
man-on-wire|Man on Wire|-|2008|m|documental|libertad,arte,ciudad|luminoso,tenso|docu|free-solo,grizzly-man,searching-for-sugar-man
free-solo|Free Solo|-|2018|m|documental,aventura|obsesion,muerte,naturaleza|tenso|docu|man-on-wire,grizzly-man
grizzly-man|Grizzly Man|-|2005|m|documental|naturaleza,obsesion,locura|perturbador,melancolico|docu|man-on-wire,fitzcarraldo,fire-of-love
fire-of-love|Fire of Love|-|2022|m|documental|amor,ciencia,naturaleza|luminoso,melancolico|docu|grizzly-man,free-solo
the-act-of-killing|The Act of Killing|-|2012|m|documental,politico|violencia,memoria,poder|perturbador,bizarro|docu|the-fog-of-war,los-rubios,argentina-1985
the-fog-of-war|The Fog of War|-|2003|m|documental,politico|guerra,poder,culpa|cerebral|docu|the-act-of-killing,dr-strangelove
hoop-dreams|Hoop Dreams|-|1994|m|documental,social|deporte,clase,adolescencia|emotivo|docu|searching-for-sugar-man,senna
senna|Senna|-|2010|m|documental,biografico|deporte,fe,muerte|emotivo,tenso|docu|hoop-dreams,amy,free-solo
amy|Amy|-|2015|m|documental,biografico|musica,fama,adiccion|melancolico|docu|senna,searching-for-sugar-man,stop-making-sense
searching-for-sugar-man|Searching for Sugar Man|-|2012|m|documental,musical|musica,fama,destino|luminoso,emotivo|docu|amy,stop-making-sense,man-on-wire
exit-through-the-gift-shop|Exit Through the Gift Shop|-|2010|m|documental,satira|arte,fama,dinero|ingenioso,divertido|docu|the-square,man-on-wire
jiro-dreams|Jiro Dreams of Sushi|-|2011|m|documental|trabajo,paternidad,arte|contemplativo|docu|man-on-wire,tokyo-story
paris-is-burning|Paris Is Burning|-|1990|m|documental,social|identidad,genero,comunidad|luminoso,melancolico|docu|moonlight,hoop-dreams
honeyland|Honeyland|-|2019|m|documental|naturaleza,soledad,tradicion|contemplativo|docu|grizzly-man,first-cow
los-rubios|The Blonds|Los rubios|2003|m|documental,autor|memoria,dictadura,identidad|cerebral,melancolico|docu|argentina-1985,la-historia-oficial,the-act-of-killing
kind-hearts|Kind Hearts and Coronets|-|1949|m|humor-negro|clase,herencia,venganza|ingenioso,elegante|comedia-negra|arsenic,the-ladykillers,the-death-of-stalin
arsenic|Arsenic and Old Lace|-|1944|m|humor-negro,humor|familia,locura|divertido,bizarro|comedia-negra|kind-hearts,the-ladykillers
the-ladykillers|The Ladykillers|-|1955|m|humor-negro,atracos|vejez,dinero|divertido,ingenioso|comedia-negra|kind-hearts,arsenic,fargo
heathers|Heathers|-|1989|m|humor-negro,coming-of-age|adolescencia,violencia,poder|satirico,bizarro|comedia-negra|arsenic,kind-hearts,delicatessen
four-lions|Four Lions|-|2010|m|humor-negro,satira|fe,amistad,violencia|satirico,agridulce|comedia-negra|in-the-loop,the-death-of-stalin,dr-strangelove
seven-psychopaths|Seven Psychopaths|-|2012|m|humor-negro,policial|arte,amistad,violencia|bizarro,ingenioso|comedia-negra|in-bruges,the-banshees-of-inisherin,pulp-fiction
ben-hur|Ben-Hur|-|1959|m|epico,historico|venganza,fe,honor|epico|epicas|lawrence-of-arabia,gladiator
doctor-zhivago|Doctor Zhivago|-|1965|m|epico,romance,historico|amor,guerra,arte|romantico,epico|epicas|lawrence-of-arabia,cold-war,casablanca
the-last-emperor|The Last Emperor|-|1987|m|epico,biografico,historico|poder,identidad,soledad|elegante,epico|epicas|lawrence-of-arabia,barry-lyndon,citizen-kane
schindlers-list|Schindler's List|-|1993|m|historico,belico,drama|guerra,redencion,muerte|emotivo,sombrio|epicas|the-zone-of-interest,saving-private-ryan,come-and-see
gladiator|Gladiator|-|2000|m|epico,accion,historico|venganza,honor,poder|epico|epicas|ben-hur,seven-samurai,lotr-return
oppenheimer|Oppenheimer|-|2023|m|biografico,historico,drama|ciencia,culpa,poder,politica|tenso,epico|epicas|the-fog-of-war,citizen-kane,there-will-be-blood
killers-of-the-flower-moon|Killers of the Flower Moon|-|2023|m|historico,western,policial|colonialismo,dinero,racismo,traicion|sombrio,epico|epicas|there-will-be-blood,goodfellas,the-power-of-the-dog
last-crusade|Indiana Jones and the Last Crusade|-|1989|m|aventura,accion|paternidad,fe|divertido,pulp|aventura|raiders,back-to-the-future
sierra-madre|The Treasure of the Sierra Madre|-|1948|m|aventura,western|dinero,ambicion,traicion|sombrio,tenso|aventura|the-good-the-bad,fitzcarraldo,there-will-be-blood
life-of-pi|Life of Pi|-|2012|m|aventura,fantasia,drama|fe,supervivencia,animales,mar|luminoso,contemplativo|aventura|master-and-commander,the-fall,flow
pirates-black-pearl|Pirates of the Caribbean: The Curse of the Black Pearl|-|2003|m|aventura,fantasia,humor|libertad,mar,lealtad|divertido,pulp|aventura|raiders,the-princess-bride
the-lost-city-of-z|The Lost City of Z|-|2016|m|aventura,biografico|obsesion,colonialismo,naturaleza|contemplativo,melancolico|aventura|fitzcarraldo,embrace-of-the-serpent,aguirre
the-wire|The Wire|-|2002|t|policial,drama,social|ciudad,corrupcion,clase,crimen|crudo,cerebral|series-drama|the-sopranos,breaking-bad,true-detective
the-sopranos|The Sopranos|-|1999|t|mafia,drama|familia,poder,culpa|sombrio,ingenioso|series-drama|the-wire,breaking-bad,goodfellas,succession
breaking-bad|Breaking Bad|-|2008|t|policial,drama,neowestern|ambicion,familia,poder|tenso,sombrio|series-drama|better-call-saul,the-sopranos,fargo-tv
better-call-saul|Better Call Saul|-|2015|t|policial,drama,judicial|identidad,ambicion,familia|tenso,agridulce|series-drama|breaking-bad,fargo-tv
mad-men|Mad Men|-|2007|t|drama,historico|identidad,trabajo,deseo|elegante,melancolico|series-drama|the-sopranos,succession
succession|Succession|-|2018|t|drama,satira|poder,familia,dinero|ingenioso,tenso|series-drama|the-sopranos,veep,mad-men,the-godfather
the-leftovers|The Leftovers|-|2014|t|drama,fantasia|duelo,fe,comunidad|melancolico,emotivo|series-drama|twin-peaks,midnight-mass,dark
chernobyl|Chernobyl|-|2019|t|drama,historico|burocracia,ciencia,muerte|angustiante,sombrio|series-drama|the-wire,das-boot
dark|Dark|-|2017|t|scifi,viajes-tiempo,thriller|tiempo,familia,destino|sombrio,cerebral|series-drama|the-leftovers,primer,twin-peaks
severance|Severance|-|2022|t|scifi,thriller,satira|trabajo,identidad,memoria,control|cerebral,tenso|series-drama|mr-robot,brazil,the-truman-show
mr-robot|Mr. Robot|-|2015|t|thriller,psicologico,cyberpunk|identidad,tecnologia,rebelion|tenso,perturbador|series-drama|severance,the-matrix
fargo-tv|Fargo|-|2014|t|humor-negro,policial|crimen,destino,invierno|ingenioso,tenso|series-drama|fargo,breaking-bad,no-country-for-old-men
deadwood|Deadwood|-|2004|t|western,drama|comunidad,poder,violencia|crudo,ingenioso|series-drama|mccabe,the-wire,unforgiven
the-bear|The Bear|-|2022|t|drama,humor|trabajo,duelo,familia|frenetico,emotivo|series-drama|succession,the-holdovers
okupas|Okupas|-|2000|t|drama,social|amistad,clase,ciudad|crudo,melancolico|series-drama|pizza-birra-faso,mundo-grua,el-marginal
el-marginal|El marginal|-|2016|t|policial,thriller|violencia,supervivencia,corrupcion|crudo,tenso|series-drama|okupas,carancho,el-clan
normal-people|Normal People|-|2020|t|romance,drama,coming-of-age|amor,clase,crecer|melancolico,tierno|series-drama|call-me-by-your-name,before-sunrise,fleabag
fleabag|Fleabag|-|2016|t|humor,drama|duelo,familia,deseo|ingenioso,agridulce|series-comedia|frances-ha,normal-people,the-worst-person
atlanta|Atlanta|-|2016|t|humor,surrealista|racismo,dinero,fama|bizarro,ingenioso|series-comedia|get-out,barry,do-the-right-thing
the-office-us|The Office|-|2005|t|humor,mockumentary|trabajo,amistad|divertido,tierno|series-comedia|arrested-development,wwdits-tv
arrested-development|Arrested Development|-|2003|t|humor,absurdo|familia,dinero|ingenioso,bizarro|series-comedia|the-office-us,curb,the-royal-tenenbaums
curb|Curb Your Enthusiasm|-|2000|t|humor|amistad,fama|divertido,ingenioso|series-comedia|seinfeld,arrested-development
seinfeld|Seinfeld|-|1989|t|humor|amistad,ciudad|ingenioso,divertido|series-comedia|curb,the-office-us,annie-hall
wwdits-tv|What We Do in the Shadows|-|2019|t|humor,vampiros,mockumentary|amistad,comunidad|divertido,bizarro|series-comedia|the-office-us,shaun-of-the-dead
barry|Barry|-|2018|t|humor-negro,policial|violencia,identidad,redencion|tenso,ingenioso|series-comedia|atlanta,fargo-tv,in-bruges
veep|Veep|-|2012|t|satira,humor|politica,poder,ambicion|ingenioso,satirico|series-comedia|in-the-loop,succession,the-death-of-stalin
los-simuladores|Los simuladores|-|2002|t|humor,atracos|justicia,amistad|ingenioso,divertido|series-comedia|nueve-reinas,la-odisea-de-los-giles,division-palermo
division-palermo|División Palermo|-|2023|t|humor,satira|identidad,comunidad,corrupcion|ingenioso,bizarro|series-comedia|puan,los-simuladores,el-ciudadano-ilustre
bojack|BoJack Horseman|-|2014|t|animacion,humor-negro|fama,adiccion,soledad|agridulce,melancolico|series-comedia|fleabag,anomalisa,barry
the-good-place|The Good Place|-|2016|t|humor,fantasia|muerte,humanidad,redencion|ingenioso,tierno|series-comedia|groundhog-day,the-office-us
"""

def main():
    films, ids, errors = [], set(), []
    rows = [l.strip() for l in (DATA + '\n' + DATA2).strip().splitlines() if l.strip()]
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
    grouped = [x for _, secs in GROUPS for x in secs]
    for k in LABELS['sec']:
        if grouped.count(k) != 1: errors.append('sección %s aparece %d veces en GROUPS' % (k, grouped.count(k)))
    for k in grouped:
        if k not in LABELS['sec']: errors.append('GROUPS: sección desconocida ' + k)
    if errors:
        print('\n'.join(errors)); sys.exit(1)
    out = {'v': 1, 'labels': LABELS, 'groups': [[g, secs] for g, secs in GROUPS], 'films': films}
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'curaduria.json')
    with open(path, 'w', encoding='utf-8') as fh:
        json.dump(out, fh, ensure_ascii=False, separators=(',', ':'))
    secs = {}
    for f in films: secs[f['sec']] = secs.get(f['sec'], 0) + 1
    print('ok: %d títulos, %d bytes' % (len(films), os.path.getsize(path)))
    print('por sección:', ', '.join('%s %d' % (LABELS['sec'][k], v) for k, v in sorted(secs.items(), key=lambda x: -x[1])))

if __name__ == '__main__':
    main()
