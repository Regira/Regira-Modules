import { expect, test } from "vitest";
import { equals, contains, startsWith, endsWith } from "../../src/utilities/string-utility";
import { trim, trimLeft, trimRight } from "../../src/utilities/string-utility";
import { isEmail, isUrl } from "../../src/utilities/string-utility";

// COMPARING
const valueUpper = "THIS IS A VALUE";
const valueLower = "this is a value";
const valueCapitalized = "This Is A Value";
// equals
test("equals different case", () => {
  expect(equals(valueUpper, valueLower)).toBeFalsy();
});
test("equals case insensitive", () => {
  expect(equals(valueUpper, valueLower, true) && equals(valueLower, valueCapitalized, true)).toBeTruthy();
});
// contains
const containsString = " is a ";
test("contains different case", () => {
  expect(contains(valueUpper, containsString)).toBeFalsy();
});
test("contains same case", () => {
  expect(contains(valueLower, containsString)).toBeTruthy();
});
test("contains case sensitive", () => {
  expect(contains(valueUpper, containsString, true) && contains(valueCapitalized, containsString, true)).toBeTruthy();
});
// startsWith
test("startsWith different case", () => {
  expect(startsWith(valueUpper, "this")).toBeFalsy();
});
test("startsWith same case", () => {
  expect(startsWith(valueLower, "this")).toBeTruthy();
});
test("startsWith case insensitive", () => {
  expect(startsWith(valueUpper, "this", true) && startsWith(valueCapitalized, "this", true)).toBeTruthy();
});
// endsWith
test("endsWith different case", () => {
  expect(endsWith(valueUpper, "value")).toBeFalsy();
});
test("endsWith same case", () => {
  expect(endsWith(valueLower, "value")).toBeTruthy();
});
test("endsWith case insensitive", () => {
  expect(endsWith(valueUpper, "value", true) && endsWith(valueCapitalized, "value", true)).toBeTruthy();
});

// TRIMMING
const valueWithWhitespaces = "\n\thello ";
test("no chars: remove whitespace at the beginning", () => {
  expect(trimLeft(valueWithWhitespaces)).toBe("hello ");
});
test("no chars: remove whitespace at the end", () => {
  expect(trimRight(valueWithWhitespaces)).toBe("\n\thello");
});
test("no chars: remove whitespace at the beginning and at the end", () => {
  expect(trim(valueWithWhitespaces)).toBe("hello");
});

const inputWithCharsToTrim = "*_*!test!*_*";
test("remove chars at the beginning", () => {
  expect(trimLeft(inputWithCharsToTrim, "*!_")).toBe("test!*_*");
});
test("remove chars at the end", () => {
  expect(trimRight(inputWithCharsToTrim, "*!_")).toBe("*_*!test");
});
test("remove chars at the beginning and at the end", () => {
  expect(trim(inputWithCharsToTrim, "*!_")).toBe("test");
});

// VALIDATING
const validEmails = [
  "name@domain.com",
  "first_last@domain.ext",
  "first_last@sub.domain.tld",
  "firstname.lastname@exotic.special",
  "firstname-lastname@gmail.com",
];
const invalidEmails = ["@mytag", "test@hotmail@com", "test@my_domain.com", "test@my_subdomain.email.com", ""];
validEmails.forEach((x) => {
  test(`check valid email ${x}`, () => {
    expect(isEmail(x)).toBeTruthy();
  });
});
invalidEmails.forEach((x) => {
  test(`check invalid email ${x}`, () => {
    expect(isEmail(x)).not.toBeTruthy();
  });
});
const validUrls = [
  "http://www.domain.com",
  "https://www.secure.com",
  "http://domain.exotic",
  "http://domain.com:8080",
  "http://sub1.sub2.domain.anytld",
  "HTTP://WWW.UPPER.COM",
];
const invalidUrls = ["bad_domain", "file://www.domain.com", "@bad_url"];
validUrls.forEach((x) => {
  test(`check valid url ${x}`, () => {
    expect(isUrl(x)).toBeTruthy();
  });
});
invalidUrls.forEach((x) => {
  test(`check invalid url ${x}`, () => {
    expect(isUrl(x)).not.toBeTruthy();
  });
});

