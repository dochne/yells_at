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

async function decode(dataUrl) {
    return new Uint8Array(await (await fetch(dataUrl)).arrayBuffer());
}

async function loadOverlay(filename) {
    return memoize(filename, async () => {
        return new Uint8Array(await (await fetch(filename)).arrayBuffer());
    });
}

async function transformImage(content, filename)
{
    const imageItem = document.createElement("a");
    imageItem.className = "image-item spinner";
    imageItem.download = "yells_at_" + (filename ?? '.png');
    document.getElementById("image-box").appendChild(imageItem);

    await initializeImageMagick()

    const overlay = await loadOverlay("yells_at.png");
    
    ImageMagick.read(content, (image) => {
        ImageMagick.read(overlay, (overlayImage) => {
            image.resize(new MagickGeometry(56, 56))
            overlayImage.composite(image, CompositeOperator.Over, new Point(10, 0));
                
            overlayImage.write(async data => {
                const elem = document.createElement("img");
                elem.src = await encode(data);
                imageItem.href = elem.src;
                imageItem.classList.remove("spinner");
                imageItem.appendChild(elem);
            });
        });
    });
}

async function getAsString(item)
{
    return new Promise((resolve) => {
        item.getAsString((str) => {
            console.log("Resolve", str);
            resolve(str);
        });
    });
    
}

async function getDataTransferItemAsBuffer(items)
{
    let item = undefined;

    if (item = items.find((item) => item.kind === 'file')) {
        return new Uint8Array(await item.getAsFile().arrayBuffer());
    } else if (item = items.find((item) => item.kind == 'string' && item.type === 'text/uri-list')) {
        const str = await getAsString(item);

        if (str.indexOf("data:") === 0) {
            return await decode(str);
        }
    }

    return undefined;
}

async function dropHandler(ev) {
    // Prevent default behavior (Prevent file from being opened)
    ev.preventDefault();

    document.body.classList.remove("dragging");
  
    if (ev.dataTransfer.items) {
        const buffer = await getDataTransferItemAsBuffer([...ev.dataTransfer.items]);
        if (buffer) {
            transformImage(buffer);
        }
    } else {
        console.error("Not handling this")
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


async function pasteEvent(ev) {
    const buffer = await getDataTransferItemAsBuffer([...ev.clipboardData.items]);
    if (buffer) {
        transformImage(buffer);
    }

    ev.preventDefault();
  }

document.onpaste = pasteEvent;

