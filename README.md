# Sito del matrimonio — Ivan & Greta

Sito a pagina singola, senza framework: tre file e una cartella di foto. Si pubblica su GitHub Pages così com'è.

```
index.html    contenuti e testi
style.css     colori, tipografia, impaginazione
script.js     countdown, campi invitati, invio del modulo
notte.js      la modalità notturna e il disegno del cielo
cielo.js      le stelle sopra Toceno, già calcolate (generato)
img/          le vostre foto (foto-1.jpeg, foto-2.jpeg, foto-3.jpeg)
```

Più quattro file che il sito non carica mai: `foglio-google.gs` è il codice da
incollare in Apps Script per raccogliere le conferme in un foglio (sezione 2);
`strumenti-cielo.py` ricalcola il cielo della modalità notturna;
`strumenti-motivi.py` rigenera i motivi decorativi sparsi e
`strumenti-cornice.py` la cornice dell'apertura. Gli ultimi tre servono solo se
volete cambiare qualcosa di quei disegni: si possono cancellare, ma senza
`strumenti-cielo.py` il cielo non si può più rifare.

---

## 1. Pubblicare su GitHub Pages

1. Crea un repository nuovo. Due possibilità:
   - **`tuonome.github.io`** → il sito sta su `https://tuonome.github.io` (un solo sito per account);
   - **`matrimonio`** → il sito sta su `https://tuonome.github.io/matrimonio/` (puoi averne quanti vuoi).
2. Carica i file mantenendo la struttura (`index.html` deve stare nella radice del repository).
3. Vai su **Settings → Pages**, alla voce *Source* scegli **Deploy from a branch**, branch `main`, cartella `/ (root)`, salva.
4. Dopo un minuto il sito è online. Ogni `push` successivo lo aggiorna.

Da riga di comando:

```bash
git init
git add .
git commit -m "Sito del matrimonio"
git branch -M main
git remote add origin https://github.com/TUONOME/matrimonio.git
git push -u origin main
```

**Dominio personalizzato** (per esempio `ivanegreta.it`): in *Settings → Pages → Custom domain* inserisci il dominio, poi dal pannello del tuo registrar crea quattro record `A` verso `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`. Lascia attiva l'opzione *Enforce HTTPS*.

---

## 2. Modulo di conferma

GitHub Pages serve solo file statici: non può ricevere dati da sé. Il modulo funziona già, gli serve solo un indirizzo a cui consegnare le risposte.

Le strade sono due e **non fanno la stessa cosa**:

| | Google Sheets | Formspree |
|---|---|---|
| Cosa ottieni | **un foglio solo, una riga per invitato** | una email per ogni invio |
| Se qualcuno si corregge | la sua riga viene aggiornata | arriva una seconda email, e le confronti a mano |
| Da attivare | ~15 minuti | ~10 minuti |
| Voce `tipoEndpoint` | `"apps-script"` | `"formspree"` |

Se volete il riepilogo unico — presenze, allergie, email, tutto in un posto — la strada è **Google Sheets**. Formspree resta come ripiego.

### Google Sheets — il riepilogo unico (consigliata)

Alla fine avrete un foglio così, **una riga per persona**, non per gruppo:

| Nome e cognome | Partecipa | Allergie | Email di contatto | Telefono | Referente del gruppo | Messaggio | Prima risposta | Ultimo aggiornamento | N. modifiche | Chiave |
|---|---|---|---|---|---|---|---|---|---|---|
| Ivan Cucchi | Sì | nessuna | ivan@… | 333… | Ivan Cucchi | arriviamo in treno | 12/03 10:04 | 28/04 21:11 | 2 | cucchi ivan |
| Greta Zucchi | Sì | lattosio | ivan@… | 333… | Ivan Cucchi | | 12/03 10:04 | 28/04 21:11 | 2 | greta zucchi |

Filtrate la colonna *Allergie* e avete la lista per il catering; filtrate *Partecipa* e avete il numero dei coperti.

**Come attivarlo:**

