
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

    for (const kategorie of kategorien) {
      const gruppe = document.createElement("div");

      const titel = document.createElement("h3");
      titel.textContent = kategorie;
      titel.style.color = "#102b4c";
      gruppe.appendChild(titel);

      const karten = document.createElement("div");
      karten.className = "grid";

      const gefilterteWerkzeuge = werkzeuge.filter(
        werkzeug => werkzeug.kategorie === kategorie
      );

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

        // Wichtigste Eigenschaften
        if (werkzeug.eigenschaften) {
          const eigenschaften = document.createElement("ul");

          eigenschaften.style.paddingLeft = "20px";
          eigenschaften.style.marginBottom = "15px";

          const punkte = werkzeug.eigenschaften.split("|");

          for (const punkt of punkte) {
            if (punkt.trim()) {
              erstelleText(
                "li",
                punkt.trim(),
                eigenschaften
              );
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

          const zusammenfassung =
            document.createElement("summary");

          zusammenfassung.textContent = "Weitere Details";
          zusammenfassung.style.cursor = "pointer";
          zusammenfassung.style.fontWeight = "600";
          zusammenfassung.style.color = "#102b4c";

          details.appendChild(zusammenfassung);

          const detailListe = document.createElement("ul");
          detailListe.style.paddingLeft = "20px";
          detailListe.style.marginTop = "12px";

          const punkte = werkzeug.details.split("|");

          for (const punkt of punkte) {
            if (punkt.trim()) {
              erstelleText(
                "li",
                punkt.trim(),
                detailListe
              );
            }
          }

          details.appendChild(detailListe);
          karte.appendChild(details);
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

ladeWerkzeuge();
