document.getElementById("processBtn").addEventListener("click", async () => {
  const files = document.getElementById("fileInput").files;
  if (files.length === 0) {
    alert("Bitte Bilder oder ein ZIP-Archiv hochladen.");
    return;
  }

  const maxWidth = parseInt(document.getElementById("maxWidth").value);
  const maxSizeKB = parseInt(document.getElementById("maxSize").value);
  const zip = new JSZip();

  for (const file of files) {
    if (file.name.endsWith(".zip")) {
      console.log(`Extrahiere ZIP-Datei: ${file.name}`);
      await extractZip(file, zip, maxWidth, maxSizeKB);
    } else {
      console.log(`Verarbeite Bilddatei: ${file.name}`);
      const img = await loadImage(file);
      const resizedImageBlob = await resizeAndCompress(
        img,
        maxWidth,
        maxSizeKB
      );
      zip.file(file.name, resizedImageBlob, { binary: true });
    }
  }

  console.log("Generiere ZIP-Archiv mit den optimierten Bildern...");
  zip
    .generateAsync({ type: "blob" })
    .then((content) => {
      console.log("ZIP-Archiv erfolgreich generiert. Starte Download.");
      const link = document.createElement("a");
      link.href = URL.createObjectURL(content);
      link.download = "optimized_images.zip";
      link.click();
    })
    .catch((err) => {
      console.error("Fehler beim Generieren des ZIP-Archivs:", err);
    });
});

async function extractZip(zipFile, zip, maxWidth, maxSizeKB) {
  const zipData = await JSZip.loadAsync(zipFile);
  const fileEntries = Object.keys(zipData.files);

  for (const fileName of fileEntries) {
    const file = zipData.files[fileName];
    if (
      !fileName.endsWith(".jpg") &&
      !fileName.endsWith(".jpeg") &&
      !fileName.endsWith(".png")
    ) {
      console.log(`Überspringe nicht unterstützte Datei: ${fileName}`);
      continue;
    }

    console.log(`Extrahiere Datei: ${fileName}`);
    const fileData = await file.async("blob");
    const img = await loadImage(fileData);
    const resizedImageBlob = await resizeAndCompress(img, maxWidth, maxSizeKB);
    zip.file(fileName.split("/").pop(), resizedImageBlob, { binary: true });
    console.log(`Datei ${fileName} erfolgreich verarbeitet und hinzugefügt.`);
  }
}

function loadImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function resizeAndCompress(img, maxWidth, maxSizeKB) {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    let width = img.width;
    let height = img.height;
    if (width > height && width > maxWidth) {
      height *= maxWidth / width;
      width = maxWidth;
    } else if (height > width && height > maxWidth) {
      width *= maxWidth / height;
      height = maxWidth;
    }

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(img, 0, 0, width, height);

    let quality = 0.85;
    function tryCompression() {
      canvas.toBlob(
        (blob) => {
          console.log(
            `Blob-Größe nach Komprimierung: ${(blob.size / 1024).toFixed(2)} KB`
          );
          if (blob.size / 1024 > maxSizeKB && quality > 0.1) {
            quality -= 0.05;
            console.log(`Reduziere Qualität auf ${quality}`);
            tryCompression();
          } else {
            resolve(blob);
          }
        },
        "image/jpeg",
        quality
      );
    }
    tryCompression();
  });
}
