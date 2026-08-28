/* ============================================================
   Ivan & Greta — raccolta delle conferme in un foglio Google

   Questo file NON viene usato dal sito: è il codice da incollare
   in Apps Script, dentro il foglio Google dove volete la lista.
   Istruzioni passo passo nel README, sezione «Modulo di conferma».

   Cosa fa: tiene UNA RIGA PER PERSONA, non una per gruppo. Quando
   qualcuno rimanda il modulo, cerca ogni persona per nome e cognome
   e aggiorna la sua riga invece di aggiungerne una nuova — sia il
   referente sia tutti quelli per cui sta compilando.
   ============================================================ */


/* ▼▼▼ UNICA COSA REGOLABILE ▼▼▼ */

// true  → «Cucchi Ivan» e «Ivan Cucchi» sono la stessa persona.
//         Comodo, perché nessuno ricorda in che ordine ha scritto il nome.
// false → l'ordine conta. Sceglietelo se fra gli invitati esistono due
//         persone con le stesse parole in ordine diverso (Anna Maria /
//         Maria Anna): con true verrebbero fuse in una riga sola.
var IGNORA_ORDINE_DEL_NOME = true;

/* ▲▲▲ FINE ▲▲▲ */


var COLONNE = [
  "Nome e cognome",
  "Partecipa",
  "Allergie",
  "Email di contatto",
  "Telefono",
  "Referente del gruppo",
  "Messaggio",
  "Prima risposta",
  "Ultimo aggiornamento",
  "N. modifiche",
  "Chiave",
];

var COL = {
  nome: 0, partecipa: 1, allergie: 2, email: 3, telefono: 4,
  referente: 5, messaggio: 6, prima: 7, ultima: 8, modifiche: 9, chiave: 10,
};


/* ---------- la chiave con cui riconosciamo una persona ----------

   Il nome scritto a mano non torna mai identico: maiuscole diverse,
   doppi spazi, accenti. Prima di confrontare due nomi li riduciamo
   entrambi alla stessa forma minima. La chiave finisce anche in
   un'ultima colonna del foglio: se due righe vi sembrano duplicati,
   guardate lì e capite subito perché non si sono fuse.               */

