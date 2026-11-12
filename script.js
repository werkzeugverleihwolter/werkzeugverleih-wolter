
async function ladeWerkzeuge() {
  const bereich = document.querySelector("#werkzeuge .grid");
  if (!bereich) return;

  try {
    const antwort = await fetch("./werkzeuge.csv");

    if (!antwort.ok) {
      throw new Error("CSV-Datei konnte nicht geladen werden.");
    }

    const csv = (await antwort.text()).replace(/^\uFEFF/, "");
    const zeilen = csv.trim().split(/\r?\n/);

    const spalten = zeilen.shift()
      .split(";")
      .map(spalte => spalte.trim());

    const werkzeuge = zeilen
      .filter(zeile => zeile.trim() !== "")
      .map(zeile => {
        const werte = zeile.split(";");

        return Object.fromEntries(
          spalten.map((spalte, index) => [
            spalte,
            (werte[index] ?? "").trim()
          ])
        );
      });

    const kategorien = [...new Set(
      werkzeuge.map(werkzeug => werkzeug.kategorie)
    )];

    bereich.replaceChildren();
    bereich.style.gridTemplateColumns = "1fr";

    const formatPreis = wert => `${wert} €`;

    // Auswahl nur im aktuellen Seitenaufruf; noch keine Buchung oder Anfrage.
    const auswahl = new Map();
    const mietkorbDialog = document.getElementById("mietkorb-dialog");
    const mietkorbOeffnen = document.getElementById("mietkorb-oeffnen");
    const mietkorbSchliessen = document.getElementById("mietkorb-schliessen");
    const warenkorbListe = document.getElementById("warenkorb-liste");
    const warenkorbAnzahl = document.getElementById("mietkorb-anzahl");
    const warenkorbLeer = document.getElementById("warenkorb-leer");
    const auswahlButtons = new Map();
    const mietbeginn = document.getElementById("mietbeginn");
    const mietende = document.getElementById("mietende");
    const preisAnzeige = document.getElementById("mietkorb-preis");
    const anfrageForm = document.getElementById("mietkorb-anfrage");
    const anfrageName = document.getElementById("anfrage-name");
    const anfrageTelefon = document.getElementById("anfrage-telefon");
    const anfrageEmail = document.getElementById("anfrage-email");
    const anfrageNachricht = document.getElementById("anfrage-nachricht");
    const anfrageAbsenden = document.getElementById("anfrage-absenden");
    const anfrageStatus = document.getElementById("anfrage-status");
    let anfrageLaeuft = false;
    const formspreeEndpoint = "https://formspree.io/f/mjywkyew";
    const euro = betrag => new Intl.NumberFormat("de-DE", {
      style: "currency", currency: "EUR"
    }).format(betrag);
    const alsDatum = wert => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(wert)) return null;
      const [jahr, monat, tag] = wert.split("-").map(Number);
      const datum = new Date(Date.UTC(jahr, monat - 1, tag));
      return datum.getUTCFullYear() === jahr && datum.getUTCMonth() === monat - 1 &&
        datum.getUTCDate() === tag ? datum : null;
    };
    const einTag = 86400000;

    // Wochenendpauschale: Samstag bis Montag (Montag ist Rückgabetag).
    // Zusätzliche Tage außerhalb des Wochenendblocks zählen als Tagesmiete.
    function berechnePreis(werkzeug, start, ende) {
      const tagespreis = Number(werkzeug.tag_eur);
      const wochenendpreis = Number(werkzeug.wochenende_eur);
      if (!Number.isFinite(tagespreis) || tagespreis < 0) return null;
      let gesamt = 0;
      let tage = 0;
      let wochenenden = 0;
      for (let zeit = start.getTime(); zeit <= ende.getTime();) {
        const datum = new Date(zeit);
        const istSamstag = datum.getUTCDay() === 6;
        const montag = zeit + 2 * einTag;
        if (istSamstag && montag <= ende.getTime() &&
            werkzeug.wochenende_eur !== "" && Number.isFinite(wochenendpreis) &&
            wochenendpreis >= 0) {
          gesamt += wochenendpreis;
          wochenenden++;
          zeit += 3 * einTag;
        } else {
          gesamt += tagespreis;
          tage++;
          zeit += einTag;
        }
      }
      return { gesamt, tage, wochenenden };
    }

    function anfrageBerechnung() {
      if (!auswahl.size) return null;
      const start = alsDatum(mietbeginn.value);
      const ende = alsDatum(mietende.value);
      if (!start || !ende || ende < start) return null;
      if (ende.getUTCDay() === 0 && start.getTime() <= ende.getTime() - einTag) return null;
      let gesamt = 0;
      let kaution = 0;
      const positionen = [];
      for (const werkzeug of auswahl.values()) {
        const preis = berechnePreis(werkzeug, start, ende);
        const k = Number(werkzeug.kaution_eur);
        if (!preis || werkzeug.kaution_eur === "" || !Number.isFinite(k) || k < 0) return null;
        gesamt += preis.gesamt;
        kaution += k;
        positionen.push(werkzeug.name + " – Mietpreis " + euro(preis.gesamt) + ", Kaution " + euro(k));
      }
      return { gesamt, kaution, positionen };
    }

    function aktualisiereAnfrageButton() {
      const nameGueltig = anfrageName.value.trim().length >= 2;
      const telefon = anfrageTelefon.value.trim();
      const telefonGueltig = /^[+0-9() /-]{6,40}$/.test(telefon) &&
        (telefon.match(/\d/g) || []).length >= 6;
      const emailGueltig = anfrageEmail.validity.valid && anfrageEmail.value.trim() !== "";
      anfrageAbsenden.disabled = anfrageLaeuft || !anfrageBerechnung() ||
        !nameGueltig || !telefonGueltig || !emailGueltig;
    }

    for (const feld of [anfrageName, anfrageTelefon, anfrageEmail, anfrageNachricht]) {
      feld.addEventListener("input", () => {
        anfrageStatus.textContent = "";
        anfrageStatus.removeAttribute("role");
        delete anfrageStatus.dataset.erfolg;
        aktualisiereAnfrageButton();
      });
    }

    anfrageForm.addEventListener("submit", async event => {
      event.preventDefault();
      aktualisiereAnfrageButton();
      if (anfrageAbsenden.disabled) return;
      const berechnung = anfrageBerechnung();
      if (!berechnung) return;
      anfrageLaeuft = true;
      anfrageAbsenden.textContent = "Wird gesendet …";
      aktualisiereAnfrageButton();
      anfrageStatus.textContent = "";
      anfrageStatus.removeAttribute("role");
      delete anfrageStatus.dataset.erfolg;
      const daten = new FormData();
      daten.set("name", anfrageName.value.trim());
      daten.set("telefon", anfrageTelefon.value.trim());
      daten.set("email", anfrageEmail.value.trim());
      daten.set("nachricht", anfrageNachricht.value.trim());
      daten.set("mietbeginn", mietbeginn.value);
      daten.set("rueckgabe", mietende.value);
      daten.set("werkzeuge", berechnung.positionen.join("\n"));
      daten.set("voraussichtliche_gesamtmiete", euro(berechnung.gesamt));
      daten.set("gesamtkaution", euro(berechnung.kaution));
      daten.set("_subject", "Mietanfrage – Werkzeugverleih Wolter");
      try {
        const antwort = await fetch(formspreeEndpoint, {
          method: "POST",
          body: daten,
          headers: { Accept: "application/json" }
        });
        if (!antwort.ok) throw new Error("Formspree HTTP " + antwort.status);
        anfrageStatus.textContent = "Deine unverbindliche Mietanfrage wurde übermittelt. Wir prüfen die Verfügbarkeit und melden uns bei dir.";
        anfrageStatus.dataset.erfolg = "true";
        anfrageForm.reset();
      } catch (fehler) {
        console.error("Mietanfrage konnte nicht gesendet werden:", fehler);
        anfrageStatus.textContent = "Die Anfrage konnte nicht übermittelt werden. Bitte versuche es erneut oder kontaktiere uns per E-Mail bzw. Telefon.";
        anfrageStatus.setAttribute("role", "alert");
      } finally {
        anfrageLaeuft = false;
        anfrageAbsenden.textContent = "Mietanfrage absenden";
        aktualisiereAnfrageButton();
      }
    });

    function aktualisierePreis() {
      preisAnzeige.replaceChildren();
      const hinweis = text => {
        const p = document.createElement("p");
        p.textContent = text;
        preisAnzeige.appendChild(p);
      };
      if (auswahl.size === 0) {
        hinweis("Wähle zunächst mindestens ein Werkzeug aus.");
        return;
      }
      const start = alsDatum(mietbeginn.value);
      const ende = alsDatum(mietende.value);
      if (!start || !ende) {
        hinweis("Bitte Mietbeginn und Rückgabedatum auswählen.");
        return;
      }
      if (ende < start) {
        hinweis("Das Rückgabedatum darf nicht vor dem Mietbeginn liegen.");
        return;
      }
      // Wochenendmiete umfasst Samstag und Sonntag; Rückgabe am Montag.
      // Ein bis Sonntag gewählter Zeitraum wird nicht stillschweigend verlängert.
      if (ende.getUTCDay() === 0 && start.getTime() <= ende.getTime() - einTag) {
        hinweis("Für eine Wochenendmiete mit Nutzung am Samstag und Sonntag erfolgt die Rückgabe am Montag. Bitte Montag als Rückgabedatum auswählen, um die Wochenendpauschale zu berechnen.");
        return;
      }
      let gesamt = 0;
      let kaution = 0;
      for (const werkzeug of auswahl.values()) {
        const preis = berechnePreis(werkzeug, start, ende);
        if (!preis) {
          hinweis("Für mindestens ein Werkzeug fehlt ein gültiger Tagespreis. Eine Gesamtsumme ist nicht möglich.");
          return;
        }
        gesamt += preis.gesamt;
        const k = Number(werkzeug.kaution_eur);
        if (werkzeug.kaution_eur !== "" && Number.isFinite(k) && k >= 0) kaution += k;
      }
      const gesamtmieteZeile = document.createElement("p");
      const gesamtmieteFett = document.createElement("strong");
      gesamtmieteFett.textContent = "Voraussichtliche Gesamtmiete: " + euro(gesamt);
      gesamtmieteZeile.appendChild(gesamtmieteFett);
      preisAnzeige.appendChild(gesamtmieteZeile);

      const kautionZeile = document.createElement("p");
      const kautionFett = document.createElement("strong");
      kautionFett.textContent = "Gesamtkaution: " + euro(kaution);
      kautionZeile.appendChild(kautionFett);
      preisAnzeige.appendChild(kautionZeile);

      hinweis("Die Kaution fällt zusätzlich an und ist nicht Teil der Mietkosten.");
      hinweis("Berechnung: Tagespreise und gegebenenfalls Wochenendpauschalen. Rückgabe am Montag bei Wochenendmiete.");
    }
    mietbeginn.addEventListener("change", aktualisiereWarenkorb);
    mietende.addEventListener("change", aktualisiereWarenkorb);

    mietkorbOeffnen.addEventListener("click", () => mietkorbDialog.showModal());
    mietkorbSchliessen.addEventListener("click", () => mietkorbDialog.close());
    mietkorbDialog.addEventListener("click", event => {
      if (event.target === mietkorbDialog) {
        const rect = mietkorbDialog.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right ||
            event.clientY < rect.top || event.clientY > rect.bottom) {
          mietkorbDialog.close();
        }
      }
    });

    function aktualisiereWarenkorb() {
      warenkorbListe.replaceChildren();
      warenkorbAnzahl.textContent = String(auswahl.size);
      mietkorbOeffnen.setAttribute("aria-label", "Mietkorb öffnen, " + auswahl.size + " Werkzeuge");
      warenkorbLeer.hidden = auswahl.size > 0;

      for (const [id, werkzeug] of auswahl) {
        const name = werkzeug.name;
        const eintrag = document.createElement("li");
        const position = document.createElement("div");
        position.className = "mietkorb-position";
        const links = document.createElement("div");
        const beschriftung = document.createElement("div");
        beschriftung.className = "mietkorb-position-name";
        beschriftung.textContent = name;
        links.appendChild(beschriftung);
        position.appendChild(links);
        const preise = document.createElement("div");
        preise.className = "mietkorb-position-preise";
        function preiszeile(label, wert, klasse = "") {
          const zeile = document.createElement("div");
          if (klasse) zeile.className = klasse;
          const titel = document.createElement("span");
          titel.textContent = label;
          const betrag = document.createElement("span");
          betrag.textContent = wert;
          zeile.append(titel, betrag);
          preise.appendChild(zeile);
        }
        preiszeile("Tag", euro(Number(werkzeug.tag_eur)));
        if (werkzeug.wochenende_eur) preiszeile("Wochenende", euro(Number(werkzeug.wochenende_eur)));
        if (werkzeug.kaution_eur) preiszeile("Kaution", euro(Number(werkzeug.kaution_eur)));
        const start = alsDatum(mietbeginn.value);
        const ende = alsDatum(mietende.value);
        if (start && ende && ende >= start &&
            !(ende.getUTCDay() === 0 && start.getTime() <= ende.getTime() - einTag)) {
          const berechnung = berechnePreis(werkzeug, start, ende);
          if (berechnung) preiszeile("Mietpreis", euro(berechnung.gesamt), "mietkorb-position-summe");
        }
        position.appendChild(preise);
        eintrag.appendChild(position);

        const entfernen = document.createElement("button");
        entfernen.type = "button";
        entfernen.textContent = "Entfernen";
        entfernen.setAttribute("aria-label", name + " aus dem Mietkorb entfernen");
        entfernen.addEventListener("click", () => {
          auswahl.delete(id);
          aktualisiereWarenkorb();
        });
        eintrag.appendChild(entfernen);
        warenkorbListe.appendChild(eintrag);
      }

      aktualisierePreis();
      aktualisiereAnfrageButton();

      for (const [id, button] of auswahlButtons) {
        const gewaehlt = auswahl.has(id);
        button.textContent = gewaehlt ? "Auswahl entfernen" : "Jetzt mieten";
        button.setAttribute("aria-pressed", String(gewaehlt));
      }
    }

    function erstelleText(element, inhalt, elternElement) {
      const text = document.createElement(element);
      text.textContent = inhalt;
      elternElement.appendChild(text);
      return text;
    }

    // Merkt sich die aktuell geöffnete Kategorie
    let offeneKategorie = null;

    for (const kategorie of kategorien) {
      const gruppe = document.createElement("div");
      gruppe.style.marginBottom = "12px";

      // Anklickbare Hauptkategorie
      const kategorieButton = document.createElement("button");
      kategorieButton.type = "button";

      kategorieButton.style.width = "100%";
      kategorieButton.style.padding = "22px";
      kategorieButton.style.backgroundColor = "#102b4c";
      kategorieButton.style.color = "#ffffff";
      kategorieButton.style.border = "none";
      kategorieButton.style.borderRadius = "10px";
      kategorieButton.style.cursor = "pointer";
      kategorieButton.style.fontSize = "19px";
      kategorieButton.style.fontWeight = "600";
      kategorieButton.style.textAlign = "left";
      kategorieButton.style.display = "flex";
      kategorieButton.style.justifyContent = "space-between";
      kategorieButton.style.alignItems = "center";
      kategorieButton.style.gap = "12px";

      const kategorieName = document.createElement("span");
      kategorieName.textContent = kategorie;

      const pfeil = document.createElement("span");
      pfeil.textContent = "▼";
      pfeil.style.fontSize = "15px";

      kategorieButton.appendChild(kategorieName);
      kategorieButton.appendChild(pfeil);

      // Container für die Werkzeugkarten
      const karten = document.createElement("div");
      karten.className = "grid";
      karten.style.marginTop = "18px";
      karten.style.marginBottom = "25px";
      karten.style.display = "none";

      const gefilterteWerkzeuge = werkzeuge.filter(
        werkzeug => werkzeug.kategorie === kategorie
      );

      // Werkzeugkarten wie bisher erstellen
      for (const [werkzeugIndex, werkzeug] of gefilterteWerkzeuge.entries()) {
        const karte = document.createElement("article");
        karte.className = "card";

        // Werkzeugbild
        if (werkzeug.bild && werkzeug.bild !== "bilder/") {
          const bild = document.createElement("img");

          bild.src = werkzeug.bild;
          bild.alt = werkzeug.name + " – Werkzeugverleih Wolter";
          bild.loading = "lazy";

          bild.style.width = "100%";
          bild.style.height = "220px";
          bild.style.objectFit = "contain";
          bild.style.marginBottom = "15px";

          karte.appendChild(bild);
        }

        // Werkzeugname
        erstelleText("h3", werkzeug.name, karte);

        // Kurzbeschreibung
        if (werkzeug.beschreibung) {
          const beschreibung = erstelleText(
            "p",
            werkzeug.beschreibung,
            karte
          );

          beschreibung.style.marginBottom = "15px";
        }

        // Eigenschaften
        if (werkzeug.eigenschaften) {
          const eigenschaften = document.createElement("ul");

          eigenschaften.style.paddingLeft = "20px";
          eigenschaften.style.marginBottom = "15px";

          for (const punkt of werkzeug.eigenschaften.split("|")) {
            if (punkt.trim()) {
              erstelleText("li", punkt.trim(), eigenschaften);
            }
          }

          karte.appendChild(eigenschaften);
        }

        // Mietpreise
        if (werkzeug.tag_eur) {
          erstelleText(
            "p",
            `Tagesmiete: ${formatPreis(werkzeug.tag_eur)}`,
            karte
          );
        }

        if (werkzeug.wochenende_eur) {
          erstelleText(
            "p",
            `Wochenende: ${formatPreis(werkzeug.wochenende_eur)}`,
            karte
          );
        }

        if (werkzeug.kaution_eur) {
          erstelleText(
            "p",
            `Kaution: ${formatPreis(werkzeug.kaution_eur)}`,
            karte
          );
        }

        // Button oberhalb der weiteren Details.
        const werkzeugId = kategorie + "::" + werkzeugIndex;
        const mietenButton = document.createElement("button");
        mietenButton.type = "button";
        mietenButton.className = "mietanfrage-button";
        mietenButton.textContent = "Jetzt mieten";
        mietenButton.setAttribute("aria-pressed", "false");
        mietenButton.setAttribute("aria-label", werkzeug.name + " zur Mietanfrage hinzufügen");
        mietenButton.addEventListener("click", () => {
          if (auswahl.has(werkzeugId)) {
            auswahl.delete(werkzeugId);
          } else {
            auswahl.set(werkzeugId, werkzeug);
          }
          aktualisiereWarenkorb();
        });
        auswahlButtons.set(werkzeugId, mietenButton);
        karte.appendChild(mietenButton);

        // Aufklappbarer Detailbereich
        if (werkzeug.details) {
          const details = document.createElement("details");

          details.style.marginTop = "15px";
          details.style.padding = "12px";
          details.style.backgroundColor = "#f2f5f9";
          details.style.borderRadius = "8px";

          const zusammenfassung = document.createElement("summary");
          zusammenfassung.textContent = "Weitere Details";
          zusammenfassung.style.cursor = "pointer";
          zusammenfassung.style.fontWeight = "600";
          zusammenfassung.style.color = "#102b4c";

          details.appendChild(zusammenfassung);

          const detailListe = document.createElement("ul");
          detailListe.style.paddingLeft = "20px";
          detailListe.style.marginTop = "12px";

          for (const punkt of werkzeug.details.split("|")) {
            if (punkt.trim()) {
              erstelleText("li", punkt.trim(), detailListe);
            }
          }

          details.appendChild(detailListe);
          karte.appendChild(details);
        }

        karten.appendChild(karte);
      }

      // Kategorie öffnen oder schließen
      kategorieButton.setAttribute("aria-expanded", "false");

      kategorieButton.addEventListener("click", () => {
        const istOffen = karten.style.display !== "none";

        // Vorherige Kategorie schließen
        if (offeneKategorie && offeneKategorie !== karten) {
          offeneKategorie.style.display = "none";

          const vorherigerButton =
            offeneKategorie.previousElementSibling;

          if (vorherigerButton) {
            vorherigerButton.setAttribute("aria-expanded", "false");

            const vorherigerPfeil =
              vorherigerButton.lastElementChild;

            if (vorherigerPfeil) {
              vorherigerPfeil.textContent = "▼";
            }
          }
        }

        if (istOffen) {
          karten.style.display = "none";
          pfeil.textContent = "▼";
          kategorieButton.setAttribute("aria-expanded", "false");
          offeneKategorie = null;
        } else {
          karten.style.display = "grid";
          pfeil.textContent = "▲";
          kategorieButton.setAttribute("aria-expanded", "true");
          offeneKategorie = karten;

          // Nach dem Schließen einer anderen Kategorie verändert sich die
          // Seitenhöhe. Erst nach dem Layout die neue Überschrift ausrichten.
          requestAnimationFrame(() => {
            if (kategorieButton.getAttribute("aria-expanded") !== "true") return;
            kategorieButton.scrollIntoView({
              block: "start",
              behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
                ? "instant"
                : "smooth"
            });
          });
        }
      });

      gruppe.appendChild(kategorieButton);
      gruppe.appendChild(karten);
      bereich.appendChild(gruppe);
    }

  } catch (fehler) {
    console.error("Fehler beim Laden der Werkzeuge:", fehler);

    bereich.textContent =
      "Der Werkzeugkatalog konnte nicht geladen werden.";
  }
}

ladeWerkzeuge();
