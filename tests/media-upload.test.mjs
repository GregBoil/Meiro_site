import test from "node:test";
import assert from "node:assert/strict";
import { validateImageUpload, MAX_IMAGE_BYTES } from "../src/media/upload.ts";
const png = [137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0];
const jpeg = [255, 216, 255, 224, 0, 0, 0, 0, 0, 0, 0, 0];
const webp = [...Buffer.from("RIFF"), 0, 0, 0, 0, ...Buffer.from("WEBP")];
const image = (bytes = png, name = "зураг.png", type = "image/png") =>
  new File([new Uint8Array(bytes)], name, { type });
test("uploads accept supported raster signatures and generate independent paths", async () => {
  for (const [bytes, name, type, ext] of [
    [png, "../зураг.png", "image/png", "png"],
    [jpeg, "PHOTO.JPEG", "image/jpeg", "jpg"],
    [webp, "photo.webp", "image/webp", "webp"],
  ]) {
    const file = image(bytes, name, type);
    const path = await validateImageUpload(file);
    assert.match(path, new RegExp(`^media/[a-f0-9-]{36}\\.${ext}$`));
    assert.notEqual(path, await validateImageUpload(file));
  }
});
test("uploads reject SVG/HTML, MIME or extension mismatch, empty and oversized files", async () => {
  for (const file of [
    image([...Buffer.from("<svg/>")], "photo.svg", "image/svg+xml"),
    image([...Buffer.from("<html>bad</html>")]),
    image(png, "photo.jpg", "image/jpeg"),
    image(png, "photo.html"),
    image(png, "photo.png", ""),
    image([]),
    new File([new Uint8Array(MAX_IMAGE_BYTES + 1)], "big.png", {
      type: "image/png",
    }),
  ]) {
    await assert.rejects(() => validateImageUpload(file));
  }
  assert.match(
    await validateImageUpload(
      new File(
        [new Uint8Array(png), new Uint8Array(MAX_IMAGE_BYTES - png.length)],
        "limit.png",
        { type: "image/png" },
      ),
    ),
    /\.png$/,
  );
});
