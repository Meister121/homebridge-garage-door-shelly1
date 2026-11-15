/*
 * Shelly Plus 1 – automatischer Garagentor-Impuls
 *
 * VOR VERWENDUNG INDIVIDUELL ANPASSEN:
 * - Eingangs-ID und Kontaktlogik prüfen.
 * - Ausgangs-ID und Wartezeit prüfen.
 * - Am Relais eine geeignete Auto-off-Zeit einstellen!
 *
 * Voraussetzung:
 * Der Impuls muss bei offenem Tor die Schließung auslösen.
 * Ein einzelner Kontakt unterscheidet nicht zuverlässig zwischen
 * offenem und fahrendem Tor. Das Skript ersetzt keine
 * Hinderniserkennung oder andere Sicherheitseinrichtungen.
 *
 * Nach Skriptstart wird auf eine neue Kontaktmeldung gewartet.
 * Ein bereits offenes Tor startet nicht automatisch den Timer.
 */

let CONFIG = {
  inputId: 100,
  openState: true,
  outputId: 0,
  delaySeconds: 600 // 10 Minuten
};

let timer = null;
let generation = 0;

function cancelTimer() {
  // Macht auch bereits laufende Statusabfragen ungültig.
  generation++;

  if (timer !== null) {
    Timer.clear(timer);
    timer = null;
  }
}

function startTimer() {
  // Weitere Offen-Meldungen starten keinen zusätzlichen Timer.
  if (timer !== null) return;

  generation++;
  let currentGeneration = generation;

  timer = Timer.set(CONFIG.delaySeconds * 1000, false, function() {
    timer = null;

    // Kontakt vor dem Impuls erneut auslesen.
    Shelly.call(
      "Input.GetStatus",
      { id: CONFIG.inputId },
      function(result, errorCode, errorMessage) {
        // Zwischenzeitliche Kontaktänderung: nichts auslösen.
        if (currentGeneration !== generation) return;

        if (errorCode !== 0 || !result ||
            typeof result.state !== "boolean") {
          print("Auto-close: Kontakt nicht lesbar. Kein Impuls.");
          return;
        }

        if (result.state !== CONFIG.openState) {
          print("Auto-close: Tor nicht offen. Kein Impuls.");
          return;
        }

        // Auto-off muss am Ausgang konfiguriert sein!
        Shelly.call(
          "Switch.Set",
          { id: CONFIG.outputId, on: true },
          function(result, errorCode, errorMessage) {
            if (errorCode !== 0) {
              print("Auto-close: Schaltfehler:", errorMessage);
              return;
            }

            print("Auto-close: Schaltausgang eingeschaltet.");
          }
        );
      }
    );
  });

  print("Auto-close: Timer gestartet.");
}

Shelly.addEventHandler(function(event) {
  if (event.component !== "input:" + CONFIG.inputId) return;
  if (!event.info || typeof event.info.state !== "boolean") return;

  if (event.info.state === CONFIG.openState) {
    startTimer();
  } else {
    cancelTimer();
    print("Auto-close: Timer aufgehoben.");
  }
});