1. Create un foglio Google nuovo e apritelo.
2. **Estensioni → Apps Script**. Si apre un editor con dentro `function myFunction() {}`: cancellate tutto.
3. Aprite il file **`foglio-google.gs`** di questo repository, copiatelo per intero e incollatelo lì. Salvate (icona del dischetto).
4. **Deploy → Nuovo deployment → ⚙︎ → App web**. *Esegui come* «Io», *Chi ha accesso* «Chiunque». Autorizzate quando ve lo chiede: Google mostra una schermata di avviso perché il codice non è verificato — è il vostro, proseguite da *Avanzate → Vai a (nome progetto)*.
5. Copiate l'URL che finisce per `/exec` e incollatelo in `script.js`:

```js
endpointModulo: "https://script.google.com/macros/s/IL_TUO_ID/exec",
tipoEndpoint: "apps-script",
```

6. **Provate voi per primi**, prima di mandare il link a chiunque: compilate una conferma finta, controllate che compaia la riga, rimandate lo stesso nome con un'allergia diversa e controllate che la riga si aggiorni invece di sdoppiarsi. Poi cancellate le righe di prova.

Per averlo in Excel: **File → Scarica → Microsoft Excel (.xlsx)**. Il foglio resta la copia viva, lo `.xlsx` è la fotografia del momento.

> **Se modificate `foglio-google.gs` dopo il primo deploy**, salvare non basta: il sito continua a parlare con la versione vecchia. Bisogna fare **Deploy → Gestisci deployment → ✎ → Versione: Nuova versione → Distribuisci**, tenendo lo stesso URL.

### Come funziona l'aggiornamento di una risposta

Chi cambia idea non deve scrivere a nessuno: torna sulla pagina, ricompila e reinvia. Il foglio non aggiunge una riga nuova — **cerca ogni persona per nome e cognome e aggiorna la sua**. Vale per tutto il gruppo, non solo per chi compila: se il referente correggeva l'allergia della figlia, è la riga della figlia a cambiare.

Il confronto fra i nomi non è letterale, altrimenti non funzionerebbe mai. Prima di confrontarli il codice toglie accenti, maiuscole, doppi spazi e apostrofi, e **ignora l'ordine**: `Cucchi Ivan`, `ivan cucchi` e `Ivan Cucchì` sono la stessa persona. Il risultato finisce nella colonna *Chiave*: se due righe vi sembrano la stessa persona non fusa, guardate lì e capite subito perché.

Ignorare l'ordine ha un rovescio: due invitati che si chiamano `Anna Maria Rossi` e `Maria Anna Rossi` verrebbero fusi in una riga sola. Se fra i vostri invitati esiste un caso del genere, in cima a `foglio-google.gs` mettete `IGNORA_ORDINE_DEL_NOME = false` (e ricordatevi del riquadro qui sopra sul nuovo deployment).

Altri due comportamenti che vale la pena conoscere:

- **Chi sparisce da un gruppo non viene cancellato.** Se il referente prima annunciava tre persone e poi ne annuncia due, la terza riga resta, marcata `Non più in elenco`. Una riga cancellata sparirebbe senza lasciare traccia e non sapreste più che quella persona era stata annunciata. Filtratele via quando contate i coperti.
- **Chi risponde «no» porta con sé il suo gruppo.** Le righe di tutti passano a `No`, ma le allergie già scritte restano: se cambiano idea sono già lì.
- **L'ultimo che parla ha ragione.** Se una persona compare in due gruppi diversi, la sua riga porta il nome del referente che ha inviato per ultimo, e il vecchio referente non può più modificarla.

### Il foglio «Registro»

Nello stesso documento compare un secondo foglio, `Registro`, che **non viene mai riscritto**: una riga per ogni invio, con dentro il testo completo di quello che è arrivato. Serve quando il foglio `Invitati` non torna — «ma prima cosa aveva scritto?» — e la risposta buona è stata sovrascritta. Non serve guardarlo mai, serve che esista.

### Una nota sull'indirizzo

