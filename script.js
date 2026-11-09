
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
      for (const werkzeug of gefilterteWerkzeuge) {
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
