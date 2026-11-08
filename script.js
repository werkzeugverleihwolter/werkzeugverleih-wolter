
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
    const spalten = zeilen.shift().split(";");

    const werkzeuge = zeilen.map(zeile => {
      const werte = zeile.split(";");
      return Object.fromEntries(
        spalten.map((spalte, index) => [spalte, werte[index] ?? ""])
      );
    });

    const kategorien = [...new Set(
      werkzeuge.map(werkzeug => werkzeug.kategorie)
    )];

    bereich.replaceChildren();
    bereich.style.gridTemplateColumns = "1fr";

    const formatPreis = wert => `${wert} €`;

    for (const kategorie of kategorien) {
      const gruppe = document.createElement("div");
      const titel = document.createElement("h3");
      titel.textContent = kategorie;
      titel.style.color = "#102b4c";
      gruppe.appendChild(titel);

      const karten = document.createElement("div");
      karten.className = "grid";

      for (const werkzeug of werkzeuge.filter(
        eintrag => eintrag.kategorie === kategorie
      )) {
        const karte = document.createElement("article");
        karte.className = "card";
        
if (werkzeug.name.toLowerCase().includes("motorkran")) {
  const bild = document.createElement("img");

  bild.src = "bilder/Motorkran.png";
  bild.alt = "Motorkran – Werkzeugverleih Wolter";
  bild.loading = "lazy";

  bild.style.width = "100%";
  bild.style.height = "220px";
  bild.style.objectFit = "contain";
  bild.style.marginBottom = "15px";

  karte.appendChild(bild);
}


        const name = document.createElement("h3");
        name.textContent = werkzeug.name;
        karte.appendChild(name);

        const tag = document.createElement("p");
        tag.textContent = `Tagesmiete: ${formatPreis(werkzeug.tag_eur)}`;
        karte.appendChild(tag);

        if (werkzeug.wochenende_eur) {
          const wochenende = document.createElement("p");
          wochenende.textContent =
            `Wochenende: ${formatPreis(werkzeug.wochenende_eur)}`;
          karte.appendChild(wochenende);
        }

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
    console.error(fehler);
    bereich.textContent =
      "Der Werkzeugkatalog konnte nicht geladen werden.";
  }
}

ladeWerkzeuge();
