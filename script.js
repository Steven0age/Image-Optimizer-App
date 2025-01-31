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
      await extractZip(file, zip, maxWidth, maxSizeKB);
    } else {
      const img = await loadImage(file);
      const resizedImage = await resizeAndCompress(img, maxWidth, maxSizeKB);
      zip.file(file.name, resizedImage);
    }
  }

  zip.generateAsync({ type: "blob" }).then((content) => {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(content);
    link.download = "optimized_images.zip";
    link.click();
  });
});

async function extractZip(zipFile, zip, maxWidth, maxSizeKB) {
  const zipData = await JSZip.loadAsync(zipFile);
  for (const fileName in zipData.files) {
    if (
      fileName.endsWith(".jpg") ||
      fileName.endsWith(".jpeg") ||
      fileName.endsWith(".png")
    ) {
      const fileData = await zipData.files[fileName].async("blob");
      const img = await loadImage(fileData);
      const resizedImage = await resizeAndCompress(img, maxWidth, maxSizeKB);
      zip.file(fileName, resizedImage);
    }
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
    let resizedImage;
    function tryCompression() {
      resizedImage = canvas.toDataURL("image/jpeg", quality);
      if (resizedImage.length / 1024 > maxSizeKB && quality > 0.1) {
        quality -= 0.05;
        tryCompression();
      } else {
        resolve(dataURLtoBlob(resizedImage));
      }
    }
    tryCompression();
  });
}

function dataURLtoBlob(dataURL) {
  const byteString = atob(dataURL.split(",")[1]);
  const mimeString = dataURL.split(",")[0].split(":")[1].split(";")[0];
  const arrayBuffer = new ArrayBuffer(byteString.length);
  const uintArray = new Uint8Array(arrayBuffer);
  for (let i = 0; i < byteString.length; i++) {
    uintArray[i] = byteString.charCodeAt(i);
  }
  return new Blob([arrayBuffer], { type: mimeString });
}
