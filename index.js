import {
    initializeImageMagick,
    ImageMagick,
    MagickGeometry,
    CompositeOperator,
    Point,
} from './dist/magick.mjs';

const memoize = (() => {
    const cache = {};
    return async (key, callable) => {
        if (cache[key] === undefined) {
            cache[key] = await callable();
        }
        return cache[key];
    }
})();

async function encode(data) {
    return await new Promise((r) => {
        const reader = new FileReader()
        reader.onload = () => r(reader.result)
        reader.readAsDataURL(new Blob([data]))
    });
}

async function loadOverlay(filename) {
    return memoize(filename, async () => {
        return new Uint8Array(await (await fetch(filename)).arrayBuffer());
    });
}

async function transformImage(content, filename)
{
    await initializeImageMagick()
    const overlay = await loadOverlay("yells_at.png");
    
    ImageMagick.read(content, (image) => {
        ImageMagick.read(overlay, (overlayImage) => {
            image.resize(new MagickGeometry(56, 56))
            overlayImage.composite(image, CompositeOperator.Over, new Point(10, 0));
                
            overlayImage.write(async data => {
                // const link = document.createElement("a");
                

                const elem = document.createElement("img");
                elem.src = await encode(data);
    
                const imageItem = document.createElement("a");
                imageItem.className = "image-item";
                imageItem.download = "yells_at_" + filename;
                imageItem.href = elem.src;
    
                imageItem.appendChild(elem);
                document.getElementById("image-box").appendChild(imageItem);
            });
        });
    });
}

async function dropHandler(ev) {
    // Prevent default behavior (Prevent file from being opened)
    ev.preventDefault();

    document.body.classList.remove("dragging");
  
    if (ev.dataTransfer.items) {
      [...ev.dataTransfer.items].forEach(async (item, i) => {
        if (item.kind === 'file') {
          const file = item.getAsFile();
          transformImage(new Uint8Array(await file.arrayBuffer()), file.name);
        }
      });
    } else {
        console.error("Not handling this")
      // Use DataTransfer interface to access the file(s)
    //   [...ev.dataTransfer.files].forEach((file, i) => {
    //     console.log(`… file[${i}].name = ${file.name}`);
    //   });
    }
  }

async function dragOverHandler(ev) {
// Prevent default behavior (Prevent file from being opened)
    ev.preventDefault();
    document.body.classList.add("dragging")
}


const fileUpload = document.querySelector("#file-upload")
fileUpload.addEventListener("change", function() {
    const reader = new FileReader()
    reader.addEventListener("load", () => {
        transformImage(new Uint8Array(reader.result, this.files[0].name));
    })
    reader.readAsArrayBuffer(this.files[0])
})

const dropZone = document.getElementById("drop-zone");
dropZone.ondrop = dropHandler;
dropZone.ondragover = dragOverHandler;