function chiaveNome(nome) {
  var pulito = String(nome || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")  // via gli accenti
    .toLowerCase()
    .replace(/['`’]/g, " ")                            // d'Angelo = d Angelo
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!pulito) return "";
  if (!IGNORA_ORDINE_DEL_NOME) return pulito;
  return pulito.split(" ").sort().join(" ");
}


/* Il nome scritto dall'ultimo che ha compilato è quello che finisce nella
   cella, e il foglio serve anche a stampare i segnaposto: chi scrive tutto
   maiuscolo o tutto minuscolo lo rimettiamo in ordine. Se invece ha usato
   entrambe le forme non tocchiamo niente — «de Angelis», «McCall» e
   «Lo Russo» sanno meglio di noi come vanno scritti. */

function nomeLeggibile(nome) {
  if (!nome) return "";
  var haMinuscole = /[a-zà-ÿ]/.test(nome);
  var haMaiuscole = /[A-ZÀ-Þ]/.test(nome);
  if (haMinuscole && haMaiuscole) return nome;

  return nome
    // MARIO ROSSI → Mario Rossi
    .replace(/([A-ZÀ-Þ])([A-ZÀ-Þ]+)/g, function (tutto, prima, resto) { return prima + resto.toLowerCase(); })
    // mario rossi → Mario Rossi (anche dopo apostrofo o trattino: d'angelo, sacco-rossi)
    .replace(/(^|[\s'’-])([a-zà-ÿ])/g, function (tutto, prima, lettera) { return prima + lettera.toUpperCase(); });
}


/* ---------- il foglio ---------- */

function foglioConferme(documento) {
  var foglio = documento.getSheetByName("Invitati") || documento.getSheets()[0];
  foglio.setName("Invitati");

  if (foglio.getLastRow() === 0) {
    foglio.appendRow(COLONNE);
    foglio.getRange(1, 1, 1, COLONNE.length).setFontWeight("bold");
    foglio.setFrozenRows(1);
  }
  return foglio;
}

// Tutte le righe in memoria: leggere una volta sola e riscrivere una
// volta sola è molto più veloce di decine di chiamate al foglio, e
// soprattutto è atomico rispetto a chi sta guardando il documento.
function leggiRighe(foglio) {
  var ultima = foglio.getLastRow();
  if (ultima < 2) return [];
  return foglio.getRange(2, 1, ultima - 1, COLONNE.length).getValues();
}


/* ---------- l'aggiornamento vero e proprio ---------- */

function applica(righe, dati, adesso) {
  var partecipa = dati.partecipazione === "si";
  var chiaveReferente = chiaveNome(dati.referente);
  var esito = { nuovi: 0, aggiornati: 0, tolti: 0 };

  // Se dicono di no non c'è elenco di invitati: la risposta vale per il
  // referente e, più sotto, per chiunque risultasse nel suo gruppo.
  var persone = partecipa
    ? dati.invitati
    : [{ nome: dati.referente, allergie: "" }];

  var toccate = {};

  persone.forEach(function (persona) {
    var chiave = chiaveNome(persona.nome);
    if (!chiave) return;
    toccate[chiave] = true;

    var riga = null;
    for (var i = 0; i < righe.length; i++) {
      if (righe[i][COL.chiave] === chiave) { riga = righe[i]; break; }
    }

    if (riga) {
      esito.aggiornati++;
      riga[COL.modifiche] = (Number(riga[COL.modifiche]) || 0) + 1;
    } else {
      riga = new Array(COLONNE.length).fill("");
      riga[COL.prima] = adesso;
      riga[COL.modifiche] = 0;
      righe.push(riga);
      esito.nuovi++;
    }

    riga[COL.nome] = persona.nome;
    riga[COL.partecipa] = partecipa ? "Sì" : "No";
    // Se non partecipano, le allergie di prima non servono più a nessuno
    // ma non le cancelliamo: se cambiano idea sono già lì.
    if (partecipa) riga[COL.allergie] = persona.allergie;
    riga[COL.email] = dati.email;
    riga[COL.telefono] = dati.telefono;
    riga[COL.referente] = dati.referente;
    riga[COL.messaggio] = dati.messaggio;
    riga[COL.ultima] = adesso;
    riga[COL.chiave] = chiave;
  });

  // Chi era nel gruppo e adesso non c'è più. Due casi: il referente ha
  // ridotto il gruppo (Marco non viene più), oppure ha risposto «no» per
  // tutti. Non cancelliamo la riga — sparirebbe senza lasciare traccia e
  // non sapreste più che quella persona era stata annunciata — la
  // marchiamo e basta. Tocchiamo solo le righe che portano ancora il nome
  // di QUESTO referente: se nel frattempo la persona è passata in un
  // altro gruppo, quel gruppo è l'ultimo ad aver parlato e ha ragione lui.
  righe.forEach(function (riga) {
    if (toccate[riga[COL.chiave]]) return;
    if (chiaveNome(riga[COL.referente]) !== chiaveReferente) return;
    if (riga[COL.partecipa] === "Non più in elenco") return;

    riga[COL.partecipa] = partecipa ? "Non più in elenco" : "No";
    riga[COL.ultima] = adesso;
    riga[COL.modifiche] = (Number(riga[COL.modifiche]) || 0) + 1;
    esito.tolti++;
  });

  return esito;
}


/* ---------- il registro: cosa è arrivato, parola per parola ----------

   Il foglio «Invitati» viene sovrascritto a ogni aggiornamento, quindi da
   solo non risponde alla domanda «ma prima cosa aveva scritto?». Questo
   secondo foglio, nello stesso documento, non viene mai riscritto: è la
   memoria a cui tornare se qualcosa non torna.                          */

function registra(documento, adesso, testoGrezzo, esito) {
  var registro = documento.getSheetByName("Registro");
  if (!registro) {
    registro = documento.insertSheet("Registro");
    registro.appendRow(["Ricevuto il", "Referente", "Partecipa", "Nuovi", "Aggiornati", "Tolti", "Invio completo"]);
    registro.getRange(1, 1, 1, 7).setFontWeight("bold");
    registro.setFrozenRows(1);
  }
  var dati = esito.dati || {};
  registro.appendRow([
    adesso, dati.referente || "", dati.partecipazione || "",
    esito.nuovi, esito.aggiornati, esito.tolti,
    String(testoGrezzo).slice(0, 4000),
  ]);
}


/* ---------- ciò che arriva dalla pagina ----------

   Non ci fidiamo di quello che troviamo nel corpo della richiesta: lo
   riduciamo alla forma che ci aspettiamo, tagliando le stringhe troppo
   lunghe (una cella di Sheets non ne regge 50.000) e limitando il numero
   di invitati. Chiunque conosca l'indirizzo può scrivere qui dentro.     */

function normalizza(grezzo) {
  var testo = function (v, max) {
    return String(v == null ? "" : v).replace(/\s+/g, " ").trim().slice(0, max || 300);
  };

  var invitati = Array.isArray(grezzo.invitati) ? grezzo.invitati.slice(0, 20) : [];

  return {
    referente: nomeLeggibile(testo(grezzo.referente)),
    email: testo(grezzo.email),
    telefono: testo(grezzo.telefono, 60),
    partecipazione: grezzo.partecipazione === "si" ? "si" : "no",
    messaggio: testo(grezzo.messaggio, 2000),
    invitati: invitati
      .map(function (p) { return { nome: nomeLeggibile(testo(p && p.nome)), allergie: testo(p && p.allergie, 500) }; })
      .filter(function (p) { return p.nome; }),
  };
}


/* ---------- l'ingresso ---------- */

function doPost(e) {
  // Due conferme nello stesso istante leggerebbero lo stesso foglio e la
  // seconda riscriverebbe sopra la prima. Il lucchetto le mette in fila.
  var lucchetto = LockService.getScriptLock();
  try {
    lucchetto.waitLock(30000);
  } catch (errore) {
    return risposta({ ok: false, errore: "occupato" });
  }

  try {
    var testoGrezzo = (e && e.postData && e.postData.contents) || "{}";
    var dati = normalizza(JSON.parse(testoGrezzo));

    if (!dati.referente) return risposta({ ok: false, errore: "manca il referente" });

    var documento = SpreadsheetApp.getActiveSpreadsheet();
    var foglio = foglioConferme(documento);
    var righe = leggiRighe(foglio);
    var adesso = new Date();

    var esito = applica(righe, dati, adesso);

    if (righe.length) {
      foglio.getRange(2, 1, righe.length, COLONNE.length).setValues(righe);
    }

    esito.dati = dati;
    registra(documento, adesso, testoGrezzo, esito);

    return risposta({ ok: true, nuovi: esito.nuovi, aggiornati: esito.aggiornati, tolti: esito.tolti });
  } catch (errore) {
    return risposta({ ok: false, errore: String(errore) });
  } finally {
    lucchetto.releaseLock();
  }
}

function doGet() {
  return risposta({ ok: true, messaggio: "Il raccoglitore delle conferme è attivo." });
}

function risposta(oggetto) {
  return ContentService
    .createTextOutput(JSON.stringify(oggetto))
    .setMimeType(ContentService.MimeType.JSON);
}