L'URL `/exec` sta dentro `script.js`, che è pubblico: chiunque apra il codice della pagina lo vede, e chiunque lo veda può mandare dati al foglio. Per una lista di nozze è un rischio accettabile — al massimo qualcuno vi scrive righe finte, che riconoscete e cancellate — ma vale la pena saperlo. Il codice si difende sul minimo indispensabile: taglia i testi troppo lunghi, ferma i gruppi oltre le 20 persone e rifiuta gli invii senza referente, così nessuno può gonfiare il foglio con un invio solo. Se preferite non correre nemmeno questo rischio, l'alternativa è Formspree, dove l'indirizzo pubblico è protetto dal loro sistema antiabuso.

### Formspree — la via rapida

1. Registratevi su [formspree.io](https://formspree.io) (il piano gratuito copre 50 invii al mese).
2. Create un nuovo form e copiate l'indirizzo che vi viene mostrato, del tipo `https://formspree.io/f/abcdwxyz`.
3. In `script.js`:

```js
endpointModulo: "https://formspree.io/f/abcdwxyz",
tipoEndpoint: "formspree",
```

Ogni conferma arriva per email con tutti i campi, invitato per invitato. Nessun riepilogo e nessun aggiornamento: se qualcuno si corregge ricevete una seconda email e siete voi a dover capire quale delle due vale.

### Come è resa obbligatoria l'allergia

Per ogni invitato indicato nel menu «Quante persone» compare una scheda con nome e allergie, entrambi obbligatori. Chi prova a inviare lasciandoli vuoti riceve un messaggio sotto al campo e la pagina lo porta lì. I pulsanti «Nessuna», «Glutine», «Lattosio»… riempiono il campo con un tocco, così nessuno è tentato di saltarlo — ma una risposta esplicita resta necessaria.

---

## 3. Cosa cambiare nei file

### `script.js` — il blocco `CONFIG` in cima

| Voce | A cosa serve |
|---|---|
| `dataMatrimonio` | Data e ora della cerimonia. **I mesi partono da 0**: luglio è `6`, settembre è `8`. |
| `endpointModulo` | L'indirizzo del punto 2. |
| `tipoEndpoint` | `"apps-script"` per il foglio Google, `"formspree"` per le email. Cambia la forma di quello che viene spedito, non solo la destinazione: non basta cambiare l'indirizzo. |
| `maxInvitati` | Massimo di persone per gruppo. Se lo cambi, aggiorna anche le opzioni del menu in `index.html`. |

### `index.html`

Da sostituire, in ordine di comparsa:

- il `<title>` e le due `<meta>` di descrizione e anteprima;
- i nomi nell'apertura, nel monogramma `I&G` della barra e nel fondo pagina;
- la data: sia il testo visibile sia l'attributo `datetime="2027-07-24"`;
- i due blocchi `.luogo` della sezione «I luoghi», uno per sede: titolo, orario, indirizzo, mappa e i tre pulsanti di navigazione. Le mappe e i pulsanti funzionano **per indirizzo**, non per coordinate: dentro gli URL c'è l'indirizzo scritto per esteso, quindi per cambiare sede basta sostituire quello (ricordando di scriverlo in forma URL: spazio `%20` nell'`src` dell'iframe, `+` nei link, `à` `%C3%A0`). Se una sede non venisse trovata da Maps, ripiega sulle coordinate: `?q=46.1234,8.4567`;
- i tre riquadri della sezione «Dove parcheggiare». Questi funzionano **per coordinate**, non per indirizzo, perché un piazzale di montagna spesso non ha un civico: su Google Maps da computer fai click destro sul punto esatto, la prima voce del menu sono le coordinate, e le incolli dopo `destination=`. Per aggiungere o togliere un parcheggio, duplica o cancella un intero blocco `<article class="parcheggio">`: la griglia si riadatta da sola;
- i cinque riquadri «In auto / In treno / Fra i due luoghi / Dove dormire / Cosa portare»;
- gli orari del programma, che vanno tenuti d'accordo con `dataMatrimonio` in `script.js`: il countdown punta all'ora della cerimonia;
- nella sezione regali: le **due schede** `.iban`, una per intestatario. In ciascuna vanno l'intestatario e l'IBAN, e l'IBAN va scritto in **due posti che devono coincidere**: il testo dentro `<p class="iban__valore--codice">` (quello che si legge) e l'attributo `data-iban` del pulsante (quello che finisce negli appunti). La causale è una sola, sotto le schede. Per aggiungere o togliere un intestatario basta duplicare o cancellare un blocco `<div class="iban">`: la griglia si riadatta e il pulsante funziona da solo, perché `script.js` cerca tutti gli elementi con `data-iban` invece di un id fisso;
- email e telefono nel fondo pagina, e l'indirizzo email che compare nel messaggio d'errore in `script.js`.

### `style.css` — tema e motivo decorativo

Il tema è **bosco di montagna**. Il motivo decorativo si cambia da `index.html`,
nella classe del `<body>`, e si compone di due parole.

La prima dice **quali figure**:

| Prima parola | Cosa disegna |
|---|---|
| `tema-pigne` | pigne e rami d'abete |
| `tema-creste` | creste di montagna innevate |
| `tema-bosco` | pigne, funghi e scoiattoli |
| `tema-scoiattolo` | scoiattoli, pigne e rami, più la mascotte nel monogramma, in fondo al programma e nel fondo pagina |

La seconda dice **come sono disposte**:

| Seconda parola | Disposizione |
|---|---|
| *niente* | sparse e irregolari, poco dense *(predefinito)* |
| `regolare` | la griglia fitta e ordinata della prima versione |

Una terza parola facoltativa, `filigrana`, rimette la texture di sfondo
nell'apertura al posto della cornice. Vedi «La cornice dell'apertura».

Quindi `class="tema-bosco"` dà il bosco sparso e `class="tema-bosco regolare"`
lo stesso motivo a griglia.

Il motivo compare in due punti: le bande divisorie fra le sezioni e la filigrana
dietro l'apertura. Sono disegni a una tinta usati come maschera CSS, quindi il
colore arriva dalla palette e non va toccato dentro l'SVG.

**Come è fatta la casualità.** Una maschera CSS si ripete per forza, quindi non
esiste il vero caso: è costruito in due modi diversi.

- La **banda** usa una sola tessera larga 1399 px, con le figure distribuite a
  rumore blu — cioè scegliendo ogni posizione fra molte candidate e tenendo la
  più lontana dalle altre. Senza questo passaggio venivano grumi e vuoti. A
  quella larghezza il ciclo non entra in uno schermo.
- Il **fondo** dell'apertura sovrappone tre livelli di maschera con periodi
  primi fra loro (331, 397 e 449 px). Il disegno complessivo si ripete solo al
  loro minimo comune multiplo, cioè oltre 57 milioni di px: in pratica mai.

Le tessere sparse sono generate figura per figura da uno script, non scritte a
mano: se vuoi cambiarne densità o disposizione conviene rigenerarle. Pesano
50 KB in chiaro ma circa 3 KB compresse, che è quello che viaggia in rete.

I colori stanno tutti in `:root`, in cima al file:

| Variabile | Uso |
|---|---|
| `--bosco-scuro` | fondi scuri: apertura e fondo pagina. Se lo cambi, cambia anche il `<meta name="theme-color">` in `index.html` |
| `--bosco` | colore principale: bottoni, link, titoli piccoli |
| `--nebbia` | il fondo carta della pagina |
| `--oro` | oro larice, usato **solo** sui fondi scuri |
| `--pigna` | bruno pigna, usato **solo** sui fondi chiari |
| `--muschio` | verde muschio, per i messaggi di conferma |

`--oro` e `--pigna` sono due accenti separati per una ragione: l'oro su fondo
chiaro non ha contrasto sufficiente e il bruno su fondo scuro nemmeno. Se ne usi
uno al posto dell'altro, il testo diventa poco leggibile.

### `img/` e il carosello

Le foto stanno in un carosello, non in una griglia, e **non vengono ritagliate**:
ognuna entra per intero in un riquadro quadrato, quindi il formato è libero e
si possono mescliare orizzontali e verticali. Le fasce color carta che restano
ai lati (o sopra e sotto, per le orizzontali) sono volute.

Il quadrato è il compromesso con meno spazio buttato: con un riquadro verticale
una foto orizzontale perderebbe il 40% di altezza, e viceversa.

Per cambiare foto, in ogni `<li class="diapositiva">` di `index.html` servono
tre cose:

- **`src`** — attenzione all'estensione: i file attuali sono `.jpeg`, non `.jpg`.
  Se non corrispondono, la foto non compare e non c'è nessun messaggio d'errore;
- **`width` e `height`** — le dimensioni vere in pixel. Non servono a
  dimensionare niente: servono al browser per riservare lo spazio prima che la
  foto arrivi, così la pagina non salta mentre si carica;
- **`alt`** — descrive la foto a chi non la vede.

Per aggiungerne o togliere, duplica o cancella un `<li>`: le frecce e i puntini
si adeguano da soli, li costruisce `script.js` contando le diapositive.

**Scorre da solo ogni 6 secondi**, e si ferma in cinque casi: col mouse sopra,
col fuoco da tastiera dentro, quando esce dallo schermo, col pulsante di pausa,
e se il sistema è impostato per ridurre le animazioni (lì non parte affatto).
Il ritmo è la costante `RITMO` in `script.js`.

Il pulsante di pausa non è un ornamento: una cosa che si muove da sola per più
di cinque secondi deve poter essere fermata, altrimenti diventa un ostacolo per
chi legge lentamente. Se togli l'automatismo, puoi togliere anche quello.

**Sul peso, un avvertimento.** Le dieci foto pesano **3,7 MB in tutto**, e con
lo scorrimento automatico prima o poi si scaricano tutte, anche da telefono.
Sono più grandi del necessario: il riquadro è al massimo 620 px, e quasi tutte
sono sopra i 1500. Ridimensionandole a 1200 px sul lato lungo si scende intorno
al megabyte senza differenze visibili:

```
for f in img/foto-*.jpeg; do
  sips -Z 1200 -s formatOptions 70 "$f" --out "$f"
done
```

Se lo fai, ricordati di aggiornare i `width`/`height` di ogni `<img>`, che
devono restare le dimensioni vere.

### Lo sfondo dell'apertura

L'apertura ha una fotografia di bosco (`img/sfondo.jpg`) più un **velo verde
scuro**. Il velo non è decorativo, è necessario: dentro la zona del titolo la
fotografia va da 0.00 a 0.997 di luminanza, quindi il testo bianco sul sentiero
chiaro arriverebbe a 1.0:1, cioè invisibile.

Il velo è **solo dietro il testo e il pulsante**, non su tutta la sezione: è un
pannello a opacità uniforme sul blocco `.apertura__contenuto`, con i bordi
sfumati da un'ombra. Tutt'intorno la fotografia si vede pulita.

Il fatto che l'opacità sia *uniforme* è ciò che rende il contrasto dimostrabile
invece che sperato. A 0,92 sopra un pixel bianco puro — il caso peggiore
possibile, qualunque foto ci sia sotto — il fondo diventa `rgb(47,74,63)`, e da
lì il bianco è a 9,67:1 e l'oro a 4,74:1. Quindi basta che il testo stia dentro
il pannello, ed è per questo che il pannello è definito dal `padding` del blocco
e non da scostamenti: così lo contiene per costruzione. Vale anche se un giorno
cambi fotografia.

Prima ci avevo provato con una sfumatura ovale, ma un'ovale non riesce a coprire
un blocco di testo largo e basso: gli angoli e la riga in alto ne restavano
fuori, e su schermo stretto «Ci sposiamo» scendeva a 2,4:1.

Sotto i 620 px il ritaglio si sposta al 26% invece che al centro: su uno schermo
verticale `cover` mostrerebbe solo la striscia centrale, cioè il sentiero vuoto
e sfocato, e della fotografia non si vedrebbe la parte che vale — alberi, felci
e funghi stanno ai lati.

Due dettagli rimasti dalle versioni precedenti, che ora hanno margine
abbondante ma non danno fastidio:

- la targa della data ha un suo velo al 68%, che sopra il pannello la fa
  leggere come una targa incisa;
- le etichette del countdown sono bianche all'88% e non al 64%. Sul verde pieno
  il 64% bastava, sulla fotografia scendeva a 2,8:1.

**L'apertura è alta quanto lo schermo** (`min-height: 100svh`) e il contenuto sta
al centro, così il pulsante di conferma si vede sempre senza scorrere. È
`min-height` e non `height` perché su uno schermo molto basso l'apertura deve
poter crescere invece di tagliare il pulsante. Per farci stare tutto:

- i nomi si dimensionano su `min(13vw, 13vh)`, quindi rimpiccioliscono anche in
  base all'**altezza**: da soli erano la voce che mangiava lo spazio del pulsante;
- sotto gli 860 px di altezza il ritmo verticale si stringe, e sotto i 600 si
  riducono anche il corpo delle cifre e il pulsante.

Verificato: entra in una schermata da circa 490 px di altezza in su. Più in basso
di così (telefono in orizzontale) scorre, che è il comportamento giusto.

### Icona e anteprima del link

Sono due cose diverse che si confondono facilmente:

| | Chi la mostra | Da quale tag |
|---|---|---|
| **favicon** | la scheda del browser, la schermata home del telefono | `<link rel="icon">` |
| **anteprima** | WhatsApp, Telegram, i social quando incolli il link | `<meta property="og:image">` |

**WhatsApp non usa il favicon.** L'immagine che compare accanto al link è
`og:image`, e perché venga mostrata devono valere tre condizioni:

1. **l'indirizzo deve essere assoluto**, con `https://` e dominio. WhatsApp non
   si trova sul sito quando legge i tag, quindi un percorso relativo come
   `img/favicon.png` non lo sa risolvere: è il motivo per cui prima compariva
   un segnaposto e poi spariva tutto;
2. **il file deve essere leggero.** WhatsApp scarta le immagini troppo pesanti,
   e il favicon da 6,9 MB non lo guardava nemmeno. `img/anteprima.jpg` sta
   sotto i 200 KB;
3. larghezza e altezza dichiarate aiutano a scegliere il riquadro giusto.

Essendo `anteprima.jpg` quadrata, WhatsApp la mette come **miniatura accanto**
al titolo. Se preferisci il riquadro grande a tutta larghezza, serve
un'immagine orizzontale intorno a 1200×630, e vanno aggiornati anche
`og:image:width` e `og:image:height`.

I file, tutti ricavati da `img/favicon.png` (2048×2048, 6,9 MB, che il sito
**non carica**):

| File | Misura | Uso |
|---|---|---|
| `anteprima.jpg` | 800×800, 162 KB | l'anteprima del link |
| `favicon-32.png` | 32×32 | scheda del browser |
| `favicon-180.png` | 180×180 | schermata home iOS |
| `favicon-192.png` | 192×192 | schermata home Android |

Per rigenerarli, ritagliando la tela e la ghirlanda dall'originale:

```
sips -c 1500 1500 --cropOffset 265 285 img/favicon.png --out /tmp/tela.png
sips -Z 800 -s format jpeg -s formatOptions 80 /tmp/tela.png --out img/anteprima.jpg
sips -c 1400 1400 --cropOffset 300 320 img/favicon.png --out /tmp/ghirlanda.png
for n in 32 180 192; do
  sips -Z $n /tmp/ghirlanda.png --out img/favicon-$n.png
done
```

Due avvertenze pratiche.

**Gli URL sono scritti a mano** dentro `index.html` e valgono solo per
`ivanqkk.github.io/matrimonio`. Se il sito cambia indirizzo vanno cambiati:
sono `og:url` e `og:image`.

**WhatsApp tiene in memoria l'anteprima** di ogni indirizzo, anche quella
sbagliata. Dopo la pubblicazione può continuare a mostrare la vecchia: per
forzarla, manda una volta il link con qualcosa in coda, per esempio
`.../matrimonio/?v=2`. Vale come pagina diversa e la rilegge da zero.

**A 16 px la ghirlanda resta pallida**, perché l'originale è un acquerello
chiaro su bianco: nella scheda del browser si vede un cerchietto tenue. Alle
misure grandi, quelle della schermata home, viene benissimo. Se preferisci
un'icona che si stacchi di più servirebbe un disegno pensato per quei pixel,
per esempio il monogramma in oro su verde.

### I tre file dello sfondo

| File | Peso | Chi lo usa |
|---|---|---|
| `sfondo.png` | 9,9 MB | **nessuno.** È il tuo originale, resta lì intatto |
| `sfondo.jpg` | 620 KB | schermi sopra i 620 px (2816 px, qualità 40) |
| `sfondo-telefono.jpg` | 159 KB | schermi fino a 620 px (1200 px, qualità 45) |

La risoluzione conta più della qualità. Su uno schermo retina l'immagine viene
ingrandita per coprire l'apertura: una versione da 1800 px risultava
**visibilmente sfocata**, mentre a 2816 px è nitida. La qualità invece può stare
bassa, perché il velo copre gli artefatti. Il telefono ha un file suo perché non
gli servono 2816 px e sono 460 KB in meno da scaricare.

Per rigenerarli:

```
sips -Z 2816 -s format jpeg -s formatOptions 40 img/sfondo.png --out img/sfondo.jpg
sips -Z 1200 -s format jpeg -s formatOptions 45 img/sfondo.png --out img/sfondo-telefono.jpg
```

### La modalità notturna e il cielo

La mezzaluna in basso a destra spegne il bosco e accende la notte. Non è un
filtro scuro: sotto la pagina compare **il cielo che c'era davvero sopra
Toceno il 24 luglio 2027 alle 23:30**, con le costellazioni al posto giusto.

Chi non la accende non paga niente: `cielo.js` — una quarantina di KB di
coordinate — viene scaricato al primo click e non prima. La scelta resta
ricordata (`localStorage`) per le visite successive. Il valore predefinito è il
giorno: il sito è un bosco d'estate, la notte è una cosa che si sceglie. Se
preferite che si accenda da sola a chi ha il telefono in tema scuro, in fondo a
`notte.js` c'è la riga che legge il ricordo: basta aggiungere un controllo su
`matchMedia("(prefers-color-scheme: dark)")`.

**Perché il calcolo non è nel sito.** Dove stanno le stelle dipende da data, ora
e luogo, e tutti e tre sono fissi. Li calcola una volta `strumenti-cielo.py`, che
lascia in `cielo.js` delle coordinate già piatte, pronte da moltiplicare per il
raggio dello schermo. Nessuna libreria di astronomia da caricare, e lo stesso
identico cielo per tutti — che è anche più giusto: è il *vostro* cielo, non
quello di chi guarda.

Per rifarlo (altra data, altra ora, altro paese) si cambiano le costanti in cima
a `strumenti-cielo.py` e si rilancia:

```
python3 strumenti-cielo.py
```

Si scarica da solo i cataloghi (bright stars e figure delle costellazioni, dal
progetto d3-celestial) e riscrive `cielo.js`. Stampa anche i controlli che
servono a capire se il conto torna:

- **il Sole a −18°**, cioè notte astronomica piena: se qui leggete un numero
  vicino a zero avete scelto un'ora in cui c'è ancora luce;
- **la Polare alta quanto la latitudine.** È la verifica più forte di tutte: se
  la matematica dell'orizzonte fosse sbagliata, questo numero non tornerebbe. A
  Toceno dà 45,7° contro una latitudine di 46,1°, e la differenza è giusta —
  la Polare non sta esattamente sul polo, gli gira intorno a tre quarti di grado;
- **Vega, Deneb e Altair**, il Triangolo Estivo, che a quell'ora di luglio deve
  stare quasi sopra la testa: 81°, 64° e 47°.

**Cosa si vede.** Zenit al centro dello schermo, orizzonte sul cerchio esterno,
nord in alto ed est **a sinistra** — perché si guarda in su, non in giù su una
cartina. Il disco è scalato sulla diagonale, così non restano angoli vuoti: in
cambio le stelle più basse finiscono fuori quadro, che è poi quello che fa anche
il crinale delle montagne. Il colore delle stelle non è deciso a caso, viene
dall'indice B−V del catalogo: Vega bianco-azzurra, Antares rossa.

**La regola da non rompere.** Il cielo passa sotto ai testi attraverso un velo
scuro, mai dietro a un testo nudo. Il caso peggiore — una stella bianca
esattamente dietro a una lettera — è calcolato: col velo all'80% il testo chiaro
resta a 9,8:1 e quello tenue a 5,6:1, contro il minimo di 4,5:1. Se alleggerite
i veli in `body.notte .sezione`, rifate quel conto prima.

**Tre variabili di ruolo.** Nel `:root` di `style.css` ci sono `--accento`,
`--accento-caldo`, `--carta` e `--inchiostro`. Non sono tinte nuove: di giorno
valgono esattamente quanto valevano prima. Servono perché tre colori facevano
due lavori diversi — il verde era insieme il fondo dei bottoni e il colore dei
link — e di notte i due lavori divergono: su nero un link verde bosco non si
legge più, ma un bottone verde con la scritta bianca sì. Separare il ruolo dalla
tinta è ciò che permette alla modalità notturna di cambiarne uno senza rompere
l'altro. Se aggiungete testo verde scuro, usate `--inchiostro`, non
`--bosco-scuro`, altrimenti di notte sparisce.

### La cornice dell'apertura

Attorno al titolo c'è una cornice incompleta di funghi, foglie, pigne e
scoiattoli, con più peso in basso e a sinistra e un centro lasciato libero.

Non è un motivo ripetuto ma una composizione unica, divisa in cinque gruppi
ancorati ai bordi (`cornice__gruppo--bs`, `--bd`, `--sx`, `--dx`, `--alto`).
Ogni gruppo è un SVG con il suo `viewBox`: le figure che sporgono dal viewBox
vengono tagliate, ed è così che alcune sembrano entrare da fuori. Essendo
gruppi separati e non un'immagine unica, non si stirano a nessuna larghezza:
si allontanano fra loro sugli schermi larghi, che è esattamente ciò che serve
a una cornice che deve sembrare incompleta.

Sotto i 560 px restano solo i due gruppi in basso, altrimenti ruberebbero
spazio al titolo.

`strumenti-cornice.py` rigenera la composizione. Le posizioni sono in fondo al
file, come liste di `(figura, x, y, rotazione, scala)`; lo script verifica che
nessuna coppia si sovrapponga e stampa il varco più stretto, così le distanze
restano controllate e non a occhio.

Di norma l'apertura ha la cornice e nessuna filigrana, perché il centro va
lasciato pulito. Se preferisci la vecchia texture di sfondo, aggiungi la parola
`filigrana` alla classe del `<body>`.

---

## 4. Prima di mandare il link

- Aprilo sul telefono: la maggior parte degli invitati lo vedrà da WhatsApp.
- Prova una conferma vera, con due o tre persone, e controlla che arrivi tutto.
- Poi **rimanda la stessa conferma** cambiando un'allergia: nel foglio la riga deve aggiornarsi, non sdoppiarsi. È la prova che conta di più, ed è quella che si dimentica.
- Prova a inviare lasciando vuote le allergie: deve bloccarti.
- Cancella le righe di prova prima di mandare il link in giro.
- Accendi la mezzaluna e riscorri la pagina fino in fondo: la modalità notturna tocca ogni sezione, ed è il posto dove un colore dimenticato si vede subito.
- Verifica che i link della mappa aprano il posto giusto.
- Controlla **entrambi gli IBAN** carattere per carattere, e poi falli ricontrollare da qualcun altro. Controlla anche che il pulsante copi lo stesso codice che si legge sopra: sono due punti distinti del file e possono divergere.

Una nota sugli IBAN: pubblicandoli su una pagina aperta lo rendi visibile a chiunque. Non è un rischio per il conto — con l'IBAN si può solo ricevere, non prelevare — ma è un dato che finisce nei motori di ricerca. Se preferisci tenerlo riservato, un'alternativa è togliere il codice dalla pagina e lasciare una riga tipo «scriveteci e ve lo mandiamo».

---

## 5. Note tecniche

- Nessuna dipendenza: solo i font di Google (Fraunces e Manrope).
- Funziona senza JavaScript, tranne countdown e modulo.
- Navigazione da tastiera, contrasti verificati, `prefers-reduced-motion` rispettato.
- La mappa è l'incorporamento pubblico di Google Maps: non serve alcuna chiave API.
