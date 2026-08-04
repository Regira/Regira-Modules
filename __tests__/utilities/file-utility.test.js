import "regenerator-runtime/runtime";
//import { Blob } from "blob-polyfill";
import { expect, test, describe, beforeEach, afterEach, vi } from "vitest";
import { isFile, getFilename, base64ToBlob, blobToBase64, getExtension, readAllText, fileToBlob, saveAs } from "../../src/utilities/file-utility";

const data = {};
beforeEach(() => {
  data.textFilename = "plain-text.txt";
  data.jsonFilename = "my_json.json";
  data.noExtFilename = "without-extension";

  data.textContent = "This is a plain text test.";
  data.textBlob = new Blob([data.textContent], { type: "text/plain" });
  data.textBlob.name = data.textFilename;

  data.jsonContent = JSON.stringify({ value: "test" });
  data.jsonBlob = new Blob([data.jsonContent], { type: "application/json" });
  data.jsonBlob.name = data.jsonFilename;

  data.base64 =
    "data:image/jpeg;base64,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";
});

test("check if an object is a file", () => {
  expect(isFile(data.textBlob)).toBeTruthy();
  expect(isFile({ name: "fake-file.txt", size: 10, type: "text/plain" })).toBeFalsy();
});
describe("get the filename from a uri", () => {
  test("a simple filename returns itself", () => {
    expect(getFilename("filename.txt")).toBe("filename.txt");
  });
  test("a uri with a single parent folder returns the filename without folder", () => {
    expect(getFilename("folder/filename.txt")).toBe("filename.txt");
  });
  test("a uri with multiple parent folders returns the filename without folders", () => {
    expect(getFilename("folder/another/filename.txt")).toBe("filename.txt");
  });
  test("an absolute uri returns the only filename", () => {
    expect(getFilename("http://www.my-domain.com/files/filename.txt")).toBe("filename.txt");
  });
  test("an invalid uri throws an error", () => {
    // throws an error :~
    //expect(getFilename('folder/another/')).toThrow();
    try {
      getFilename("folder/another/");
    } catch (err) {
      expect(err.message).toMatch("filename cannot end with a '/'");
    }
  });
  test("get extension", () => {
    const txtExt = getExtension(data.textFilename);
    expect(txtExt).toBe(".txt");
    const jsonExt = getExtension(data.jsonFilename);
    expect(jsonExt).toBe(".json");
    const noExt = getExtension(data.noExtFilename);
    expect(noExt).toBe("");
  });
});
describe("file conversion", () => {
  test("convert base64 to blob", () => {
    const blob = base64ToBlob(data.base64);
    console.debug(blob, { name: blob.name, type: blob.type, size: blob.size });
    expect(blob instanceof Blob).toBeTruthy();
    expect(blob.type).toBe("image/jpeg");
    expect(blob.size).toBeGreaterThan(0);
  });
  test("convert blob to base64", async (done) => {
    const blob = base64ToBlob(data.base64);
    const base64 = await blobToBase64(blob);
    expect(base64).toBe(data.base64);
    return Promise.resolve();
  });
});

test("reading content", async (done) => {
  const textContent = await readAllText(data.textBlob);
  expect(textContent).toBe(data.textContent);
  const jsonContent = await readAllText(data.jsonBlob);
  expect(jsonContent).toBe(data.jsonContent);
  return Promise.resolve();
});

test("fileToBlob returns a renamable Blob with preserved content", async () => {
  const file = new File(["file-content"], "orig.txt", { type: "text/plain" });
  const blob = await fileToBlob(file);
  expect(blob instanceof Blob).toBeTruthy();
  expect(blob.name).toBe("orig.txt");
  expect(await blob.text()).toBe("file-content");

  const renamed = await fileToBlob(file, "renamed.txt", "application/x-custom");
  expect(renamed.name).toBe("renamed.txt");
  expect(renamed.type).toBe("application/x-custom");
  expect(await renamed.text()).toBe("file-content");
});

describe("saveAs triggers a browser download", () => {
  let createSpy, revokeSpy, clickSpy, clicked;
  beforeEach(() => {
    createSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock-url");
    revokeSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    clicked = undefined;
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function () {
      clicked = this;
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("creates an object URL, clicks a download link and revokes the URL", () => {
    vi.useFakeTimers();
    try {
      const blob = new Blob(["hello"], { type: "text/plain" });
      saveAs(blob, "greeting.txt");

      expect(createSpy).toHaveBeenCalledWith(blob);
      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(clicked).toBeTruthy();
      expect(clicked.download).toBe("greeting.txt");
      expect(clicked.getAttribute("href")).toBe("blob:mock-url");
      // the link is removed from the DOM right after the click
      expect(document.querySelector("a[download]")).toBeNull();

      // the object URL is released on the scheduled timeout
      vi.runAllTimers();
      expect(revokeSpy).toHaveBeenCalledWith("blob:mock-url");
    } finally {
      vi.useRealTimers();
    }
  });

  test("falls back to the blob name, then to 'file'", () => {
    const named = new Blob(["x"]);
    named.name = "from-name.bin";
    saveAs(named);
    expect(clicked.download).toBe("from-name.bin");

    saveAs(new Blob(["x"]));
    expect(clicked.download).toBe("file");
  });
});
