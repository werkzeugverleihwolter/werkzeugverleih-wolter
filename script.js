
async function ladeWerkzeuge() {
  const bereich = document.querySelector("#werkzeuge .grid");

  if (!bereich) return;

  try {
    // CSV-Datei laden
    const antwort = await fetch("./werkzeuge.csv");

    if (!antwort.ok) {
      throw new Error("CSV-Datei konnte nicht geladen werden.");
    }

    // CSV-Daten einlesen
    const csv = (await antwort.text()).replace(/^\uFEFF/, "");
    const zeilen = csv.trim().split(/\r?\n/);
    const spalten = zeilen.shift().split(";").map(
      spalte => spalte.trim()
    );

    // Werkzeugdaten aus den Zeilen erstellen
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

    // Kategorien ermitteln
    const kategorien = [...new Set(
      werkzeuge.map(werkzeug => werkzeug.kategorie)
    )];

    // Bisherige Karten entfernen
    bereich.replaceChildren();
    bereich.style.gridTemplateColumns = "1fr";

    const formatPreis = wert => `${wert} €`;

    // Kategorien erstellen
    for (const kategorie of kategorien) {
      const gruppe = document.createElement("div");

      const titel = document.createElement("h3");
      titel.textContent = kategorie;
      titel.style.color = "#102b4c";

      gruppe.appendChild(titel);

      const karten = document.createElement("div");
      karten.className = "grid";

      // Werkzeuge der jeweiligen Kategorie
      const gefilterteWerkzeuge = werkzeuge.filter(
        werkzeug => werkzeug.kategorie === kategorie
      );

      for (const werkzeug of gefilterteWerkzeuge) {
        const karte = document.createElement("article");
        karte.className = "card";

        // Werkzeugbild aus CSV-Datei laden
        if (werkzeug.bild) {
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
        const name = document.createElement("h3");
        name.textContent = werkzeug.name;

        karte.appendChild(name);

        // Tagesmiete
        if (werkzeug.tag_eur) {
          const tag = document.createElement("p");

          tag.textContent =
            `Tagesmiete: ${formatPreis(werkzeug.tag_eur)}`;

          karte.appendChild(tag);
        }

        // Wochenendmiete
        if (werkzeug.wochenende_eur) {
          const wochenende = document.createElement("p");

          wochenende.textContent =
            `Wochenende: ${formatPreis(werkzeug.wochenende_eur)}`;

          karte.appendChild(wochenende);
        }

        // Kaution
        if (werkzeug.kaution_eur) {
          const kaution = document.createElement("p");

          kaution.textContent =
            `Kaution: ${formatPreis(werkzeug.kaution_eur)}`;

          karte.appendChild(kaution);
        }

        karten.appendChild(karte);
      }

      gruppe.appendChild(karten);
      bereich.appendChild(gruppe);
    }

  } catch (fehler) {
    console.error("Fehler beim Laden der Werkzeuge:", fehler);

    bereich.textContent =
      "Der Werkzeugkatalog konnte nicht geladen werden.";
  }
}

// Werkzeugkatalog starten
ladeWerkzeuge();