// REPLACING
const frenchInput = "€200 > façon spéciale, ma sœur";
import { normalizeDiacritics, htmlEncode, htmlDecode } from "../../src/utilities/string-utility";

test("replace special french characters in lowercase", () => {
  expect(normalizeDiacritics(frenchInput)).toBe("€200 > facon speciale, ma soeur");
});
test("replace special french characters in uppercase", () => {
  expect(normalizeDiacritics(frenchInput.toUpperCase())).toBe("€200 > FACON SPECIALE, MA SOEUR");
});
test("htmlEncode", () => {
  expect(htmlEncode(frenchInput)).toBe("&#8364;200 &#62; fa&#231;on sp&#233;ciale, ma s&#339;ur");
});
test("htmlEncode & htmlDecode equals original", () => {
  expect(htmlDecode(htmlEncode(frenchInput))).toBe(frenchInput);
});
test("htmlDecode decodes named and hex entities, preserving literal markup", () => {
  expect(htmlDecode("&amp;&lt;&gt;&quot;")).toBe('&<>"');
  expect(htmlDecode("&#x41;&#66;")).toBe("AB");
  expect(htmlDecode("plain <b>text</b> &amp; more")).toBe("plain <b>text</b> & more");
});

import { randomize, newPassword } from "../../src/utilities/string-utility";
test("randomize returns a string of the requested length from the alphanumeric charset", () => {
  const s = randomize(40);
  expect(s).toHaveLength(40);
  expect(s).toMatch(/^[0-9a-zA-Z]+$/);
});
test("newPassword returns an 8-31 char alphanumeric string", () => {
  const p = newPassword();
  expect(p.length).toBeGreaterThanOrEqual(8);
  expect(p.length).toBeLessThanOrEqual(31);
  expect(p).toMatch(/^[0-9a-zA-Z]+$/);
});

// TRANSFORMING
import { capitalize, toKebabCase, toSnakeCase, toTrainCase, toCamelCase, toPascalCase, slugify } from "../../src/utilities/string-utility";
const inputToTransform = "To be, or not? To be.";
const specialCharsToTransform = "une façon spéciale, ma sœur";
test("capitalizing input with punctuation", () => {
  expect(capitalize(inputToTransform)).toBe("To Be, Or Not? To Be.");
});
test("kebabCase: input with punctuation", () => {
  expect(toKebabCase(inputToTransform)).toBe("to-be-or-not-to-be");
  expect(toKebabCase(null)).toBe("");
});
test("snakeCase: input with punctuation", () => {
  expect(toSnakeCase(inputToTransform)).toBe("to_be_or_not_to_be");
  expect(toSnakeCase(undefined)).toBe("");
});
test("trainCase: input with punctuation", () => {
  expect(toTrainCase(inputToTransform)).toBe("To-Be-Or-Not-To-Be");
  expect(toTrainCase("")).toBe("");
});
test("camelCase: input with punctuation", () => {
  expect(toCamelCase(inputToTransform)).toBe("toBeOrNotToBe");
  expect(toCamelCase(null)).toBe("");
});
test("pascalCase: input with punctuation", () => {
  expect(toPascalCase(inputToTransform)).toBe("ToBeOrNotToBe");
  expect(toPascalCase(undefined)).toBe("");
});
test("slugify input with punctuation", () => {
  expect(slugify(inputToTransform)).toBe("to-be-or-not-to-be");
  expect(slugify(specialCharsToTransform)).toBe("une-facon-speciale-ma-soeur");
  expect(slugify(specialCharsToTransform.toUpperCase())).toBe("une-facon-speciale-ma-soeur");
});
